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
import { LifeGrid, POISON_LETHAL, SeatPlayer } from './life-grid/life-grid';
import { SEAT_COLOR_ORDER, SEAT_COLORS, SeatColorCode } from './seat-colors';
import { NotificationService } from '../../shared/notification/notification.service';
import { MatchService } from '../../services/match-service';
import { MatchDto } from '../../models/match.models';

const SEATS_KEY = 'match-seats';
const STARTING_LIFE = 40;

/** Estado da mesa (ordem, cor, vida e veneno), preso à partida que o gerou. */
interface StoredSeats {
  matchId: number;
  seats: { userId: number; seatColor: SeatColorCode; life: number; poison: number }[];
}

/** Assento da mesa + o usuário real por trás dele. */
interface MatchSeat extends SeatPlayer {
  userId: number;
  poison: number;
}

@Component({
  selector: 'app-match',
  standalone: true,
  imports: [
    LifeGrid,
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
  /** Modo de trocar assentos de lugar. */
  protected arranging = signal(false);
  protected pickedSeatId = signal<number | null>(null);
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

        this.players.set(this.buildSeats(match, this.getStoredSeats(matchId)));
        this.loading.set(false);
      },
      error: (error) => {
        this.notify.apiError(error, { fallback: 'Não foi possível carregar a partida.' });
        this.clearMatchKeys();
        this.router.navigate(['/play']);
      }
    });
  }

  /** Retoma a mesa como ela estava: mesma ordem, cores, vidas e veneno. */
  private buildSeats(match: MatchDto, stored: StoredSeats | null): MatchSeat[] {
    const order = stored?.seats.map(s => s.userId) ?? [];
    const savedByUser = new Map((stored?.seats ?? []).map(s => [s.userId, s]));

    const ordered = [...match.playersConnection].sort((a, b) => {
      const ia = order.indexOf(a.user.id);
      const ib = order.indexOf(b.user.id);
      if (ia === -1 && ib === -1) return a.id - b.id;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return ordered.map((mp, i) => {
      const saved = savedByUser.get(mp.user.id);
      return {
        id: mp.user.id,
        userId: mp.user.id,
        name: mp.user.name,
        life: saved?.life ?? STARTING_LIFE,
        poison: saved?.poison ?? 0,
        seatColor: saved?.seatColor ?? SEAT_COLOR_ORDER[i % SEAT_COLOR_ORDER.length]!,
      };
    });
  }

  private getStoredSeats(matchId: number): StoredSeats | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(SEATS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      // Assentos de outra partida não valem para esta.
      if (!parsed || parsed.matchId !== matchId || !Array.isArray(parsed.seats)) return null;
      return parsed as StoredSeats;
    } catch {
      return null;
    }
  }

  private persistSeats(): void {
    if (!isPlatformBrowser(this.platformId) || this.matchId === null) return;
    const payload: StoredSeats = {
      matchId: this.matchId,
      seats: this.players().map(p => ({
        userId: p.userId,
        seatColor: p.seatColor,
        life: p.life,
        poison: p.poison,
      })),
    };
    localStorage.setItem(SEATS_KEY, JSON.stringify(payload));
  }

  protected onLifeChange(event: { id: number; delta: number }): void {
    const before = this.players().find(p => p.id === event.id);

    this.players.update(players =>
      players.map(p => (p.id === event.id ? { ...p, life: p.life + event.delta } : p)),
    );

    const after = this.players().find(p => p.id === event.id);
    this.persistSeats();

    // Avisa só na virada para zero, para não repetir o toast a cada toque.
    if (before && after && before.life > 0 && after.life <= 0) {
      this.notify.warning(`${after.name} está fora!`, {
        description: `Chegou a ${after.life} pontos de vida.`
      });
    }
  }

  protected updatePoison(id: number, delta: number): void {
    const before = this.players().find(p => p.id === id);

    this.players.update(players =>
      players.map(p => (p.id === id ? { ...p, poison: Math.max(0, p.poison + delta) } : p)),
    );

    const after = this.players().find(p => p.id === id);
    this.persistSeats();

    // Avisa só quando cruza o letal, para não repetir o toast a cada toque.
    if (before && after && before.poison < POISON_LETHAL && after.poison >= POISON_LETHAL) {
      this.notify.warning(`${after.name} está fora!`, {
        description: `Chegou a ${after.poison} marcadores de veneno.`
      });
    }
  }

  /** Cicla a cor do assento entre os 6 tokens de mana — repetição permitida. */
  protected cycleSeatColor(id: number): void {
    this.players.update(players =>
      players.map(p => {
        if (p.id !== id) return p;
        const next =
          SEAT_COLOR_ORDER[(SEAT_COLOR_ORDER.indexOf(p.seatColor) + 1) % SEAT_COLOR_ORDER.length]!;
        return { ...p, seatColor: next };
      }),
    );
    this.persistSeats();
  }

  protected startArranging(): void {
    this.pickedSeatId.set(null);
    this.arranging.set(true);
  }

  protected stopArranging(): void {
    this.arranging.set(false);
    this.pickedSeatId.set(null);
  }

  /** Primeiro toque escolhe o assento, o segundo troca os dois de lugar. */
  protected onSeatPick(id: number): void {
    const picked = this.pickedSeatId();

    if (picked === null || picked === id) {
      this.pickedSeatId.set(picked === id ? null : id);
      return;
    }

    this.players.update(list => {
      const from = list.findIndex(p => p.id === picked);
      const to = list.findIndex(p => p.id === id);
      const first = list[from];
      const second = list[to];
      if (!first || !second) return list;

      const next = [...list];
      next[from] = second;
      next[to] = first;
      return next;
    });

    this.pickedSeatId.set(null);
    this.persistSeats();
  }

  protected resetLives(): void {
    this.players.update(players => players.map(p => ({ ...p, life: STARTING_LIFE, poison: 0 })));
    this.persistSeats();
    this.notify.info(`Vidas reiniciadas em ${STARTING_LIFE}, veneno zerado.`);
  }

  protected openEndDialog(dialog: HlmDialog): void {
    if (this.loading() || this.players().length === 0) return;
    // Sugestão: pré-seleciona quem tem mais vida; a escolha final é manual.
    this.selectedWinnerId.set(this.playersByLife()[0]!.userId);
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
