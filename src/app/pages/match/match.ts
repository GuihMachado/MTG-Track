import { Component, OnInit, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { LifeWheel, SeatPlayer } from './life-wheel/life-wheel';
import { SEAT_COLOR_ORDER, SEAT_COLORS, SeatColorCode } from './life-wheel/seat-colors';

const SEATS_KEY = 'match-seats';
const STARTING_LIFE = 40;

interface StoredSeat {
  id: number;
  name: string;
  seatColor: SeatColorCode;
}

@Component({
  selector: 'app-match',
  standalone: true,
  imports: [LifeWheel, BrnSheetImports, HlmSheetImports, HlmButtonImports, HlmSeparatorImports],
  templateUrl: './match.html',
  styleUrls: ['./match.css'],
})
export class Match implements OnInit {
  private platformId = inject(PLATFORM_ID);

  protected players = signal<SeatPlayer[]>([]);

  protected readonly seatColors = SEAT_COLORS;

  ngOnInit(): void {
    this.players.set(this.buildSeats());
  }

  private buildSeats(): SeatPlayer[] {
    const count = this.getStoredPlayerCount();
    const stored = this.getStoredSeats();

    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: stored[i]?.name ?? `Jogador ${i + 1}`,
      life: STARTING_LIFE,
      seatColor: stored[i]?.seatColor ?? SEAT_COLOR_ORDER[i % SEAT_COLOR_ORDER.length],
    }));
  }

  private getStoredPlayerCount(): number {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('players');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 2 && parsed <= 6) return parsed;
      }
    }
    return 4;
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
    this.players.update(players =>
      players.map(p => (p.id === event.id ? { ...p, life: p.life + event.delta } : p)),
    );
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
  }
}
