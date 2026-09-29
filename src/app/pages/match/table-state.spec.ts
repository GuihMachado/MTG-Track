import { describe, expect, it } from 'vitest';
import { clockTime, describeDiff, formatClock, isOut, lifeLine, sameTable, SeatSnapshot, toTableState } from './table-state';
import { emptyCounters } from './counters';

function seat(userId: number, life: number, extra: Partial<SeatSnapshot> = {}): SeatSnapshot {
  return { userId, seatColor: 'U', life, poison: 0, counters: emptyCounters(), ...extra };
}

describe('mesa salva', () => {
  const table = toTableState([seat(1, 40), seat(2, 32), seat(3, 18)], 40);

  it('guarda os assentos na ordem da mesa, com a vida inicial', () => {
    expect(table.startingLife).toBe(40);
    expect(table.seats.map(s => s.userId)).toEqual([1, 2, 3]);
    expect(table.seats[0]!.counters).toEqual({ energy: 0, experience: 0, treasure: 0, rad: 0 });
  });

  it('mesa idêntica não pede escolha', () => {
    const copy = toTableState([seat(1, 40), seat(2, 32), seat(3, 18)], 40);
    expect(sameTable(table, copy)).toBe(true);
  });

  it('qualquer diferença de vida, veneno, contador, cor ou lugar pede escolha', () => {
    expect(sameTable(table, toTableState([seat(1, 40), seat(2, 31), seat(3, 18)], 40))).toBe(false);
    expect(sameTable(table, toTableState([seat(1, 40), seat(2, 32, { poison: 1 }), seat(3, 18)], 40))).toBe(false);
    expect(
      sameTable(table, toTableState([seat(1, 40), seat(2, 32), seat(3, 18, { counters: { ...emptyCounters(), treasure: 2 } })], 40)),
    ).toBe(false);
    expect(sameTable(table, toTableState([seat(1, 40, { seatColor: 'R' }), seat(2, 32), seat(3, 18)], 40))).toBe(false);
    expect(sameTable(table, toTableState([seat(2, 32), seat(1, 40), seat(3, 18)], 40))).toBe(false);
  });

  it('mesa ausente nunca é igual', () => {
    expect(sameTable(table, null)).toBe(false);
    expect(sameTable(undefined, table)).toBe(false);
  });

  it('contador ausente conta como zero (mesa salva antes dos contadores)', () => {
    const old = { startingLife: 40, seats: table.seats.map(s => ({ ...s, counters: {} })) };
    expect(sameTable(table, old)).toBe(true);
  });

  it('diz o que difere, com nome — inclusive quando as vidas são iguais', () => {
    const names = new Map([[1, 'Ana'], [2, 'Bruno'], [3, 'Rafa']]);
    const colorOnly = toTableState([seat(1, 40, { seatColor: 'R' }), seat(2, 32), seat(3, 18)], 40);
    expect(describeDiff(table, colorOnly, names)).toBe('cor de Ana');

    const many = toTableState(
      [seat(1, 39), seat(2, 30, { poison: 2 }), seat(3, 18, { counters: { ...emptyCounters(), rad: 1 } })],
      40,
    );
    expect(describeDiff(table, many, names)).toBe('vida de Ana, vida de Bruno, veneno de Bruno e mais 1');

    const swapped = toTableState([seat(2, 32), seat(1, 40), seat(3, 18)], 40);
    expect(describeDiff(table, swapped, names)).toBe('ordem dos lugares');
  });

  it('linha de vidas para comparar de relance', () => {
    expect(lifeLine(table)).toBe('40 · 32 · 18');
  });

  it('fora por vida ou por veneno', () => {
    expect(isOut(0, 0)).toBe(true);
    expect(isOut(-3, 0)).toBe(true);
    expect(isOut(12, 10)).toBe(true);
    expect(isOut(1, 9)).toBe(false);
  });

  it('cronômetro em mm:ss e h:mm:ss', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock((38 * 60 + 7) * 1000)).toBe('38:07');
    expect(formatClock((72 * 60 + 40) * 1000)).toBe('1:12:40');
    expect(formatClock(-5000)).toBe('00:00');
  });

  it('hora do salvamento com dois dígitos', () => {
    expect(clockTime(new Date(2026, 8, 28, 9, 5))).toBe('09:05');
  });
});
