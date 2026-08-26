/**
 * Coleção pessoal. Só cinco campos por entrada — quantidade, edição, idioma,
 * foil e preço. Conservação, preço pago e localização física foram considerados
 * e descartados por não serem preenchidos.
 *
 * O preço é em **dólar**, não em real: a Scryfall publica usd/eur/tix e nunca
 * BRL. `priceUsd` null é preço indisponível, e a tela mostra `—`, nunca zero.
 */
export interface CollectionEntryDto {
  id: string;
  /** Impressão exata — o id da Scryfall é por idioma. */
  scryfallId: string;
  /** A carta, independente da impressão: é a chave do casamento com decks. */
  oracleId: string;
  /** Nome na língua da impressão: "Anel Solar". */
  name: string;
  /** Sempre em inglês — a busca casa contra os dois ao mesmo tempo. */
  nameEn: string;
  artCropUrl: string | null;
  /** Carta inteira (imagem `normal`); null em linha antiga até o refresh de preços. */
  imageUrl: string | null;
  setCode: string;
  setName: string;
  /** Raiz da família de edições: hoc (The Hobbit Eternal) devolve hob. */
  setFamilyCode: string;
  /** Nome da família — é o que o usuário chama de coleção. */
  setFamilyName: string;
  setIconUrl: string | null;
  collectorNumber: string;
  language: string;
  foil: boolean;
  quantity: number;
  priceUsd: number | null;
  colors: string[];
  typeLine: string;
  addedAt: string;
  pricedAt: string | null;
}

export interface CollectionSummaryDto {
  totalCards: number;
  uniqueCards: number;
  totalValueUsd: number;
  mostValuable: { name: string; priceUsd: number } | null;
  /** Entradas fora do total por falta de preço — a nota do painel. */
  withoutPrice: number;
}

export interface CollectionResponse {
  entries: CollectionEntryDto[];
  summary: CollectionSummaryDto;
}

export const EMPTY_SUMMARY: CollectionSummaryDto = {
  totalCards: 0,
  uniqueCards: 0,
  totalValueUsd: 0,
  mostValuable: null,
  withoutPrice: 0,
};

/** Uma impressão da Scryfall pronta para a tela: com preço, arte e acabamento. */
export interface CardPrint {
  scryfallId: string;
  oracleId: string;
  name: string;
  nameEn: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  language: string;
  priceUsd: number | null;
  priceUsdFoil: number | null;
  artCropUrl: string | null;
  /** Carta inteira (imagem `normal`) — a folha de adicionar mostra a carta. */
  imageUrl: string | null;
  /** Símbolo da edição; vem preenchido só do seletor de impressões. */
  setIconUrl: string | null;
  typeLine: string;
  colors: string[];
  rarity: string;
  manaCost: string | null;
  releasedAt: string | null;
  hasFoil: boolean;
}

export interface DeckCardDto {
  id: string;
  oracleId: string;
  name: string;
  quantity: number;
  ownedQuantity: number;
  owned: boolean;
  priceUsd: number | null;
  artCropUrl: string | null;
  section: string;
}

export interface DeckDto {
  id: string;
  name: string;
  commanderName: string | null;
  commanderArtUrl: string | null;
  colors: string[];
  totalCards: number;
  ownedCards: number;
  missingCards: number;
  /** O que falta comprar, não o valor do deck: é o que leva a uma ação. */
  missingValueUsd: number;
  updatedAt: string;
  cards?: DeckCardDto[];
}

/** Uma linha da lista colada, já quebrada pelo parser (que é puro e tem teste). */
export interface ParsedLine {
  line: number;
  raw: string;
  quantity: number;
  name: string;
  setCode: string | null;
  collectorNumber: string | null;
  foil: boolean;
  section: string;
}

export type ResolutionStatus = 'ready' | 'ambiguous' | 'notfound';

export interface ResolutionDto extends ParsedLine {
  status: ResolutionStatus;
  reason: string;
  match: CardPrint | null;
  alternatives: CardPrint[];
}

export interface ImportItem {
  scryfallId: string;
  quantity: number;
  foil: boolean;
  section: string;
}

export interface ImportResult {
  destination: 'collection' | 'deck';
  collection?: CollectionResponse;
  deck?: DeckDto;
}

export type ImportSource = 'moxfield' | 'archidekt' | 'deckstats' | 'tappedout';

export interface FetchedDeck {
  source: ImportSource;
  deckName: string | null;
  text: string;
}

/** Eixos de filtro da coleção. Cor e tipo vêm gravados na entrada. */
export interface CollectionFilters {
  colors: string[];
  types: string[];
  foil: boolean | null;
  language: string | null;
  /**
   * Coleções marcadas. Guarda o código da família ("hob") ou o de uma edição
   * solta ("hoc") — marcar a família traz os filhos junto, que é como o
   * usuário fala de The Hobbit.
   */
  sets: string[];
}

export const NO_FILTERS: CollectionFilters = {
  colors: [],
  types: [],
  foil: null,
  language: null,
  sets: [],
};

/**
 * Uma coleção como o usuário a enxerga: a família inteira de edições. O que
 * você tem é contado em cartas distintas **dessa família** — ter Anel Solar de
 * Commander 2021 não aproxima ninguém de fechar The Hobbit.
 */
export interface CollectionSetDto {
  code: string;
  name: string;
  iconUrl: string | null;
  releasedAt: string | null;
  members: { code: string; name: string; setType: string }[];
  ownedUnique: number;
  ownedCards: number;
  ownedEntries: number;
  /** Cartas distintas da família; null quando a Scryfall não respondeu. */
  totalUnique: number | null;
  valueUsd: number;
}

/** Uma carta da edição no fichário — tendo você ou não. */
export interface SetBinderCardDto {
  scryfallId: string;
  oracleId: string;
  name: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  colors: string[];
  priceUsd: number | null;
  imageUrl: string | null;
  ownedQuantity: number;
}

export interface SetBinderDto extends CollectionSetDto {
  cards: SetBinderCardDto[];
}

export type CollectionSort = 'name' | 'price' | 'quantity' | 'recent';
export type CollectionView = 'list' | 'grid';
