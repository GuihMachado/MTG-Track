import { describe, expect, it } from 'vitest';
import { groupSets, matchesSetQuery } from './collection-sets';
import { CollectionEntryDto } from '../../models/collection.models';

function entry(overrides: Partial<CollectionEntryDto> = {}): CollectionEntryDto {
  return {
    id: overrides.id ?? '1',
    scryfallId: 'sc-1',
    oracleId: 'or-1',
    name: 'Bilbo',
    nameEn: 'Bilbo',
    artCropUrl: null,
    imageUrl: null,
    setCode: 'HOB',
    setName: 'The Hobbit',
    setFamilyCode: 'hob',
    setFamilyName: 'The Hobbit',
    setIconUrl: null,
    collectorNumber: '1',
    language: 'pt',
    foil: false,
    quantity: 1,
    priceUsd: 1,
    colors: [],
    typeLine: 'Criatura',
    addedAt: '2026-08-01T00:00:00.000Z',
    pricedAt: null,
    ...overrides,
  };
}

describe('groupSets', () => {
  it('junta as edições da mesma família numa coleção só', () => {
    const groups = groupSets([
      entry({ id: '1', quantity: 2 }),
      entry({
        id: '2',
        setCode: 'HOC',
        setName: 'The Hobbit Eternal',
        oracleId: 'or-2',
        quantity: 3,
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].code).toBe('hob');
    expect(groups[0].name).toBe('The Hobbit');
    expect(groups[0].cards).toBe(5);
    expect(groups[0].entries).toBe(2);
    expect(groups[0].members.map(member => member.code)).toEqual(['hoc', 'hob']);
  });

  it('conta cartas distintas, não impressões', () => {
    // A mesma carta em duas edições da família é uma carta só para quem quer
    // fechar a coleção.
    const groups = groupSets([
      entry({ id: '1', oracleId: 'or-1' }),
      entry({ id: '2', oracleId: 'or-1', setCode: 'HOC', setName: 'The Hobbit Eternal' }),
      entry({ id: '3', oracleId: 'or-9' }),
    ]);

    expect(groups[0].unique).toBe(2);
    expect(groups[0].entries).toBe(3);
  });

  it('ordena por quantidade, com o nome desempatando', () => {
    const groups = groupSets([
      entry({ id: '1', quantity: 1 }),
      entry({
        id: '2',
        setCode: 'SPM',
        setName: "Marvel's Spider-Man",
        setFamilyCode: 'spm',
        setFamilyName: "Marvel's Spider-Man",
        quantity: 9,
      }),
    ]);

    expect(groups.map(group => group.code)).toEqual(['spm', 'hob']);
  });

  it('entrada sem família cai na própria edição', () => {
    // Edição que o catálogo da Scryfall não conhece continua listável.
    const groups = groupSets([
      entry({ setFamilyCode: '', setFamilyName: '', setCode: 'ZZZ', setName: 'Caixa de Sapato' }),
    ]);

    expect(groups[0].code).toBe('zzz');
    expect(groups[0].name).toBe('Caixa de Sapato');
  });
});

describe('matchesSetQuery', () => {
  const [hobbit] = groupSets([
    entry({ id: '1' }),
    entry({ id: '2', setCode: 'HOC', setName: 'The Hobbit Eternal' }),
  ]);

  it('casa nome, sigla e nome de edição filha', () => {
    expect(matchesSetQuery(hobbit, 'hobbit')).toBe(true);
    expect(matchesSetQuery(hobbit, 'HOB')).toBe(true);
    expect(matchesSetQuery(hobbit, 'eternal')).toBe(true);
  });

  it('busca vazia mostra tudo', () => {
    expect(matchesSetQuery(hobbit, '   ')).toBe(true);
  });

  it('não casa o que não é da coleção', () => {
    expect(matchesSetQuery(hobbit, 'spider')).toBe(false);
  });
});
