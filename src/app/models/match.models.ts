export interface CreateMatchPayload {
  players: {
    userId: number;
    colors: string;
    commander: string;
  }[];
  /** Partida casual: conta no histórico, fica fora do ranking. */
  isFun?: boolean;
}

export interface StartMatchResponse {
  matchId: number;
}

export interface FinishMatchPayload {
  winnerId: number;
  matchTimeInMinutes: number;
}

export interface UserSummary {
  id: number;
  name: string;
}

export interface MatchPlayerDto {
  id: number;
  colors: string;
  commander: string;
  user: UserSummary;
}

export interface MatchDto {
  id: number;
  matchDate: string;
  matchTime: number;
  isFun: boolean;
  winner: UserSummary | null;
  playersConnection: MatchPlayerDto[];
}

export interface UserStats {
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export interface RankingEntry {
  userId: number;
  userName: string;
  wins: number;
  totalMatches: number;
  winRate: number;
}

export interface RecentDeck {
  commander: string;
  imageCard: string | null;
  colors: string;
}

/* ─── Estatísticas por deck ──────────────────────────────────────
   Derivados no cliente a partir de MatchDto — não são DTOs. Um deck é um
   comandante: a chave de agrupamento é o nome normalizado (deckKey), porque é
   o que o app registra hoje e é como a mesa fala ("levei o Aang"). */

export interface DeckStats {
  /** deckKey normalizado — chave de agrupamento e da rota. */
  key: string;
  /** Grafia mais recente daquele deckKey. */
  commander: string;
  /** "U/B" da partida mais recente. */
  colors: string;
  wins: number;
  losses: number;
  /** wins + losses — partidas em andamento ficam fora. */
  total: number;
  /** 0–100, arredondado. */
  winRate: number;
  /** ISO da partida mais recente. */
  lastPlayed: string;
  /** Abaixo de 6 partidas o número existe, mas vem marcado. */
  smallSample: boolean;
  /** Comandante que parece digitação de teste ("fte", "gsg"): escondido atrás
   *  de um "mostrar N entradas", nunca apagado — é histórico do usuário. */
  invalid: boolean;
  /** Última partida há mais de 60 dias: vai para o fim, sem cor. */
  retired: boolean;
}

export interface TableSizeStat {
  label: '2' | '3-4' | '5-6';
  wins: number;
  total: number;
  winRate: number;
}

/** Presença na mesa, não duelo: "vs. Renatao" = "Renatao estava na mesa". */
export interface PlayerPresenceStat {
  userId: number;
  name: string;
  /** Cores do deck mais recente desse jogador — pinta o avatar. */
  colors: string;
  wins: number;
  total: number;
  winRate: number;
  smallSample: boolean;
}

export interface OpponentCommanderStat {
  commander: string;
  ownerName: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

export interface DeckStatsDetail extends DeckStats {
  currentStreak: { type: 'win' | 'loss'; count: number };
  bestWinStreak: number;
  /** Até 12, mais antiga → mais recente. */
  recentResults: ('W' | 'L')[];
  /** Faixas com zero partidas não aparecem. */
  byTableSize: TableSizeStat[];
  avgDurationMin: number;
  /** Partidas com matchTime absurdo (> 300min) descartadas da média. */
  durationIgnored: number;
  fastestWinMin: number | null;
  byPlayer: PlayerPresenceStat[];
  byOpponentCommander: OpponentCommanderStat[];
}
