import { Component, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import {
  lucideBookmark,
  lucideCheck,
  lucideChevronLeft,
  lucideCopy,
  lucidePlus,
  lucideRefreshCw,
  lucideSearch,
  lucideX,
} from '@ng-icons/lucide';
import { CardService } from '../../services/card-service';
import { ScryfallService } from '../../services/scryfall-service';
import { ProxyListService } from '../../services/proxy-list-service';
import { ManaSymbolPipe } from '../../shared/pipes/mana-symbol-pipe';
import { NotificationService } from '../../shared/notification/notification.service';
import { CardDto, CardFaceDto } from '../../models/card.models';
import { extractImageUris, ScryfallCard } from '../../models/proxy.models';
import { manaRgbVar } from '../../shared/match-utils';
import { describeManaCost, parseOracleLines } from './oracle-blocks';

/** Mínimo de letras para buscar — abaixo disso a Scryfall devolve o mundo. */
const MIN_QUERY = 3;
/** Resultados listados; a busca da mesa é por nome, não catálogo. */
const MAX_RESULTS = 12;
/** O idioma escolhido acompanha a sessão: quem lê em PT quer PT na próxima. */
const LANGUAGE_KEY = 'card-language';

type CardLanguage = 'pt' | 'en';

@Component({
  selector: 'app-cards',
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmIconImports,
    HlmInputImports,
    HlmSkeletonImports,
    ManaSymbolPipe
  ],
  providers: [
    provideIcons({
      lucideSearch,
      lucideChevronLeft,
      lucideCopy,
      lucideBookmark,
      lucideRefreshCw,
      lucidePlus,
      lucideCheck,
      lucideX,
    }),
  ],
  templateUrl: './cards.html',
  styleUrl: './cards.css',
})
export class Cards {
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private cardService = inject(CardService);
  private scryfall = inject(ScryfallService);
  private proxyList = inject(ProxyListService);
  private notify = inject(NotificationService);

  protected query = new FormControl('', { nonNullable: true });

  protected results = signal<ScryfallCard[]>([]);
  protected searching = signal(false);
  protected loadingCard = signal(false);
  /** Carta aberta em detalhe; null mostra a busca. */
  protected card = signal<CardDto | null>(null);
  /** A carta como veio da Scryfall — é o que a lista de proxies aceita. */
  private chosen = signal<ScryfallCard | null>(null);

  protected activeFaceIndex = signal(0);
  protected language = signal<CardLanguage>(this.storedLanguage());
  protected fullscreen = signal(false);
  /** Tradução sob demanda em voo — a aba PT espera sem apagar a carta. */
  protected translating = signal(false);

  /** Descarta resposta de busca já superada por uma digitação mais nova. */
  private searchSeq = 0;

  protected faces = computed(() => {
    const card = this.card();
    if (!card) return [];
    return this.language() === 'en' ? card.facesEn : card.faces;
  });

  protected face = computed<CardFaceDto | null>(
    () => this.faces()[this.activeFaceIndex()] ?? null,
  );

  /** Nome da face frontal — é o que o verso cita em "verso de …". */
  protected frontName = computed(() => this.card()?.faces[0]?.name ?? '');

  /** Nomes das abas de face — sempre no idioma que está sendo lido. */
  protected faceTabs = computed(() => this.faces().map(face => face.name));

  protected blocks = computed(() => parseOracleLines(this.face()?.oracleLines ?? []));

  /** Só a face frontal traz coleção e artista; a de trás diz de quem é o verso. */
  protected isBackFace = computed(() => this.activeFaceIndex() > 0);

  protected artUrl = computed(() => {
    const card = this.card();
    if (!card) return null;
    return this.face()?.artCropUrl ?? card.artCropUrl;
  });

  protected printUrl = computed(() => {
    const card = this.card();
    if (!card) return null;
    return this.face()?.imageUrl ?? card.imageUrl;
  });

  /** Brilho ambiente na identidade de cor da face (só no verso, como no design). */
  protected faceRgb = computed(() => manaRgbVar(this.face()?.colors?.join('/')));

  /** O payload atual tem texto em português (impressão PT ou já traduzido). */
  protected hasPortuguese = computed(() => this.card()?.language === 'pt');

  protected inProxyList = computed(() => {
    const name = this.card()?.englishName?.trim().toLowerCase();
    if (!name) return false;
    return this.proxyList.list().some(item => item.name.trim().toLowerCase() === name);
  });

  /**
   * O rótulo já avisa o que a aba vai fazer: carta sem impressão PT ganha
   * "(auto)" antes mesmo de traduzir, porque tocá-la dispara o DeepL.
   */
  protected ptLabel = computed(() => {
    if (this.translating()) return 'traduzindo…';
    const card = this.card();
    return card && (card.translated || card.language === 'en') ? 'Português (auto)' : 'Português';
  });

  constructor() {
    this.query.valueChanges
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(term => this.runSearch(term));

    // Carta nova sempre começa pela face frontal — e a aba acompanha o que o
    // payload tem: carta que chegou em inglês (sem impressão PT, ainda não
    // traduzida) abre na aba English, senão a aba PT mostraria texto inglês.
    effect(() => {
      const card = this.card();
      this.activeFaceIndex.set(0);
      if (card && card.language === 'en' && !card.translated) this.language.set('en');
    });

    // Aberta por link (a coleção manda para cá): ?carta=Sol+Ring cai direto no
    // detalhe, sem obrigar a digitar de novo um nome que a outra tela já sabia.
    const preset = this.route.snapshot.queryParamMap.get('carta');
    if (preset && isPlatformBrowser(this.platformId)) {
      // Sem emitir: o valueChanges dispararia a busca e a lista de resultados
      // ficaria carregando atrás do detalhe, à toa.
      this.query.setValue(preset, { emitEvent: false });
      this.loadByName(preset);
      this.fetchChosen(preset);
    }
  }

