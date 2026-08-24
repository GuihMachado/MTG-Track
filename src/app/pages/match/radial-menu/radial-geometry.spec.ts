import { describe, expect, it } from 'vitest';
import {
  CENTER_R,
  CX,
  CY,
  GAP_DEG,
  labelArcLength,
  labelPoint,
  polar,
  R_INNER,
  R_LABEL,
  R_OUTER,
  slicePath,
  sliceAngles,
} from './radial-geometry';

/** Tamanhos reais de menu: 4 (vidas/dado), 5 (raiz), 6 (mesa cheia em Cores). */
const CONTAGENS = [4, 5, 6];

describe('radial-geometry', () => {
  it('divide o círculo em fatias iguais de 360/n', () => {
    for (const n of CONTAGENS) {
      const step = 360 / n;
      for (let i = 0; i < n; i++) {
        const { a0, mid, a1 } = sliceAngles(i, n);
        expect(mid).toBeCloseTo(i * step, 9);
        expect(a1 - a0).toBeCloseTo(step - 2 * GAP_DEG, 9);
      }
    }
  });

  it('deixa vão entre fatias vizinhas, sem sobreposição', () => {
    for (const n of CONTAGENS) {
      for (let i = 0; i < n; i++) {
        const atual = sliceAngles(i, n);
        const proxima = sliceAngles((i + 1) % n, n);
        const inicioProxima = i + 1 === n ? proxima.a0 + 360 : proxima.a0;
        expect(atual.a1).toBeLessThan(inicioProxima);
      }
    }
  });

  it('polar: 0° é o topo e o sentido é horário', () => {
    expect(polar(0, R_OUTER)).toEqual({ x: CX, y: CY - R_OUTER });
    const direita = polar(90, R_OUTER);
    expect(direita.x).toBeCloseTo(CX + R_OUTER, 9);
    expect(direita.y).toBeCloseTo(CY, 9);
  });

  it('mantém o furo de ~38% do Grimório', () => {
    expect(R_INNER / R_OUTER).toBeCloseTo(0.387, 2);
  });

  it('o botão central cabe no furo sem tocar o anel', () => {
    expect(CENTER_R).toBeLessThan(R_INNER - 4);
  });

  it('o rótulo fica dentro do anel, com folga das duas bordas', () => {
    for (const n of CONTAGENS) {
      for (let i = 0; i < n; i++) {
        const p = labelPoint(i, n);
        const distancia = Math.hypot(p.x - CX, p.y - CY);
        expect(distancia).toBeGreaterThan(R_INNER + 20);
        expect(distancia).toBeLessThan(R_OUTER - 20);
        expect(distancia).toBeCloseTo(R_LABEL, 1);
      }
    }
  });

  it('sobra arco para o rótulo mesmo com a mesa cheia', () => {
    // 6 fatias é o pior caso (submenu de cores numa mesa de 6).
    expect(labelArcLength(6)).toBeGreaterThan(90);
    // Quanto menos fatias, mais espaço.
    expect(labelArcLength(4)).toBeGreaterThan(labelArcLength(6));
  });

  it('o path da fatia começa na borda externa e fecha o setor', () => {
    const { a0 } = sliceAngles(2, 5);
    const inicio = polar(a0, R_OUTER);
    const d = slicePath(2, 5);
    expect(d.startsWith(`M${Math.round(inicio.x * 100) / 100} ${Math.round(inicio.y * 100) / 100}`)).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    // Dois arcos (borda externa e interna) e uma reta ligando.
    expect(d.match(/A/g)).toHaveLength(2);
    expect(d).toContain('L');
  });
});
