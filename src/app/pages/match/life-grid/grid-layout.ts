/**
 * Geometria da mesa em grade — substitui a rosca.
 *
 * A mesa tem sempre 2 colunas e ceil(n/2) linhas. Com número ímpar de
 * jogadores a última célula ocupa a linha inteira (uma mesa de 5 fica com
 * 4 quadrados e 1 retângulo).
 *
 * Cada jogador senta na lateral do celular correspondente à sua coluna, então
 * o conteúdo da célula gira ±90° para que ele leia o próprio número na
 * horizontal. A célula larga fica na leitura de quem está de frente (0°).
 */

export type SeatOrientation = 'left' | 'right' | 'up' | 'down';

export const MAX_SEATS = 6;

/** Posição da zona de toque dentro da célula, na orientação da tela. */
export type TapZone = 'zone-top' | 'zone-bottom' | 'zone-left' | 'zone-right';

export interface SeatSlot {
  index: number;
  /** Ocupa as duas colunas: a última célula quando o total é ímpar. */
  wide: boolean;
  orientation: SeatOrientation;
  /** Rotação do conteúdo, em graus. */
  rotation: number;
  /** Zona que subtrai vida — sempre à esquerda de quem está sentado ali. */
  minusZone: TapZone;
  /** Zona que soma vida — sempre à direita de quem está sentado ali. */
  plusZone: TapZone;
}

const ROTATION: Record<SeatOrientation, number> = {
  left: 90,
  right: -90,
  up: 180,
  down: 0,
};

/** Zonas na ordem [menos, mais], já do ponto de vista de quem senta ali. */
const ZONES: Record<SeatOrientation, [TapZone, TapZone]> = {
  left: ['zone-top', 'zone-bottom'],
  right: ['zone-bottom', 'zone-top'],
  down: ['zone-left', 'zone-right'],
  up: ['zone-right', 'zone-left'],
};

export function gridRows(count: number): number {
  const total = clampCount(count);
  // Mesa de 2 é a exceção: empilhada, não lado a lado.
  if (total === 2) return 2;
  return Math.ceil(total / 2);
}

function makeSlot(index: number, wide: boolean, orientation: SeatOrientation): SeatSlot {
  const [minusZone, plusZone] = ZONES[orientation];
  return { index, wide, orientation, rotation: ROTATION[orientation], minusZone, plusZone };
}

export function seatSlots(count: number): SeatSlot[] {
  const total = clampCount(count);

  // Dois jogadores ficam frente a frente ao longo do lado curto do celular:
  // uma faixa em cima (lendo de cabeça para baixo) e outra embaixo. Em duas
  // colunas cada um leria o próprio número deitado, que é o caso errado.
  if (total === 2) {
    return [makeSlot(0, true, 'up'), makeSlot(1, true, 'down')];
  }

  const lastIsWide = total % 2 === 1;

  return Array.from({ length: total }, (_, index) => {
    const wide = lastIsWide && index === total - 1;
    const orientation: SeatOrientation = wide ? 'down' : index % 2 === 0 ? 'left' : 'right';
    return makeSlot(index, wide, orientation);
  });
}

/** Corpo do numeral em vmin — encolhe conforme a mesa enche. */
export function lifeFontSize(count: number): number {
  const sizes: Record<number, number> = { 1: 30, 2: 26, 3: 20, 4: 20, 5: 15, 6: 15 };
  return sizes[clampCount(count)] ?? 15;
}

function clampCount(count: number): number {
  if (!Number.isFinite(count) || count < 1) return 1;
  return Math.min(MAX_SEATS, Math.floor(count));
}
