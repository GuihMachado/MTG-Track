/**
 * Geometria pura da rosca de vidas (Grimório §05).
 * Portada do protótipo SVG aprovado — sem dependência de Angular, testável isolada.
 *
 * Convenções: viewBox 400×400, centro (200,200), raio externo 186,
 * furo de 38% (raio interno 72). Ângulo 0° = topo, sentido horário.
 * O assento i ocupa a cunha centrada em i * (360/n).
 */

export const VIEWBOX = 400;
export const CX = 200;
export const CY = 200;
export const R_OUTER = 186;
export const R_INNER = 72; // 72/186 ≈ 38% — não reduzir: estreitaria a ponta da cunha
export const GAP_DEG = 1.4; // meio-vão angular entre assentos

export const R_NAME = 96;   // raio do rótulo de nome (bordo interno)
export const R_LIFE = 138;  // raio do numeral de vidas
export const R_HINT = 168;  // raio dos hints + / −
export const R_PIP = 164;   // raio do pip de letra (cor repetida)

/** Corpo do numeral por nº de assentos, em unidades de viewBox (≈px numa roda de 360px). */
export function lifeFontSize(n: number): number {
  const sizes: Record<number, number> = { 2: 68, 3: 60, 4: 53, 5: 46, 6: 42 };
  return sizes[n] ?? 53;
}

export interface Point { x: number; y: number; }

/** Ponto polar: ângulo em graus a partir do topo, sentido horário. */
export function polar(angleDeg: number, radius: number): Point {
  const t = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.sin(t), y: CY - radius * Math.cos(t) };
}

const f = (v: number) => Math.round(v * 100) / 100;

/** Ângulos [início, meio, fim] da cunha do assento i entre n. */
export function seatAngles(i: number, n: number): { a0: number; mid: number; a1: number } {
  const step = 360 / n;
  const mid = i * step;
  return { a0: mid - step / 2 + GAP_DEG, mid, a1: mid + step / 2 - GAP_DEG };
}

/** Path de um setor anelar entre os ângulos a0→a1. */
export function annularSectorPath(a0: number, a1: number, rOuter = R_OUTER, rInner = R_INNER): string {
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

/** Path do setor completo do assento i. */
export function seatPath(i: number, n: number): string {
  const { a0, a1 } = seatAngles(i, n);
  return annularSectorPath(a0, a1);
}

/**
 * Paths das metades de toque do assento i.
 * `plus` é a metade à direita DO JOGADOR (que olha para o centro): a metade de ângulo menor.
 */
export function tapHalves(i: number, n: number): { plus: string; minus: string } {
  const { a0, mid, a1 } = seatAngles(i, n);
  return {
    plus: annularSectorPath(a0, mid),
    minus: annularSectorPath(mid, a1),
  };
}

/** Arco de estado crítico (4px de traço) no bordo externo do assento i. */
export function warningArcPath(i: number, n: number): string {
  const { a0, a1 } = seatAngles(i, n);
  const r = R_OUTER - 4;
  const p1 = polar(a0 + 1, r);
  const p2 = polar(a1 - 1, r);
  const large = a1 - a0 - 2 > 180 ? 1 : 0;
  return `M${f(p1.x)} ${f(p1.y)}A${r} ${r} 0 ${large} 1 ${f(p2.x)} ${f(p2.y)}`;
}

/**
 * Transform SVG para texto no raio `radius` do assento i, girado mid+180°:
 * o topo dos glifos aponta para o centro da mesa (leitura do ponto de vista do jogador).
 * Usar com <text x=CX y=CY-radius text-anchor="middle" dominant-baseline="central">.
 */
export function seatTextTransform(angleDeg: number, radius: number): { group: string; text: string } {
  const y = CY - radius;
  return {
    group: `rotate(${f(angleDeg)} ${CX} ${CY})`,
    text: `rotate(180 ${CX} ${y})`,
  };
}

/** Ângulos dos hints +/− (centro de cada metade). */
export function hintAngles(i: number, n: number): { plus: number; minus: number } {
  const { a0, mid, a1 } = seatAngles(i, n);
  return { plus: mid - (mid - a0) / 2, minus: mid + (a1 - mid) / 2 };
}

/** Linha divisória entre o assento i e o vizinho i+1 (fio de ouro quando cores repetem). */
export function dividerLine(i: number, n: number): { x1: number; y1: number; x2: number; y2: number } {
  const step = 360 / n;
  const boundary = i * step + step / 2;
  const p1 = polar(boundary, R_INNER);
  const p2 = polar(boundary, R_OUTER + 2);
  return { x1: f(p1.x), y1: f(p1.y), x2: f(p2.x), y2: f(p2.y) };
}
