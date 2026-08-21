import { Component, OnInit, afterNextRender, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { LifeWheel, SeatPlayer } from './life-wheel/life-wheel';
import { SEAT_COLOR_ORDER, SEAT_COLORS, SeatColorCode } from './life-wheel/seat-colors';
import { NotificationService } from '../../shared/notification/notification.service';

const SEATS_KEY = 'match-seats';
const STARTING_LIFE = 40;

interface StoredSeat {
  id: number;
  name: string;
  seatColor: SeatColorCode;
}

const DEFAULT_PLAYERS = 4;

@Component({
  selector: 'app-match',
  standalone: true,
  imports: [LifeWheel, BrnSheetImports, HlmSheetImports, HlmButtonImports, HlmSeparatorImports],
  templateUrl: './match.html',
  styleUrls: ['./match.css'],
})
export class Match implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private notify = inject(NotificationService);

  protected players = signal<SeatPlayer[]>([]);

  protected readonly seatColors = SEAT_COLORS;

  private usedDefaultPlayers = false;

  constructor() {
    // O aviso precisa sair depois da renderização, não no meio do ngOnInit.
    afterNextRender(() => {
      if (this.usedDefaultPlayers) {
        this.notify.warning('Não encontramos quantos jogadores estão na mesa.', {
          description: `Abrimos a partida com ${DEFAULT_PLAYERS} jogadores.`
        });
      }
    });
  }

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

      this.usedDefaultPlayers = true;
    }
    return DEFAULT_PLAYERS;
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

  protected confirmLeave(): void {
    this.notify.confirm('Sair da partida?', () => this.leaveMatch(), {
      // Id fixo: tocar de novo reaproveita o mesmo aviso em vez de empilhar.
      id: 'match-exit',
      description: 'A contagem de vidas desta mesa será perdida.',
      confirmLabel: 'Sair',
      cancelLabel: 'Continuar jogando'
    });
  }

  private leaveMatch(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('matchId');
    }

    this.notify.info('Você saiu da partida.');
    this.router.navigate(['/play']);
  }
}
