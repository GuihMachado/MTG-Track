import { describe, expect, it } from 'vitest';
import { markLeaving, removeFloat, upsertFloat, type LifeFloat } from './float-deltas';

describe('float-deltas', () => {
  it('cria um float novo quando o assento não tem nenhum ativo', () => {
    const list = upsertFloat([], 1, 1, 10);
    expect(list).toEqual([{ key: 10, seatId: 1, amount: 1, leaving: false }]);
  });

  it('agrega toques no float ativo do mesmo assento', () => {
    let list = upsertFloat([], 1, 1, 10);
    list = upsertFloat(list, 1, 1, 11);
    list = upsertFloat(list, 1, 1, 12);
    expect(list).toEqual([{ key: 10, seatId: 1, amount: 3, leaving: false }]);
  });

  it('assentos diferentes têm floats independentes', () => {
    let list = upsertFloat([], 1, 1, 10);
    list = upsertFloat(list, 2, -1, 11);
    expect(list).toHaveLength(2);
    expect(list.find(f => f.seatId === 2)?.amount).toBe(-1);
  });

  it('soma que zera remove o float (+1 depois -1)', () => {
    let list = upsertFloat([], 1, 1, 10);
    list = upsertFloat(list, 1, -1, 11);
    expect(list).toEqual([]);
  });

  it('float em saída não recebe mais toques: nasce um novo', () => {
    let list = upsertFloat([], 1, 2, 10);
    list = markLeaving(list, 1);
    list = upsertFloat(list, 1, 1, 11);
    expect(list).toHaveLength(2);
    expect(list.find(f => f.key === 10)).toMatchObject({ amount: 2, leaving: true });
    expect(list.find(f => f.key === 11)).toMatchObject({ amount: 1, leaving: false });
  });

  it('markLeaving só afeta o float ativo do assento pedido', () => {
    const list: LifeFloat[] = [
      { key: 1, seatId: 1, amount: 3, leaving: false },
      { key: 2, seatId: 2, amount: -2, leaving: false },
    ];
    const next = markLeaving(list, 1);
    expect(next.find(f => f.key === 1)?.leaving).toBe(true);
    expect(next.find(f => f.key === 2)?.leaving).toBe(false);
  });

  it('removeFloat tira só a key pedida', () => {
    const list: LifeFloat[] = [
      { key: 1, seatId: 1, amount: 3, leaving: true },
      { key: 2, seatId: 1, amount: 1, leaving: false },
    ];
    expect(removeFloat(list, 1)).toEqual([{ key: 2, seatId: 1, amount: 1, leaving: false }]);
  });
});
