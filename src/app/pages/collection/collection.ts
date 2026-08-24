import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import {
  lucideArrowUpDown,
  lucideCirclePlus,
  lucideDownload,
  lucideLayoutGrid,
  lucideLibraryBig,
  lucideList,
  lucidePlus,
  lucideSearch,
  lucideSlidersHorizontal,
  lucideX,
} from '@ng-icons/lucide';
import { BackButton } from '../../shared/back-button/back-button';
import { NotificationService } from '../../shared/notification/notification.service';
import { CollectionService } from '../../services/collection-service';
import { DeckService } from '../../services/deck-service';
import {
  CollectionEntryDto,
  CollectionFilters,
  CollectionSort,
  CollectionView,
  NO_FILTERS,
} from '../../models/collection.models';
import { activeFilterCount, applyCollectionView } from './collection-filters';
import { formatCount, formatTotal, formatUsd } from './money';
import { EntryRow } from './entry-row/entry-row';
import { EntryTile } from './entry-tile/entry-tile';
import { AddCard } from './add-card/add-card';
import { DeckRow } from './deck-row/deck-row';

const VIEW_KEY = 'collection-view';
const SORT_KEY = 'collection-sort';

/** Altura da linha da lista, em px — o virtual scroll precisa dela fixa. */
const ROW_SIZE = 69;

interface FilterChip {
  label: string;
  axis: 'color' | 'type' | 'foil' | 'language';
  value: string;
}

/**
 * Coleção pessoal. Responde três perguntas, nesta ordem: eu tenho essa carta,
 * esse deck cabe no que eu tenho, quanto isso vale.
 *
 * A lista é o padrão e a grade é alternativa: a lista mostra preço, idioma e
 * foil sem nenhum toque, que é exatamente a primeira e a terceira pergunta. A
 * grade é melhor só para folhear sem objetivo.
 *
 * `view` e `sort` ficam no localStorage; `query` e `filters` não — filtro que
 * sobrevive ao fechamento da tela faz o usuário achar que perdeu cartas.
 */
