import { describe, expect, it } from 'vitest';
import {
  cycleCounter,
  SEAT_COUNTER_ORDER,
  swipeTowardPlayer,
} from './seat-counters';

describe('seat-counters', () => {
  it('cicla para frente na ordem vida → veneno → energia → … → radiação → vida', () => {
    let kind = SEAT_COUNTER_ORDER[0]!;
    const visitados = [kind];
    for (let i = 1; i < SEAT_COUNTER_ORDER.length; i++) {
      kind = cycleCounter(kind, 1);
      visitados.push(kind);
    }
    expect(visitados).toEqual([...SEAT_COUNTER_ORDER]);
    expect(cycleCounter(kind, 1)).toBe('life'); // fecha o ciclo
  });

  it('cicla para trás e dá a volta a partir da vida', () => {
    expect(cycleCounter('life', -1)).toBe('rad');
    expect(cycleCounter('energy', -1)).toBe('poison');
  });

  it('deslize "para o jogador" segue a orientação do assento', () => {
    // Jogador da esquerda: puxar para o próprio corpo = arrastar para a esquerda da tela.
    expect(swipeTowardPlayer('left', -50, 0)).toBeGreaterThan(0);
    expect(swipeTowardPlayer('left', 50, 0)).toBeLessThan(0);
    // Jogador da direita: o espelho.
    expect(swipeTowardPlayer('right', 50, 0)).toBeGreaterThan(0);
    // Assento largo de baixo (0°): para baixo da tela.
    expect(swipeTowardPlayer('down', 0, 50)).toBeGreaterThan(0);
    // Assento de cima (180°): para cima da tela.
    expect(swipeTowardPlayer('up', 0, -50)).toBeGreaterThan(0);
  });

  it('deslize no eixo de vida (perpendicular) não conta para o ciclo', () => {
    // toBeCloseTo: 'left' devolve -dx, e -0 !== 0 para o Object.is do toBe.
    expect(swipeTowardPlayer('left', 0, 80)).toBeCloseTo(0);
    expect(swipeTowardPlayer('down', 80, 0)).toBeCloseTo(0);
  });
});
