import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  CX, CY, R_INNER, R_LIFE, R_NAME, R_HINT, R_PIP,
  dividerLine, hintAngles, lifeFontSize, seatAngles, seatPath, seatTextTransform, tapHalves, warningArcPath,
} from './wheel-geometry';
import { SeatColorCode, paintSeats } from './seat-colors';

export interface SeatPlayer {
  id: number;
  name: string;
  life: number;
  seatColor: SeatColorCode;
  /** Marcadores de veneno; 10 ou mais eliminam o jogador. */
  poison?: number;
}

export const POISON_LETHAL = 10;

interface SeatVM {
  player: SeatPlayer;
  path: string;
  tapPlus: string;
  tapMinus: string;
  warnPath: string;
  fill: string;
  fg: string;
  nameT: { group: string; text: string };
  lifeT: { group: string; text: string };
  hintPlusT: { group: string; text: string };
  hintMinusT: { group: string; text: string };
  pip: { t: { group: string; text: string }; letter: string } | null;
  divider: { x1: number; y1: number; x2: number; y2: number } | null;
  poison: number;
  low: boolean;
  out: boolean;
}

/**
 * Rosca de vidas (Grimório §05): setores de 360°/N para 2–6 jogadores,
 * texto girado mid+180° (topo aponta ao centro da mesa), ± nas metades do arco.
 * Sem animação na troca de vida — o número muda, o setor não.
 */
@Component({
  selector: 'app-life-wheel',
  standalone: true,
  templateUrl: './life-wheel.html',
  styleUrl: './life-wheel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LifeWheel {
  players = input.required<SeatPlayer[]>();

  lifeChange = output<{ id: number; delta: number }>();
  menu = output<void>();

  protected readonly CX = CX;
  protected readonly CY = CY;
  protected readonly R_INNER = R_INNER;

  protected lifeSize = computed(() => lifeFontSize(this.players().length));

  protected seats = computed<SeatVM[]>(() => {
    const players = this.players();
    const n = players.length;
    const paints = paintSeats(players.map(p => p.seatColor));

    return players.map((player, i) => {
      const { mid } = seatAngles(i, n);
      const halves = tapHalves(i, n);
      const hints = hintAngles(i, n);
      const paint = paints[i];
      return {
        player,
        path: seatPath(i, n),
        tapPlus: halves.plus,
        tapMinus: halves.minus,
        warnPath: warningArcPath(i, n),
        fill: paint.fill,
        fg: paint.fg,
        nameT: seatTextTransform(mid, R_NAME),
        lifeT: seatTextTransform(mid, R_LIFE),
        hintPlusT: seatTextTransform(hints.plus, R_HINT),
        hintMinusT: seatTextTransform(hints.minus, R_HINT),
        pip: paint.needsPip
          ? { t: seatTextTransform(mid, R_PIP), letter: player.seatColor }
          : null,
        divider: paint.needsDividerAfter ? dividerLine(i, n) : null,
        poison: player.poison ?? 0,
        low: player.life > 0 && player.life <= 5,
        out: player.life <= 0 || (player.poison ?? 0) >= POISON_LETHAL,
      };
    });
  });

  protected change(id: number, delta: number): void {
    this.lifeChange.emit({ id, delta });
  }
}
