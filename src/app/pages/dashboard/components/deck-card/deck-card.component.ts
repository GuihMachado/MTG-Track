import { Component, Input, input } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'app-deck-card',
  imports: [ HlmCardImports ],
  templateUrl: './deck-card.component.html',
  styleUrl: './deck-card.component.css',
})
export class DeckCardComponent {
  @Input() deck: string = '';
  @Input() wins: number = 0;
}
