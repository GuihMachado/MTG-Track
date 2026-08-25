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
 * Total da coleção. Segue a mesma régua do preço de uma carta — centavos abaixo
 * de US$ 100, inteiro acima — e não o inteiro puro de antes: numa estante de
 * US$ 8.740 os centavos são ruído, mas numa de US$ 0,50 arredondar imprimia
 * `US$ 1`, que é o dobro do que a pessoa tem. O total é ordem de grandeza
 * quando há grandeza; abaixo de cem dólares ele ainda é o extrato.
 *
 * Zero é `0` e não `0,00`: coleção sem preço nenhum não tem centavo para
 * mostrar.
 */
export function formatTotal(value: number | null | undefined): string {
  const number = Number(value) || 0;
  if (number === 0) return '0';

  return Math.abs(number) >= 100 ? formatCount(Math.round(number)) : formatUsd(number);
}
