import { TableState } from '../../models/match.models';
import { COUNTER_TYPES, CounterMap, normalizeCounters } from './counters';

/** Salvamento automático no servidor: a cada 10 minutos, se algo mudou. */
export const AUTOSAVE_MS = 10 * 60 * 1000;

/** Veneno que elimina (mesmo número da mesa de vidas). */
export const POISON_OUT = 10;

/** O mínimo de um assento que vai para o servidor. */
export interface SeatSnapshot {
  userId: number;
  seatColor: string;
  life: number;
  poison: number;
  counters: CounterMap;
}

/** A mesa como o servidor guarda: assentos na ordem em que estão na mesa. */
export function toTableState(seats: readonly SeatSnapshot[], startingLife: number): TableState {
  return {
    startingLife,
    seats: seats.map(seat => ({
      userId: seat.userId,
      seatColor: seat.seatColor,
      life: seat.life,
      poison: seat.poison,
      counters: { ...normalizeCounters(seat.counters) },
    })),
  };
}

/**
 * Duas mesas são a mesma quando cada lugar tem o mesmo jogador, cor, vida,
 * veneno e contadores. É o que decide se o outro celular precisa perguntar
 * qual mesa usar: igual não pergunta nada.
 */
export function sameTable(a: TableState | null | undefined, b: TableState | null | undefined): boolean {
  if (!a || !b) return false;
  if (a.seats.length !== b.seats.length) return false;

  return a.seats.every((seat, index) => {
    const other = b.seats[index]!;
    if (
      seat.userId !== other.userId ||
      seat.seatColor !== other.seatColor ||
      seat.life !== other.life ||
      seat.poison !== other.poison
    ) {
      return false;
    }

    const mine = normalizeCounters(seat.counters);
    const theirs = normalizeCounters(other.counters);
    return COUNTER_TYPES.every(kind => mine[kind] === theirs[kind]);
  });
}

/**
 * O que difere entre as duas mesas, em palavras: "vida de Ana", "cor de
 * Bruno", "ordem dos lugares". Quando só a cor ou um contador mudou, as duas
 * linhas de vida saem iguais — sem isto a pergunta pediria uma escolha sem
 * mostrar o motivo. Até três itens; o resto vira "e mais N".
 */
export function describeDiff(a: TableState, b: TableState, names: ReadonlyMap<number, string>): string {
  const items: string[] = [];
  const nameOf = (id: number) => names.get(id) ?? 'um jogador';

  const orderA = a.seats.map(seat => seat.userId).join(',');
  const orderB = b.seats.map(seat => seat.userId).join(',');
  if (orderA !== orderB) items.push('ordem dos lugares');

  const byUser = new Map(b.seats.map(seat => [seat.userId, seat]));
  for (const seat of a.seats) {
    const other = byUser.get(seat.userId);
    if (!other) continue;
    const name = nameOf(seat.userId);
    if (seat.life !== other.life) items.push(`vida de ${name}`);
    if (seat.poison !== other.poison) items.push(`veneno de ${name}`);
    if (seat.seatColor !== other.seatColor) items.push(`cor de ${name}`);
    const mine = normalizeCounters(seat.counters);
    const theirs = normalizeCounters(other.counters);
    if (COUNTER_TYPES.some(kind => mine[kind] !== theirs[kind])) items.push(`contadores de ${name}`);
  }

  if (a.startingLife !== b.startingLife) items.push('vida inicial');
  if (items.length <= 3) return items.join(', ');
  return `${items.slice(0, 3).join(', ')} e mais ${items.length - 3}`;
}

/** "32 · 18 · 40 · 7": as vidas na ordem da mesa, para comparar de relance. */
export function lifeLine(state: TableState): string {
  return state.seats.map(seat => seat.life).join(' · ');
}

export function isOut(life: number, poison: number): boolean {
  return life <= 0 || poison >= POISON_OUT;
}

/** Cronômetro da partida: "38:07", ou "1:12:40" passada a primeira hora. */
export function formatClock(elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** "21:43", na hora local. */
export function clockTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
