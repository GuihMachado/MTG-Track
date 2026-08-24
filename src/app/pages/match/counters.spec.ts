import { describe, expect, it } from 'vitest';
import { COUNTER_TYPES, emptyCounters, normalizeCounters } from './counters';

describe('counters', () => {
  it('começa tudo em zero', () => {
    expect(emptyCounters()).toEqual({ energy: 0, experience: 0, treasure: 0, rad: 0 });
  });

  it('save antigo sem o campo vira tudo zero', () => {
    expect(normalizeCounters(undefined)).toEqual(emptyCounters());
    expect(normalizeCounters(null)).toEqual(emptyCounters());
  });

  it('shape parcial completa as chaves que faltam', () => {
    expect(normalizeCounters({ energy: 3 })).toEqual({ energy: 3, experience: 0, treasure: 0, rad: 0 });
  });

  it('nunca fica negativo e descarta lixo', () => {
    const sujo = { energy: -2, experience: 'abc', treasure: 1.9, rad: Infinity } as never;
    expect(normalizeCounters(sujo)).toEqual({ energy: 0, experience: 0, treasure: 1, rad: 0 });
  });

  it('emptyCounters devolve um objeto novo a cada chamada', () => {
    const a = emptyCounters();
    a.energy = 5;
    expect(emptyCounters().energy).toBe(0);
  });

  it('a lista de tipos cobre exatamente o mapa', () => {
    expect(Object.keys(emptyCounters()).sort()).toEqual([...COUNTER_TYPES].sort());
  });
});
