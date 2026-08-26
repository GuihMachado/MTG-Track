import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import {
  lucideCheck,
  lucideChevronDown,
  lucideCirclePlus,
  lucideExpand,
  lucideLoader,
  lucideMinus,
  lucidePlus,
  lucideSearch,
  lucideSparkles,
  lucideTrash2,
  lucideX,
} from '@ng-icons/lucide';
import { ManaSymbolPipe } from '../../../shared/pipes/mana-symbol-pipe';
import { NotificationService } from '../../../shared/notification/notification.service';
import { CollectionService } from '../../../services/collection-service';
import { ImportService } from '../../../services/import-service';
import { ScryfallService } from '../../../services/scryfall-service';
import { extractImageUris, ScryfallCard } from '../../../models/proxy.models';
import { CardPrint, CollectionEntryDto } from '../../../models/collection.models';
import { formatUsd, usd } from '../money';

type LanguageChoice = 'pt' | 'en' | 'other';

const LANGUAGE_KEY = 'collection-language';
const SEARCH_DEBOUNCE_MS = 350;
const MAX_SUGGESTIONS = 12;

/**
 * Folha inferior de adicionar carta — e de editar uma entrada que já existe.
 *
 * Um componente e não dois porque as duas telas mostram a mesma carta com os
 * mesmos campos; o que muda é o que se pode alterar. Ao editar, a impressão está
 * decidida (foi ela que virou a linha da coleção), então edição, idioma e foil
 * ficam como informação e só a quantidade se move.
 *
 * O segundo botão ("adicionar e continuar") é o que torna a entrada manual
 * viável em escala: cadastrar 40 cartas com 40 idas e voltas é o que faz o
 * usuário desistir. Ele grava, mantém edição e idioma, limpa o resto e devolve
 * o foco à busca.
 */
