/**
 * Classificação das linhas de oráculo em blocos de leitura.
 *
 * O backend entrega uma linha por habilidade; aqui cada linha ganha a forma
 * com que vai aparecer na tela: chips de palavra-chave, pílula de custo de
 * habilidade ativada, rótulo de habilidade nomeada e texto lembrete separado
 * do texto de regra. Módulo puro de propósito — é regra de apresentação com
 * casos de borda demais para viver num template.
 */

export type OracleBlockKind = 'keywords' | 'rule';

export interface OracleBlock {
  kind: OracleBlockKind;
  /** Palavras-chave da linha (`Voar`, `Ameaça`) quando kind = 'keywords'. */
  keywords: string[];
  /** Custo de habilidade ativada, em pips (`{1}{U}{B}{R}`). */
  cost: string | null;
  /** Rótulo de habilidade nomeada (`Fórmula do Duende`). */
  label: string | null;
  /** Texto de regra, já sem custo, rótulo e lembrete. */
  text: string;
  /** Texto lembrete que vinha entre parênteses no fim da linha. */
  reminder: string | null;
}

/** Um grupo de pips: `{1}`, `{U}`, `{W/U}`, `{T}`. */
const PIP = /\{[^}]+\}/g;
/** Custo de habilidade ativada: só pips, vírgulas e espaços antes do `:`. */
const ACTIVATED = /^((?:\{[^}]+\}[,\s]*)+):\s*(.+)$/;
/** Habilidade nomeada: `Rótulo — texto`. Travessão, não hífen. */
const NAMED = /^([^—{}]{1,44})\s—\s(.+)$/;
/** Lembrete: parênteses fechando a linha. */
const REMINDER = /\s*\(([^()]*)\)\s*$/;

/** Palavra-chave: no máximo duas palavras, sem pontuação de frase. */
const MAX_KEYWORD_WORDS = 2;
const MAX_KEYWORDS = 4;

export function parseOracleLine(line: string): OracleBlock {
  const raw = line.trim();

  const keywords = asKeywords(raw);
  if (keywords) {
    return { kind: 'keywords', keywords, cost: null, label: null, text: '', reminder: null };
  }

  let text = raw;
  let reminder: string | null = null;
  let cost: string | null = null;
  let label: string | null = null;

  const withReminder = REMINDER.exec(text);
  // Linha que é *só* o lembrete não vira bloco vazio: o parêntese fica no texto.
  if (withReminder && withReminder.index > 0) {
    reminder = withReminder[1]!.trim();
    text = text.slice(0, withReminder.index).trim();
  }

  const activated = ACTIVATED.exec(text);
  if (activated) {
    cost = (activated[1]!.match(PIP) ?? []).join('');
    text = activated[2]!.trim();
  }

  const named = NAMED.exec(text);
  if (named) {
    label = named[1]!.trim();
    text = named[2]!.trim();
  }

  return { kind: 'rule', keywords: [], cost, label, text, reminder };
}

export function parseOracleLines(lines: string[]): OracleBlock[] {
  return lines.map(parseOracleLine).filter(block => block.kind === 'keywords' || block.text.length > 0);
}

/**
 * Palavras-chave são a linha de cima da carta: termos curtos separados por
 * vírgula, sem ponto final. "Voar, ameaça" entra; "Voar quando esta criatura
 * ataca." não — tem ponto e frase.
 */
function asKeywords(line: string): string[] | null {
  if (/[.:;{}—]/.test(line)) return null;

  const terms = line.split(',').map(term => term.trim()).filter(Boolean);
  if (terms.length === 0 || terms.length > MAX_KEYWORDS) return null;

  const short = terms.every(term => term.split(/\s+/).length <= MAX_KEYWORD_WORDS);
  if (!short) return null;

  // Uma palavra sozinha e minúscula tende a ser fim de frase quebrada, não
  // palavra-chave; palavra-chave de carta vem sempre capitalizada.
  return terms.map(term => term.charAt(0).toUpperCase() + term.slice(1));
}

/**
 * Custo de mana em palavras, para o aria-label da pílula: os pips são ícones
 * de fonte e não têm texto acessível nenhum.
 */
export function describeManaCost(cost: string): string {
  const names: Record<string, string> = {
    W: 'branco',
    U: 'azul',
    B: 'preto',
    R: 'vermelho',
    G: 'verde',
    C: 'incolor',
    X: 'X',
    T: 'virar',
    Q: 'desvirar',
    S: 'neve',
    E: 'energia',
  };

  const parts = (cost.match(PIP) ?? []).map(pip => {
    const symbol = pip.slice(1, -1).toUpperCase();

    if (/^\d+$/.test(symbol)) return `${symbol} genérico`;
    if (names[symbol]) return names[symbol]!;

    // Híbrido e phyrexiano: {W/U} e {W/P}.
    return symbol
      .split('/')
      .map(part => (part === 'P' ? 'phyrexiano' : names[part] ?? part))
      .join(' ou ');
  });

  return parts.length > 0 ? `custo: ${parts.join(', ')}` : 'sem custo';
}
