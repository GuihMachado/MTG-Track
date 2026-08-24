import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import {
  lucideCheck,
  lucideChevronDown,
  lucideChevronLeft,
  lucideCircleCheck,
  lucideLayers,
  lucideLibraryBig,
  lucideSearch,
  lucideTriangleAlert,
  lucideX,
} from '@ng-icons/lucide';
import { NotificationService } from '../../../../shared/notification/notification.service';
import { CollectionService } from '../../../../services/collection-service';
import { DeckService } from '../../../../services/deck-service';
import { CardPrint, ImportItem, ResolutionDto } from '../../../../models/collection.models';

/** Decisão do usuário sobre uma pendência. */
type Verdict = 'pending' | 'accepted' | 'discarded';

/**
 * Revisão antes de gravar. **Esta tela não é opcional**: nenhuma importação de
 * cem linhas acerta tudo, e gravar direto produz uma coleção suja que ninguém
 * limpa depois.
 *
 * O rótulo do botão conta o número real que vai ser gravado e muda conforme o
 * usuário resolve pendências. E o botão nunca é bloqueado por causa delas —
 * deixar quatro linhas de fora e seguir é melhor que travar a importação
 * inteira.
 */
@Component({
  selector: 'app-import-review',
  standalone: true,
  imports: [NgIcon, HlmIcon],
  providers: [
    provideIcons({
      lucideTriangleAlert,
      lucideCircleCheck,
      lucideChevronDown,
      lucideChevronLeft,
      lucideCheck,
      lucideX,
      lucideSearch,
      lucideLayers,
      lucideLibraryBig,
    }),
  ],
  templateUrl: './review.html',
  styleUrl: './review.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Review {
  resolutions = input.required<ResolutionDto[]>();
  destination = input.required<'deck' | 'collection'>();
  deckName = input<string | null>(null);

  back = output<void>();
  imported = output<void>();

  private collection = inject(CollectionService);
  private decks = inject(DeckService);
  private notify = inject(NotificationService);

  /** Veredito por número de linha — a linha crua é a identidade da pendência. */
  protected verdicts = signal<Record<number, Verdict>>({});

  /**
   * Palpite trocado pelo usuário, por linha. Fica em signal separado em vez de
   * mudar o objeto da resolução: input mutado não redesenha nada num componente
   * OnPush, e o total do rodapé sairia errado.
   */
  protected overrides = signal<Record<number, CardPrint>>({});
  protected readyOpen = signal(false);
  protected saving = signal(false);

  protected ready = computed(() => this.resolutions().filter(item => item.status === 'ready'));

  /** Pendências ainda sem decisão: as que "precisam de você". */
  protected pending = computed(() =>
    this.resolutions().filter(
      item => item.status !== 'ready' && this.verdictOf(item.line) === 'pending',
    ),
  );

  protected accepted = computed(() =>
    this.resolutions().filter(
      item => item.status !== 'ready' && this.verdictOf(item.line) === 'accepted',
    ),
  );

  /** Tudo que vai ser gravado: o reconhecido mais o que o usuário confirmou. */
  protected included = computed(() => [...this.ready(), ...this.accepted()]);

  protected totalLines = computed(() => this.resolutions().length);
  protected recognized = computed(() => this.included().length);

  protected cardCount = computed(() =>
    this.included().reduce((sum, item) => sum + item.quantity, 0),
  );

  protected pendingCount = computed(() => this.pending().length);

  /**
   * "62 já na sua coleção" — é a informação de maior valor da tela: responde
   * "esse deck cabe no que eu tenho" antes mesmo de gravar.
   */
  protected alreadyOwned = computed(() => {
    const owned = this.collection.ownedByOracle();
    return this.included().filter(item => (owned.get(this.matchOf(item)?.oracleId ?? '') ?? 0) > 0)
      .length;
  });

  /** O palpite em vigor: o do servidor, ou o que o usuário escolheu no lugar. */
  protected matchOf(item: ResolutionDto): CardPrint | null {
    return this.overrides()[item.line] ?? item.match;
  }

  /** Alternativas menos a que já está em vigor. */
  protected alternativesOf(item: ResolutionDto): CardPrint[] {
    const current = this.matchOf(item);
    return item.alternatives.filter(option => option.scryfallId !== current?.scryfallId);
  }

  protected percent = computed(() => {
    const total = this.totalLines();
    return total === 0 ? 0 : Math.round((this.recognized() / total) * 100);
  });

  protected actionLabel = computed(() => {
    const cards = this.cardCount();
    const plural = cards === 1 ? 'carta' : 'cartas';

    return this.destination() === 'deck'
      ? `Criar deck com ${cards} ${plural}`
      : `Somar ${cards} ${plural} à coleção`;
  });

  protected verdictOf(line: number): Verdict {
    return this.verdicts()[line] ?? 'pending';
  }

  protected accept(item: ResolutionDto): void {
    if (!this.matchOf(item)) return;
    this.verdicts.update(current => ({ ...current, [item.line]: 'accepted' }));
  }

  protected discard(item: ResolutionDto): void {
    this.verdicts.update(current => ({ ...current, [item.line]: 'discarded' }));
  }

  /**
   * Palpite ambíguo com alternativas: trocar por outra opção é confirmar essa
   * outra. A troca acontece na própria pendência, sem sair da tela.
   */
  protected chooseAlternative(item: ResolutionDto, alternative: CardPrint): void {
    this.overrides.update(current => ({ ...current, [item.line]: alternative }));
    this.verdicts.update(current => ({ ...current, [item.line]: 'accepted' }));
  }

  protected save(): void {
    const items = this.toItems();

    if (items.length === 0 || this.saving()) return;

    this.saving.set(true);
    this.collection
      .importList({
        destination: this.destination(),
        ...(this.deckName() ? { deckName: this.deckName()! } : {}),
        items,
      })
      .subscribe({
        next: result => {
          this.saving.set(false);

          if (result.deck) {
            this.decks.put(result.deck);
            this.notify.success(`${result.deck.name}: ${result.deck.totalCards} cartas no deck.`);
          } else {
            this.notify.success(`${this.cardCount()} cartas somadas à coleção.`);
          }

          this.imported.emit();
        },
        error: error => {
          this.saving.set(false);
          this.notify.apiError(error, { fallback: 'Não consegui gravar essa importação.' });
        },
      });
  }

  private toItems(): ImportItem[] {
    return this.included()
      .filter(item => this.matchOf(item) !== null)
      .map(item => ({
        scryfallId: this.matchOf(item)!.scryfallId,
        quantity: item.quantity,
        foil: item.foil,
        // Sideboard e maybeboard viram seção do deck; na coleção a seção não
        // muda nada, e a carta entra igual.
        section: item.section,
      }));
  }
}
