import { describe, expect, it } from 'vitest';
import { parseList, parseLine, totalCards } from './parse-list';

describe('parseLine', () => {
  it('lê a forma completa: quantidade, nome, edição e número', () => {
    expect(parseLine('1 Sol Ring (C21) 263', 1, 'main')).toEqual({
      line: 1,
      raw: '1 Sol Ring (C21) 263',
      quantity: 1,
      name: 'Sol Ring',
      setCode: 'C21',
      collectorNumber: '263',
      foil: false,
      section: 'main',
    });
  });

  it('aceita o "x" na quantidade e nome sem edição', () => {
    const line = parseLine('1x Sol Ring', 2, 'main');
    // O nome inteiro tem de sobreviver: uma regex só engoliria "Ring" como
    // número de colecionador.
    expect(line?.name).toBe('Sol Ring');
    expect(line?.quantity).toBe(1);
    expect(line?.setCode).toBeNull();
    expect(line?.collectorNumber).toBeNull();
  });

  it('sem quantidade, é uma cópia', () => {
    expect(parseLine('Sol Ring', 3, 'main')?.quantity).toBe(1);
  });

  it('quantidade maior que um', () => {
    expect(parseLine('4 Anel Solar', 4, 'main')).toMatchObject({
      quantity: 4,
      name: 'Anel Solar',
    });
  });

  it('marca foil em qualquer uma das três notações', () => {
    expect(parseLine('1 Sol Ring (C21) 263 *F*', 5, 'main')).toMatchObject({
      name: 'Sol Ring',
      setCode: 'C21',
      collectorNumber: '263',
      foil: true,
    });
    expect(parseLine('1 Sol Ring [foil]', 6, 'main')).toMatchObject({ name: 'Sol Ring', foil: true });
    expect(parseLine('1 Sol Ring (foil)', 7, 'main')).toMatchObject({ name: 'Sol Ring', foil: true });
  });

  it('número sem edição não vira número de colecionador', () => {
    // "Fire // Ice 2" existe; assumir que o 2 é impressão perderia o nome.
    const line = parseLine('1 Fire // Ice 2', 8, 'main');
    expect(line?.name).toBe('Fire // Ice 2');
    expect(line?.collectorNumber).toBeNull();
  });

  it('nome de dupla face fica inteiro', () => {
    expect(parseLine('1 Wear // Tear (DIS) 133', 9, 'main')).toMatchObject({
      name: 'Wear // Tear',
      setCode: 'DIS',
      collectorNumber: '133',
    });
  });

  it('descarta o ruído que os sites grudam na linha', () => {
    expect(parseLine('1 Sol Ring [Ramp]', 10, 'main')?.name).toBe('Sol Ring');
    expect(parseLine('1 Sol Ring # comprar depois', 11, 'main')?.name).toBe('Sol Ring');
  });

  it('linha sem nome não vira carta', () => {
    expect(parseLine('4', 12, 'main')).toBeNull();
  });
});

describe('parseList', () => {
  it('ignora linha vazia, comentário e cerquilha', () => {
    const lines = parseList(['', '// meu deck', '# rascunho', '1 Sol Ring', '   '].join('\n'));
    expect(lines).toHaveLength(1);
    expect(lines[0]!.name).toBe('Sol Ring');
  });

  it('numera a linha pelo texto original, não pela ordem do resultado', () => {
    // A tela mostra "linha 3" para o usuário conferir sem voltar à fonte.
    const lines = parseList(['// nota', '', '1 Sol Ring'].join('\n'));
    expect(lines[0]!.line).toBe(3);
  });

  it('cabeçalho de seção muda a seção corrente', () => {
    const lines = parseList(
      ['Commander:', '1 Ayli, Eternal Pilgrim', 'Deck:', '1 Sol Ring', 'Sideboard:', '1 Duress'].join(
        '\n',
      ),
    );

    expect(lines.map(line => line.section)).toEqual(['commander', 'main', 'sideboard']);
  });

  it('cabeçalho com contagem e abreviação também contam', () => {
    const lines = parseList(['Sideboard (15):', '1 Duress', 'SB:', '1 Negate'].join('\n'));
    expect(lines.map(line => line.section)).toEqual(['sideboard', 'sideboard']);
  });

  it('lista sem cabeçalho é toda deck principal', () => {
    const lines = parseList(['1 Sol Ring', '1 Cyclonic Rift'].join('\n'));
    expect(lines.every(line => line.section === 'main')).toBe(true);
  });

  it('cabeçalho desconhecido vira seção própria, não engole a carta seguinte', () => {
    const lines = parseList(['Artifacts:', '1 Sol Ring'].join('\n'));
    expect(lines).toHaveLength(1);
    expect(lines[0]!.section).toBe('artifacts');
  });

  it('conta o total de cartas, não de linhas', () => {
    const lines = parseList(['4 Anel Solar', '1 Sol Ring'].join('\n'));
    expect(lines).toHaveLength(2);
    expect(totalCards(lines)).toBe(5);
  });

  it('lê a exportação real do Archidekt (edição, número e foil)', () => {
    const lines = parseList(
      [
        'Commander:',
        '1 Thelon of Havenwood (TSP) 227',
        '1 Mana Crypt (MPS) 16 *F*',
        '1 Spread the Sickness (MBS) 56',
      ].join('\n'),
    );

    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ section: 'commander', setCode: 'TSP', collectorNumber: '227' });
    expect(lines[1]).toMatchObject({ name: 'Mana Crypt', foil: true, setCode: 'MPS' });
    expect(lines[2]!.foil).toBe(false);
  });

  it('texto vazio devolve lista vazia em vez de explodir', () => {
    expect(parseList('')).toEqual([]);
    expect(parseList(null as unknown as string)).toEqual([]);
  });
});
