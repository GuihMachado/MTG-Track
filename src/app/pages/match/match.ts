import { Component, OnInit, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmDialogImports, HlmDialog } from '@spartan-ng/helm/dialog';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { LifeWheel, SeatPlayer } from './life-wheel/life-wheel';
import { SEAT_COLOR_ORDER, SEAT_COLORS, SeatColorCode } from './life-wheel/seat-colors';
import { NotificationService } from '../../shared/notification/notification.service';
import { MatchService } from '../../services/match-service';

const SEATS_KEY = 'match-seats';
const STARTING_LIFE = 40;

interface StoredSeat {
  id: number;
  name: string;
  seatColor: SeatColorCode;
}

/** Assento da rosca + o usuário real por trás dele. */
interface MatchSeat extends SeatPlayer {
  userId: number;
}

@Component({
  selector: 'app-match',
  standalone: true,
  imports: [
    LifeWheel,
    BrnSheetImports,
    HlmSheetImports,
    BrnDialogImports,
    HlmDialogImports,
    HlmRadioGroupImports,
    HlmButtonImports,
    HlmSeparatorImports,
  ],
  templateUrl: './match.html',
  styleUrls: ['./match.css'],
})
export class Match implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private notify = inject(NotificationService);
  private matchService = inject(MatchService);

  protected players = signal<MatchSeat[]>([]);
  protected loading = signal(true);
  protected finishing = signal(false);
  protected selectedWinnerId = signal<number | null>(null);
  private matchId: number | null = null;

  protected readonly seatColors = SEAT_COLORS;

  protected playersByLife = computed(() =>
    [...this.players()].sort((a, b) => b.life - a.life)
  );

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const matchId = Number(localStorage.getItem('matchId'));
    if (!matchId || isNaN(matchId)) {
      this.clearMatchKeys();
      this.notify.warning('Partida inválida.', {
        description: 'Inicie uma nova partida para abrir a mesa.'
      });
      this.router.navigate(['/play']);
      return;
    }

    this.matchId = matchId;
    this.matchService.getMatchById(matchId).subscribe({
      next: (match) => {
        // Partida antiga que já foi encerrada: limpa e volta para a home.
        if (match.winner) {
          this.clearMatchKeys();
          this.router.navigate(['/dashboard']);
          return;
        }

        const stored = this.getStoredSeats();
        this.players.set(
          [...match.playersConnection]
            .sort((a, b) => a.id - b.id)
            .map((mp, i) => ({
              id: i + 1,
              userId: mp.user.id,
              name: mp.user.name,
              life: STARTING_LIFE,
              seatColor: stored[i]?.seatColor ?? SEAT_COLOR_ORDER[i % SEAT_COLOR_ORDER.length],
            }))
        );
        this.loading.set(false);
      },
      error: (error) => {
        this.notify.apiError(error, { fallback: 'Não foi possível carregar a partida.' });
        this.clearMatchKeys();
        this.router.navigate(['/play']);
      }
    });
  }

  private getStoredSeats(): StoredSeat[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const raw = localStorage.getItem(SEATS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistSeats(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const seats: StoredSeat[] = this.players().map(p => ({
      id: p.id,
      name: p.name,
      seatColor: p.seatColor,
    }));
    localStorage.setItem(SEATS_KEY, JSON.stringify(seats));
  }

  protected onLifeChange(event: { id: number; delta: number }): void {
    const before = this.players().find(p => p.id === event.id);

    this.players.update(players =>
      players.map(p => (p.id === event.id ? { ...p, life: p.life + event.delta } : p)),
    );

    const after = this.players().find(p => p.id === event.id);

    // Avisa só na virada para zero, para não repetir o toast a cada toque.
    if (before && after && before.life > 0 && after.life <= 0) {
      this.notify.warning(`${after.name} está fora!`, {
        description: `Chegou a ${after.life} pontos de vida.`
      });
    }
  }

  /** Cicla a cor do assento entre os 6 tokens de mana — repetição permitida. */
  protected cycleSeatColor(id: number): void {
    this.players.update(players =>
      players.map(p => {
        if (p.id !== id) return p;
        const next =
          SEAT_COLOR_ORDER[(SEAT_COLOR_ORDER.indexOf(p.seatColor) + 1) % SEAT_COLOR_ORDER.length];
        return { ...p, seatColor: next };
      }),
    );
    this.persistSeats();
  }

  protected resetLives(): void {
    this.players.update(players => players.map(p => ({ ...p, life: STARTING_LIFE })));
    this.notify.info(`Vidas reiniciadas em ${STARTING_LIFE}.`);
  }

  protected openEndDialog(dialog: HlmDialog): void {
    if (this.loading() || this.players().length === 0) return;
    // Sugestão: pré-seleciona quem tem mais vida; a escolha final é manual.
    this.selectedWinnerId.set(this.playersByLife()[0].userId);
    dialog.open();
  }

  protected onWinnerChange(value: unknown): void {
    this.selectedWinnerId.set(Number(value));
  }

  protected confirmFinish(dialog: HlmDialog): void {
    const winnerId = this.selectedWinnerId();
    if (this.matchId === null || winnerId === null || this.finishing()) return;

    const winner = this.players().find(p => p.userId === winnerId);
    this.finishing.set(true);

    this.matchService.finishMatch(this.matchId, {
      winnerId,
      matchTimeInMinutes: this.getElapsedMinutes()
    }).subscribe({
      next: () => {
        this.notify.success('Partida encerrada!', {
          description: `Vencedor: ${winner?.name ?? ''}.`
        });
        this.clearMatchKeys();
        dialog.close(null);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.notify.apiError(error, { fallback: 'Não foi possível encerrar a partida.' });
        this.finishing.set(false);
      }
    });
  }

  protected confirmLeave(): void {
    this.notify.confirm('Sair da partida?', () => this.leaveMatch(), {
      // Id fixo: tocar de novo reaproveita o mesmo aviso em vez de empilhar.
      id: 'match-exit',
      description: 'A partida fica em andamento, sem vencedor registrado.',
      confirmLabel: 'Sair',
      cancelLabel: 'Continuar jogando'
    });
  }

  private leaveMatch(): void {
    this.clearMatchKeys();
    this.notify.info('Você saiu da partida.');
    this.router.navigate(['/play']);
  }

  private getElapsedMinutes(): number {
    const start = Number(localStorage.getItem('match-start'));
    if (!start || isNaN(start)) return 0;
    return Math.max(0, Math.round((Date.now() - start) / 60000));
  }

  private clearMatchKeys(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem('matchId');
    localStorage.removeItem('match-start');
    localStorage.removeItem(SEATS_KEY);
    localStorage.removeItem('players');
  }
}
