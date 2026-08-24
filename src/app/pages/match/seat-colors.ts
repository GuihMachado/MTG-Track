/**
 * Cores de assento da mesa (Levitação, lei 2: "cor de mana é luz, não tinta").
 *
 * A cor nunca preenche o assento. Ela entra em quatro camadas — halo no topo
 * da placa, borda tingida, sombra colorida e glow no numeral — todas derivadas
 * dos mesmos canais RGB (`--mana-*-rgb`). Com a placa escura por baixo, o
 * numeral é sempre claro, em qualquer cor: é isso que dispensa o
 * `--color-mana-g-seat` e o `--color-mana-w-ink` no assento.
 *
 * Os alfas são calibrados por cor, não iguais: branco a .34 de halo estoura e
 * verde a .42 de borda vira neon. Os valores vêm do padrão aprovado.
 */

export type SeatColorCode = 'W' | 'U' | 'B' | 'R' | 'G' | 'C';

export const SEAT_COLOR_ORDER: SeatColorCode[] = ['U', 'R', 'G', 'W', 'B', 'C'];

interface SeatColorDef {
  /* Canais RGB para a camada de luz. */
  rgbVarName: string;
  label: string;
  /* Topo do gradiente da placa do assento: a mana tinge, não pinta. */
  plateTop: string;
  /* Numeral: branco com viés da mana. */
  ink: string;
  /* Alfas da camada de luz. */
  halo: number;
  border: number;
  shadow: number;
  glow: number;
}

export const SEAT_COLORS: Record<SeatColorCode, SeatColorDef> = {
  W: {
    rgbVarName: '--mana-w-rgb',
    label: 'White',
    plateTop: '#1C1A20',
    ink: '#FFFBF0',
    halo: 0.26,
    border: 0.34,
    shadow: 0.5,
    glow: 0.45,
  },
  U: {
    rgbVarName: '--mana-u-rgb',
    label: 'Blue',
    plateTop: '#141224',
    ink: '#EAF1FF',
    halo: 0.34,
    border: 0.42,
    shadow: 0.8,
    glow: 0.65,
  },
  B: {
    rgbVarName: '--mana-b-rgb',
    label: 'Black',
    plateTop: '#181622',
    ink: '#EDE7F2',
    halo: 0.3,
    border: 0.4,
    shadow: 0.6,
    glow: 0.5,
  },
  R: {
    rgbVarName: '--mana-r-rgb',
    label: 'Red',
    plateTop: '#1B1220',
    ink: '#FFEDEA',
    halo: 0.34,
    border: 0.42,
    shadow: 0.8,
    glow: 0.7,
  },
  G: {
    rgbVarName: '--mana-g-rgb',
    label: 'Green',
    plateTop: '#111C19',
    ink: '#E9FBF0',
    halo: 0.32,
    border: 0.4,
    shadow: 0.75,
    glow: 0.6,
  },
  C: {
    rgbVarName: '--mana-c-rgb',
    label: 'Colorless',
    plateTop: '#17181C',
    ink: '#F2F4F6',
    halo: 0.28,
    border: 0.36,
    shadow: 0.6,
    glow: 0.5,
  },
};

/** Pintura de um assento: tudo o que a folha de estilo precisa por cor. */
export interface SeatPaint {
  /** Canais RGB da camada de luz, em `rgb(var(--mana-rgb) / alfa)`. */
  rgb: string;
  plateTop: string;
  ink: string;
  halo: number;
  border: number;
  shadow: number;
  glow: number;
}

export function seatPaint(code: SeatColorCode): SeatPaint {
  const def = SEAT_COLORS[code];
  return {
    rgb: `var(${def.rgbVarName})`,
    plateTop: def.plateTop,
    ink: def.ink,
    halo: def.halo,
    border: def.border,
    shadow: def.shadow,
    glow: def.glow,
  };
}

/**
 * Pintura de todos os assentos da mesa. Cor repetida não muda de tom: o que
 * diferencia dois assentos da mesma cor é o pip de letra, agora sempre visível
 * (a cor rebaixada a halo não carrega mais essa identificação sozinha).
 */
export function paintSeats(codes: SeatColorCode[]): SeatPaint[] {
  return codes.map(seatPaint);
}