@Component({
  selector: 'app-add-card',
  standalone: true,
  imports: [NgIcon, HlmIcon, ManaSymbolPipe],
  providers: [
    provideIcons({
      lucideSearch,
      lucideChevronDown,
      lucideCheck,
      lucideCirclePlus,
      lucideExpand,
      lucideMinus,
      lucidePlus,
      lucideTrash2,
      lucideSparkles,
      lucideX,
      lucideLoader,
    }),
  ],
  templateUrl: './add-card.html',
  styleUrl: './add-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddCard {
  /** Entrada em edição; null abre a folha no modo de busca. */
  editing = input<CollectionEntryDto | null>(null);

  /**
   * Nome da carta já escolhida — é assim que o fichário abre a folha: o slot
   * vazio sabe qual carta falta, e digitar o nome de novo seria pedir ao
   * usuário um trabalho que a tela já fez.
   */
  presetName = input<string | null>(null);

  closed = output<void>();
  /** Gravou algo — a tela de coleção usa para reavaliar os decks. */
  changed = output<void>();

  private scryfall = inject(ScryfallService);
  private importService = inject(ImportService);
  private collection = inject(CollectionService);
  private notify = inject(NotificationService);
  private injector = inject(Injector);
  private router = inject(Router);

  private searchInput = viewChild<ElementRef<HTMLInputElement>>('searchField');

  protected query = signal('');
  protected results = signal<ScryfallCard[]>([]);
  protected searching = signal(false);

  /** Impressões da carta escolhida, com preço em cada uma. */
  protected prints = signal<CardPrint[]>([]);
  protected loadingPrints = signal(false);
  protected print = signal<CardPrint | null>(null);
  protected printsOpen = signal(false);

  protected quantity = signal(1);
  protected foil = signal(false);
  protected language = signal<LanguageChoice>(this.storedLanguage());
  protected saving = signal(false);

  private searchSeq = 0;
  private debounce?: ReturnType<typeof setTimeout>;

  constructor() {
    // Modo de edição: a carta já está escolhida, a folha abre no formulário.
    effect(() => {
      const entry = this.editing();
      if (!entry) return;

      this.quantity.set(entry.quantity);
      this.foil.set(entry.foil);
      this.print.set(this.printFromEntry(entry));
    });

    // Aberta a partir de um slot do fichário: a busca já sai resolvida, e o
    // que resta ao usuário é a impressão, o idioma e a quantidade.
    effect(() => {
      const name = this.presetName();
      if (!name || this.editing()) return;

      this.query.set(name);
      this.loadPrints(name);
    });
  }

  protected readonly imagesOf = extractImageUris;

  protected isEditing = computed(() => this.editing() !== null);

  /** Impressões no idioma escolhido — o seletor de edição lista só estas. */
  protected visiblePrints = computed(() => {
    const choice = this.language();
    const prints = this.prints();

    if (choice === 'other') return prints;
    return prints.filter(item => item.language === choice);
  });

  protected cheapest = computed(() => {
    const priced = this.visiblePrints().filter(item => item.priceUsd !== null);
    if (priced.length === 0) return null;
    return priced.reduce((best, item) => (item.priceUsd! < best.priceUsd! ? item : best));
  });

  /** "14 impressões · a mais barata sai US$ 74" — a ajuda abaixo do campo. */
  protected printsHint = computed(() => {
    const count = this.visiblePrints().length;
    if (count === 0) return 'nenhuma impressão nesse idioma';

    const label = count === 1 ? '1 impressão' : `${count} impressões`;
    const cheapest = this.cheapest();

    // Sem nenhuma impressão com preço, a ajuda só conta quantas existem: dizer
    // "a mais barata sai —" não ajuda ninguém.
    return cheapest ? `${label} · a mais barata sai ${usd(cheapest.priceUsd)}` : label;
  });

  protected priceNow = computed(() => {
    const print = this.print();
    if (!print) return null;
    return this.foil() ? print.priceUsdFoil : print.priceUsd;
  });

  /** "US$ 210 → US$ 340". Escondido quando a Scryfall não tem preço de foil. */
  protected foilDelta = computed(() => {
    const print = this.print();
    if (!print || print.priceUsd === null || print.priceUsdFoil === null) return null;
    return `${usd(print.priceUsd)} → ${usd(print.priceUsdFoil)}`;
  });

  protected canSave = computed(() => this.print() !== null && !this.saving());

  protected onSearch(term: string): void {
    this.query.set(term);
    clearTimeout(this.debounce);
    this.debounce = setTimeout(() => this.runSearch(term), SEARCH_DEBOUNCE_MS);
  }

  private runSearch(term: string): void {
    const query = term.trim();
    const seq = ++this.searchSeq;

    if (query.length < 3) {
      this.results.set([]);
      this.searching.set(false);
      return;
    }

    this.searching.set(true);
    this.scryfall.search(query).subscribe({
      next: page => {
        if (seq !== this.searchSeq) return;

        if (page.data.length === 0) {
          this.searchTranslated(query, seq);
          return;
        }

        this.results.set(page.data.slice(0, MAX_SUGGESTIONS));
        this.searching.set(false);
      },
      error: (error: unknown) => {
        if (seq !== this.searchSeq) return;

        // 404 é "nenhuma carta com esse nome" na busca em inglês — e o nome
        // pode estar em português, que é o caso comum aqui.
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.searchTranslated(query, seq);
          return;
        }

        this.results.set([]);
        this.searching.set(false);
        this.notify.apiError(error, { fallback: 'Não foi possível buscar na Scryfall agora.' });
      },
    });
  }

  /**
   * Segunda tentativa, com o nome impresso: a busca da Scryfall só olha o nome
   * em inglês até receber `include:multilingual`. Sem esta passada, "Anel Solar"
   * não acha nada — e é assim que a carta se chama na mão do usuário.
   *
   * Não é a primeira tentativa porque ela devolve a impressão de qualquer
   * idioma como representante; para um nome em inglês, a busca canônica dá o
   * resultado melhor.
   */
  private searchTranslated(query: string, seq: number): void {
    this.scryfall.search(`${query} include:multilingual`).subscribe({
      next: page => {
        if (seq !== this.searchSeq) return;
        this.results.set(page.data.slice(0, MAX_SUGGESTIONS));
        this.searching.set(false);
      },
      error: (error: unknown) => {
        if (seq !== this.searchSeq) return;
        this.results.set([]);
        this.searching.set(false);
        if (error instanceof HttpErrorResponse && error.status === 404) return;
        this.notify.apiError(error, { fallback: 'Não foi possível buscar na Scryfall agora.' });
      },
    });
  }

  protected choose(card: ScryfallCard): void {
    this.results.set([]);
    this.query.set(card.name);
    this.loadPrints(card.name);
  }

  private loadPrints(name: string): void {
    this.loadingPrints.set(true);
    this.print.set(null);

    this.importService.prints(name, this.language() === 'other').subscribe({
      next: prints => {
        this.prints.set(prints);
        this.loadingPrints.set(false);
        this.print.set(this.preferred(prints));
      },
      error: error => {
        this.prints.set([]);
        this.loadingPrints.set(false);
        this.notify.apiError(error, { fallback: 'Não achei as impressões dessa carta.' });
      },
    });
  }

  /**
   * Pré-seleção: a impressão mais recente em português; sem português, a mais
   * barata. A escolha de edição é quase sempre uma escolha de preço.
   */
  private preferred(prints: CardPrint[]): CardPrint | null {
    if (prints.length === 0) return null;

    const wanted = this.language();
    const inLanguage = wanted === 'other' ? prints : prints.filter(item => item.language === wanted);
    const pool = inLanguage.length > 0 ? inLanguage : prints;

    if (wanted === 'pt' && inLanguage.length > 0) return pool[0]!;

    const priced = pool.filter(item => item.priceUsd !== null);
    if (priced.length === 0) return pool[0]!;

    return priced.reduce((best, item) => (item.priceUsd! < best.priceUsd! ? item : best));
  }

  protected setLanguage(choice: LanguageChoice): void {
    if (this.isEditing() || this.language() === choice) return;

    this.language.set(choice);
    this.remember(choice);

    // "Outro" precisa da lista completa: o padrão do servidor traz só PT e EN.
    if (choice === 'other' && this.query().trim().length >= 3) {
      this.loadPrints(this.query().trim());
      return;
    }

    const next = this.preferred(this.prints());
    if (next) this.print.set(next);
  }

  protected selectPrint(print: CardPrint): void {
    this.print.set(print);
    this.printsOpen.set(false);

    // Impressão sem foil não pode ficar com o interruptor ligado por herança.
    if (!print.hasFoil) this.foil.set(false);
  }

  protected togglePrints(): void {
    if (this.isEditing() || this.visiblePrints().length === 0) return;
    this.printsOpen.update(open => !open);
  }

  protected step(delta: number): void {
    this.quantity.update(value => Math.max(1, Math.min(999, value + delta)));
  }

  protected toggleFoil(): void {
    const print = this.print();
    if (this.isEditing() || !print?.hasFoil) return;
    this.foil.update(value => !value);
  }

  /** Grava e fecha. */
  protected save(): void {
    this.persist(() => this.closed.emit());
  }

  /** Grava e volta para a busca, mantendo edição e idioma escolhidos. */
  protected saveAndContinue(): void {
    this.persist(() => {
      this.query.set('');
      this.results.set([]);
      this.prints.set([]);
      this.print.set(null);
      this.quantity.set(1);
      this.foil.set(false);

      // O campo de busca não existe ainda: a folha só troca do passo 2 para o
      // passo 1 quando o Angular renderizar o `print()` zerado acima, e até lá
      // o viewChild é undefined — focar aqui seria um no-op silencioso.
      afterNextRender(() => this.searchInput()?.nativeElement.focus(), {
        injector: this.injector,
      });
    });
  }

  private persist(afterSave: () => void): void {
    const entry = this.editing();
    const print = this.print();

    if (this.saving()) return;

    if (entry) {
      this.saving.set(true);
      this.collection.setQuantity(entry.id, this.quantity()).subscribe({
        next: () => {
          this.saving.set(false);
          this.notify.success(`${entry.name}: ${this.quantity()} na coleção.`);
          this.changed.emit();
          this.closed.emit();
        },
        error: error => {
          this.saving.set(false);
          this.notify.apiError(error, { fallback: 'Não foi possível salvar a quantidade.' });
        },
      });
      return;
    }

    if (!print) return;

    this.saving.set(true);
    this.collection.add(print.scryfallId, this.quantity(), this.foil()).subscribe({
      next: saved => {
        this.saving.set(false);
        this.notify.success(`${saved.name} na sua coleção.`);
        this.changed.emit();
        afterSave();
      },
      error: error => {
        this.saving.set(false);
        this.notify.apiError(error, { fallback: 'Não foi possível adicionar a carta.' });
      },
    });
  }

  protected remove(): void {
    const entry = this.editing();
    if (!entry || this.saving()) return;

    this.notify.confirm(
      `Tirar ${entry.name} da coleção?`,
      () => {
        this.saving.set(true);
        this.collection.remove(entry.id).subscribe({
          next: () => {
            this.saving.set(false);
            this.notify.success(`${entry.name} saiu da coleção.`);
            this.changed.emit();
            this.closed.emit();
          },
          error: error => {
            this.saving.set(false);
            this.notify.apiError(error, { fallback: 'Não foi possível remover a carta.' });
          },
        });
      },
      { confirmLabel: 'Tirar' },
    );
  }

  protected close(): void {
    this.closed.emit();
  }

  /**
   * A carta inteira, com o texto para ler: a tela de tradução já faz isso —
   * navegar para lá com o nome é reusar o modelo em vez de duplicá-lo. O nome
   * vai em inglês porque é a chave que a busca de texto daquela tela usa.
   */
  protected viewCard(): void {
    const print = this.print();
    if (!print) return;
    this.router.navigate(['/cards'], { queryParams: { carta: print.nameEn } });
  }

  /** Entrada já gravada vira uma "impressão" para o cabeçalho da folha. */
  private printFromEntry(entry: CollectionEntryDto): CardPrint {
    return {
      scryfallId: entry.scryfallId,
      oracleId: entry.oracleId,
      name: entry.name,
      nameEn: entry.nameEn,
      setCode: entry.setCode,
      setName: entry.setName,
      collectorNumber: entry.collectorNumber,
      language: entry.language,
      // O preço guardado na entrada já é o do acabamento dela: entrada foil
      // guarda o preço do foil. Colocá-lo no campo certo é o que faz o valor
      // aparecer no modo de edição em vez de um travessão.
      priceUsd: entry.foil ? null : entry.priceUsd,
      priceUsdFoil: entry.foil ? entry.priceUsd : null,
      artCropUrl: entry.artCropUrl,
      imageUrl: entry.imageUrl,
      setIconUrl: entry.setIconUrl,
      typeLine: entry.typeLine,
      colors: entry.colors,
      rarity: '',
      manaCost: null,
      releasedAt: null,
      hasFoil: entry.foil,
    };
  }

  protected priceLabel(value: number | null): string {
    return value === null ? '—' : `US$ ${formatUsd(value)}`;
  }

  private storedLanguage(): LanguageChoice {
    if (typeof localStorage === 'undefined') return 'pt';
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return stored === 'pt' || stored === 'en' || stored === 'other' ? stored : 'pt';
  }

  private remember(choice: LanguageChoice): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LANGUAGE_KEY, choice);
  }
}
