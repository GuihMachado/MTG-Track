import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { SeatColorCode, paintSeats } from '../seat-colors';
import { SeatSlot, TapZone, gridRows, lifeFontSize, seatSlots } from './grid-layout';

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
  slot: SeatSlot;
  transform: string;
  fill: string;
  fg: string;
  /** Letra da cor: só quando a mesa repete a cor em mais de um assento. */
  pip: string | null;
  poison: number;
  low: boolean;
  out: boolean;
}

/**
 * Mesa de vidas em grade (2 colunas, 1–6 jogadores). Cada jogador lê o próprio
 * número na horizontal, girado para a lateral em que está sentado.
 */
@Component({
  selector: 'app-life-grid',
  standalone: true,
  imports: [NgClass],
  templateUrl: './life-grid.html',
  styleUrl: './life-grid.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LifeGrid {
  players = input.required<SeatPlayer[]>();
  /** Modo de troca de assentos: as zonas de vida dão lugar ao toque de seleção. */
  arranging = input(false);
  /** Assento já escolhido, aguardando o par para trocar. */
  pickedId = input<number | null>(null);

  lifeChange = output<{ id: number; delta: number }>();
  menu = output<void>();
  pick = output<number>();

  protected rowsTemplate = computed(() => `repeat(${gridRows(this.players().length)}, minmax(0, 1fr))`);
  protected lifeSize = computed(() => lifeFontSize(this.players().length));

  protected seats = computed<SeatVM[]>(() => {
    const players = this.players();
    const slots = seatSlots(players.length);
    const paints = paintSeats(players.map(p => p.seatColor));

    return players.map((player, i) => {
      const slot = slots[i]!;
      const paint = paints[i]!;
      const poison = player.poison ?? 0;

      return {
        player,
        slot,
        transform: `rotate(${slot.rotation}deg)`,
        fill: paint.fill,
        fg: paint.fg,
        pip: paint.needsPip ? player.seatColor : null,
        poison,
        low: player.life > 0 && player.life <= 5,
        out: player.life <= 0 || poison >= POISON_LETHAL,
      };
    });
  });

  protected change(id: number, delta: number): void {
    this.lifeChange.emit({ id, delta });
  }

  protected zoneClass(zone: TapZone): string {
    return zone;
  }
}
