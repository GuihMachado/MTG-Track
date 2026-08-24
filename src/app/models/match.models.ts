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
