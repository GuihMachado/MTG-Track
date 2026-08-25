import {
  DeckStats,
  DeckStatsDetail,
  MatchDto,
  MatchPlayerDto,
  OpponentCommanderStat,
  PlayerPresenceStat,
  TableSizeStat,
} from '../models/match.models';

/**
 * Estatísticas por deck — a agregação inteira, em funções puras.
 *
 * Um deck é um comandante (ESTATISTICAS.md): a chave é o nome normalizado, não
 * um id — é o que o app registra e é como a mesa fala. Tudo aqui deriva de
 * MatchDto; não existe endpoint novo nem entidade Deck. Para o histórico de
 * uma mesa (dezenas de partidas) o cálculo no cliente é instantâneo, e sendo
 * função pura já está escrito e testado para virar SQL se um dia precisar.
 */

export type StatsPeriod = 'all' | '6m' | 'ranked';
export type StatsSort = 'winrate' | 'games' | 'recent' | 'name';

/** Janela do filtro "6 meses". */
const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000;
/** Deck sem partida há mais de isso é aposentado: sai da pergunta "qual levo hoje". */
const RETIRED_MS = 60 * 24 * 60 * 60 * 1000;
/** Abaixo disso a amostra mente: 100% em duas partidas não é 100%. */
export const SMALL_SAMPLE = 6;
/** matchTime acima disso é mesa que ninguém encerrou, não partida: sai da média. */
export const DURATION_OUTLIER_MIN = 300;
/** Comandante com menos de 4 caracteres é digitação de teste, não deck. */
const MIN_COMMANDER_LENGTH = 4;
/** Confronto abaixo de 3 encontros é ruído, não padrão. */
const MIN_ENCOUNTERS = 3;

