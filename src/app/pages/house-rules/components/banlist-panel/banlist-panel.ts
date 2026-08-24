import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLayoutGrid, lucideList, lucideSearch } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { firstValueFrom } from 'rxjs';
import { BANLIST_CATEGORIES, BanlistCategory, BanlistItem } from '../../../../models/house-rules.models';
import { namedCardImageUrl } from '../../../../shared/match-utils';
import {
  CardPreviewDialog,
  CardPreviewResult,
} from '../../../../shared/card-preview-dialog/card-preview-dialog';

type CategoryFilter = 'all' | BanlistCategory;

/** Cores das categorias nos tokens do Grimório (§4.2 aprovado). */
const CATEGORY_CLASSES: Record<BanlistCategory, string> = {
  Overpowered: 'text-danger bg-danger-bg',
  'Salt/Unfun': 'text-warning bg-warning-bg',
  'Rule Breaking': 'text-info bg-info-bg',
  Custom: 'text-foreground-muted bg-surface-3',
};

@Component({
  selector: 'app-banlist-panel',
  standalone: true,
  imports: [NgIcon, HlmIcon, HlmInputImports],
  providers: [provideIcons({ lucideSearch, lucideLayoutGrid, lucideList })],
  templateUrl: './banlist-panel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BanlistPanel {
  banlist = input.required<BanlistItem[]>();
  remove = output<string>();

  private dialog = inject(HlmDialogService);

  protected readonly categories = BANLIST_CATEGORIES;
  protected search = signal('');
  protected category = signal<CategoryFilter>('all');
  protected viewMode = signal<'grid' | 'list'>('grid');
  /** Ids cuja imagem 404ou — mostram o fallback com o nome. */
  protected failedImages = signal<ReadonlySet<string>>(new Set());

  protected filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const category = this.category();

    return this.banlist().filter(item => {
      if (category !== 'all' && item.category !== category) return false;
      if (!term) return true;
      return (
        item.cardName.toLowerCase().includes(term) || item.reason.toLowerCase().includes(term)
      );
    });
  });

  protected imageUrl(item: BanlistItem): string {
    return namedCardImageUrl(item.cardName, item.imageUrl);
  }

  protected categoryClass(category: BanlistCategory): string {
    return CATEGORY_CLASSES[category];
  }

  protected onSearch(value: string): void {
    this.search.set(value);
  }

  protected onImageError(id: string): void {
    this.failedImages.update(set => new Set(set).add(id));
  }

  protected async openPreview(item: BanlistItem): Promise<void> {
    const ref = this.dialog.open(CardPreviewDialog, {
      context: {
        name: item.cardName,
        imageUrl: this.imageUrl(item),
        subtitle: item.category,
        note: item.reason,
        removeLabel: 'Remover da banlist',
      },
    });

    const result = (await firstValueFrom(ref.closed$)) as CardPreviewResult;
    if (result === 'remove') this.remove.emit(item.id);
  }
}
