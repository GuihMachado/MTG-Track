import { Component } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { WinRateChart } from '../../shared/win-rate-chart/win-rate-chart';
import { DeckCardComponent } from './components/deck-card/deck-card.component';
import { MatchCardComponent } from './components/match-card/match-card.component';


@Component({
  selector: 'app-dashboard',
  imports: [HlmCardImports, WinRateChart, DeckCardComponent, MatchCardComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  stats = {
    wins: 32,
    losses: 18
  };

  decks = [
    {
      id: 1,
      name: 'Deck 1',
      deck: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    },
    {
      id: 2,
      name: 'Deck 2',
      deck: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    },
    {
      id: 3,
      name: 'Deck 3',
      deck: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    },
    {
      id: 4,
      name: 'Deck 4',
      deck: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
    }
  ];
}
