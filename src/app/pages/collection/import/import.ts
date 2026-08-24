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
import {
  lucideArrowRight,
  lucideCircleCheck,
  lucideClipboardPaste,
  lucideDownload,
  lucideLayers,
  lucideLibraryBig,
  lucideLink,
  lucideLoader,
} from '@ng-icons/lucide';
import { BackButton } from '../../../shared/back-button/back-button';
import { NotificationService } from '../../../shared/notification/notification.service';
import { ImportService } from '../../../services/import-service';
import { ImportSource, ParsedLine, ResolutionDto } from '../../../models/collection.models';
import { parseList, totalCards } from './parse-list';
import { Review } from './review/review';

/** As quatro fontes que o campo de link reconhece pelo domínio. */
const SOURCES: { id: ImportSource; label: string }[] = [
  { id: 'moxfield', label: 'Moxfield' },
  { id: 'archidekt', label: 'Archidekt' },
  { id: 'deckstats', label: 'Deckstats' },
  { id: 'tappedout', label: 'TappedOut' },
];

const PLACEHOLDER = `1 Sol Ring (C21) 263
1 Rhystic Study (JR)
1 Cyclonic Rift
1 Command Tower`;

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
 * O botão do rodapé diz "Ler a lista", não "Importar": ler não grava nada. Quem
 * grava é a tela de revisão, depois de o usuário resolver as pendências.
 */
@Component({
  selector: 'app-collection-import',
  standalone: true,
  imports: [NgIcon, HlmIcon, BackButton, Review],
  providers: [
    provideIcons({
      lucideLayers,
      lucideLibraryBig,
      lucideLink,
      lucideCircleCheck,
      lucideClipboardPaste,
      lucideDownload,
      lucideArrowRight,
      lucideLoader,
    }),
  ],
  templateUrl: './import.html',
  styleUrl: './import.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionImport implements OnInit {
  private importService = inject(ImportService);
  private notify = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  protected readonly sources = SOURCES;
  protected readonly placeholder = PLACEHOLDER;

  protected destination = signal<'deck' | 'collection'>('deck');
  protected url = signal('');
  protected text = signal('');
  protected fetching = signal(false);
  protected reading = signal(false);

  /** Nome do deck vindo da fonte externa, quando ela informa. */
  protected deckName = signal<string | null>(null);

  /** Resultado da leitura: presente = a tela virou revisão. */
  protected resolutions = signal<ResolutionDto[] | null>(null);

  protected source = computed(() => this.importService.detectSource(this.url()));

  protected parsed = computed<ParsedLine[]>(() => parseList(this.text()));
  protected lineCount = computed(() => this.parsed().length);
  protected cardCount = computed(() => totalCards(this.parsed()));

  protected destinationHint = computed(() =>
    this.destination() === 'deck'
      ? 'Vira um deck e marca o que você já tem. Nada é somado à coleção.'
      : 'Soma as quantidades à sua coleção. Não cria deck nenhum.',
  );

  /** Domínio conhecido mas sem API aberta: dizer isso é melhor que fingir. */
  protected urlWarning = computed(() => {
    const url = this.url().trim();
    if (!url) return null;

    if (this.source() === null) {
      return 'Não conheço esse site. Cole a lista em texto que eu leio.';
    }

    if (this.source() === 'moxfield') {
      return 'O Moxfield não libera a lista para outros aplicativos. Abra o deck, use Export e cole aqui.';
    }

    return null;
  });

  protected canRead = computed(() => this.lineCount() > 0 && !this.reading());

  ngOnInit(): void {
    const destination = this.route.snapshot.queryParamMap.get('destino');
    if (destination === 'collection' || destination === 'deck') this.destination.set(destination);
  }

  protected setDestination(destination: 'deck' | 'collection'): void {
    this.destination.set(destination);
  }

  /**
   * Busca a lista no site da fonte. O resultado cai no campo de colar, em texto:
   * a lista buscada fica visível e revisável, em vez de virar um deck que
   * ninguém viu.
   */
  protected fetchFromUrl(): void {
    const url = this.url().trim();
    if (!url || this.fetching()) return;

    this.fetching.set(true);
    this.importService.fromUrl(url).subscribe({
      next: fetched => {
        this.fetching.set(false);
        this.text.set(fetched.text);
        this.deckName.set(fetched.deckName);
        this.notify.success(`Lista do ${fetched.source} carregada. Confira antes de ler.`);
      },
      error: error => {
        this.fetching.set(false);
        this.notify.apiError(error, { fallback: 'Não consegui buscar esse deck.' });
      },
    });
  }

  protected async paste(): Promise<void> {
    try {
      const clipboard = await navigator.clipboard.readText();
      if (clipboard.trim()) this.text.set(clipboard);
    } catch {
      // Sem permissão de área de transferência (ou navegador sem suporte): o
      // campo continua editável, então o Ctrl+V à mão resolve.
      this.notify.warning('Seu navegador não deixou eu ler a área de transferência. Cole com Ctrl+V.');
    }
  }

  protected openFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    file
      .text()
      .then(content => this.text.set(content))
      .catch(() => this.notify.error('Não consegui ler esse arquivo.'));

    // Zera para o mesmo arquivo poder ser escolhido de novo.
    input.value = '';
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

  protected onImported(): void {
    this.router.navigate(['/colecao']);
  }
}
