import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { ManaSymbolPipe } from '../../../../shared/pipes/mana-symbol-pipe';
import { colorsToManaSymbols } from '../../../../shared/match-utils';

@Component({
  selector: 'app-deck-card',
  imports: [CommonModule, HlmCardImports, ManaSymbolPipe],
  templateUrl: './deck-card.component.html',
  styleUrl: './deck-card.component.css',
})
export class DeckCardComponent {
  @Input() name: string = '';
  @Input() imageUrl: string | null = null;
  @Input() colors: string = '';

  protected imageFailed = false;

  get manaColors(): string {
    return colorsToManaSymbols(this.colors);
  }

  onImageError(): void {
    this.imageFailed = true;
  }
}
