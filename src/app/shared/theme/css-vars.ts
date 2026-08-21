/**
 * Resolve o valor computado de uma CSS custom property no :root.
 * Necessário para consumidores que pintam fora do CSS (ex.: chart.js em canvas).
 * Só funciona no browser — guarde a chamada com isPlatformBrowser.
 */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