@Component({
  selector: 'app-collection',
  standalone: true,
  imports: [
    ScrollingModule,
    NgIcon,
    HlmIcon,
    HlmDropdownMenuImports,
    BackButton,
    EntryRow,
    EntryTile,
    DeckRow,
    AddCard,
  ],
  providers: [
    provideIcons({
      lucideSearch,
      lucideSlidersHorizontal,
      lucideLayoutGrid,
      lucideList,
      lucideArrowUpDown,
      lucidePlus,
      lucideX,
      lucideCirclePlus,
      lucideLibraryBig,
      lucideDownload,
    }),
  ],
  templateUrl: './collection.html',
  styleUrl: './collection.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Collection implements OnInit {
  private collection = inject(CollectionService);
  private decksService = inject(DeckService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly rowSize = ROW_SIZE;

  protected tab = signal<'cards' | 'decks'>('cards');
  protected view = signal<CollectionView>('list');
  protected sort = signal<CollectionSort>('name');
  protected query = signal('');
  protected filters = signal<CollectionFilters>(NO_FILTERS);
  protected filtersOpen = signal(false);

  /** Folha de adicionar/editar: null fechada, 'new' ou a entrada em edição. */
  protected sheet = signal<'new' | CollectionEntryDto | null>(null);

  protected entries = this.collection.entries;
  protected summary = this.collection.summary;
  protected loading = this.collection.loading;
  protected decks = this.decksService.decks;
  protected loadingDecks = this.decksService.loading;

  protected readonly sortLabels: Record<CollectionSort, string> = {
    name: 'Nome',
    price: 'Preço',
    quantity: 'Quantidade',
    recent: 'Adicionada por último',
  };

  protected readonly sortOptions: CollectionSort[] = ['name', 'price', 'quantity', 'recent'];

  /**
   * Eixos de filtro. Cor e tipo vêm gravados na entrada justamente para o
   * filtro não precisar de rede.
   */
  protected readonly chips: FilterChip[] = [
    { label: 'Branco', axis: 'color', value: 'W' },
    { label: 'Azul', axis: 'color', value: 'U' },
    { label: 'Preto', axis: 'color', value: 'B' },
    { label: 'Vermelho', axis: 'color', value: 'R' },
    { label: 'Verde', axis: 'color', value: 'G' },
    { label: 'Incolor', axis: 'color', value: 'C' },
    { label: 'Criatura', axis: 'type', value: 'criatura' },
    { label: 'Artefato', axis: 'type', value: 'artefato' },
    { label: 'Instantânea', axis: 'type', value: 'instant' },
    { label: 'Feitiço', axis: 'type', value: 'sorcery' },
    { label: 'Encantamento', axis: 'type', value: 'encantamento' },
    { label: 'Terreno', axis: 'type', value: 'terreno' },
    { label: 'Foil', axis: 'foil', value: 'true' },
    { label: 'PT-BR', axis: 'language', value: 'pt' },
    { label: 'EN', axis: 'language', value: 'en' },
  ];

  protected visible = computed(() =>
    applyCollectionView(this.entries(), this.query(), this.filters(), this.sort()),
  );

  protected activeFilters = computed(() => activeFilterCount(this.filters()));

  protected totalCards = computed(() => formatCount(this.summary().totalCards));
  protected uniqueCards = computed(() => formatCount(this.summary().uniqueCards));
  protected totalValue = computed(() => formatTotal(this.summary().totalValueUsd));

  protected mostValuable = computed(() => {
    const top = this.summary().mostValuable;
    return top ? `${top.name} · US$ ${formatUsd(top.priceUsd)}` : 'sem preço ainda';
  });

  /** Por que a lista está vazia muda o que a tela oferece como saída. */
  protected emptyReason = computed<'none' | 'query' | 'filters' | null>(() => {
    if (this.visible().length > 0) return null;
    if (this.entries().length === 0) return 'none';
    if (this.query().trim().length > 0) return 'query';
    if (this.activeFilters() > 0) return 'filters';
    return 'none';
  });

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.view.set(this.stored(VIEW_KEY, ['list', 'grid'], 'list') as CollectionView);
    this.sort.set(
      this.stored(SORT_KEY, ['name', 'price', 'quantity', 'recent'], 'name') as CollectionSort,
    );

    this.collection.load().subscribe({
      next: () => {
        // Os preços são do dia da consulta. Revalidar em segundo plano é o que
        // mantém o total honesto sem fazer a tela esperar por ele.
        this.collection.refreshPrices();
      },
      error: error =>
        this.notify.apiError(error, { fallback: 'Não foi possível carregar a coleção.' }),
    });

    this.decksService.load().subscribe({ error: () => undefined });
  }

  /** `cdkVirtualFor` recicla os nós: sem chave estável a linha troca de carta. */
  protected readonly trackById = (_: number, entry: CollectionEntryDto) => entry.id;

  protected setTab(tab: 'cards' | 'decks'): void {
    this.tab.set(tab);
  }

  protected toggleView(): void {
    this.view.update(current => (current === 'list' ? 'grid' : 'list'));
    this.remember(VIEW_KEY, this.view());
  }

  protected setSort(sort: CollectionSort): void {
    this.sort.set(sort);
    this.remember(SORT_KEY, sort);
  }

  protected isChipOn(chip: FilterChip): boolean {
    const filters = this.filters();

    switch (chip.axis) {
      case 'color':
        return filters.colors.includes(chip.value);
      case 'type':
        return filters.types.includes(chip.value);
      case 'foil':
        return filters.foil === true;
      case 'language':
        return filters.language === chip.value;
    }
  }

  protected toggleChip(chip: FilterChip): void {
    this.filters.update(filters => {
      switch (chip.axis) {
        case 'color':
          return { ...filters, colors: toggle(filters.colors, chip.value) };
        case 'type':
          return { ...filters, types: toggle(filters.types, chip.value) };
        case 'foil':
          return { ...filters, foil: filters.foil === true ? null : true };
        case 'language':
          return { ...filters, language: filters.language === chip.value ? null : chip.value };
      }
    });
  }

  protected clearFilters(): void {
    this.filters.set(NO_FILTERS);
  }

  protected clearQuery(): void {
    this.query.set('');
  }

  protected openAdd(): void {
    this.sheet.set('new');
  }

  protected openEdit(entry: CollectionEntryDto): void {
    this.sheet.set(entry);
  }

  protected closeSheet(): void {
    this.sheet.set(null);
  }

  /** A coleção mudou, então o "quanto falta" de cada deck mudou junto. */
  protected onCollectionChanged(): void {
    this.decksService.load().subscribe({ error: () => undefined });
  }

  protected editingEntry(): CollectionEntryDto | null {
    const state = this.sheet();
    return state === 'new' || state === null ? null : state;
  }

  protected goToImport(destination: 'collection' | 'deck' = 'collection'): void {
    this.router.navigate(['/colecao/importar'], { queryParams: { destino: destination } });
  }

  protected openDeck(id: string): void {
    this.router.navigate(['/decks', id]);
  }

  /** Busca sem resultado oferece a Scryfall: é a ponte para adicionar. */
  protected searchOnScryfall(): void {
    this.sheet.set('new');
  }

  private stored(key: string, allowed: string[], fallback: string): string {
    const value = localStorage.getItem(key);
    return value && allowed.includes(value) ? value : fallback;
  }

  private remember(key: string, value: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem(key, value);
  }
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}
