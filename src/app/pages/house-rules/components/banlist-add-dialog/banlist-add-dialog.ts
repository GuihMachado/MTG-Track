import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { BANLIST_CATEGORIES, BanlistCategory, BanlistItem } from '../../../../models/house-rules.models';
import { CardPicker } from '../../../../shared/card-picker/card-picker';
import { extractImageUris, ScryfallCard } from '../../../../models/proxy.models';

const DEFAULT_REASON = 'Banimento aprovado por consenso da mesa.';

/**
 * Adicionar carta à banlist. O nome vem da busca na Scryfall (seleção
 * obrigatória), então a imagem sempre resolve — antes era texto livre resolvido
 * por `exact=`, que dava 404 em nome parcial ou em português.
 */
@Component({
  selector: 'app-banlist-add-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmLabelImports,
    HlmTextareaImports,
    CardPicker,
  ],
  templateUrl: './banlist-add-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BanlistAddDialog {
  private readonly dialogRef = inject<BrnDialogRef<BanlistItem | undefined>>(BrnDialogRef);

  protected readonly categories = BANLIST_CATEGORIES;
  protected nameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected reasonControl = new FormControl(DEFAULT_REASON, { nonNullable: true });
  protected category = signal<BanlistCategory>('Overpowered');

  /** Imagem da carta escolhida — vira o imageUrl do item, sem depender do nome. */
  protected previewUrl = signal<string | null>(null);

  protected onCardSelected(card: ScryfallCard): void {
    const images = extractImageUris(card);
    this.previewUrl.set(images?.normal ?? null);
  }

  protected cancel(): void {
    this.dialogRef.close(undefined);
  }

  protected save(): void {
    if (this.nameControl.invalid) {
      this.nameControl.markAsTouched();
      return;
    }

    this.dialogRef.close({
      id: crypto.randomUUID(),
      cardName: this.nameControl.value.trim(),
      reason: this.reasonControl.value.trim() || DEFAULT_REASON,
      category: this.category(),
      ...(this.previewUrl() ? { imageUrl: this.previewUrl()! } : {}),
    });
  }
}
