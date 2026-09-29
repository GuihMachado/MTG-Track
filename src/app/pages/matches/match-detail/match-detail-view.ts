import { MatchDto } from '../../../models/match.models';
import { commanderArtUrl } from '../../../shared/match-utils';

export type MatchResult = 'win' | 'loss' | 'open' | 'watched';

export interface DetailRow {
  userId: number;
  name: string;
  isMe: boolean;
  isWinner: boolean;
  /** Nome do deck; partida antiga (sem deck vinculado) usa o commander. */
  deckName: string;
  commander: string;
  /** "W/U" da partida, em símbolos para o pipe de mana. */
  symbols: string;
  artUrl: string | null;
  /** Dono do deck, quando o deck era emprestado. */
  lentBy: string | null;
  /** Vida final — só existe se a mesa foi salva (botão, automático ou encerramento). */
  final: { life: number; poison: number; out: boolean } | null;
}

export interface DetailView {
  result: MatchResult;
  /** "vs. Ana, Bruno e Rafa". */
  opponents: string;
  minutes: number;
  seats: number;
  typeLabel: 'Ranqueada' | '4Fun';
  rows: DetailRow[];
  /** Algum assento tem vida final? Sem nenhum, a coluna nem aparece. */
  hasFinal: boolean;
}

const POISON_OUT = 10;

/** "Ana, Bruno e Rafa" — com "e" antes do último, como se fala. */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

function symbolsOf(colors: string | null | undefined): string {
  return (colors ?? '')
    .split('/')
    .map(color => color.trim().toUpperCase())
    .filter(color => /^[WUBRGC]$/.test(color))
    .map(color => `{${color}}`)
    .join('');
}

/**
 * O detalhe de uma partida, montado só a partir do MatchDto.
 *
 * A ordem dos jogadores é a da mesa quando ela foi salva (é assim que a partida
 * aconteceu); sem mesa salva, vale a ordem de cadastro. A duração é a gravada no
 * encerramento; partida aberta conta desde o início.
 */
export function buildDetail(match: MatchDto, currentUserId: number, now = Date.now()): DetailView {
  const seatsByUser = new Map((match.tableState?.seats ?? []).map((seat, index) => [seat.userId, { seat, index }]));
  const players = [...match.playersConnection].sort((a, b) => {
    const ia = seatsByUser.get(a.user.id)?.index ?? Number.MAX_SAFE_INTEGER;
    const ib = seatsByUser.get(b.user.id)?.index ?? Number.MAX_SAFE_INTEGER;
    return ia - ib || a.id - b.id;
  });

  const rows: DetailRow[] = players.map(player => {
    const saved = seatsByUser.get(player.user.id)?.seat;
    const owner = player.deck?.owner;
    return {
      userId: player.user.id,
      name: player.user.name,
      isMe: player.user.id === currentUserId,
      isWinner: match.winner?.id === player.user.id,
      deckName: player.deck?.name ?? player.commander,
      commander: player.commander,
      symbols: symbolsOf(player.colors),
      artUrl: commanderArtUrl(player.commander),
      lentBy: owner && owner.id !== player.user.id ? owner.name : null,
      final: saved
        ? { life: saved.life, poison: saved.poison, out: saved.life <= 0 || saved.poison >= POISON_OUT }
        : null,
    };
  });

  const me = rows.find(row => row.isMe);
  const result: MatchResult = !match.winner ? 'open' : !me ? 'watched' : me.isWinner ? 'win' : 'loss';

  const started = new Date(match.matchDate).getTime();
  const minutes =
    match.winner || match.matchTime > 0
      ? match.matchTime
      : Number.isFinite(started)
        ? Math.max(0, Math.round((now - started) / 60000))
        : 0;

  return {
    result,
    opponents: joinNames(rows.filter(row => !row.isMe).map(row => row.name)),
    minutes,
    seats: rows.length,
    typeLabel: match.isFun ? '4Fun' : 'Ranqueada',
    rows,
    hasFinal: rows.some(row => row.final !== null),
  };
}

/** "sáb, 27 de setembro · 21:04" — o app não registra locale, o Intl sim. */
export function formatMatchDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const day = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  return `${day.replace('.', '')} · ${time}`;
}
