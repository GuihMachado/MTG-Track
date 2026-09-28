import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideArrowRight, lucideChevronDown, lucideListPlus } from '@ng-icons/lucide';
import { BackButton } from '../../../shared/back-button/back-button';
import { NotificationService } from '../../../shared/notification/notification.service';
import { DeckForm, DeckFormValue, emptyDeckForm } from '../../../shared/deck-form/deck-form';
import { DeckService } from '../../../services/deck-service';
import { ImportService } from '../../../services/import-service';
import { DeckDto, DeckPayload, ResolutionDto } from '../../../models/collection.models';
import { orderWubrg } from '../../../shared/deck-choice';
import { ListSource } from '../../collection/import/list-source/list-source';
import { parseList, totalCards } from '../../collection/import/parse-list';
import { Review } from '../../collection/import/review/review';

/**
 * Formulário de deck: `/decks/novo` e `/decks/:id/editar`.
 *
 * O deck que vai à mesa é nome, commander e cores — a lista é opcional. Sem
 * lista, o deck nasce pronto para a partida; com a lista, passa pela mesma
 * revisão da importação antes de gravar, porque nenhuma lista de cem linhas
 * acerta tudo.
 */
@Component({
  selector: 'app-deck-edit',
  standalone: true,
  imports: [NgIcon, HlmIcon, BackButton, DeckForm, ListSource, Review],
  providers: [provideIcons({ lucideArrowRight, lucideChevronDown, lucideListPlus })],
  templateUrl: './deck-edit.html',
  styleUrl: './deck-edit.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckEdit implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private decks = inject(DeckService);
  private importService = inject(ImportService);
  private notify = inject(NotificationService);

  /** Id do deck em edição; null é criação. */
  protected deckId = signal<string | null>(null);
  protected loading = signal(false);
  protected saving = signal(false);

  protected form = signal<DeckFormValue>(emptyDeckForm());

  protected listOpen = signal(false);
  protected listText = signal('');
  /** Presente = a tela virou a revisão da lista. */
  protected resolutions = signal<ResolutionDto[] | null>(null);

  protected editing = computed(() => this.deckId() !== null);

  private listCards = computed(() => (this.listOpen() ? totalCards(parseList(this.listText())) : 0));
  protected withList = computed(() => this.listCards() > 0);

  /** Criar exige commander: é ele que dá arte, cores e o nome da estatística. */
  protected canSave = computed(() => {
    if (this.saving() || this.loading()) return false;
    return this.editing() || this.form().commanderName.length > 0;
  });

  protected actionLabel = computed(() => {
    if (this.saving()) return this.withList() ? 'Lendo…' : 'Gravando…';
    if (this.editing()) return 'Salvar';
    if (this.withList()) return `Revisar ${this.listCards()} carta${this.listCards() > 1 ? 's' : ''}`;
    return 'Criar deck';
  });

  /** O nome que vai para a revisão; vazio deixa o servidor usar o do commander. */
  protected reviewName = computed(() => this.form().name.trim() || null);
  protected reviewColors = computed(() => orderWubrg(this.form().colors));

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.deckId.set(id);
    this.loading.set(true);
    this.decks.getDeck(id).subscribe({
      next: deck => {
        this.form.set({
          name: deck.name,
          commanderName: deck.commanderName ?? '',
          commanderScryfallId: null,
          colors: orderWubrg(deck.colors),
        });
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.notify.apiError(error, {
          fallback: 'Não foi possível abrir esse deck.',
          byStatus: { 404: 'Esse deck não existe mais.' },
        });
        this.router.navigate(['/colecao']);
      },
    });
  }

  protected save(): void {
    if (!this.canSave()) {
      if (!this.editing() && !this.form().commanderName) {
        this.notify.warning('Escolha o commander do deck.');
      }
      return;
    }

    if (this.editing()) return this.update();
    if (this.withList()) return this.readList();
    this.create();
  }

  private payload(): DeckPayload {
    const value = this.form();
    return {
      name: value.name.trim() || value.commanderName,
      ...(value.commanderScryfallId ? { commanderScryfallId: value.commanderScryfallId } : {}),
      colors: orderWubrg(value.colors),
    };
  }

  private create(): void {
    this.saving.set(true);
    this.decks.create(this.payload()).subscribe({
      next: deck => {
        this.saving.set(false);
        this.notify.success(`${deck.name} pronto para a mesa.`);
        this.open(deck);
      },
      error: error => {
        this.saving.set(false);
        this.notify.apiError(error, { fallback: 'Não foi possível criar o deck.' });
      },
    });
  }

  private update(): void {
    const id = this.deckId()!;
    this.saving.set(true);
    this.decks.update(id, this.payload()).subscribe({
      next: deck => {
        this.saving.set(false);
        this.notify.success('Deck salvo.');
        this.open(deck);
      },
      error: error => {
        this.saving.set(false);
        this.notify.apiError(error, { fallback: 'Não foi possível salvar o deck.' });
      },
    });
  }

  /** Com lista: lê na Scryfall e passa para a revisão, que é quem grava. */
  private readList(): void {
    this.saving.set(true);
    this.importService.resolveLines(parseList(this.listText())).subscribe({
      next: resolutions => {
        this.saving.set(false);
        this.resolutions.set(resolutions);
      },
      error: error => {
        this.saving.set(false);
        this.notify.apiError(error, { fallback: 'Não consegui ler essa lista.' });
      },
    });
  }

  /** A fonte externa sabe o nome do deck: vale enquanto a pessoa não digitou outro. */
  protected onFetchedName(name: string | null): void {
    if (name && !this.form().name.trim()) this.form.update(value => ({ ...value, name }));
  }

  protected backToForm(): void {
    this.resolutions.set(null);
  }

  protected onImported(deck: DeckDto | null): void {
    if (deck) this.open(deck);
    else this.router.navigate(['/colecao']);
  }

  /** Substitui o formulário no histórico: voltar do deck não reabre o "novo". */
  private open(deck: DeckDto): void {
    this.router.navigate(['/decks', deck.id], { replaceUrl: true });
  }
}
