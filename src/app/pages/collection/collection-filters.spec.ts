import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  applyCollectionView,
  countTextMatches,
  fold,
  keywordFacets,
  matchesDeckCardQuery,
  matchesFilters,
  matchesQuery,
  matchesText,
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
    imageUrl: null,
    manaCost: null,
    rarity: '',
    setCode: 'C21',
    setName: 'Commander 2021',
    setFamilyCode: 'c21',
    setFamilyName: 'Commander 2021',
    setIconUrl: null,
    collectorNumber: '263',
    language: 'pt',
    foil: false,
    quantity: 4,
    priceUsd: 2,
    colors: [],
    typeLine: 'Artefato',
    oracleText: '{T}: Add {C}{C}.',
    keywords: [],
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

  it('tipo é bilíngue: o chip casa a linha de tipo nos dois idiomas', () => {
    // A linha gravada segue o idioma da impressão — a mesma coleção mistura os dois.
    const creatureEn = entry({ typeLine: 'Creature — Human Soldier' });
    const creaturePt = entry({ typeLine: 'Criatura — Humano Soldado' });
    const sorceryPt = entry({ typeLine: 'Feitiço' });
    const instantPt = entry({ typeLine: 'Mágica Instantânea' });
    const enchantEn = entry({ typeLine: 'Enchantment — Aura' });
    const landEn = entry({ typeLine: 'Basic Land — Island' });

    expect(matchesFilters(creatureEn, { ...NO_FILTERS, types: ['criatura'] })).toBe(true);
    expect(matchesFilters(creaturePt, { ...NO_FILTERS, types: ['criatura'] })).toBe(true);
    expect(matchesFilters(sorceryPt, { ...NO_FILTERS, types: ['sorcery'] })).toBe(true);
    expect(matchesFilters(instantPt, { ...NO_FILTERS, types: ['instant'] })).toBe(true);
    expect(matchesFilters(enchantEn, { ...NO_FILTERS, types: ['encantamento'] })).toBe(true);
    expect(matchesFilters(landEn, { ...NO_FILTERS, types: ['terreno'] })).toBe(true);
    // E não vira passe-livre: tipo errado continua fora nos dois idiomas.
    expect(matchesFilters(creatureEn, { ...NO_FILTERS, types: ['sorcery'] })).toBe(false);
    expect(matchesFilters(sorceryPt, { ...NO_FILTERS, types: ['criatura'] })).toBe(false);
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

    const result = applyCollectionView(
      entries,
      '',
      'name',
      { ...NO_FILTERS, colors: ['U'] },
      'price',
    );
    expect(result.map(item => item.id)).toEqual(['b', 'c']);
  });
});

