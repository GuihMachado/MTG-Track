export function commanderArtUrl(commander: string | null | undefined): string | null {
  if (!commander) return null;
  return `https://api.scryfall.com/cards/named?format=image&version=art_crop&fuzzy=${encodeURIComponent(commander)}`;
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
