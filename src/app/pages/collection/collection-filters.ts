import {
  CollectionEntryDto,
  CollectionFilters,
  CollectionSort,
} from '../../models/collection.models';

/**
 * Busca, filtro e ordenação da coleção — tudo local, sem ida à rede. Módulo
 * puro porque é a regra que o usuário percebe direto: "digitar anel acha Anel
 * Solar, digitar sol ring acha a mesma carta".
 */

/** Sem acento e sem caixa: "Anel Solar" tem de casar com "anel solar". */
export function fold(value: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * A busca casa contra o nome impresso E o nome em inglês ao mesmo tempo: a
 * coleção é bilíngue por natureza, e obrigar o usuário a lembrar em que idioma
 * ele cadastrou a carta é obrigá-lo a fazer o trabalho do app.
 */
export function matchesQuery(entry: CollectionEntryDto, query: string): boolean {
  const needle = fold(query);
  if (!needle) return true;

  return (
    fold(entry.name).includes(needle) ||
    fold(entry.nameEn).includes(needle) ||
    fold(entry.setCode).includes(needle) ||
    // O nome da edição também casa: quem digita "hobbit" está procurando a
    // coleção, não uma carta chamada Hobbit.
    fold(entry.setName).includes(needle) ||
    fold(entry.setFamilyName ?? '').includes(needle)
  );
}

/**
 * O tipo é bilíngue como o nome: a linha de tipo gravada vem do idioma da
 * impressão (o backend prefere `printed_type_line`), então a mesma coleção tem
 * "Criatura — Humano" e "Creature — Human" convivendo. O filtro casa com os
 * dois, senão marcar "Criatura" esconde toda criatura em inglês — e vice-versa.
 * As chaves são os `value` dos chips; os termos já saem passados por `fold`.
 */
const TYPE_TERMS: Record<string, string[]> = {
  criatura: ['criatura', 'creature'],
  artefato: ['artefato', 'artifact'],
  instant: ['instant', 'instantanea'],
  sorcery: ['sorcery', 'feitico'],
  encantamento: ['encantamento', 'enchantment'],
  terreno: ['terreno', 'land'],
};

/**
 * Os eixos de filtro são independentes e se somam (E entre eixos, OU dentro do
 * eixo): cor azul + tipo artefato mostra artefato azul, e duas cores marcadas
 * mostram qualquer uma das duas.
 */
export function matchesFilters(entry: CollectionEntryDto, filters: CollectionFilters): boolean {
  if (filters.colors.length > 0) {
    const colorless = entry.colors.length === 0;
    const hit = filters.colors.some(color =>
      color === 'C' ? colorless : entry.colors.includes(color),
    );
    if (!hit) return false;
  }

  if (filters.types.length > 0) {
    const type = fold(entry.typeLine);
    const hit = filters.types.some(candidate =>
      (TYPE_TERMS[candidate] ?? [fold(candidate)]).some(term => type.includes(term)),
    );
    if (!hit) return false;
  }

  if (filters.sets.length > 0) {
    // A marca pode ser a família ("hob") ou uma edição solta dela ("hoc"):
    // marcar The Hobbit traz o Eternal junto, marcar só o Eternal não traz o
    // resto da família.
    const family = fold(entry.setFamilyCode ?? entry.setCode);
    const code = fold(entry.setCode);
    if (!filters.sets.some(chosen => fold(chosen) === family || fold(chosen) === code)) {
      return false;
    }
  }

  if (filters.foil !== null && entry.foil !== filters.foil) return false;

  if (filters.language !== null && entry.language !== filters.language) return false;

  return true;
}

export function sortEntries(
  entries: CollectionEntryDto[],
  sort: CollectionSort,
): CollectionEntryDto[] {
  const sorted = [...entries];

  switch (sort) {
    case 'price':
      // Sem preço vai para o fim: a ordenação por preço serve para achar o que
      // vale mais, e null no topo não responde nada.
      return sorted.sort((a, b) => (b.priceUsd ?? -1) - (a.priceUsd ?? -1));
    case 'quantity':
      return sorted.sort((a, b) => b.quantity - a.quantity || compareName(a, b));
    case 'recent':
      return sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
    default:
      return sorted.sort(compareName);
  }
}

function compareName(a: CollectionEntryDto, b: CollectionEntryDto): number {
  return fold(a.name).localeCompare(fold(b.name), 'pt');
}

export function applyCollectionView(
  entries: CollectionEntryDto[],
  query: string,
  filters: CollectionFilters,
  sort: CollectionSort,
): CollectionEntryDto[] {
  return sortEntries(
    entries.filter(entry => matchesQuery(entry, query) && matchesFilters(entry, filters)),
    sort,
  );
}

export function activeFilterCount(filters: CollectionFilters): number {
  return (
    filters.colors.length +
    filters.types.length +
    filters.sets.length +
    (filters.foil === null ? 0 : 1) +
    (filters.language === null ? 0 : 1)
  );
}
