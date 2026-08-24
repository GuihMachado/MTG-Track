import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  applyCollectionView,
  fold,
  matchesFilters,
  matchesQuery,
  sortEntries,
} from './collection-filters';
import { deckProgress } from './deck-progress';
import {
  CollectionEntryDto,
  DeckDto,
  NO_FILTERS,
} from '../../models/collection.models';

function entry(overrides: Partial<CollectionEntryDto> = {}): CollectionEntryDto {
  return {
    id: overrides.id ?? '1',
    scryfallId: 'sc-1',
    oracleId: 'or-1',
    name: 'Anel Solar',
    nameEn: 'Sol Ring',
    artCropUrl: null,
    setCode: 'C21',
    setName: 'Commander 2021',
    collectorNumber: '263',
    language: 'pt',
    foil: false,
    quantity: 4,
    priceUsd: 2,
    colors: [],
    typeLine: 'Artefato',
    addedAt: '2026-08-01T00:00:00.000Z',
    pricedAt: null,
    ...overrides,
  };
}

describe('fold', () => {
  it('tira acento e caixa', () => {
    expect(fold('Anel Solar')).toBe('anel solar');
    expect(fold('Estudo Rístico')).toBe('estudo ristico');
    expect(fold('  CoAçÃo  ')).toBe('coacao');
  });
});

describe('matchesQuery', () => {
  const sol = entry();

  it('acha pelo nome impresso, sem acento e sem caixa', () => {
    expect(matchesQuery(entry({ name: 'Estudo Rístico' }), 'ristico')).toBe(true);
    expect(matchesQuery(sol, 'ANEL')).toBe(true);
  });

  it('acha pelo nome em inglês da mesma entrada', () => {
    // A coleção é bilíngue: lembrar em que idioma cadastrou não é trabalho do
    // usuário.
    expect(matchesQuery(sol, 'sol ring')).toBe(true);
  });

  it('acha pelo código da edição', () => {
    expect(matchesQuery(sol, 'c21')).toBe(true);
  });

  it('busca vazia não filtra nada', () => {
    expect(matchesQuery(sol, '   ')).toBe(true);
  });

  it('não casa o que não existe', () => {
    expect(matchesQuery(sol, 'tarmogoyf')).toBe(false);
  });
});

describe('matchesFilters', () => {
  it('sem filtro, tudo passa', () => {
    expect(matchesFilters(entry(), NO_FILTERS)).toBe(true);
  });

  it('cor: incolor entra por C, não por ausência', () => {
    const colorless = entry({ colors: [] });
    const blue = entry({ colors: ['U'] });

    expect(matchesFilters(colorless, { ...NO_FILTERS, colors: ['C'] })).toBe(true);
    expect(matchesFilters(blue, { ...NO_FILTERS, colors: ['C'] })).toBe(false);
    expect(matchesFilters(blue, { ...NO_FILTERS, colors: ['U'] })).toBe(true);
  });

  it('duas cores marcadas é OU dentro do eixo', () => {
    const white = entry({ colors: ['W'] });
    expect(matchesFilters(white, { ...NO_FILTERS, colors: ['U', 'W'] })).toBe(true);
  });

  it('tipo casa por pedaço da linha de tipo, no idioma da impressão', () => {
    expect(matchesFilters(entry(), { ...NO_FILTERS, types: ['artefato'] })).toBe(true);
    expect(matchesFilters(entry(), { ...NO_FILTERS, types: ['criatura'] })).toBe(false);
  });

  it('eixos diferentes se somam com E', () => {
    const blueArtifact = entry({ colors: ['U'], typeLine: 'Artefato' });
    expect(
      matchesFilters(blueArtifact, { ...NO_FILTERS, colors: ['U'], types: ['artefato'] }),
    ).toBe(true);
    expect(
      matchesFilters(blueArtifact, { ...NO_FILTERS, colors: ['R'], types: ['artefato'] }),
    ).toBe(false);
  });

  it('foil e idioma filtram pelo valor exato, e false não é "sem filtro"', () => {
    expect(matchesFilters(entry({ foil: false }), { ...NO_FILTERS, foil: false })).toBe(true);
    expect(matchesFilters(entry({ foil: true }), { ...NO_FILTERS, foil: false })).toBe(false);
    expect(matchesFilters(entry({ language: 'pt' }), { ...NO_FILTERS, language: 'en' })).toBe(false);
  });
});

