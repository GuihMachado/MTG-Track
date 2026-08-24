/** Tipos enxutos da resposta da Scryfall — só o que o módulo de proxies usa. */
export interface ScryfallImageUris {
  small: string;
  normal: string;
  large: string;
  png?: string;
}

export interface ScryfallCardFace {
  name: string;
  mana_cost?: string;
  type_line?: string;
  image_uris?: ScryfallImageUris;
}

export interface ScryfallCard {
  id: string;
  name: string;
  set: string;
  set_name: string;
  type_line?: string;
  mana_cost?: string;
  colors?: string[];
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
}

export interface ScryfallSearchPage {
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
}

/** Cartas de dupla face não têm image_uris na raiz — vale a frente. */
export function extractImageUris(card: ScryfallCard): ScryfallImageUris | undefined {
  return card.image_uris ?? card.card_faces?.[0]?.image_uris;
}

export interface ProxyCard {
  id: string;
  scryfallId?: string;
  name: string;
  setName?: string;
  setCode?: string;
  typeLine?: string;
  manaCost?: string;
  colors?: string[];
  /** Imagem 'normal' — grid e preview. */
  imageUrl: string;
  /** Imagem 'large' — render do PDF (~271 DPI a 63mm). */
  largeImageUrl?: string;
  quantity: number;
}

export interface PrintSettings {
  pageSize: 'a4' | 'letter';
  /** Retrato = grade 3×3 (9/página); paisagem = 4×2 (8/página). */
  orientation: 'portrait' | 'landscape';
  cutLines: boolean;
  /** Espaço entre cartas, em mm. */
  gapMm: 0 | 1 | 2;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  pageSize: 'a4',
  orientation: 'portrait',
  cutLines: true,
  gapMm: 0,
};
