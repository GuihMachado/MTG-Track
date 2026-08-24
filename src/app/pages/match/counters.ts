import { MtgIconName } from '../../shared/icons/mtg-icons';

/** Contadores extras da mesa (Energia, Experiência, Tesouro, Radiação). */
export type CounterType = 'energy' | 'experience' | 'treasure' | 'rad';

export const COUNTER_TYPES: readonly CounterType[] = ['energy', 'experience', 'treasure', 'rad'];

export interface CounterDef {
  /** Ícone da família do app (ver shared/icons/mtg-icons). */
  icon: MtgIconName;
  label: string;
}

export const COUNTER_DEFS: Record<CounterType, CounterDef> = {
  energy: { icon: 'energy', label: 'Energia' },
  experience: { icon: 'experience', label: 'Experiência' },
  treasure: { icon: 'treasure', label: 'Tesouro' },
  rad: { icon: 'rad', label: 'Radiação' },
};

export type CounterMap = Record<CounterType, number>;

export function emptyCounters(): CounterMap {
  return { energy: 0, experience: 0, treasure: 0, rad: 0 };
}

/**
 * Migração de saves antigos: `match-seats` gravado antes desta feature não tem
 * o campo, e o shape interno do storage nunca é validado — qualquer chave
 * ausente ou valor estranho vira 0.
 */
export function normalizeCounters(raw: Partial<Record<CounterType, unknown>> | null | undefined): CounterMap {
  const counters = emptyCounters();
  if (!raw || typeof raw !== 'object') return counters;

  for (const type of COUNTER_TYPES) {
    const value = Number(raw[type]);
    counters[type] = Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }
  return counters;
}
