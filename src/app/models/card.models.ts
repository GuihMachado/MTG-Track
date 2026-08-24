/**
 * Carta como o backend a devolve (`GET /mtg/search?name=`). O texto de oráculo
 * chega quebrado em linhas de regra, não como parágrafo corrido: é assim que a
 * carta é lida, e é o que a tela precisa para desenhar um bloco por habilidade.
 */
export interface CardFaceDto {
  name: string;
  typeLine: string;
  /** null na face transformada, que não tem custo próprio. */
  manaCost: string | null;
  oracleLines: string[];
  power: string | null;
  toughness: string | null;
  /** Identidade de cor da face — alimenta o brilho ambiente da tela. */
  colors: string[];
  /** Arte e carta impressa da face; null cai no nível da carta. */
  artCropUrl: string | null;
  imageUrl: string | null;
}

export interface CardDto {
  /** Nome no idioma de `faces`. */
  name: string;
  englishName: string;
  imageUrl: string;
  artCropUrl: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  artist: string;
  /** Faces em português (impressão ou tradução); igual a `facesEn` se não houver. */
  faces: CardFaceDto[];
  facesEn: CardFaceDto[];
  /** true = tradução automática, não impressão em português. */
  translated: boolean;
  /** Idioma de `faces`: 'en' quando não há português nenhum. */
  language: 'pt' | 'en';
}
