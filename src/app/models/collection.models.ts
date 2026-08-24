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
  setCode: string;
  setName: string;
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
}

export const NO_FILTERS: CollectionFilters = {
  colors: [],
  types: [],
  foil: null,
  language: null,
};

export type CollectionSort = 'name' | 'price' | 'quantity' | 'recent';
export type CollectionView = 'list' | 'grid';