describe('activeFilterCount', () => {
  it('conta cada eixo ligado, para o botão de filtro acender', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(
      activeFilterCount({
        colors: ['U', 'W'],
        types: ['artefato'],
        foil: true,
        language: 'pt',
        sets: ['hob'],
        keywords: [],
      }),
    ).toBe(6);
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

describe('matchesFilters · eixo de coleção', () => {
  const eternal = entry({
    setCode: 'HOC',
    setName: 'The Hobbit Eternal',
    setFamilyCode: 'hob',
    setFamilyName: 'The Hobbit',
  });

  const base = entry({
    setCode: 'HOB',
    setName: 'The Hobbit',
    setFamilyCode: 'hob',
    setFamilyName: 'The Hobbit',
  });

  it('marcar a família traz os filhos junto', () => {
    // "The Hobbit" na boca do usuário é hob + hoc — é a decisão §5.1.
    const filters = { ...NO_FILTERS, sets: ['hob'] };
    expect(matchesFilters(base, filters)).toBe(true);
    expect(matchesFilters(eternal, filters)).toBe(true);
    expect(matchesFilters(entry(), filters)).toBe(false);
  });

  it('marcar só o filho não traz o resto da família', () => {
    const filters = { ...NO_FILTERS, sets: ['hoc'] };
    expect(matchesFilters(eternal, filters)).toBe(true);
    expect(matchesFilters(base, filters)).toBe(false);
  });

  it('soma com os outros eixos, e não substitui', () => {
    // E entre eixos: coleção + cor mostra o verde daquela coleção.
    const filters = { ...NO_FILTERS, sets: ['hob'], colors: ['G'] };
    expect(matchesFilters({ ...base, colors: ['G'] }, filters)).toBe(true);
    expect(matchesFilters({ ...base, colors: ['U'] }, filters)).toBe(false);
  });

  it('conta como filtro ativo, um por coleção marcada', () => {
    expect(activeFilterCount({ ...NO_FILTERS, sets: ['hob', 'spm'] })).toBe(2);
  });
});

describe('matchesQuery · nome da edição', () => {
  it('digitar o nome da coleção acha as cartas dela', () => {
    const card = entry({
      name: 'Bilbo',
      nameEn: 'Bilbo',
      setCode: 'HOB',
      setName: 'The Hobbit',
      setFamilyName: 'The Hobbit',
    });

    expect(matchesQuery(card, 'hobbit')).toBe(true);
    expect(matchesQuery(card, 'HOB')).toBe(true);
  });
});

describe('busca por efeito', () => {
  const shredder = entry({
    id: 'shredder',
    name: 'Picotador de Livros-caixa',
    nameEn: 'Ledger Shredder',
    oracleText:
      'Flying\nWhenever a player casts their second spell each turn, this creature connives.',
    keywords: ['Flying', 'Connive'],
  });

  const launderer = entry({
    id: 'launderer',
    name: 'Eliminador de Cadáveres',
    nameEn: 'Body Launderer',
    oracleText:
      'Deathtouch\nWhenever another nontoken creature you control dies, this creature connives.',
    keywords: ['Connive', 'Deathtouch'],
  });

  const solRing = entry({ id: 'sol', oracleText: '{T}: Add {C}{C}.', keywords: [] });

  it('casa o texto de regras, sem caixa e sem acento', () => {
    expect(matchesText(shredder, 'connives')).toBe(true);
    expect(matchesText(shredder, 'CONNIVE')).toBe(true);
    expect(matchesText(solRing, 'connive')).toBe(false);
  });

  it('a busca é em inglês: o termo em português não acha', () => {
    // A tradução oficial de "connive" é "acobertar", mas o texto gravado é o
    // oracle_text — que a Scryfall só publica em inglês.
    expect(matchesText(launderer, 'acoberta')).toBe(false);
  });

  it('acha a carta pelo efeito mesmo quando a impressão é em português', () => {
    // O Picotador é a impressão pt-BR; o texto gravado é o inglês dela.
    expect(shredder.language).toBe('pt');
    expect(matchesText(shredder, 'connive')).toBe(true);
  });

  it('termo vazio casa tudo, como a busca por nome', () => {
    expect(matchesText(solRing, '')).toBe(true);
    expect(matchesText(solRing, '   ')).toBe(true);
  });

  it('carta sem texto gravado não casa nada', () => {
    const antiga = entry({ oracleText: null });
    expect(matchesText(antiga, 'connive')).toBe(false);
  });

  it('a contagem da sugestão respeita os filtros já ligados', () => {
    const entries = [
      shredder,
      launderer,
      entry({ id: 'outra', oracleText: 'This creature connives.', colors: ['R'] }),
    ];

    expect(countTextMatches(entries, 'connive', NO_FILTERS)).toBe(3);
    // Com o filtro de vermelho aceso, a linha promete só o que vai aparecer.
    expect(countTextMatches(entries, 'connive', { ...NO_FILTERS, colors: ['R'] })).toBe(1);
  });

  it('contagem de termo vazio é zero, não a coleção inteira', () => {
    expect(countTextMatches([shredder, launderer], '', NO_FILTERS)).toBe(0);
  });

  it('applyCollectionView troca o alvo do termo conforme o modo', () => {
    const entries = [shredder, solRing];

    const byName = applyCollectionView(entries, 'connive', 'name', NO_FILTERS, 'name');
    expect(byName).toHaveLength(0);

    const byText = applyCollectionView(entries, 'connive', 'text', NO_FILTERS, 'name');
    expect(byText.map(e => e.id)).toEqual(['shredder']);
  });
});

describe('chips de habilidade', () => {
  it('lista só as habilidades da estante, da mais comum para a mais rara', () => {
    const entries = [
      entry({ id: 'a', keywords: ['Flying', 'Connive'] }),
      entry({ id: 'b', keywords: ['Connive', 'Deathtouch'] }),
      entry({ id: 'c', keywords: ['Connive'] }),
    ];

    expect(keywordFacets(entries)).toEqual([
      { keyword: 'Connive', count: 3 },
      { keyword: 'Deathtouch', count: 1 },
      { keyword: 'Flying', count: 1 },
    ]);
  });

  it('estante sem palavra-chave nenhuma não gera chip', () => {
    expect(keywordFacets([entry({ keywords: [] })])).toEqual([]);
  });

  it('filtra por OU dentro do eixo, como cor e tipo', () => {
    const flyer = entry({ keywords: ['Flying'] });
    const conniver = entry({ keywords: ['Connive'] });
    const vanilla = entry({ keywords: [] });
    const filters = { ...NO_FILTERS, keywords: ['Flying', 'Connive'] };

    expect(matchesFilters(flyer, filters)).toBe(true);
    expect(matchesFilters(conniver, filters)).toBe(true);
    expect(matchesFilters(vanilla, filters)).toBe(false);
  });

  it('cada habilidade marcada conta um no contador do botão', () => {
    expect(activeFilterCount({ ...NO_FILTERS, keywords: ['Flying', 'Connive'] })).toBe(2);
  });

  it('o termo da busca não entra no contador — ele já está à vista no campo', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
  });
});

describe('busca no detalhe do deck', () => {
  it('um campo só: casa nome e efeito', () => {
    const card = { name: 'Ledger Shredder', oracleText: 'Flying\nThis creature connives.' };

    expect(matchesDeckCardQuery(card, 'shredder')).toBe(true);
    expect(matchesDeckCardQuery(card, 'connives')).toBe(true);
    expect(matchesDeckCardQuery(card, 'lifelink')).toBe(false);
  });

  it('carta que falta e ainda não tem texto casa pelo nome', () => {
    const card = { name: 'Sol Ring', oracleText: null };

    expect(matchesDeckCardQuery(card, 'sol')).toBe(true);
    expect(matchesDeckCardQuery(card, 'add {c}')).toBe(false);
  });
});
