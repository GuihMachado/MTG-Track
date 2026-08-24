/**
 * Formatação de número da coleção.
 *
 * Existe como módulo puro (e não como pipe do Angular com locale) por dois
 * motivos: o app não registra locale nenhum — o padrão é en-US, que escreveria
 * `1,284` onde o desenho pede `1.284` — e a regra de casas decimais é uma
 * decisão de produto, não de internacionalização.
 *
 * **O preço é em dólar.** A Scryfall publica `usd`, `usd_foil`, `eur` e `tix`,
 * e nunca `brl`: o handoff pedia R$, mas o dado não existe. Mostrar dólar é a
 * única alternativa que não inventa número — e é o que a tela de carta do app
 * já faz.
 */

/** Milhar com ponto, como se escreve em português. */
export function formatCount(value: number | null | undefined): string {
  const number = Math.trunc(Number(value) || 0);
  return number.toLocaleString('pt-BR');
}

/**
 * Centavos só abaixo de US$ 100: em `US$ 1.82` os centavos são metade da
 * informação, em `US$ 110.25` são ruído ao lado de um numeral grande.
 */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';

  const number = Number(value);

  if (Math.abs(number) >= 100) {
    return Math.round(number).toLocaleString('pt-BR');
  }

  return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** `US$ 8.740` — o par de rótulo e número que o painel de valor mostra. */
export function usd(value: number | null | undefined): string {
  const formatted = formatUsd(value);
  return formatted === '—' ? formatted : `US$ ${formatted}`;
}

/**
 * Total da coleção: sempre inteiro. Centavos num numeral de 30px são ruído, e
 * um total que oscila na casa dos centavos entre duas aberturas de tela parece
 * erro — o valor é uma ordem de grandeza, não um extrato.
 */
export function formatTotal(value: number | null | undefined): string {
  return formatCount(Math.round(Number(value) || 0));
}