describe('sortEntries', () => {
  const cheap = entry({ id: 'a', name: 'Bola', priceUsd: 1, quantity: 1, addedAt: '2026-01-01' });
  const pricey = entry({ id: 'b', name: 'Anel', priceUsd: 90, quantity: 2, addedAt: '2026-05-01' });
  const priceless = entry({ id: 'c', name: 'Carta', priceUsd: null, quantity: 9, addedAt: '2026-09-01' });

  it('nome é o padrão, em ordem de português', () => {
    expect(sortEntries([cheap, pricey], 'name').map(item => item.id)).toEqual(['b', 'a']);
  });

  it('preço desce e joga sem preço para o fim', () => {
    // Sem preço no topo não responderia "quanto vale", que é a pergunta da
    // ordenação.
    expect(sortEntries([cheap, priceless, pricey], 'price').map(item => item.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('quantidade desce e empate cai no nome', () => {
    const other = entry({ id: 'd', name: 'Abacate', quantity: 9 });
    expect(sortEntries([priceless, other], 'quantity').map(item => item.id)).toEqual(['d', 'c']);
  });

  it('recente usa a data de entrada', () => {
    expect(sortEntries([cheap, priceless, pricey], 'recent').map(item => item.id)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });
});

describe('applyCollectionView', () => {
  it('busca, filtro e ordem numa passada', () => {
    const entries = [
      entry({ id: 'a', name: 'Anel Solar', nameEn: 'Sol Ring', priceUsd: 2, colors: [] }),
      entry({ id: 'b', name: 'Estudo Rístico', nameEn: 'Rhystic Study', priceUsd: 90, colors: ['U'] }),
      entry({ id: 'c', name: 'Fenda Ciclônica', nameEn: 'Cyclonic Rift', priceUsd: 40, colors: ['U'] }),
    ];

    const result = applyCollectionView(entries, '', { ...NO_FILTERS, colors: ['U'] }, 'price');
    expect(result.map(item => item.id)).toEqual(['b', 'c']);
  });
});

describe('activeFilterCount', () => {
  it('conta cada eixo ligado, para o botão de filtro acender', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ colors: ['U', 'W'], types: ['artefato'], foil: true, language: 'pt' })).toBe(5);
  });
});

function deck(overrides: Partial<DeckDto> = {}): DeckDto {
  return {
    id: 'd1',
    name: 'Ayli, Eternal Pilgrim',
    commanderName: 'Ayli, Eternal Pilgrim',
    commanderArtUrl: null,
    colors: ['W', 'B'],
    totalCards: 100,
    ownedCards: 87,
    missingCards: 13,
    missingValueUsd: 186,
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('deckProgress', () => {
  it('90% ou mais é completo, com brilho', () => {
    const progress = deckProgress(deck({ ownedCards: 94, missingCards: 6 }));
    expect(progress.level).toBe('complete');
    expect(progress.percent).toBe(94);
    expect(progress.glow).toBe(true);
  });

  it('entre 60 e 89 é perto', () => {
    expect(deckProgress(deck()).level).toBe('close');
  });

  it('abaixo de 60 não brilha: não se celebra o que está longe', () => {
    const progress = deckProgress(deck({ ownedCards: 52, missingCards: 48 }));
    expect(progress.level).toBe('far');
    expect(progress.glow).toBe(false);
  });

  it('deck sem carta não divide por zero', () => {
    const progress = deckProgress(deck({ totalCards: 0, ownedCards: 0, missingCards: 0 }));
    expect(progress.percent).toBe(0);
    expect(progress.context).toBe('lista vazia');
  });

  it('deck fechado diz "completo", não "faltam 0"', () => {
    expect(deckProgress(deck({ ownedCards: 100, missingCards: 0 })).context).toBe('completo');
  });
});
