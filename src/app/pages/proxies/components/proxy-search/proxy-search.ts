import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucidePlus, lucideSearch, lucideX } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { NotificationService } from '../../../../shared/notification/notification.service';
import { ScryfallService } from '../../../../services/scryfall-service';
import { extractImageUris, ScryfallCard } from '../../../../models/proxy.models';
import { CardPreviewDialog } from '../../../../shared/card-preview-dialog/card-preview-dialog';

/* O item "todas/todos" precisa de um valor real: o hlm-select só mostra o
   rótulo do que está selecionado, e string vazia ele lê como nada escolhido
   (cairia no placeholder). A busca traduz ALL de volta para "sem filtro". */
const ALL = 'all';

const COLOR_FILTERS = [
  { value: ALL, label: 'Todas as cores' },
  { value: 'w', label: 'Branco' },
  { value: 'u', label: 'Azul' },
  { value: 'b', label: 'Preto' },
  { value: 'r', label: 'Vermelho' },
  { value: 'g', label: 'Verde' },
  { value: 'c', label: 'Incolor' },
] as const;

const TYPE_FILTERS = [
  { value: ALL, label: 'Todos os tipos' },
  { value: 'creature', label: 'Criatura' },
  { value: 'instant', label: 'Mágica instantânea' },
  { value: 'sorcery', label: 'Feitiço' },
  { value: 'artifact', label: 'Artefato' },
  { value: 'enchantment', label: 'Encantamento' },
  { value: 'planeswalker', label: 'Planeswalker' },
  { value: 'land', label: 'Terreno' },
] as const;

/** ALL não é filtro: vira ausência de parâmetro na consulta da Scryfall. */
const unset = (value: string): string | undefined => (value === ALL ? undefined : value);

/** Busca na Scryfall + formulário de proxy manual. */
@Component({
  selector: 'app-proxy-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmIcon,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    BrnSelectImports,
    HlmSelectImports,
    HlmSkeletonImports,
  ],
  providers: [provideIcons({ lucideSearch, lucidePlus, lucideX, lucideChevronDown })],
  templateUrl: './proxy-search.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProxySearch {
  add = output<ScryfallCard>();
  addManual = output<{ name: string; imageUrl: string }>();

  private scryfall = inject(ScryfallService);
  private notify = inject(NotificationService);
  private dialog = inject(HlmDialogService);

  protected readonly colorFilters = COLOR_FILTERS;
  protected readonly typeFilters = TYPE_FILTERS;
  protected readonly extractImages = extractImageUris;

  protected queryControl = new FormControl('', { nonNullable: true });
  protected color = signal<string>(ALL);
  protected type = signal<string>(ALL);

  protected results = signal<ScryfallCard[]>([]);
  protected totalCards = signal(0);
  protected nextPage = signal<string | null>(null);
  protected loading = signal(false);
  protected loadingMore = signal(false);
  /** true depois da primeira busca — controla o estado vazio. */
  protected searched = signal(false);

  /** Descarta respostas fora de ordem (uma busca nova invalida a anterior). */
  private searchSeq = 0;

  /** Proxy manual (nome + URL direta de imagem). */
  protected manualOpen = signal(false);
  protected manualName = signal('');
  protected manualUrl = signal('');

  constructor() {
    this.queryControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.performSearch());
  }

  protected setColor(value: string): void {
    this.color.set(value);
    this.performSearch();
  }

  protected setType(value: string): void {
    this.type.set(value);
    this.performSearch();
  }

  protected clearQuery(): void {
    this.queryControl.setValue('');
    this.results.set([]);
    this.totalCards.set(0);
    this.nextPage.set(null);
    this.searched.set(false);
  }

  private performSearch(): void {
    const query = this.queryControl.value.trim();
    const seq = ++this.searchSeq;

    if (query.length < 2) {
      this.results.set([]);
      this.totalCards.set(0);
      this.nextPage.set(null);
      this.searched.set(false);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.scryfall
      .search(query, { color: unset(this.color()), type: unset(this.type()) })
      .subscribe({
        next: page => {
          if (seq !== this.searchSeq) return;
          this.results.set(page.data.filter(card => extractImageUris(card)));
          this.totalCards.set(page.total_cards);
          this.nextPage.set(page.has_more ? (page.next_page ?? null) : null);
          this.searched.set(true);
          this.loading.set(false);
        },
        error: error => {
          if (seq !== this.searchSeq) return;
          this.loading.set(false);
          this.searched.set(true);
          this.results.set([]);
          this.totalCards.set(0);
          this.nextPage.set(null);
          // 404 da Scryfall = "nenhuma carta encontrada", não erro de rede.
          if (error instanceof HttpErrorResponse && error.status === 404) return;
          this.notify.apiError(error, { fallback: 'Não foi possível buscar na Scryfall agora.' });
        },
      });
  }

  protected loadMore(): void {
    const url = this.nextPage();
    if (!url || this.loadingMore()) return;

    const seq = this.searchSeq;
    this.loadingMore.set(true);
    this.scryfall.searchByUrl(url).subscribe({
      next: page => {
        this.loadingMore.set(false);
        if (seq !== this.searchSeq) return;
        this.results.update(list => [...list, ...page.data.filter(card => extractImageUris(card))]);
        this.nextPage.set(page.has_more ? (page.next_page ?? null) : null);
      },
      error: error => {
        this.loadingMore.set(false);
        this.notify.apiError(error, { fallback: 'Não foi possível carregar mais resultados.' });
      },
    });
  }

  protected openPreview(card: ScryfallCard): void {
    const images = extractImageUris(card);
    if (!images) return;
    this.dialog.open(CardPreviewDialog, {
      context: {
        name: card.name,
        imageUrl: images.large ?? images.normal,
        subtitle: `${card.set_name} · ${card.set.toUpperCase()}`,
        note: card.type_line,
      },
    });
  }

  protected submitManual(): void {
    const name = this.manualName().trim();
    const url = this.manualUrl().trim();
    if (!name || !/^https?:\/\//i.test(url)) {
      this.notify.warning('Informe o nome e uma URL de imagem começando com http(s)://');
      return;
    }
    this.addManual.emit({ name, imageUrl: url });
    this.manualName.set('');
    this.manualUrl.set('');
    this.manualOpen.set(false);
  }
}
