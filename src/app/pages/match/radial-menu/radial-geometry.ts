/**
 * Geometria pura do menu em rosca da partida.
 *
 * Portada da rosca de vidas que o projeto usou antes da mesa em grade
 * (mesmas convenções: viewBox 400×400, centro em 200,200, furo de 38%,
 * ângulo 0° no topo e sentido horário).
 *
 * Diferença em relação à rosca de vidas: aqui os rótulos ficam na horizontal.
 * Quem opera o menu é quem tocou no centro, e não os quatro jogadores ao
 * redor da mesa — não há contra-rotação por fatia.
 */

export const VIEWBOX = 400;
export const CX = 200;
export const CY = 200;
export const R_OUTER = 186;
/** 72/186 ≈ 38%: abaixo disso a ponta da fatia fica estreita demais. */
export const R_INNER = 72;
/** Meio-vão angular entre fatias, em graus. */
export const GAP_DEG = 1.4;
/** Raio do rótulo: meio do anel. */
export const R_LABEL = (R_OUTER + R_INNER) / 2;
/** Raio do botão central (voltar/fechar) — cabe no furo com folga. */
export const CENTER_R = 40;

export interface Point {
  x: number;
  y: number;
}

/** Ponto polar: ângulo em graus a partir do topo, sentido horário. */
export function polar(angleDeg: number, radius: number): Point {
  const t = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.sin(t), y: CY - radius * Math.cos(t) };
}

const f = (v: number) => Math.round(v * 100) / 100;

/** Ângulos [início, meio, fim] da fatia i entre n. */
export function sliceAngles(index: number, count: number): { a0: number; mid: number; a1: number } {
  const step = 360 / count;
  const mid = index * step;
  return { a0: mid - step / 2 + GAP_DEG, mid, a1: mid + step / 2 - GAP_DEG };
}

/** Path de um setor anelar entre os ângulos a0→a1. */
export function annularSectorPath(
  a0: number,
  a1: number,
  rOuter = R_OUTER,
  rInner = R_INNER,
): string {
  const p1 = polar(a0, rOuter);
  const p2 = polar(a1, rOuter);
  const p3 = polar(a1, rInner);
  const p4 = polar(a0, rInner);
  const large = a1 - a0 > 180 ? 1 : 0;
  return (
    `M${f(p1.x)} ${f(p1.y)}` +
    `A${rOuter} ${rOuter} 0 ${large} 1 ${f(p2.x)} ${f(p2.y)}` +
    `L${f(p3.x)} ${f(p3.y)}` +
    `A${rInner} ${rInner} 0 ${large} 0 ${f(p4.x)} ${f(p4.y)}Z`
  );
}

/** Path da fatia i entre n. */
export function slicePath(index: number, count: number): string {
  const { a0, a1 } = sliceAngles(index, count);
  return annularSectorPath(a0, a1);
}

/** Onde ancorar o rótulo da fatia i (texto na horizontal). */
export function labelPoint(index: number, count: number): Point {
  const { mid } = sliceAngles(index, count);
  const p = polar(mid, R_LABEL);
  return { x: f(p.x), y: f(p.y) };
}

/** Comprimento do arco disponível para o rótulo, em unidades de viewBox. */
export function labelArcLength(count: number): number {
  const usableDeg = 360 / count - 2 * GAP_DEG;
  return 2 * Math.PI * R_LABEL * (usableDeg / 360);
}
