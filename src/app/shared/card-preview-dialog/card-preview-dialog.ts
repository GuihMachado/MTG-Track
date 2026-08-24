import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';

export interface CardPreviewContext {
  name: string;
  imageUrl: string;
  /** Linha secundária (categoria, edição…). */
  subtitle?: string;
  /** Texto livre exibido abaixo (ex.: motivo do banimento). */
  note?: string;
  /** Quando presente, mostra o botão destrutivo; fechar com 'remove' aciona a ação. */
  removeLabel?: string;
}

/** Resultado do diálogo: 'remove' quando o usuário pediu a ação destrutiva. */
export type CardPreviewResult = 'remove' | undefined;

/**
 * Lightbox de carta compartilhado (banlist e busca de proxies), aberto via
 * HlmDialogService.open(CardPreviewDialog, { context: CardPreviewContext }).
 */
@Component({
  selector: 'app-card-preview-dialog',
  standalone: true,
  imports: [HlmButtonImports],
  templateUrl: './card-preview-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardPreviewDialog {
  protected readonly context = injectBrnDialogContext<CardPreviewContext>();
  private readonly dialogRef = inject<BrnDialogRef<CardPreviewResult>>(BrnDialogRef);

  protected imageFailed = signal(false);

  protected get scryfallLink(): string {
    return `https://scryfall.com/search?q=${encodeURIComponent(`!"${this.context.name}"`)}`;
  }

  protected onImageError(): void {
    this.imageFailed.set(true);
  }

  protected close(): void {
    this.dialogRef.close(undefined);
  }

  protected remove(): void {
    this.dialogRef.close('remove');
  }
}
