/**
 * Contador ativo do assento — vida por padrão; deslizar na vertical (no
 * referencial de quem está sentado) cicla vida → veneno → energia →
 * experiência → tesouro → radiação.
 */
import { COUNTER_DEFS, CounterType } from '../counters';
import { SeatOrientation } from './grid-layout';
import { MtgIconName } from '../../../shared/icons/mtg-icons';

export type SeatCounterKind = 'life' | 'poison' | CounterType;

export const SEAT_COUNTER_ORDER: readonly SeatCounterKind[] = [
  'life',
  'poison',
  'energy',
  'experience',
  'treasure',
  'rad',
];

export interface SeatCounterDef {
  /** Ícone da família do app (ver shared/icons/mtg-icons). */
  icon: MtgIconName;
  label: string;
}

export const SEAT_COUNTER_DEFS: Record<SeatCounterKind, SeatCounterDef> = {
  life: { icon: 'life', label: 'Vida' },
  poison: { icon: 'poison', label: 'Veneno' },
  energy: COUNTER_DEFS.energy,
  experience: COUNTER_DEFS.experience,
  treasure: COUNTER_DEFS.treasure,
  rad: COUNTER_DEFS.rad,
};

/** Deslize mínimo, em px, para valer como troca de contador (e não toque). */
export const SWIPE_THRESHOLD = 36;

/** Próximo contador no ciclo; step +1 = deslizou "para baixo" do jogador. */
export function cycleCounter(kind: SeatCounterKind, step: 1 | -1): SeatCounterKind {
  const index = SEAT_COUNTER_ORDER.indexOf(kind);
  const length = SEAT_COUNTER_ORDER.length;
  return SEAT_COUNTER_ORDER[(index + step + length) % length]!;
}

/**
 * Converte um deslize na tela (dx, dy) para o "para baixo" de quem está
 * sentado no assento. Positivo = o jogador puxou para o próprio corpo.
 */
export function swipeTowardPlayer(orientation: SeatOrientation, dx: number, dy: number): number {
  switch (orientation) {
    case 'left':
      return -dx; // sentado à esquerda da tela: o corpo fica em -x
    case 'right':
      return dx;
    case 'up':
      return -dy;
    case 'down':
      return dy;
  }
}
