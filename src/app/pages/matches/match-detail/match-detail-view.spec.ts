import { describe, expect, it } from 'vitest';
import { buildDetail, joinNames } from './match-detail-view';
import { MatchDto } from '../../../models/match.models';

const GUI = { id: 1, name: 'Guilherme' };
const ANA = { id: 2, name: 'Ana' };
const BRUNO = { id: 3, name: 'Bruno' };

function match(overrides: Partial<MatchDto> = {}): MatchDto {
  return {
    id: 10,
    matchDate: '2026-09-27T21:04:00.000Z',
    matchTime: 74,
    isFun: false,
    winner: GUI,
    playersConnection: [
      { id: 1, user: GUI, commander: 'Atraxa, Grand Unifier', colors: 'W/U/B/G', deck: { id: 'd1', name: 'Atraxa superfriends', owner: GUI } },
      { id: 2, user: ANA, commander: 'Kinnan, Bonder Prodigy', colors: 'U/G', deck: { id: 'd2', name: 'Kinnan cEDH', owner: BRUNO } },
      { id: 3, user: BRUNO, commander: 'Krenko, Mob Boss', colors: 'R', deck: null },
    ],
    ...overrides,
  };
}

describe('detalhe da partida', () => {
  it('diz o resultado do ponto de vista de quem está logado', () => {
    expect(buildDetail(match(), GUI.id).result).toBe('win');
    expect(buildDetail(match(), ANA.id).result).toBe('loss');
    expect(buildDetail(match({ winner: null }), GUI.id).result).toBe('open');
    expect(buildDetail(match(), 99).result).toBe('watched');
  });

  it('adversários com "e" antes do último', () => {
    expect(buildDetail(match(), GUI.id).opponents).toBe('Ana e Bruno');
    expect(joinNames(['Ana', 'Bruno', 'Rafa'])).toBe('Ana, Bruno e Rafa');
    expect(joinNames(['Ana'])).toBe('Ana');
  });

  it('marca o vencedor, o deck emprestado e cai no commander sem deck', () => {
    const rows = buildDetail(match(), GUI.id).rows;
    expect(rows.find(r => r.userId === GUI.id)!.isWinner).toBe(true);
    expect(rows.find(r => r.userId === ANA.id)!.lentBy).toBe('Bruno');
    expect(rows.find(r => r.userId === GUI.id)!.lentBy).toBeNull();
    expect(rows.find(r => r.userId === BRUNO.id)!.deckName).toBe('Krenko, Mob Boss');
    expect(rows[0]!.symbols).toBe('{W}{U}{B}{G}');
  });

  it('sem mesa salva: ordem de cadastro e sem coluna de vida final', () => {
    const view = buildDetail(match(), GUI.id);
    expect(view.rows.map(r => r.userId)).toEqual([1, 2, 3]);
    expect(view.hasFinal).toBe(false);
  });

  it('com mesa salva: ordem da mesa e vida final, fora por vida ou veneno', () => {
    const view = buildDetail(
      match({
        tableState: {
          startingLife: 40,
          seats: [
            { userId: 3, seatColor: 'R', life: 0, poison: 0, counters: {} },
            { userId: 1, seatColor: 'W', life: 23, poison: 0, counters: {} },
            { userId: 2, seatColor: 'U', life: 4, poison: 10, counters: {} },
          ],
        },
      }),
      GUI.id,
    );
    expect(view.rows.map(r => r.userId)).toEqual([3, 1, 2]);
    expect(view.hasFinal).toBe(true);
    expect(view.rows[0]!.final).toEqual({ life: 0, poison: 0, out: true });
    expect(view.rows[1]!.final!.out).toBe(false);
    expect(view.rows[2]!.final!.out).toBe(true);
  });

  it('duração: a gravada no encerramento; aberta conta desde o início', () => {
    expect(buildDetail(match(), GUI.id).minutes).toBe(74);
    const now = new Date('2026-09-27T21:16:00.000Z').getTime();
    expect(buildDetail(match({ winner: null, matchTime: 0 }), GUI.id, now).minutes).toBe(12);
  });

  it('tipo da partida', () => {
    expect(buildDetail(match(), GUI.id).typeLabel).toBe('Ranqueada');
    expect(buildDetail(match({ isFun: true }), GUI.id).typeLabel).toBe('4Fun');
  });
});
