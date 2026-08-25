import { DeckDto } from '../../models/collection.models';

/**
 * Estado de um deck contra a coleção. A barra é o elemento principal do cartão
 * — não o nome — e a cor dela é o resumo de "isso cabe no que eu tenho".
 *
 * O verde e o âmbar brilham; o vermelho não. Não se celebra o que está longe.
 */
export type DeckProgressLevel = 'complete' | 'close' | 'far';

export interface DeckProgress {
  level: DeckProgressLevel;
  /** 0–100, arredondado; deck vazio é 0 e não divide por zero. */
  percent: number;
  /** Token de cor do estado, para o template não repetir hex. */
  color: string;
  glow: boolean;
  /** A linha de contexto: o que ela diz depende de estar completo ou não. */
  context: string;
}

const COLORS: Record<DeckProgressLevel, string> = {
  complete: 'var(--success)',
  close: 'var(--warning)',
  far: 'var(--danger)',
};

/**
 * A barra sozinha, sem a linha de contexto. Deck e coleção usam a mesma
 * gramática de cor de propósito: as duas respondem "o quanto disso eu tenho",
 * e inventar uma segunda escala faria o usuário aprender duas.
 */
export function progressBar(owned: number, total: number | null): Omit<DeckProgress, 'context'> {
  const percent = total && total > 0 ? Math.round((owned / total) * 100) : 0;
  const level: DeckProgressLevel = percent >= 90 ? 'complete' : percent >= 60 ? 'close' : 'far';

  return {
    level,
    percent,
    color: COLORS[level],
    // O vermelho é o único sem brilho: acender o que está longe seria elogiar
    // o problema.
    glow: level !== 'far',
  };
}

export function deckProgress(deck: DeckDto): DeckProgress {
  return { ...progressBar(deck.ownedCards, deck.totalCards), context: contextLine(deck) };
}

/** "completo · US$ 1.420" ou "faltam 13 · US$ 186 para fechar". */
function contextLine(deck: DeckDto): string {
  if (deck.missingCards === 0 && deck.totalCards > 0) return 'completo';
  if (deck.totalCards === 0) return 'lista vazia';
  return `faltam ${deck.missingCards}`;
}
