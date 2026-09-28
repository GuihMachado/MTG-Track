import { commanderArtUrl } from './match-utils';

/**
 * Regras puras da escolha de deck: as cores do formulário, a arte da linha, a
 * pré-seleção do assento e a folha de empréstimo. Moram fora dos componentes
 * para terem teste — é aqui que mora o "qual deck aparece escolhido".
 */

export const WUBRG = ['W', 'U', 'B', 'R', 'G'] as const;
export type ManaCode = (typeof WUBRG)[number];

/** O mínimo de deck que estas regras precisam — serve a `DeckOption` e a `DeckDto`. */
export interface DeckLike {
  id: string;
  name: string;
  commanderName: string | null;
  commanderArtUrl: string | null;
  colors: string[];
}

export interface OwnedDeck extends DeckLike {
  owner: { id: number; name: string };
}

/** Cores sempre em WUBRG, sem repetição e sem letra estranha. */
export function orderWubrg(colors: readonly string[]): ManaCode[] {
  const set = new Set(colors.map(color => color.toUpperCase()));
  return WUBRG.filter(color => set.has(color));
}

export function toggleColor(colors: readonly string[], code: ManaCode): ManaCode[] {
  const current = orderWubrg(colors);
  return current.includes(code)
    ? current.filter(color => color !== code)
    : orderWubrg([...current, code]);
}

/**
 * Identidade de cor de uma carta da Scryfall. `color_identity` conta custo de
 * habilidade e símbolo no texto — é a regra do Commander; `colors` fica de
 * reserva para resposta que não traga o campo.
 */
export function identityOf(card: { color_identity?: string[]; colors?: string[] }): ManaCode[] {
  return orderWubrg(card.color_identity ?? card.colors ?? []);
}

/**
 * Canais RGB da primeira cor — o que tinge placa e brilho. Com duas ou mais
 * cores vale a primeira: gradiente entre elas soma sombras e vira lama.
 */
export function colorsRgb(colors: readonly string[]): string | null {
  const first = orderWubrg(colors)[0];
  return first ? `var(--mana-${first.toLowerCase()}-rgb)` : null;
}

/** `{W}{U}` para o pipe de mana. */
export function colorsToSymbols(colors: readonly string[]): string {
  return orderWubrg(colors).map(color => `{${color}}`).join('');
}

/**
 * Arte da linha do deck. Deck criado pelo histórico (ou sem commander
 * escolhido) não guarda arte: cai na busca por nome da Scryfall, a mesma que a
 * mesa de vidas já usa.
 */
export function deckArt(deck: DeckLike): string | null {
  return deck.commanderArtUrl ?? commanderArtUrl(deck.commanderName ?? deck.name);
}

export function isBorrowed(deck: OwnedDeck, playerId: number): boolean {
  return deck.owner.id !== playerId;
}

/**
 * O deck que o assento mostra escolhido assim que o jogador entra.
 *
 * 1. O último deck que ele levou à mesa — próprio ou emprestado — se estiver
 *    livre nesta mesa.
 * 2. Se esse deck já está em outro assento: o deck próprio livre mais recente.
 * 3. Sem histórico: o deck próprio, quando ele tem um só. Com dois ou mais,
 *    escolher é dele.
 */
export function preselectDeck(
  playerId: number,
  decks: readonly OwnedDeck[],
  lastDeckByUser: Record<string, string>,
  taken: ReadonlySet<string>,
): string | null {
  const own = decks.filter(deck => deck.owner.id === playerId && !taken.has(deck.id));
  const lastId = lastDeckByUser[String(playerId)];
  const last = lastId ? decks.find(deck => deck.id === lastId) : undefined;

  if (last && !taken.has(last.id)) return last.id;
  if (last) return own[0]?.id ?? null;
  return own.length === 1 ? own[0]!.id : null;
}

export interface LendGroup {
  owner: { id: number; name: string };
  decks: OwnedDeck[];
}

/** Sem acento e sem caixa: "Kinnan" acha "kínnan". */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * A folha "Emprestar deck": os decks dos outros jogadores, agrupados por dono
 * (em ordem alfabética), filtrados por nome do deck, commander ou dono. Os
 * decks do próprio jogador ficam de fora — já estão no select.
 */
export function lendGroups(decks: readonly OwnedDeck[], playerId: number, query = ''): LendGroup[] {
  const term = normalizeSearch(query);
  const groups = new Map<number, LendGroup>();

  for (const deck of decks) {
    if (deck.owner.id === playerId) continue;

    if (term) {
      const haystack = normalizeSearch(`${deck.name} ${deck.commanderName ?? ''} ${deck.owner.name}`);
      if (!haystack.includes(term)) continue;
    }

    const group = groups.get(deck.owner.id) ?? { owner: deck.owner, decks: [] };
    group.decks.push(deck);
    groups.set(deck.owner.id, group);
  }

  return [...groups.values()].sort((a, b) => a.owner.name.localeCompare(b.owner.name, 'pt-BR'));
}
