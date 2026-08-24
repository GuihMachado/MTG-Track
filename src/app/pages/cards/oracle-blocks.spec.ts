import { describe, expect, it } from 'vitest';
import { describeManaCost, parseOracleLine, parseOracleLines } from './oracle-blocks';

describe('oracle-blocks', () => {
  it('reconhece a linha de palavras-chave', () => {
    const block = parseOracleLine('Voar, ameaça');
    expect(block.kind).toBe('keywords');
    // Palavra-chave aparece capitalizada na carta, mesmo vinda em minúscula.
    expect(block.keywords).toEqual(['Voar', 'Ameaça']);
  });

  it('não confunde frase com palavras-chave', () => {
    expect(parseOracleLine('Norman Osborn não pode ser bloqueado.').kind).toBe('rule');
    expect(parseOracleLine('Voar, ameaça, vigilância, atropelar, iniciativa').kind).toBe('rule');
  });

  it('separa custo de habilidade ativada', () => {
    const block = parseOracleLine('{1}{U}{B}{R}: Transforme Norman Osborn.');
    expect(block.cost).toBe('{1}{U}{B}{R}');
    expect(block.text).toBe('Transforme Norman Osborn.');
  });

  it('aceita custo com virar no meio', () => {
    const block = parseOracleLine('{2}, {T}: Compre uma carta.');
    expect(block.cost).toBe('{2}{T}');
    expect(block.text).toBe('Compre uma carta.');
  });

  it('extrai o texto lembrete do fim da linha', () => {
    const block = parseOracleLine('Sempre que ele causar dano, ele trama. (Compre e descarte.)');
    expect(block.text).toBe('Sempre que ele causar dano, ele trama.');
    expect(block.reminder).toBe('Compre e descarte.');
  });

  it('mantém a linha inteira quando ela é só o lembrete', () => {
    const block = parseOracleLine('(As regras de tempo ainda se aplicam.)');
    expect(block.reminder).toBeNull();
    expect(block.text).toBe('(As regras de tempo ainda se aplicam.)');
  });

  it('separa o rótulo de habilidade nomeada', () => {
    const block = parseOracleLine('Fórmula do Duende — Cada carta no seu cemitério tem caos.');
    expect(block.label).toBe('Fórmula do Duende');
    expect(block.text).toBe('Cada carta no seu cemitério tem caos.');
  });

  it('não trata travessão no meio da frase como rótulo', () => {
    // Sem espaço em volta do travessão não é rótulo, é pontuação.
    const block = parseOracleLine('Escolha uma—compre uma carta; ou ganhe 2 pontos de vida.');
    expect(block.label).toBeNull();
  });

  it('descarta linha que ficaria vazia', () => {
    expect(parseOracleLines(['Voar', '', '   '])).toHaveLength(1);
  });

  it('descreve o custo em palavras para o leitor de tela', () => {
    expect(describeManaCost('{1}{U}')).toBe('custo: 1 genérico, azul');
    expect(describeManaCost('{W/U}')).toBe('custo: branco ou azul');
    expect(describeManaCost('{G/P}')).toBe('custo: verde ou phyrexiano');
    expect(describeManaCost('')).toBe('sem custo');
  });
});
