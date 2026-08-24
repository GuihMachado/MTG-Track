import { describe, expect, it } from 'vitest';
import { gridRows, lifeFontSize, MAX_SEATS, seatSlots } from './grid-layout';
import { paintSeats } from '../seat-colors';

describe('grid-layout', () => {
  it('usa 2 colunas e ceil(n/2) linhas, exceto na mesa de 2', () => {
    expect(gridRows(1)).toBe(1);
    // Mesa de 2 empilha: duas linhas de largura cheia.
    expect(gridRows(2)).toBe(2);
    expect(gridRows(3)).toBe(2);
    expect(gridRows(4)).toBe(2);
    expect(gridRows(5)).toBe(3);
    expect(gridRows(6)).toBe(3);
  });

  it('mesa de 2 fica frente a frente, empilhada', () => {
    const slots = seatSlots(2);
    // Os dois ocupam a linha inteira, um em cima e outro embaixo.
    expect(slots.every(s => s.wide)).toBe(true);
    expect(slots.map(s => s.orientation)).toEqual(['up', 'down']);
    expect(slots.map(s => s.rotation)).toEqual([180, 0]);
    // Cada um tem o − à sua própria esquerda: espelhado entre os dois.
    expect(slots[0]!.minusZone).toBe('zone-right');
    expect(slots[1]!.minusZone).toBe('zone-left');
  });

  it('cria uma célula por jogador, de 1 a 6', () => {
    for (let n = 1; n <= MAX_SEATS; n++) {
      expect(seatSlots(n)).toHaveLength(n);
    }
  });

  it('com número ímpar, só a última célula é larga', () => {
    for (const n of [1, 3, 5]) {
      const slots = seatSlots(n);
      expect(slots.filter(s => s.wide).map(s => s.index)).toEqual([n - 1]);
    }
  });

  it('com número par acima de 2, nenhuma célula é larga', () => {
    for (const n of [4, 6]) {
      expect(seatSlots(n).some(s => s.wide)).toBe(false);
    }
  });

  it('mesa de 5 tem 4 quadrados e 1 retângulo', () => {
    const slots = seatSlots(5);
    expect(slots.filter(s => !s.wide)).toHaveLength(4);
    expect(slots.filter(s => s.wide)).toHaveLength(1);
  });

  it('gira a coluna da esquerda e a da direita para lados opostos', () => {
    const slots = seatSlots(6);
    for (const slot of slots) {
      expect(slot.rotation).toBe(slot.index % 2 === 0 ? 90 : -90);
    }
  });

  it('deixa a célula larga na leitura de quem está de frente', () => {
    const wide = seatSlots(5).at(-1)!;
    expect(wide.orientation).toBe('down');
    expect(wide.rotation).toBe(0);
  });

  it('mantém o "−" à esquerda e o "+" à direita de quem senta na célula', () => {
    // Mesa de 4: duas colunas de verdade (a de 2 é empilhada, caso próprio).
    const [left, right] = seatSlots(4);
    // Sentado à esquerda da tela: a sua esquerda é o topo do celular.
    expect(left!.minusZone).toBe('zone-top');
    expect(left!.plusZone).toBe('zone-bottom');
    // Sentado à direita: tudo espelhado.
    expect(right!.minusZone).toBe('zone-bottom');
    expect(right!.plusZone).toBe('zone-top');
  });

  it('nunca coloca as duas zonas de toque no mesmo lugar', () => {
    for (let n = 1; n <= MAX_SEATS; n++) {
      for (const slot of seatSlots(n)) {
        expect(slot.minusZone).not.toBe(slot.plusZone);
      }
    }
  });

  it('protege contra contagens fora da faixa', () => {
    expect(seatSlots(0)).toHaveLength(1);
    expect(seatSlots(-3)).toHaveLength(1);
    expect(seatSlots(99)).toHaveLength(MAX_SEATS);
    expect(gridRows(99)).toBe(3);
  });

  it('diminui o numeral conforme a mesa enche', () => {
    const sizes = [1, 2, 3, 4, 5, 6].map(lifeFontSize);
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]!).toBeLessThanOrEqual(sizes[i - 1]!);
    }
    expect(lifeFontSize(6)).toBeGreaterThan(0);
  });

  it('segue usando a pintura de assentos da mesa', () => {
    const paints = paintSeats(['U', 'U', 'R']);
    expect(paints).toHaveLength(3);
    // Cor repetida pinta igual: o que diferencia os dois assentos é o pip de
    // letra, sempre visível, não um deslocamento de tom.
    expect(paints[0]).toEqual(paints[1]);
    expect(paints[2]!.rgb).not.toBe(paints[0]!.rgb);
    // A cor entra como luz: canais soltos e alfas por cor, nunca fill chapado.
    expect(paints[0]!.rgb).toBe('var(--mana-u-rgb)');
    expect(paints[0]!.halo).toBeGreaterThan(0);
    expect(paints[0]!.halo).toBeLessThan(1);
  });
});
