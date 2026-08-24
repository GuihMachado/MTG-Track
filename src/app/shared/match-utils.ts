export function commanderArtUrl(commander: string | null | undefined): string | null {
  if (!commander) return null;
  return `https://api.scryfall.com/cards/named?format=image&version=art_crop&fuzzy=${encodeURIComponent(commander)}`;
}

/**
 * Imagem inteira da carta pelo nome exato (em inglês) — usada pela banlist.
 * O service worker já cacheia esse endpoint; nome errado retorna 404, então
 * o <img> precisa do handler de erro com fallback.
 */
export function namedCardImageUrl(cardName: string, customUrl?: string | null): string {
  if (customUrl) return customUrl;
  return `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image`;
}

/**
 * Canais RGB da identidade de cor de um deck, para a camada de luz da
 * Levitação (halo, trilho, glow). A primeira cor manda: um deck U/B brilha
 * azul, e deck sem cor cai no cinza do incolor.
 */
export function manaRgbVar(colors: string | null | undefined): string {
  const first = (colors ?? '').split('/')[0]?.trim().toUpperCase();
  const known = ['W', 'U', 'B', 'R', 'G', 'C'];
  return `var(--mana-${known.includes(first ?? '') ? first!.toLowerCase() : 'c'}-rgb)`;
}

// Converte "W/U/B" (formato salvo no banco) para "{W}{U}{B}" (formato do pipe manaSymbol).
export function colorsToManaSymbols(colors: string | null | undefined): string {
  if (!colors) return '';
  return colors
    .split('/')
    .filter(c => c.trim().length > 0)
    .map(c => `{${c.trim()}}`)
    .join('');
}
