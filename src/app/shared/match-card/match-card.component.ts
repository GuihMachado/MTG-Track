import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmDialogImports, HlmDialog } from '@spartan-ng/helm/dialog';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { MatchDto, MatchPlayerDto } from '../../models/match.models';
import { ManaSymbolPipe } from '../pipes/mana-symbol-pipe';
import { TimeAgoPipe } from '../pipes/time-ago-pipe';
import { colorsToManaSymbols, manaRgbVar } from '../match-utils';
import { MatchService } from '../../services/match-service';
import { NotificationService } from '../notification/notification.service';

@Component({
  selector: 'app-match-card',
  standalone: true,
  imports: [
    BrnDialogImports,
    HlmDialogImports,
    HlmRadioGroupImports,
    HlmButtonImports,
    ManaSymbolPipe,
    TimeAgoPipe
  ],
  templateUrl: './match-card.component.html',
  styleUrl: './match-card.component.css'
})
export class MatchCardComponent {
  @Input({ required: true }) match!: MatchDto;
  @Input({ required: true }) currentUserId!: number;
  /**
   * Partida em andamento: `true` oferece encerrar (tela de Partidas), `false`
   * oferece voltar para a mesa (home). A mesma linha, duas intenções.
   */
  @Input() showFinish = false;

  /** Emitido depois que uma partida em andamento é encerrada por esta linha. */
  @Output() finished = new EventEmitter<void>();

  private router = inject(Router);
  private matchService = inject(MatchService);
  private notify = inject(NotificationService);

  protected finishing = signal(false);
  protected selectedWinnerId = signal<number | null>(null);

  get result(): 'V' | 'D' | 'E' {
    if (!this.match.winner) return 'E';
    return this.match.winner.id === this.currentUserId ? 'V' : 'D';
  }

  get railClass(): string {
    switch (this.result) {
      case 'V': return 'rail win';
      case 'D': return 'rail loss';
      default: return 'rail open';
    }
  }

  /** O resultado vira palavra: "Vitória vs. Renatao". A letra V/D saiu. */
  get title(): string {
    if (this.result === 'E') {
      const seats = this.match.playersConnection.length;
      return `Mesa aberta · ${seats} ${seats === 1 ? 'jogador' : 'jogadores'}`;
    }

    const word = this.result === 'V' ? 'Vitória' : 'Derrota';
    const opponents = this.opponentNames;
    return opponents ? `${word} vs. ${opponents}` : `${word} em mesa solo`;
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

  /** Só o nome antes da vírgula: "Aang, Airbending Master" não cabe na linha. */
  get commanderName(): string {
    const commander = this.myPlayer?.commander;
    if (!commander) return 'Sem commander';
    return commander.split(',')[0]!.trim();
  }

  get manaColors(): string {
    return colorsToManaSymbols(this.myPlayer?.colors);
  }

  /** Identidade de cor do deck usado: tinge o fundo da linha. */
  get deckRgb(): string {
    return manaRgbVar(this.myPlayer?.colors);
  }

  get elapsedMinutes(): number {
    return this.getElapsedMinutes();
  }

  /** Volta para a mesa desta partida — inclusive se não for a última aberta. */
  protected resume(): void {
    localStorage.setItem('matchId', String(this.match.id));
    const start = new Date(this.match.matchDate).getTime();
    localStorage.setItem('match-start', String(isNaN(start) ? Date.now() : start));
    this.router.navigate(['/match']);
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
    localStorage.removeItem('match-starting-life');
    localStorage.removeItem('players');
  }
}
