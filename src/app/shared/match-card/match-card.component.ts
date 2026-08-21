import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchDto, MatchPlayerDto } from '../../models/match.models';
import { ManaSymbolPipe } from '../pipes/mana-symbol-pipe';
import { TimeAgoPipe } from '../pipes/time-ago-pipe';
import { colorsToManaSymbols, commanderArtUrl } from '../match-utils';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [CommonModule, ManaSymbolPipe, TimeAgoPipe],
  templateUrl: './match-card.component.html'
})
export class MatchCardComponent {
  @Input({ required: true }) match!: MatchDto;
  @Input({ required: true }) currentUserId!: number;

  protected imageFailed = false;

  get result(): 'V' | 'D' | 'E' {
    if (!this.match.winner) return 'E';
    return this.match.winner.id === this.currentUserId ? 'V' : 'D';
  }

  get resultClass(): string {
    switch (this.result) {
      case 'V': return 'bg-success-bg text-success';
      case 'D': return 'bg-danger-bg text-danger';
      default: return 'bg-warning-bg text-warning';
    }
  }

  get myPlayer(): MatchPlayerDto | undefined {
    return this.match.playersConnection.find(p => p.user.id === this.currentUserId);
  }

  get opponentNames(): string {
    return this.match.playersConnection
      .filter(p => p.user.id !== this.currentUserId)
      .map(p => p.user.name)
      .join(', ');
  }

  get commanderImage(): string | null {
    if (this.imageFailed) return null;
    return commanderArtUrl(this.myPlayer?.commander);
  }

  get manaColors(): string {
    return colorsToManaSymbols(this.myPlayer?.colors);
  }

  onImageError(): void {
    this.imageFailed = true;
  }
}
