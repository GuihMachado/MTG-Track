/**
 * Deltas flutuantes de vida — camada puramente visual sobre a life-grid.
 * Toques na mesma janela agregam num único número (+1 → +3); ao fechar a
 * janela o float "voa" (leaving) e é removido no fim da animação.
 */
export interface LifeFloat {
  /** Id único para o track do template. */
  key: number;
  seatId: number;
  /** Valor agregado com sinal (+3 / -5). */
  amount: number;
  /** true = tocando a animação de saída; não recebe mais toques. */
  leaving: boolean;
}

export const FLOAT_WINDOW_MS = 800;

/**
 * Soma o delta no float ativo (não-leaving) do assento, ou cria um novo com
 * `nextKey`. Se a soma zerar (+1 seguido de -1), o float some na hora.
 */
export function upsertFloat(list: LifeFloat[], seatId: number, delta: number, nextKey: number): LifeFloat[] {
  const active = list.find(f => f.seatId === seatId && !f.leaving);

  if (!active) {
    return [...list, { key: nextKey, seatId, amount: delta, leaving: false }];
  }

  const amount = active.amount + delta;
  if (amount === 0) {
    return list.filter(f => f.key !== active.key);
  }
  return list.map(f => (f.key === active.key ? { ...f, amount } : f));
}

/** Marca o float ativo do assento para a animação de saída. */
export function markLeaving(list: LifeFloat[], seatId: number): LifeFloat[] {
  return list.map(f => (f.seatId === seatId && !f.leaving ? { ...f, leaving: true } : f));
}

/** Remove um float (chamado no animationend da saída). */
export function removeFloat(list: LifeFloat[], key: number): LifeFloat[] {
  return list.filter(f => f.key !== key);
}
