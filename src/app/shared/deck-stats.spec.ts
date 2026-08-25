import { describe, expect, it } from 'vitest';
import { MatchDto } from '../models/match.models';
import { aggregateByDeck, deckKey, detailFor, sortDecks, winRateBand } from './deck-stats';

const ME = { id: 1, name: 'Machadao' };
const RENATAO = { id: 2, name: 'Renatao' };
const BIANCA = { id: 3, name: 'Bianca' };
const LEO = { id: 4, name: 'Léo' };

/** "Agora" fixo: os testes não podem depender do relógio. */
const NOW = new Date('2026-08-25T12:00:00Z').getTime();

let nextId = 1;

interface MatchSpec {
  daysAgo: number;
  won: boolean | null; // null = em andamento
  commander?: string;
  colors?: string;
  minutes?: number;
  isFun?: boolean;
  opponents?: { user: typeof RENATAO; commander: string; colors?: string }[];
}

function match(spec: MatchSpec): MatchDto {
  const opponents = spec.opponents ?? [{ user: RENATAO, commander: 'Krark, the Thumbless' }];
  return {
    id: nextId++,
    matchDate: new Date(NOW - spec.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
    matchTime: spec.minutes ?? 40,
    isFun: spec.isFun ?? false,
    winner: spec.won === null ? null : spec.won ? ME : opponents[0].user,
    playersConnection: [
      { id: nextId++, colors: spec.colors ?? 'U/W', commander: spec.commander ?? 'Aang, Airbending Master', user: ME },
      ...opponents.map(o => ({
        id: nextId++,
        colors: o.colors ?? 'R',
        commander: o.commander,
        user: o.user,
      })),
    ],
  };
}

describe('deckKey', () => {
  it('agrupa grafias diferentes do mesmo comandante', () => {
    expect(deckKey('  Ayli, Eternal Pilgrim ')).toBe(deckKey('ayli, eternal pilgrim'));
    expect(deckKey('Krenko, Mob Boss')).toBe(deckKey('KRENKO, MOB BOSS'));
  });

  it('ignora acentos: "Léo" e "Leo" são o mesmo deck', () => {
    expect(deckKey('Léo')).toBe(deckKey('Leo'));
  });
});

describe('aggregateByDeck', () => {
  it('partida em andamento não conta — não é derrota', () => {
    const decks = aggregateByDeck(
      [match({ daysAgo: 1, won: true }), match({ daysAgo: 0, won: null })],
      ME.id, 'all', NOW,
    );
    expect(decks).toHaveLength(1);
    expect(decks[0].total).toBe(1);
    expect(decks[0].winRate).toBe(100);
  });

  it('comandante com grafia diferente cai no mesmo deck, exibindo a mais recente', () => {
    const decks = aggregateByDeck(
      [
        match({ daysAgo: 5, won: true, commander: 'aang, airbending master' }),
        match({ daysAgo: 1, won: false, commander: 'Aang, Airbending Master' }),
      ],
      ME.id, 'all', NOW,
    );
    expect(decks).toHaveLength(1);
    expect(decks[0].commander).toBe('Aang, Airbending Master');
    expect(decks[0].total).toBe(2);
  });

  it('4Fun entra no histórico do deck, mas sai com o filtro "só ranqueadas"', () => {
    const history = [
      match({ daysAgo: 2, won: true, isFun: true }),
      match({ daysAgo: 1, won: false }),
    ];
    expect(aggregateByDeck(history, ME.id, 'all', NOW)[0].total).toBe(2);
    expect(aggregateByDeck(history, ME.id, 'ranked', NOW)[0].total).toBe(1);
  });

  it('o filtro de 6 meses corta partidas antigas', () => {
    const history = [
      match({ daysAgo: 200, won: true }),
      match({ daysAgo: 10, won: false }),
    ];
    expect(aggregateByDeck(history, ME.id, '6m', NOW)[0].total).toBe(1);
  });

  it('menos de 6 partidas marca amostra curta; digitação de teste marca inválido', () => {
    const decks = aggregateByDeck(
      [
        match({ daysAgo: 1, won: true, commander: 'fte' }),
        match({ daysAgo: 2, won: true }),
      ],
      ME.id, 'all', NOW,
    );
    const junk = decks.find(d => d.commander === 'fte')!;
    const real = decks.find(d => d.commander !== 'fte')!;
    expect(junk.invalid).toBe(true);
    expect(real.invalid).toBe(false);
    expect(real.smallSample).toBe(true);
  });

  it('deck sem partida há mais de 60 dias é aposentado', () => {
    const decks = aggregateByDeck([match({ daysAgo: 90, won: true })], ME.id, 'all', NOW);
    expect(decks[0].retired).toBe(true);
  });
});

describe('sortDecks', () => {
  it('winrate: amostra cheia primeiro, curta depois, aposentado no fim', () => {
    const full = { ...stub('Cheio'), total: 10, winRate: 40 };
    const small = { ...stub('Curto'), total: 2, winRate: 100, smallSample: true };
    const retired = { ...stub('Velho'), total: 10, winRate: 90, retired: true };

    const sorted = sortDecks([retired, small, full], 'winrate');
    expect(sorted.map(d => d.commander)).toEqual(['Cheio', 'Curto', 'Velho']);
  });

  function stub(commander: string) {
    return {
      key: deckKey(commander), commander, colors: 'U', wins: 0, losses: 0,
      total: 0, winRate: 0, lastPlayed: new Date(NOW).toISOString(),
      smallSample: false, invalid: false, retired: false,
    };
  }
});

describe('winRateBand', () => {
  it('≥50 verde com glow, 35–44 âmbar sem glow, 45–49 âmbar com glow, <35 vermelho', () => {
    expect(winRateBand(72)).toEqual({ color: 'success', glow: true });
    expect(winRateBand(40)).toEqual({ color: 'warning', glow: false });
    expect(winRateBand(47)).toEqual({ color: 'warning', glow: true });
    expect(winRateBand(23)).toEqual({ color: 'danger', glow: false });
  });
});

describe('detailFor', () => {
  it('uma partida só: sequência de 1 e fita de um resultado', () => {
    const detail = detailFor(
      deckKey('Aang, Airbending Master'),
      [match({ daysAgo: 1, won: true })],
      ME.id, 'all', NOW,
    )!;
    expect(detail.currentStreak).toEqual({ type: 'win', count: 1 });
    expect(detail.bestWinStreak).toBe(1);
    expect(detail.recentResults).toEqual(['W']);
  });

  it('sequência atual e melhor sequência saem da ordem cronológica', () => {
    // W W L W W W (antiga → recente): atual = 3 vitórias, melhor = 3.
    const history = [
      match({ daysAgo: 6, won: true }),
      match({ daysAgo: 5, won: true }),
      match({ daysAgo: 4, won: false }),
      match({ daysAgo: 3, won: true }),
      match({ daysAgo: 2, won: true }),
      match({ daysAgo: 1, won: true }),
    ];
    const detail = detailFor(deckKey('Aang, Airbending Master'), history, ME.id, 'all', NOW)!;
    expect(detail.currentStreak).toEqual({ type: 'win', count: 3 });
    expect(detail.bestWinStreak).toBe(3);
    expect(detail.recentResults).toEqual(['W', 'W', 'L', 'W', 'W', 'W']);
  });

  it('matchTime absurdo sai da média e é contado como ignorado', () => {
    const history = [
      match({ daysAgo: 3, won: true, minutes: 30 }),
      match({ daysAgo: 2, won: true, minutes: 50 }),
      match({ daysAgo: 1, won: false, minutes: 703 }),
    ];
    const detail = detailFor(deckKey('Aang, Airbending Master'), history, ME.id, 'all', NOW)!;
    expect(detail.avgDurationMin).toBe(40);
    expect(detail.durationIgnored).toBe(1);
    expect(detail.fastestWinMin).toBe(30);
  });

  it('tamanho de mesa: faixa sem partida não aparece', () => {
    const history = [
      match({ daysAgo: 2, won: true }), // mesa 2
      match({
        daysAgo: 1, won: false,
        opponents: [
          { user: RENATAO, commander: 'Krark, the Thumbless' },
          { user: BIANCA, commander: 'Atraxa, Praetors Voice' },
        ],
      }), // mesa 3
    ];
    const detail = detailFor(deckKey('Aang, Airbending Master'), history, ME.id, 'all', NOW)!;
    expect(detail.byTableSize.map(b => b.label)).toEqual(['2', '3-4']);
  });

  it('com quem na mesa é presença, não duelo', () => {
    const history = [
      match({
        daysAgo: 1, won: true,
        opponents: [
          { user: RENATAO, commander: 'Krark, the Thumbless' },
          { user: BIANCA, commander: 'Atraxa, Praetors Voice' },
        ],
      }),
    ];
    const detail = detailFor(deckKey('Aang, Airbending Master'), history, ME.id, 'all', NOW)!;
    expect(detail.byPlayer).toHaveLength(2);
    expect(detail.byPlayer.every(p => p.total === 1 && p.wins === 1)).toBe(true);
  });

  it('comandantes que derrotam: só 3+ encontros e winrate abaixo de 50', () => {
    const vsKrark = (daysAgo: number, won: boolean) =>
      match({ daysAgo, won, opponents: [{ user: LEO, commander: 'Krark, the Thumbless' }] });
    const history = [
      vsKrark(4, false), vsKrark(3, false), vsKrark(2, true),
      // Só 1 encontro contra Atraxa: fica fora mesmo perdendo.
      match({ daysAgo: 1, won: false, opponents: [{ user: BIANCA, commander: 'Atraxa, Praetors Voice' }] }),
    ];
    const detail = detailFor(deckKey('Aang, Airbending Master'), history, ME.id, 'all', NOW)!;
    expect(detail.byOpponentCommander).toHaveLength(1);
    expect(detail.byOpponentCommander[0].commander).toBe('Krark, the Thumbless');
    expect(detail.byOpponentCommander[0].losses).toBe(2);
  });

  it('deck inexistente no período devolve null', () => {
    expect(detailFor('nada', [match({ daysAgo: 1, won: true })], ME.id, 'all', NOW)).toBeNull();
  });
});
