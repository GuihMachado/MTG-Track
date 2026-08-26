import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import {
  lucideChevronRight,
  lucideLibraryBig,
  lucideScrollText,
  lucideSearch,
  lucideSparkles,
  lucideX,
} from '@ng-icons/lucide';
import { CollectionFilters } from '../../../models/collection.models';
import {
  FilterChip,
  chipsOfAxis,
  fold,
  isChipOn,
} from '../collection-filters';

/** Acima disso a nuvem de habilidades ganha campo de busca e altura máxima. */
const KEYWORD_SEARCH_FROM = 10;

/**
 * Modal de filtros da coleção.
 *
 * Antes os eixos abriam como uma fileira de chips *dentro* da tela, e ela
 * roubava altura da lista justamente quando havia mais filtros para mostrar.
 * Agora tudo mora aqui, em seções nomeadas, e a tela da coleção fica com três
 * controles: busca, este botão e a troca de vista.
 *
 * O rodapé é preso e diz quantas cartas a combinação atual devolve — dá para
 * ajustar e ver o efeito antes de fechar, sem o vai-e-volta de fechar, olhar e
 * reabrir.
 */
@Component({
  selector: 'app-filters-sheet',
  standalone: true,
  imports: [NgIcon, HlmIcon],
  providers: [
    provideIcons({
      lucideSearch,
      lucideX,
      lucideChevronRight,
      lucideLibraryBig,
      lucideScrollText,
      lucideSparkles,
    }),
  ],
  templateUrl: './filters-sheet.html',
  styleUrl: './filters-sheet.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FiltersSheet {
  filters = input.required<CollectionFilters>();
  /** Habilidades da estante, da mais comum para a mais rara. */
  facets = input.required<{ keyword: string; count: number }[]>();
  /** Termo valendo como texto de regras; vazio quando a busca é por nome. */
  text = input('');
  /** Quantas cartas a combinação atual devolve — o rótulo do botão de fechar. */
  resultCount = input(0);
  activeCount = input(0);
  /** Rótulos das coleções marcadas, para a linha do eixo de edição. */
  setLabels = input<string[]>([]);
  /** Quantas coleções existem na estante; 0 desabilita a linha. */
  setsAvailable = input(0);

  chipToggled = output<FilterChip>();
  keywordToggled = output<string>();
  textChanged = output<string>();
  setsRequested = output<void>();
  cleared = output<void>();
  closed = output<void>();

  protected keywordQuery = signal('');

  protected readonly colorChips = chipsOfAxis('color');
  protected readonly typeChips = chipsOfAxis('type');
  protected readonly foilChips = chipsOfAxis('foil');
  protected readonly languageChips = chipsOfAxis('language');

  protected searchableKeywords = computed(() => this.facets().length > KEYWORD_SEARCH_FROM);

  protected visibleFacets = computed(() => {
    const needle = fold(this.keywordQuery());
    if (!needle) return this.facets();
    return this.facets().filter(facet => fold(facet.keyword).includes(needle));
  });

  protected setsLine = computed(() => {
    const labels = this.setLabels();
    if (labels.length === 0) {
      const total = this.setsAvailable();
      return `nenhuma marcada · ${total} na estante`;
    }
    if (labels.length <= 2) return labels.join(' · ');
    return `${labels.slice(0, 2).join(' · ')} +${labels.length - 2}`;
  });

  protected on(chip: FilterChip): boolean {
    return isChipOn(chip, this.filters());
  }

  protected keywordOn(keyword: string): boolean {
    return this.filters().keywords.includes(keyword);
  }

  protected close(): void {
    this.closed.emit();
  }
}
