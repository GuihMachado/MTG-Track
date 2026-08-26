import {
  CollectionEntryDto,
  CollectionFilters,
  CollectionSort,
  SearchMode,
} from '../../models/collection.models';

/**
 * Busca, filtro e ordenação da coleção — tudo local, sem ida à rede. Módulo
 * puro porque é a regra que o usuário percebe direto: "digitar anel acha Anel
 * Solar, digitar sol ring acha a mesma carta".
 */

/** Um eixo de filtro que cabe em chip — valor fechado, ao contrário de edição. */
export interface FilterChip {
  label: string;
  axis: 'color' | 'type' | 'foil' | 'language';
  value: string;
}

/**
 * Os eixos de valor fechado, na ordem em que aparecem no modal. Cor e tipo vêm
 * gravados na entrada justamente para o filtro não precisar de rede.
 */
export const FILTER_CHIPS: readonly FilterChip[] = [
  { label: 'Branco', axis: 'color', value: 'W' },
  { label: 'Azul', axis: 'color', value: 'U' },
  { label: 'Preto', axis: 'color', value: 'B' },
  { label: 'Vermelho', axis: 'color', value: 'R' },
  { label: 'Verde', axis: 'color', value: 'G' },
  { label: 'Incolor', axis: 'color', value: 'C' },
  { label: 'Criatura', axis: 'type', value: 'criatura' },
  { label: 'Artefato', axis: 'type', value: 'artefato' },
  { label: 'Instantânea', axis: 'type', value: 'instant' },
  { label: 'Feitiço', axis: 'type', value: 'sorcery' },
  { label: 'Encantamento', axis: 'type', value: 'encantamento' },
  { label: 'Terreno', axis: 'type', value: 'terreno' },
  { label: 'Foil', axis: 'foil', value: 'true' },
  { label: 'PT-BR', axis: 'language', value: 'pt' },
  { label: 'EN', axis: 'language', value: 'en' },
];

export function chipsOfAxis(axis: FilterChip['axis']): FilterChip[] {
  return FILTER_CHIPS.filter(chip => chip.axis === axis);
}

export function isChipOn(chip: FilterChip, filters: CollectionFilters): boolean {
  switch (chip.axis) {
    case 'color':
      return filters.colors.includes(chip.value);
    case 'type':
      return filters.types.includes(chip.value);
    case 'foil':
      return filters.foil === true;
    case 'language':
      return filters.language === chip.value;
  }
}

export function toggleChip(chip: FilterChip, filters: CollectionFilters): CollectionFilters {
  switch (chip.axis) {
    case 'color':
      return { ...filters, colors: toggleValue(filters.colors, chip.value) };
    case 'type':
      return { ...filters, types: toggleValue(filters.types, chip.value) };
    case 'foil':
      return { ...filters, foil: filters.foil === true ? null : true };
    case 'language':
      return { ...filters, language: filters.language === chip.value ? null : chip.value };
  }
}

export function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

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
 * Busca por efeito: casa o texto de regras da carta.
 *
 * Em **inglês**, e só. É a língua que toda impressão da Scryfall carrega — a
 * cópia brasileira do Eliminador de Cadáveres também traz o `oracle_text` em
 * inglês —, então buscar nela acha a carta independentemente de qual impressão
 * o usuário registrou. O preço disso é saber o termo em inglês: "connive", não
 * "acoberta".
 */
export function matchesText(entry: CollectionEntryDto, query: string): boolean {
  const needle = fold(query);
  if (!needle) return true;

  return foldedOracle(entry).includes(needle);
}

/**
 * O texto de regras dobrado, guardado por entrada.
 *
 * Sem isto, cada tecla digitada normalizaria o texto inteiro de mil cartas — um
 * `oracle_text` tem centenas de caracteres, e nome e tipo, que a busca já
 * dobrava, têm dezenas. O `WeakMap` é chaveado pelo próprio objeto da entrada:
 * ele muda quando a coleção recarrega, e aí o cache se refaz sozinho sem
 * ninguém precisar invalidá-lo.
 */
const oracleCache = new WeakMap<CollectionEntryDto, string>();

function foldedOracle(entry: CollectionEntryDto): string {
  const cached = oracleCache.get(entry);
  if (cached !== undefined) return cached;

  const folded = fold(entry.oracleText ?? '');
  oracleCache.set(entry, folded);
  return folded;
}

/**
 * Quantas cartas casariam se a busca fosse por texto — é o número da linha de
 * sugestão. Conta **dentro dos filtros já ligados**: prometer 12 e entregar 3
 * porque havia um filtro de cor aceso quebraria a única coisa que a linha faz,
 * que é dizer de antemão o que vai aparecer.
 */
export function countTextMatches(
  entries: CollectionEntryDto[],
  query: string,
  filters: CollectionFilters,
): number {
  if (!fold(query)) return 0;

  return entries.filter(entry => matchesFilters(entry, filters) && matchesText(entry, query))
    .length;
}

/**
 * Busca no detalhe do deck: nome **ou** texto de regras, num campo só.
 *
 * Aqui não existe a ambiguidade que obriga a coleção a ter dois modos — a lista
 * tem cem cartas, não mil, então casar os dois de uma vez não produz ruído que
 * o olho não resolva. "Sol Ring" acha pelo nome e "draw a card" pelo efeito.
 */
export function matchesDeckCardQuery(
  card: { name: string; oracleText: string | null },
  query: string,
): boolean {
  const needle = fold(query);
  if (!needle) return true;

  return fold(card.name).includes(needle) || fold(card.oracleText ?? '').includes(needle);
}

/**
 * As habilidades que existem na estante, da mais comum para a mais rara — é o
 * que a seção de chips lista. Mesma regra do filtro de coleções: só aparece o
 * que o usuário tem, senão a lista seriam as ~180 palavras-chave do jogo.
 *
 * Os nomes ficam em inglês porque é assim que a Scryfall os publica; não existe
 * lista de palavras-chave em português na API.
 */
export function keywordFacets(
  entries: CollectionEntryDto[],
): { keyword: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    for (const keyword of entry.keywords ?? []) {
      counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword));
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

  if (filters.keywords.length > 0) {
    // OU dentro do eixo, como cor e tipo: marcar Flying e Deathtouch mostra
    // quem tem qualquer uma das duas, não quem tem as duas.
    const owned = entry.keywords ?? [];
    if (!filters.keywords.some(chosen => owned.includes(chosen))) return false;
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
  mode: SearchMode,
  filters: CollectionFilters,
  sort: CollectionSort,
): CollectionEntryDto[] {
  const matchesTerm = mode === 'text' ? matchesText : matchesQuery;

  return sortEntries(
    entries.filter(entry => matchesTerm(entry, query) && matchesFilters(entry, filters)),
    sort,
  );
}

/**
 * Quantos eixos estão ligados — é o número no contador do botão de filtros,
 * agora que os chips saíram da tela.
 *
 * O termo da busca **não** conta, em nenhum dos dois modos: ele está escrito no
 * próprio campo, à vista, e a linha de sugestão diz se está valendo como nome
 * ou como texto. Contá-lo aqui seria avisar duas vezes a mesma coisa.
 */
export function activeFilterCount(filters: CollectionFilters): number {
  return (
    filters.colors.length +
    filters.types.length +
    filters.sets.length +
    filters.keywords.length +
    (filters.foil === null ? 0 : 1) +
    (filters.language === null ? 0 : 1)
  );
}