/** Normaliza o nome do comandante para agrupar grafias diferentes do mesmo deck. */
export function deckKey(commander: string): string {
  return commander
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Faixa de cor do winrate: ≥50 verde, 35–49 âmbar (glow só de 45), <35 vermelho. */
export function winRateBand(rate: number): { color: 'success' | 'warning' | 'danger'; glow: boolean } {
  if (rate >= 50) return { color: 'success', glow: true };
  if (rate >= 35) return { color: 'warning', glow: rate >= 45 };
  return { color: 'danger', glow: false };
}

interface DeckMatch {
  match: MatchDto;
  me: MatchPlayerDto;
  won: boolean;
  date: number;
}

/**
 * Partidas que contam: as encerradas (winner null é mesa aberta, não derrota),
 * dentro do período, em que eu joguei. Ordenadas da mais antiga para a mais
 * recente — é a ordem de que sequência e fita de resultados precisam.
 */
function countableMatches(
  matches: MatchDto[],
  userId: number,
  period: StatsPeriod,
  now: number,
): DeckMatch[] {
  const cutoff = period === '6m' ? now - SIX_MONTHS_MS : null;

  return matches
    .filter(m => m.winner !== null)
    .filter(m => (period === 'ranked' ? !m.isFun : true))
    .map(m => {
      const me = m.playersConnection.find(p => p.user.id === userId);
      return me
        ? { match: m, me, won: m.winner!.id === userId, date: new Date(m.matchDate).getTime() }
        : null;
    })
    .filter((entry): entry is DeckMatch => entry !== null && !isNaN(entry.date))
    .filter(entry => (cutoff === null ? true : entry.date >= cutoff))
    .sort((a, b) => a.date - b.date);
}

/** Tela 1: um DeckStats por comandante, sem ordenação — quem ordena é sortDecks. */
export function aggregateByDeck(
  matches: MatchDto[],
  userId: number,
  period: StatsPeriod,
  now: number = Date.now(),
): DeckStats[] {
  const groups = new Map<string, DeckMatch[]>();

  for (const entry of countableMatches(matches, userId, period, now)) {
    const key = deckKey(entry.me.commander);
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }

  const decks: DeckStats[] = [];
  for (const [key, group] of groups) {
    // O grupo já vem em ordem cronológica: o último é a partida mais recente,
    // de onde saem a grafia exibida, as cores e a data.
    const latest = group[group.length - 1];
    const wins = group.filter(g => g.won).length;
    const total = group.length;

    decks.push({
      key,
      commander: latest.me.commander.trim(),
      colors: latest.me.colors,
      wins,
      losses: total - wins,
      total,
      winRate: Math.round((wins / total) * 100),
      lastPlayed: latest.match.matchDate,
      smallSample: total < SMALL_SAMPLE,
      invalid: key.length < MIN_COMMANDER_LENGTH,
      retired: now - latest.date > RETIRED_MS,
    });
  }

  return decks;
}

/**
 * Ordenação da lista. No padrão (winrate), amostra curta vai depois da amostra
 * cheia e aposentado vai para o fim — um deck 100% em 2 jogos no topo destrói
 * a utilidade da pergunta "qual levo hoje". Nas demais ordenações o critério
 * pedido manda sozinho.
 */
export function sortDecks(decks: DeckStats[], sort: StatsSort): DeckStats[] {
  const list = [...decks];

  switch (sort) {
    case 'games':
      return list.sort((a, b) => b.total - a.total || b.winRate - a.winRate);
    case 'recent':
      return list.sort(
        (a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime(),
      );
    case 'name':
      return list.sort((a, b) => a.commander.localeCompare(b.commander, 'pt'));
    default: {
      const tier = (d: DeckStats) => (d.retired ? 2 : d.smallSample ? 1 : 0);
      return list.sort(
        (a, b) => tier(a) - tier(b) || b.winRate - a.winRate || b.total - a.total,
      );
    }
  }
}

function tableSizeLabel(seats: number): TableSizeStat['label'] {
  if (seats <= 2) return '2';
  if (seats <= 4) return '3-4';
  return '5-6';
}

/** Telas 2 e 3: o detalhe de um deck. Null quando o deck não existe no período. */
export function detailFor(
  key: string,
  matches: MatchDto[],
  userId: number,
  period: StatsPeriod = 'all',
  now: number = Date.now(),
): DeckStatsDetail | null {
  const deckMatches = countableMatches(matches, userId, period, now).filter(
    entry => deckKey(entry.me.commander) === key,
  );
  if (deckMatches.length === 0) return null;

  const base = aggregateByDeck(matches, userId, period, now).find(d => d.key === key)!;

  // ─── Sequências e fita ───────────────────────────────────────
  const results = deckMatches.map(g => (g.won ? 'W' : 'L') as 'W' | 'L');

  let count = 1;
  for (let i = results.length - 2; i >= 0 && results[i] === results[results.length - 1]; i--) {
    count++;
  }
  const currentStreak = {
    type: results[results.length - 1] === 'W' ? ('win' as const) : ('loss' as const),
    count,
  };

  let bestWinStreak = 0;
  let run = 0;
  for (const r of results) {
    run = r === 'W' ? run + 1 : 0;
    if (run > bestWinStreak) bestWinStreak = run;
  }

  // ─── Por tamanho de mesa (faixa vazia não aparece) ───────────
  const sizeBuckets = new Map<TableSizeStat['label'], { wins: number; total: number }>();
  for (const entry of deckMatches) {
    const label = tableSizeLabel(entry.match.playersConnection.length);
    const bucket = sizeBuckets.get(label) ?? { wins: 0, total: 0 };
    bucket.total++;
    if (entry.won) bucket.wins++;
    sizeBuckets.set(label, bucket);
  }
  const byTableSize: TableSizeStat[] = (['2', '3-4', '5-6'] as const)
    .filter(label => sizeBuckets.has(label))
    .map(label => {
      const { wins, total } = sizeBuckets.get(label)!;
      return { label, wins, total, winRate: Math.round((wins / total) * 100) };
    });

  // ─── Duração (descartando mesa que ninguém encerrou) ─────────
  const sane = deckMatches.filter(
    entry => entry.match.matchTime > 0 && entry.match.matchTime <= DURATION_OUTLIER_MIN,
  );
  const durationIgnored = deckMatches.filter(
    entry => entry.match.matchTime > DURATION_OUTLIER_MIN,
  ).length;
  const avgDurationMin =
    sane.length > 0
      ? Math.round(sane.reduce((sum, entry) => sum + entry.match.matchTime, 0) / sane.length)
      : 0;
  const winTimes = sane.filter(entry => entry.won).map(entry => entry.match.matchTime);
  const fastestWinMin = winTimes.length > 0 ? Math.min(...winTimes) : null;

  // ─── Com quem na mesa (presença, não duelo) ──────────────────
  const players = new Map<number, { name: string; colors: string; wins: number; total: number }>();
  for (const entry of deckMatches) {
    for (const p of entry.match.playersConnection) {
      if (p.user.id === userId) continue;
      const acc = players.get(p.user.id) ?? { name: p.user.name, colors: p.colors, wins: 0, total: 0 };
      acc.total++;
      if (entry.won) acc.wins++;
      // Cronológico: a última partida ganha o nome e a cor mais recentes.
      acc.name = p.user.name;
      acc.colors = p.colors;
      players.set(p.user.id, acc);
    }
  }
  const byPlayer: PlayerPresenceStat[] = [...players.entries()]
    .map(([id, acc]) => ({
      userId: id,
      name: acc.name,
      colors: acc.colors,
      wins: acc.wins,
      total: acc.total,
      winRate: Math.round((acc.wins / acc.total) * 100),
      smallSample: acc.total < MIN_ENCOUNTERS,
    }))
    .sort(
      (a, b) =>
        Number(a.smallSample) - Number(b.smallSample) ||
        b.winRate - a.winRate ||
        b.total - a.total,
    );

  // ─── Comandantes que te derrotam ─────────────────────────────
  const opponents = new Map<
    string,
    { commander: string; ownerName: string; wins: number; total: number }
  >();
  for (const entry of deckMatches) {
    for (const p of entry.match.playersConnection) {
      if (p.user.id === userId) continue;
      const oppKey = deckKey(p.commander);
      if (oppKey.length < MIN_COMMANDER_LENGTH) continue;
      const acc = opponents.get(oppKey) ?? { commander: p.commander.trim(), ownerName: p.user.name, wins: 0, total: 0 };
      acc.total++;
      if (entry.won) acc.wins++;
      acc.commander = p.commander.trim();
      acc.ownerName = p.user.name;
      opponents.set(oppKey, acc);
    }
  }
  const byOpponentCommander: OpponentCommanderStat[] = [...opponents.values()]
    .map(acc => ({
      commander: acc.commander,
      ownerName: acc.ownerName,
      wins: acc.wins,
      losses: acc.total - acc.wins,
      total: acc.total,
      winRate: Math.round((acc.wins / acc.total) * 100),
    }))
    .filter(o => o.total >= MIN_ENCOUNTERS && o.winRate < 50)
    .sort((a, b) => a.winRate - b.winRate || b.total - a.total)
    .slice(0, 5);

  return {
    ...base,
    currentStreak,
    bestWinStreak,
    recentResults: results.slice(-12),
    byTableSize,
    avgDurationMin,
    durationIgnored,
    fastestWinMin,
    byPlayer,
    byOpponentCommander,
  };
}
