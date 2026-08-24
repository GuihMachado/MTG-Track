import { ParsedLine } from '../../../models/collection.models';

/**
 * Leitor de lista de cartas. Módulo puro porque é a peça que mais precisa de
 * teste desta feature: toda casa exporta em um formato ligeiramente diferente, e
 * a tela de revisão só faz sentido se as linhas chegarem quebradas certo.
 *
 * Formas aceitas (todas as combinações):
 *
 *     1 Sol Ring (C21) 263
 *     1x Sol Ring
 *     Sol Ring
 *     4 Anel Solar
 *     1 Sol Ring (C21) 263 *F*     ← foil
 *     Commander:                    ← cabeçalho de seção
 *     // comentário                 ← ignorado
 *
 * Regras: quantidade opcional no começo (padrão 1); edição entre parênteses e
 * número de colecionador depois dela, os dois opcionais; `*F*`, `*f*` ou
 * `[foil]` marcam foil; linha vazia e linha que começa com `//` ou `#` são
 * ignoradas; cabeçalho terminado em `:` troca a seção corrente — sem isso o
 * sideboard entraria no deck principal.
 */

/** `main` é a seção implícita: lista sem cabeçalho é o deck todo. */
const DEFAULT_SECTION = 'main';

/**
 * Cabeçalhos que mudam de seção. O texto varia por site ("Sideboard", "SB:",
 * "Deck", "Companion"), então o que vale é a palavra, não a linha inteira.
 */
const SECTION_ALIASES: Record<string, string> = {
  commander: 'commander',
  commanders: 'commander',
  comandante: 'commander',
  sideboard: 'sideboard',
  sb: 'sideboard',
  reserva: 'sideboard',
  maybeboard: 'maybeboard',
  considering: 'maybeboard',
  deck: DEFAULT_SECTION,
  mainboard: DEFAULT_SECTION,
  main: DEFAULT_SECTION,
  companion: 'companion',
  token: 'token',
  tokens: 'token',
};

/**
 * Quantidade e edição saem por regex própria, das duas pontas da linha, e o
 * nome é o que fica no meio. Uma regex só, com o nome preguiçoso entre grupos
 * opcionais, come parte do nome quando a edição não vem: em "1x Sol Ring" ela
 * casa nome "Sol" e número "Ring", porque as duas leituras satisfazem o padrão.
 */
const QUANTITY_PATTERN = /^(\d+)\s*[xX]?[\s.)-]+/;
const PRINT_PATTERN = /[\s(]*\(([A-Za-z0-9]{2,6})\)(?:\s+([A-Za-z0-9★-]{1,10}))?\s*$/;

const FOIL_PATTERN = /\s*(?:\*f\*|\[foil\]|\(foil\))\s*/i;

/** Sufixos que os sites grudam na linha e não fazem parte do nome. */
const TRAILING_NOISE = [
  /\s*\[[^\]]*\]\s*$/, // [Commander], [Ramp]
  /\s*#.*$/, // # comentário no fim
  /\s*\|.*$/, // | tags do Moxfield
];

function sectionFromHeader(line: string): string | null {
  const withoutColon = line.replace(/:$/, '').trim();
  if (!withoutColon || withoutColon.length > 40) return null;

  // "Sideboard (15)" e "Commander" caem no mesmo alias.
  const word = withoutColon
    .replace(/\(.*\)/, '')
    .trim()
    .toLowerCase();

  return SECTION_ALIASES[word] ?? (line.endsWith(':') ? slug(word) : null);
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9]+/g, '-').slice(0, 32) || DEFAULT_SECTION;
}

export function parseList(text: string): ParsedLine[] {
  const lines = (text ?? '').split(/\r?\n/);
  const parsed: ParsedLine[] = [];
  let section = DEFAULT_SECTION;

  for (let index = 0; index < lines.length; index++) {
    const raw = lines[index] ?? '';
    const trimmed = raw.trim();

    if (!trimmed) continue;
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    // Cabeçalho de seção: só quando não há carta na mesma linha.
    if (trimmed.endsWith(':')) {
      const header = sectionFromHeader(trimmed);
      if (header) {
        section = header;
        continue;
      }
    }

    const line = parseLine(trimmed, index + 1, section);
    if (line) parsed.push(line);
  }

  return parsed;
}

export function parseLine(raw: string, lineNumber: number, section: string): ParsedLine | null {
  let text = raw.trim();

  const foil = FOIL_PATTERN.test(text);
  if (foil) text = text.replace(FOIL_PATTERN, ' ').trim();

  for (const noise of TRAILING_NOISE) text = text.replace(noise, '').trim();

  let quantity = 1;
  const quantityMatch = QUANTITY_PATTERN.exec(text);
  if (quantityMatch) {
    quantity = Math.max(1, Number(quantityMatch[1]) || 1);
    text = text.slice(quantityMatch[0].length).trim();
  }

  let setCode: string | null = null;
  let collectorNumber: string | null = null;
  const printMatch = PRINT_PATTERN.exec(text);
  if (printMatch) {
    setCode = (printMatch[1] ?? '').toUpperCase();
    // Número sem edição é ambíguo (pode ser parte do nome), então só vale
    // quando a edição veio junto.
    collectorNumber = printMatch[2] ?? null;
    text = text.slice(0, printMatch.index).trim();
  }

  const name = text.trim();
  // Nome tem de ter letra: uma linha só de número é contagem ou lixo de
  // exportação ("15", "100"), nunca carta.
  if (!/\p{L}/u.test(name)) return null;

  return {
    line: lineNumber,
    raw: raw.trim(),
    quantity,
    name,
    setCode,
    collectorNumber,
    foil,
    section,
  };
}

/** Quantas cartas a lista soma — o rótulo do botão da revisão conta isso. */
export function totalCards(lines: ParsedLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
