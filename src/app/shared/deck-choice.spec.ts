import { describe, expect, it } from 'vitest';
import {
  colorsRgb,
  colorsToSymbols,
  deckArt,
  identityOf,
  isBorrowed,
  lendGroups,
  orderWubrg,
  OwnedDeck,
  preselectDeck,
  toggleColor,
} from './deck-choice';

const GUI = { id: 1, name: 'Guilherme' };
const ANA = { id: 2, name: 'Ana' };
const RAFA = { id: 3, name: 'Rafa' };

function deck(id: string, owner: { id: number; name: string }, extra: Partial<OwnedDeck> = {}): OwnedDeck {
  return {
    id,
    name: `Deck ${id}`,
    commanderName: `Commander ${id}`,
    commanderArtUrl: null,
    colors: [],
    owner,
    ...extra,
  };
}

describe('cores do deck', () => {
  it('ordena em WUBRG e descarta repetição e letra estranha', () => {
    expect(orderWubrg(['G', 'w', 'U', 'G', 'X'])).toEqual(['W', 'U', 'G']);
  });

  it('acende e apaga uma orbe mantendo a ordem', () => {
    expect(toggleColor(['G'], 'W')).toEqual(['W', 'G']);
    expect(toggleColor(['W', 'G'], 'W')).toEqual(['G']);
  });

  it('usa a identidade de cor do commander, não só a cor da carta', () => {
    // Atraxa é WUBG nas duas; Kenrith tem custo de habilidade em todas as cores.
    expect(identityOf({ colors: ['W'], color_identity: ['W', 'U', 'B', 'R', 'G'] })).toEqual([
      'W', 'U', 'B', 'R', 'G',
    ]);
    expect(identityOf({ colors: ['R'] })).toEqual(['R']);
    expect(identityOf({})).toEqual([]);
  });

  it('tinge pela primeira cor e deixa incolor sem luz', () => {
    expect(colorsRgb(['G', 'U'])).toBe('var(--mana-u-rgb)');
    expect(colorsRgb([])).toBeNull();
  });

  it('vira símbolos para o pipe de mana', () => {
    expect(colorsToSymbols(['B', 'W'])).toBe('{W}{B}');
  });
});

describe('arte do deck', () => {
  it('prefere a arte gravada', () => {
    expect(deckArt(deck('a', GUI, { commanderArtUrl: 'https://img/art.jpg' }))).toBe('https://img/art.jpg');
  });

  it('deck do histórico cai na busca por nome', () => {
    const url = deckArt(deck('a', GUI, { commanderName: 'Krenko, Mob Boss' }));
    expect(url).toContain('fuzzy=Krenko%2C%20Mob%20Boss');
  });
});

describe('pré-seleção do assento', () => {
  const decks = [
    deck('gui-1', GUI),
    deck('gui-2', GUI),
    deck('ana-1', ANA),
    deck('rafa-1', RAFA),
  ];

  it('escolhe o último deck jogado', () => {
    expect(preselectDeck(GUI.id, decks, { '1': 'gui-2' }, new Set())).toBe('gui-2');
  });

  it('o último deck pode ser emprestado', () => {
    expect(preselectDeck(ANA.id, decks, { '2': 'rafa-1' }, new Set())).toBe('rafa-1');
  });

  it('último deck ocupado em outro assento cai no próprio livre mais recente', () => {
    expect(preselectDeck(ANA.id, decks, { '2': 'rafa-1' }, new Set(['rafa-1']))).toBe('ana-1');
    expect(preselectDeck(GUI.id, decks, { '1': 'gui-1' }, new Set(['gui-1']))).toBe('gui-2');
  });

  it('último deck ocupado e nenhum próprio livre: nada escolhido', () => {
    expect(preselectDeck(ANA.id, decks, { '2': 'ana-1' }, new Set(['ana-1']))).toBeNull();
  });

  it('sem histórico, escolhe o único deck próprio', () => {
    expect(preselectDeck(ANA.id, decks, {}, new Set())).toBe('ana-1');
  });

  it('sem histórico e com dois decks, deixa a escolha para o jogador', () => {
    expect(preselectDeck(GUI.id, decks, {}, new Set())).toBeNull();
  });

  it('último deck que sumiu (apagado ou de conta desativada) segue a regra sem histórico', () => {
    expect(preselectDeck(ANA.id, decks, { '2': 'apagado' }, new Set())).toBe('ana-1');
  });

  it('jogador sem deck nenhum fica sem escolha', () => {
    expect(preselectDeck(99, decks, {}, new Set())).toBeNull();
  });
});

describe('folha de empréstimo', () => {
  const decks = [
    deck('rafa-1', RAFA, { name: 'Ninjas', commanderName: 'Yuriko, the Tiger’s Shadow' }),
    deck('gui-1', GUI, { name: 'Kinnan cEDH', commanderName: 'Kinnan, Bonder Prodigy' }),
    deck('ana-1', ANA, { name: 'Goblins' }),
    deck('gui-2', GUI, { name: 'Atraxa superfriends', commanderName: 'Atraxa, Grand Unifier' }),
  ];

  it('agrupa por dono em ordem alfabética e tira os decks do próprio jogador', () => {
    const groups = lendGroups(decks, ANA.id);
    expect(groups.map(group => group.owner.name)).toEqual(['Guilherme', 'Rafa']);
    expect(groups[0]!.decks.map(item => item.id)).toEqual(['gui-1', 'gui-2']);
  });

  it('busca por deck, commander ou dono, sem acento', () => {
    expect(lendGroups(decks, ANA.id, 'kínnan').flatMap(group => group.decks.map(d => d.id))).toEqual(['gui-1']);
    expect(lendGroups(decks, ANA.id, 'yuriko').flatMap(group => group.decks.map(d => d.id))).toEqual(['rafa-1']);
    expect(lendGroups(decks, ANA.id, 'guilherme')).toHaveLength(1);
    expect(lendGroups(decks, ANA.id, 'nada disso')).toEqual([]);
  });

  it('sabe quando o deck do assento é emprestado', () => {
    expect(isBorrowed(decks[1]!, ANA.id)).toBe(true);
    expect(isBorrowed(decks[1]!, GUI.id)).toBe(false);
  });
});
