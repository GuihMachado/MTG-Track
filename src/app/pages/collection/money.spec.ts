import { describe, expect, it } from 'vitest';
import { formatCount, formatTotal, formatUsd, usd } from './money';

describe('formatCount', () => {
  it('separa milhar com ponto, como se escreve em português', () => {
    expect(formatCount(1284)).toBe('1.284');
    expect(formatCount(412)).toBe('412');
    expect(formatCount(0)).toBe('0');
  });

  it('nulo e undefined contam zero, não quebram a tela', () => {
    expect(formatCount(null)).toBe('0');
    expect(formatCount(undefined)).toBe('0');
  });
});

describe('formatUsd', () => {
  it('centavos abaixo de cem, inteiro acima', () => {
    expect(formatUsd(1.82)).toBe('1,82');
    expect(formatUsd(38.89)).toBe('38,89');
    expect(formatUsd(110.25)).toBe('110');
    expect(formatUsd(8740)).toBe('8.740');
  });

  it('preço indisponível é travessão, nunca zero', () => {
    // Um "US$ 0" mentiria: a carta tem preço, a Scryfall é que não o publica.
    expect(formatUsd(null)).toBe('—');
    expect(formatUsd(undefined)).toBe('—');
  });

  it('zero de verdade continua zero', () => {
    expect(formatUsd(0)).toBe('0,00');
  });
});

describe('usd', () => {
  it('prefixa a moeda, e não prefixa o travessão', () => {
    expect(usd(8740)).toBe('US$ 8.740');
    expect(usd(null)).toBe('—');
  });
});

describe('formatTotal', () => {
  it('inteiro a partir de cem: acima disso, centavos são ruído', () => {
    expect(formatTotal(8740.37)).toBe('8.740');
    expect(formatTotal(110.25)).toBe('110');
  });

  it('centavos abaixo de cem: arredondar 0,50 para 1 dobra a coleção', () => {
    expect(formatTotal(0.5)).toBe('0,50');
    expect(formatTotal(1.82)).toBe('1,82');
    expect(formatTotal(38.89)).toBe('38,89');
  });

  it('sem valor nenhum é zero seco, não zero com centavos', () => {
    expect(formatTotal(0)).toBe('0');
    expect(formatTotal(null)).toBe('0');
    expect(formatTotal(undefined)).toBe('0');
  });
});
