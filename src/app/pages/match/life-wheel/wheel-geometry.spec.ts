import { describe, expect, it } from 'vitest';
import {
  CX, CY, R_INNER, R_OUTER,
  hintAngles, lifeFontSize, polar, seatAngles, seatPath, tapHalves,
} from './wheel-geometry';
import { paintSeats } from './seat-colors';

describe('wheel-geometry', () => {
  it('divide o círculo em setores iguais de 360/n', () => {
    for (const n of [2, 3, 4, 5, 6]) {
      const step = 360 / n;
      for (let i = 0; i < n; i++) {
        const { a0, mid, a1 } = seatAngles(i, n);
        expect(mid).toBeCloseTo(i * step, 5);
        expect(a1 - a0).toBeCloseTo(step - 2.8, 5); // step − 2·GAP
      }
    }
  });

  it('polar: 0° é o topo, sentido horário', () => {
    expect(polar(0, R_OUTER)).toEqual({ x: CX, y: CY - R_OUTER });
    const right = polar(90, R_OUTER);
    expect(right.x).toBeCloseTo(CX + R_OUTER, 5);
    expect(right.y).toBeCloseTo(CY, 5);
  });

  it('furo de 38%: raio interno ≈ 0.38 · raio externo', () => {
    expect(R_INNER / R_OUTER).toBeCloseTo(0.387, 2);
  });

  it('metades de toque cobrem o setor: plus termina onde minus começa', () => {
    const { a0, mid, a1 } = seatAngles(2, 5);
    const halves = tapHalves(2, 5);
    // plus é a metade [a0, mid], minus é [mid, a1]
    expect(halves.plus).toContain(pathStart(a0));
    expect(halves.minus).toContain(pathStart(mid));
    expect(a1).toBeGreaterThan(mid);

    function pathStart(angle: number): string {
      const p = polar(angle, R_OUTER);
      return `M${Math.round(p.x * 100) / 100} ${Math.round(p.y * 100) / 100}`;
    }
  });

  it('hints ± ficam no centro de cada metade', () => {
    const { a0, mid, a1 } = seatAngles(1, 4);
    const h = hintAngles(1, 4);
    expect(h.plus).toBeCloseTo((a0 + mid) / 2, 5);
    expect(h.minus).toBeCloseTo((mid + a1) / 2, 5);
  });

  it('corpo do numeral por nº de assentos (espec §05)', () => {
    expect(lifeFontSize(2)).toBe(68);
    expect(lifeFontSize(3)).toBe(60);
    expect(lifeFontSize(4)).toBe(53);
    expect(lifeFontSize(5)).toBe(46);
    expect(lifeFontSize(6)).toBe(42);
  });

  it('seatPath produz um path fechado com dois arcos', () => {
    const d = seatPath(0, 4);
    expect(d).toMatch(/^M[\d. ]+A.+L.+A.+Z$/);
  });
});

describe('seat-colors · repetição', () => {
  it('cores distintas: sem pip, sem divisor, fill puro', () => {
    const paints = paintSeats(['U', 'R', 'G', 'W']);
    expect(paints.every(p => !p.needsPip && !p.needsDividerAfter)).toBe(true);
    expect(paints[0].fill).toBe('var(--color-mana-u)');
    expect(paints[2].fill).toBe('var(--color-mana-g-seat)'); // verde usa -seat
  });

  it('cor repetida: 2ª ocorrência desloca 12%, pips em ambas', () => {
    const paints = paintSeats(['U', 'U', 'R']);
    expect(paints[0].fill).toBe('var(--color-mana-u)');
    expect(paints[1].fill).toBe('color-mix(in oklab, var(--color-mana-u), white 12%)');
    expect(paints[0].needsPip).toBe(true);
    expect(paints[1].needsPip).toBe(true);
    expect(paints[2].needsPip).toBe(false);
  });

  it('vizinhos iguais ganham divisor de ouro (incluindo o fecho do círculo)', () => {
    const paints = paintSeats(['U', 'U', 'R', 'U']);
    expect(paints[0].needsDividerAfter).toBe(true);  // U|U
    expect(paints[1].needsDividerAfter).toBe(false); // U|R
    expect(paints[3].needsDividerAfter).toBe(true);  // último U | primeiro U (wrap)
  });

  it('deslocamento tonal satura em 50%', () => {
    const paints = paintSeats(['R', 'R', 'R', 'R', 'R', 'R']);
    expect(paints[5].fill).toBe('color-mix(in oklab, var(--color-mana-r), white 50%)');
  });

  it('cores claras escurecem em vez de clarear', () => {
    const paints = paintSeats(['W', 'W']);
    expect(paints[1].fill).toBe('color-mix(in oklab, var(--color-mana-w), black 12%)');
  });
});
