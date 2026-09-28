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
import { lucideArrowRight, lucideLayers, lucideLibraryBig } from '@ng-icons/lucide';
import { BackButton } from '../../../shared/back-button/back-button';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ImportService } from '../../../services/import-service';
import { DeckDto, ParsedLine, ResolutionDto } from '../../../models/collection.models';
import { parseList } from './parse-list';
import { Review } from './review/review';
import { ListSource } from './list-source/list-source';

/**
 * Importar lista. Duas decisões nesta tela, nesta ordem:
 *
 * 1. **Para onde vai** — importar um deck do Archidekt e cadastrar cartas
 *    compradas são operações diferentes com o mesmo formato de entrada.
 *    Perguntar primeiro evita a pior falha possível da feature: cem cartas
 *    somadas à coleção por engano, sem desfazer óbvio.
 * 2. **De onde vem** — o campo de colar é o caminho principal, porque todo site
 *    exporta texto; o link é conveniência.
 *
 * Com `?deck=<id>` a tela é o "Adicionar lista" de um deck que já existe: o
 * destino está decidido, e a lista substitui a do deck.
 *
 * O botão do rodapé diz "Ler a lista", não "Importar": ler não grava nada. Quem
 * grava é a tela de revisão, depois de o usuário resolver as pendências.
 */
@Component({
  selector: 'app-collection-import',
  standalone: true,
  imports: [NgIcon, HlmIcon, BackButton, Review, ListSource],
  providers: [provideIcons({ lucideLayers, lucideLibraryBig, lucideArrowRight })],
  templateUrl: './import.html',
  styleUrl: './import.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionImport implements OnInit {
  private importService = inject(ImportService);
  private notify = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected destination = signal<'deck' | 'collection'>('deck');
  protected text = signal('');
  protected reading = signal(false);

  /** Deck que recebe a lista, quando a tela é o "Adicionar lista". */
  protected deckId = signal<string | null>(null);

  /** Nome do deck vindo da fonte externa, quando ela informa. */
  protected deckName = signal<string | null>(null);

  /** Resultado da leitura: presente = a tela virou revisão. */
  protected resolutions = signal<ResolutionDto[] | null>(null);

  protected parsed = computed<ParsedLine[]>(() => parseList(this.text()));

  protected destinationHint = computed(() =>
    this.destination() === 'deck'
      ? 'Vira um deck e marca o que você já tem. Nada é somado à coleção.'
      : 'Soma as quantidades à sua coleção. Não cria deck nenhum.',
  );

  protected canRead = computed(() => this.parsed().length > 0 && !this.reading());

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const deck = params.get('deck');

    if (deck) {
      this.deckId.set(deck);
      this.destination.set('deck');
      return;
    }

    const destination = params.get('destino');
    if (destination === 'collection' || destination === 'deck') this.destination.set(destination);
  }

  protected setDestination(destination: 'deck' | 'collection'): void {
    this.destination.set(destination);
  }

  /** Lê a lista: resolve as linhas na Scryfall e passa para a revisão. */
  protected read(): void {
    const lines = this.parsed();
    if (lines.length === 0 || this.reading()) return;

    this.reading.set(true);
    this.importService.resolveLines(lines).subscribe({
      next: resolutions => {
        this.reading.set(false);
        this.resolutions.set(resolutions);
      },
      error: error => {
        this.reading.set(false);
        this.notify.apiError(error, { fallback: 'Não consegui ler essa lista.' });
      },
    });
  }

  /** Voltar da revisão para a lista, sem perder o texto. */
  protected backToList(): void {
    this.resolutions.set(null);
  }

  /** A lista de um deck que já existia volta para o deck; o resto, para a coleção. */
  protected onImported(deck: DeckDto | null): void {
    const target = this.deckId();
    if (target) {
      this.router.navigate(['/decks', deck?.id ?? target], { replaceUrl: true });
      return;
    }

    this.router.navigate(['/colecao']);
  }
}
