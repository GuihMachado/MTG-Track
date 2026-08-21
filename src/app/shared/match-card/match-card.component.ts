import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmDialogImports, HlmDialog } from '@spartan-ng/helm/dialog';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { MatchDto, MatchPlayerDto } from '../../models/match.models';
import { ManaSymbolPipe } from '../pipes/mana-symbol-pipe';
import { TimeAgoPipe } from '../pipes/time-ago-pipe';
import { colorsToManaSymbols, commanderArtUrl } from '../match-utils';
import { MatchService } from '../../services/match-service';
import { NotificationService } from '../notification/notification.service';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [
    CommonModule,
    BrnDialogImports,
    HlmDialogImports,
    HlmRadioGroupImports,
    HlmButtonImports,
    ManaSymbolPipe,
    TimeAgoPipe
  ],
  templateUrl: './match-card.component.html'
})
export class MatchCardComponent {
  @Input({ required: true }) match!: MatchDto;
  @Input({ required: true }) currentUserId!: number;

  /** Emitido depois que uma partida em andamento é encerrada por este card. */
  @Output() finished = new EventEmitter<void>();

  private matchService = inject(MatchService);
  private notify = inject(NotificationService);

  protected imageFailed = false;
  protected finishing = signal(false);
  protected selectedWinnerId = signal<number | null>(null);

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

  protected openEndDialog(dialog: HlmDialog): void {
    this.selectedWinnerId.set(null);
    dialog.open();
  }

  protected onWinnerChange(value: unknown): void {
    this.selectedWinnerId.set(Number(value));
  }

  protected confirmFinish(dialog: HlmDialog): void {
    const winnerId = this.selectedWinnerId();
    if (winnerId === null || this.finishing()) return;

    const winner = this.match.playersConnection.find(p => p.user.id === winnerId);
    this.finishing.set(true);

    this.matchService.finishMatch(this.match.id, {
      winnerId,
      matchTimeInMinutes: this.getElapsedMinutes()
    }).subscribe({
      next: () => {
        this.notify.success('Partida encerrada!', {
          description: `Vencedor: ${winner?.user.name ?? ''}.`
        });
        this.clearStoredMatchIfSame();
        this.finishing.set(false);
        dialog.close(null);
        this.finished.emit();
      },
      error: (error) => {
        this.notify.apiError(error, { fallback: 'Não foi possível encerrar a partida.' });
        this.finishing.set(false);
      }
    });
  }

  /** Fora da tela de vida não há cronômetro: a duração vem do início da partida. */
  private getElapsedMinutes(): number {
    const start = new Date(this.match.matchDate).getTime();
    if (isNaN(start)) return 0;
    return Math.max(0, Math.round((Date.now() - start) / 60000));
  }

  /** Se esta era a partida guardada no localStorage, limpa para o /match não reabri-la. */
  private clearStoredMatchIfSame(): void {
    if (Number(localStorage.getItem('matchId')) !== this.match.id) return;
    localStorage.removeItem('matchId');
    localStorage.removeItem('match-start');
    localStorage.removeItem('match-seats');
    localStorage.removeItem('players');
  }
}
