/**
 * Cores de assento da rosca (Grimório §02/§05).
 * Assentos usam os tokens de mana; repetição é permitida e diferenciada por:
 *  1. deslocamento tonal de 12% por ocorrência (máx. 50%) — claras escurecem, escuras clareiam;
 *  2. fio de ouro entre vizinhos da mesma cor;
 *  3. pip de letra, apenas quando a cor repete.
 */

export type SeatColorCode = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

export const SEAT_COLOR_ORDER: SeatColorCode[] = ['U', 'R', 'G', 'W', 'B', 'C'];

interface SeatColorDef {
  /* Fill da cunha — verde usa a variante -seat (o tom puro reprova AA em área grande). */
  cssVarName: string;
  /* Cor do texto sobre a cunha. */
  fg: string;
  light: boolean; // claras escurecem na repetição; escuras clareiam
  label: string;
}

export const SEAT_COLORS: Record<SeatColorCode, SeatColorDef> = {
  W: { cssVarName: '--color-mana-w', fg: 'var(--color-mana-w-ink)', light: true, label: 'White' },
  U: { cssVarName: '--color-mana-u', fg: '#FFFFFF', light: false, label: 'Blue' },
  B: { cssVarName: '--color-mana-b', fg: '#EDE7F2', light: false, label: 'Black' },
  R: { cssVarName: '--color-mana-r', fg: '#FFFFFF', light: false, label: 'Red' },
  G: { cssVarName: '--color-mana-g-seat', fg: '#FFFFFF', light: false, label: 'Green' },
  C: { cssVarName: '--color-mana-c', fg: '#14171A', light: true, label: 'Colorless' },
};

export const TONE_STEP = 12; // % por ocorrência repetida
export const TONE_MAX = 50;

/**
 * Fill CSS da k-ésima ocorrência (0-based) de uma cor.
 * O deslocamento tonal é resolvido pelo próprio CSS via color-mix.
 */
export function seatFill(code: SeatColorCode, occurrence: number): string {
  const def = SEAT_COLORS[code];
  const base = `var(${def.cssVarName})`;
  if (occurrence <= 0) return base;
  const amount = Math.min(TONE_MAX, TONE_STEP * occurrence);
  const toward = def.light ? 'black' : 'white';
  return `color-mix(in oklab, ${base}, ${toward} ${amount}%)`;
}

export interface SeatPaint {
  fill: string;
  fg: string;
  /** Pip de letra: só quando a cor aparece mais de uma vez na mesa. */
  needsPip: boolean;
  /** Fio de ouro na fronteira com o próximo assento (mesma cor lado a lado). */
  needsDividerAfter: boolean;
}

/** Pintura de todos os assentos de uma mesa, dadas as cores escolhidas em ordem. */
export function paintSeats(codes: SeatColorCode[]): SeatPaint[] {
  const total = new Map<SeatColorCode, number>();
  for (const c of codes) total.set(c, (total.get(c) ?? 0) + 1);

  const seen = new Map<SeatColorCode, number>();
  return codes.map((code, i) => {
    const occurrence = seen.get(code) ?? 0;
    seen.set(code, occurrence + 1);
    const next = codes[(i + 1) % codes.length];
    return {
      fill: seatFill(code, occurrence),
      fg: SEAT_COLORS[code].fg,
      needsPip: (total.get(code) ?? 0) > 1,
      needsDividerAfter: codes.length > 1 && next === code,
    };
  });
}
