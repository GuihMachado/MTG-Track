import { CollectionEntryDto } from '../../models/collection.models';
import { fold } from './collection-filters';

/**
 * As coleções que existem na estante, agrupadas por família de edição — sem ida
 * à rede, só com o que a entrada já traz.
 *
 * É o que alimenta a folha de filtro: ela lista **o que você tem**, nunca as
 * 1.048 edições que existem. Uma lista de tudo obrigaria o usuário a procurar
 * a agulha; a lista da estante cabe em quatro toques.
 */

export interface SetGroupMember {
  code: string;
  name: string;
  /** Linhas da coleção (uma por impressão). */
  entries: number;
  /** Soma das quantidades. */
  cards: number;
}

export interface SetGroup extends SetGroupMember {
  iconUrl: string | null;
  /** Cartas distintas (por oracleId) — a mesma carta em duas edições conta uma. */
  unique: number;
  /**
   * As edições da família presentes na sua coleção. Só vale mostrar quando são
   * duas ou mais: "The Hobbit ⟩ The Hobbit" não diz nada a ninguém.
   */
  members: SetGroupMember[];
}

export function groupSets(entries: CollectionEntryDto[]): SetGroup[] {
  const families = new Map<string, SetGroup & { oracles: Set<string>; byCode: Map<string, SetGroupMember> }>();

  for (const entry of entries) {
    const code = (entry.setFamilyCode || entry.setCode || '').toLowerCase();
    const name = entry.setFamilyName || entry.setName || entry.setCode;

    const family = families.get(code) ?? {
      code,
      name,
      iconUrl: entry.setIconUrl ?? null,
      entries: 0,
      cards: 0,
      unique: 0,
      members: [],
      oracles: new Set<string>(),
      byCode: new Map<string, SetGroupMember>(),
    };

    family.entries += 1;
    family.cards += entry.quantity;
    if (entry.oracleId) family.oracles.add(entry.oracleId);
    family.iconUrl ??= entry.setIconUrl ?? null;

    const childCode = (entry.setCode || code).toLowerCase();
    const child = family.byCode.get(childCode) ?? {
      code: childCode,
      name: entry.setName || entry.setCode,
      entries: 0,
      cards: 0,
    };

    child.entries += 1;
    child.cards += entry.quantity;
    family.byCode.set(childCode, child);

    families.set(code, family);
  }

  return [...families.values()]
    .map(family => ({
      code: family.code,
      name: family.name,
      iconUrl: family.iconUrl,
      entries: family.entries,
      cards: family.cards,
      unique: family.oracles.size,
      members: [...family.byCode.values()].sort(byCards),
    }))
    .sort(byCards);
}

/** Busca da folha: casa nome e sigla, sem acento nem caixa. */
export function matchesSetQuery(group: SetGroup, query: string): boolean {
  const needle = fold(query);
  if (!needle) return true;

  return (
    fold(group.name).includes(needle) ||
    fold(group.code).includes(needle) ||
    group.members.some(
      member => fold(member.name).includes(needle) || fold(member.code).includes(needle),
    )
  );
}

/** Mais cartas primeiro; empate por nome, para a ordem não dançar entre visitas. */
function byCards(a: SetGroupMember, b: SetGroupMember): number {
  return b.cards - a.cards || a.name.localeCompare(b.name, 'pt');
}
