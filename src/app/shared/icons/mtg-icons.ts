/**
 * Família de ícones do MTG Track.
 *
 * Glifos preenchidos monocromáticos, todos desenhados na mesma grade de 24×24
 * e com o mesmo peso visual — é o que os emojis não davam: cor do tema
 * (`currentColor`), desenho igual em qualquer plataforma e uma família só.
 *
 * Cada ícone é um único `path` com `fill-rule: evenodd` (os vazios são
 * subcaminhos que recortam). Essa restrição é de propósito: assim o mesmo
 * desenho serve num `<ng-icon>` do HTML e dentro do SVG do menu em rosca,
 * sem duas fontes de verdade.
 */

export type MtgIconName =
  | 'life'
  | 'poison'
  | 'energy'
  | 'experience'
  | 'treasure'
  | 'rad'
  | 'dice'
  | 'colors'
  | 'swap'
  | 'finish'
  | 'printer'
  | 'scroll'
  | 'refresh'
  | 'infinity'
  | 'surrender'
  | 'chat'
  | 'power';

export const MTG_ICON_VIEWBOX = '0 0 24 24';

export const MTG_ICON_PATHS: Record<MtgIconName, string> = {
  /** Coração sólido: dois lóbulos em arco, vale no meio e a ponta embaixo. */
  life: 'M12 20.3 3.4 11.7A4.75 4.75 0 0 1 12 8.1a4.75 4.75 0 0 1 8.6 3.6L12 20.3Z',

  /** Caveira: olhos e nariz recortados. */
  poison:
    'M12 2C7.6 2 4 5.6 4 10v3a3 3 0 0 0 2 2.8V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-3.2A3 3 0 0 0 20 13v-3c0-4.4-3.6-8-8-8Zm-3 6.4a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2Zm6 0a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2Zm-3 5.4 1.3 2.4h-2.6L12 13.8Z',

  /** Raio. */
  energy: 'M13.5 3 6 13h4.4l-1.2 8 8.8-10h-4.7L15 3h-1.5Z',

  /** Estrela de cinco pontas. */
  experience:
    'M12 3.2 14.75 8.95 21 9.85 16.5 14.3 17.6 20.5 12 17.55 6.4 20.5 7.5 14.3 3 9.85 9.25 8.95Z',

  /** Baú: tampa, corpo e fechadura recortada. */
  treasure:
    'M12 3C7.6 3 4 5.8 4 9.2V11h16V9.2C20 5.8 16.4 3 12 3ZM4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6H4Zm7 1.8h2V19h-2v-4.2Z',

  /** Trifólio radioativo: três lâminas e o miolo. */
  rad:
    'M10 8.54 7.5 4.21a9 9 0 0 1 9 0L14 8.54a4 4 0 0 0-4 0Z' +
    'M16 12h5a9 9 0 0 1-4.5 7.79L14 15.46A4 4 0 0 0 16 12Z' +
    'M10 15.46 7.5 19.79A9 9 0 0 1 3 12h5a4 4 0 0 0 2 3.46Z' +
    'M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',

  /** Dado de cinco pips. */
  dice:
    'M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z' +
    'M8.5 7.1a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z' +
    'M15.5 7.1a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z' +
    'M12 10.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z' +
    'M8.5 14.1a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z' +
    'M15.5 14.1a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z',

  /** Círculo com metade preenchida (modo de cor). */
  colors:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2.1a6.9 6.9 0 1 1 0 13.8 6.9 6.9 0 0 1 0-13.8Z' +
    'M12 6.3a5.7 5.7 0 0 1 0 11.4V6.3Z',

  /** Duas setas opostas: trocar de lugar. */
  swap: 'M3 6h12V3l6 4.5L15 12V9H3V6Z M21 18H9v3l-6-4.5L9 12v3h12v3Z',

  /** Bandeira quadriculada, encostada no mastro. */
  finish:
    'M4 2h2.2v20H4V2Z' +
    'M6.2 3h13.2v8.4H6.2V3Z' +
    'M6.2 3h3.3v2.1H6.2Z M12.8 3h3.3v2.1h-3.3Z' +
    'M9.5 5.1h3.3v2.1H9.5Z M16.1 5.1h3.3v2.1h-3.3Z' +
    'M6.2 7.2h3.3v2.1H6.2Z M12.8 7.2h3.3v2.1h-3.3Z' +
    'M9.5 9.3h3.3v2.1H9.5Z M16.1 9.3h3.3v2.1h-3.3Z',

  /** Impressora com a folha saindo. */
  printer:
    'M7 3h10v3.6H7V3Z' +
    'M5 7.6h14a2 2 0 0 1 2 2v6h-3v-3.7H6v3.7H3v-6a2 2 0 0 1 2-2Z' +
    'M7 15.6h10V21H7v-5.4Z',

  /** Documento de regras com linhas recortadas. */
  scroll:
    'M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z' +
    'M8 6h8v2H8V6Z M8 10h8v2H8v-2Z M8 14h5v2H8v-2Z',

  /** Seta circular: refazer a mão. */
  refresh: 'M12 4.6a7.5 7.5 0 1 0 7.2 9.6h-2.1A5.5 5.5 0 1 1 12 6.6v2.3L16 5.5 12 2.1v2.5Z',

  /** Infinito: laços com o miolo recortado. */
  infinity:
    'M7.5 7.5a4.5 4.5 0 1 0 0 9c2 0 3.3-1.35 4.5-2.9 1.2 1.55 2.5 2.9 4.5 2.9a4.5 4.5 0 1 0 0-9c-2 0-3.3 1.35-4.5 2.9C10.8 8.85 9.5 7.5 7.5 7.5Z' +
    'M7.5 10.2c1.1 0 1.8.8 2.8 1.8-1 1.15-1.7 1.8-2.8 1.8a1.8 1.8 0 1 1 0-3.6Z' +
    'M16.5 10.2a1.8 1.8 0 1 1 0 3.6c-1.1 0-1.8-.65-2.8-1.8 1-1 1.7-1.8 2.8-1.8Z',

  /** Bandeira lisa: concessão. */
  surrender: 'M4 2h2.2v20H4V2Z M6.2 3h13.2v8.4H6.2V3Z',

  /** Balão de fala. */
  chat: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2V5Z',

  /** Medidor com agulha: nível de poder. */
  power:
    'M12 5a9.5 9.5 0 0 0-9.5 9.5V17h3.6v-2.5a5.9 5.9 0 1 1 11.8 0V17h3.6v-2.5A9.5 9.5 0 0 0 12 5Z' +
    'M16.6 9.4l-5.3 3.6a1.8 1.8 0 1 0 2 2.7l3.3-6.3Z',
};

/** SVG completo de um ícone, para registrar no @ng-icons. */
function svgOf(path: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MTG_ICON_VIEWBOX}" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="${path}"/></svg>`;
}

/** Mapa pronto para `provideIcons({ ...MTG_ICONS })`. Nomes prefixados com mtg. */
export const MTG_ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(MTG_ICON_PATHS).map(([name, path]) => [iconKey(name as MtgIconName), svgOf(path)]),
);

/** Nome registrado no @ng-icons para um ícone da família (life → mtgLife). */
export function iconKey(name: MtgIconName): string {
  return `mtg${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

export const MTG_ICON_NAMES = Object.keys(MTG_ICON_PATHS) as MtgIconName[];

/** true quando o valor é um ícone da família (e não um emoji herdado). */
export function isMtgIcon(value: string | null | undefined): value is MtgIconName {
  return !!value && Object.prototype.hasOwnProperty.call(MTG_ICON_PATHS, value);
}