  protected costLabel(cost: string | null): string {
    return describeManaCost(cost ?? '');
  }

  protected artOf(card: ScryfallCard): string | undefined {
    return extractImageUris(card)?.small;
  }

  protected typeOf(card: ScryfallCard): string {
    return card.type_line ?? card.card_faces?.[0]?.type_line ?? '';
  }

  /** Abre o detalhe: a tradução só roda para a carta escolhida. */
  protected open(card: ScryfallCard): void {
    this.chosen.set(card);
    this.loadByName(card.name);
  }

  private loadByName(name: string): void {
    this.loadingCard.set(true);
    this.card.set(null);
    this.fullscreen.set(false);

    this.cardService.getCard(name).subscribe({
      next: found => {
        this.card.set(found);
        this.loadingCard.set(false);
      },
      error: (error: unknown) => {
        this.loadingCard.set(false);
        this.chosen.set(null);

        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.notify.warning(`Nenhum texto encontrado para "${name}".`);
          return;
        }
        this.notify.apiError(error, { fallback: 'Não foi possível abrir essa carta agora.' });
      },
    });
  }

  /**
   * A carta crua da Scryfall, que o botão de proxies exige — quem entra pela
   * busca já a tem, quem entra por link não. Melhor esforço: sem ela o detalhe
   * funciona igual, só o salvar-como-proxy fica mudo.
   */
  private fetchChosen(name: string): void {
    this.scryfall.search(`!"${name}"`).subscribe({
      next: page => {
        if (!this.chosen()) this.chosen.set(page.data[0] ?? null);
      },
      error: () => undefined,
    });
  }

  /** Fecha o detalhe e volta para a lista de resultados. */
  protected close(): void {
    this.card.set(null);
    this.chosen.set(null);
    this.fullscreen.set(false);
  }

  protected setLanguage(language: CardLanguage): void {
    // Pedir português para uma carta que veio em inglês é o gatilho do DeepL:
    // a tradução só acontece aqui, no toque — nunca na abertura da carta.
    if (language === 'pt' && !this.hasPortuguese()) {
      this.translatePt();
      return;
    }

    this.language.set(language);
    this.remember(language);
  }

  /** Busca a mesma carta com a tradução ligada, sem apagar a que está na tela. */
  private translatePt(): void {
    const card = this.card();
    if (!card || this.translating()) return;

    this.translating.set(true);
    this.cardService.getCard(card.englishName, true).subscribe({
      next: found => {
        this.translating.set(false);

        // O backend cai para inglês quando o DeepL está fora: avisa em vez de
        // fingir que a aba PT mostrou português.
        if (found.language !== 'pt') {
          this.notify.warning('A tradução automática está indisponível agora.');
          return;
        }

        this.card.set(found);
        this.language.set('pt');
        this.remember('pt');
      },
      error: (error: unknown) => {
        this.translating.set(false);
        this.notify.apiError(error, { fallback: 'Não foi possível traduzir agora.' });
      },
    });
  }

  private remember(language: CardLanguage): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(LANGUAGE_KEY, language);
    }
  }

  protected setFace(index: number): void {
    this.activeFaceIndex.set(index);
  }

  protected toggleProxy(): void {
    const card = this.chosen();
    if (!card) return;

    if (this.inProxyList()) {
      this.notify.info('Essa carta já está na lista de proxies.');
      return;
    }

    this.proxyList.addFromScryfall(card);
    this.notify.success('Carta adicionada à lista de proxies.');
  }

  /** Copia o texto da face que está à mostra, no idioma que está à mostra. */
  protected async copyText(): Promise<void> {
    const face = this.face();
    if (!face) return;

    const lines = [face.name, face.typeLine, '', ...face.oracleLines];
    if (face.power && face.toughness) lines.push('', `${face.power}/${face.toughness}`);

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      this.notify.success('Texto da carta copiado.');
    } catch {
      this.notify.warning('O navegador não liberou a área de transferência.');
    }
  }

  private runSearch(term: string): void {
    const query = term.trim();
    const seq = ++this.searchSeq;

    if (query.length < MIN_QUERY) {
      this.results.set([]);
      this.searching.set(false);
      return;
    }

    this.searching.set(true);
    this.scryfall.search(query).subscribe({
      next: page => {
        if (seq !== this.searchSeq) return;
        this.results.set(page.data.slice(0, MAX_RESULTS));
        this.searching.set(false);
      },
      error: (error: unknown) => {
        if (seq !== this.searchSeq) return;
        this.results.set([]);
        this.searching.set(false);

        // 404 da Scryfall é "nenhuma carta com esse nome", não falha de rede.
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.notify.warning(`Nenhuma carta encontrada para "${query}".`);
          return;
        }
        this.notify.apiError(error, { fallback: 'Não foi possível buscar na Scryfall agora.' });
      },
    });
  }

  private storedLanguage(): CardLanguage {
    // Inglês é o padrão: é o texto que sempre existe e não custa tradução.
    if (!isPlatformBrowser(this.platformId)) return 'en';
    return sessionStorage.getItem(LANGUAGE_KEY) === 'pt' ? 'pt' : 'en';
  }
}
