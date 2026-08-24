/**
 * Gerador do ícone do MTG Track.
 *
 * O desenho é o hub da mesa: moeda de ouro com halo sobre a placa escura, e um
 * losango vazado no centro. Rasteriza e codifica PNG e ICO em JS puro, sem
 * dependência nenhuma — como é só geometria, não precisa de fonte nem de
 * conversor de SVG. A superamostragem (3–6×) é de onde vem o antialias.
 *
 * Duas saídas, de propósito diferentes:
 *   • PNG do PWA (72–512) — quadrado cheio, sangrando até a borda. O manifest
 *     declara `maskable`, e a plataforma recorta a máscara dela (círculo no
 *     Android); arte com canto arredondado deixaria falha nos cantos.
 *   • favicon.ico (16/32/48/256) — canto arredondado e fundo transparente,
 *     porque a aba do navegador mostra o arquivo como ele é.
 *
 * Uso: npm run icons   (equivale a: node scripts/gen-icons.mjs public/icons)
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

/* ── Tokens do sistema (os mesmos de src/styles.css) ─────────────── */
const PLATE_TOP = [0x1c, 0x18, 0x30];
const PLATE_BOTTOM = [0x14, 0x11, 0x26];
const GOLD_TOP = [0xf2, 0xdc, 0xa2];
const GOLD_BOTTOM = [0xd8, 0xb3, 0x68];
const GOLD_LIGHT = [0xe6, 0xc7, 0x7f];
const GEM = [0x16, 0x13, 0x2b];

/* ── Geometria, em fração do lado (vale para qualquer tamanho) ───── */
const HALO_R = 0.47; // alcance do brilho de ouro
const HALO_A = 0.62; // alfa no centro — o brilho é forte, quase uma lâmpada
const HILITE = 0.02; // fio de luz na aba de cima da moeda
const THREAD = 0.006; // fio de luz no topo da placa
/** Raio de canto da placa, fração do lado — proporção de ícone de app. */
const CORNER = 0.22;

/**
 * Tamanho ótico. O mesmo desenho não serve de 16 a 512: em 72px+ a moeda tem
 * 25% do lado e o losango cabe vazado dentro dela; de 32 a 48 a moeda abre para
 * 30% e o losango engorda; a 20px ou menos o losango vazado teria 3px e viraria
 * sujeira, então a medida mínima simplifica para a silhueta — losango de ouro
 * direto na placa, mesma identidade com o dobro de contraste.
 */
const LARGE = { disc: true, discR: 0.25, gemW: 0.104 };
const SMALL = { disc: true, discR: 0.3, gemW: 0.125 };
const TINY = { disc: false, discR: 0, gemW: 0.2 };
const opticalFor = size => (size <= 20 ? TINY : size <= 48 ? SMALL : LARGE);

/** Losango mais alto que largo, cantos vivos. */
const insideGem = (dx, dy, w) => Math.abs(dx) / w + Math.abs(dy) / (w * 1.28) <= 1;

/** Máscara de canto arredondado — o "quadradinho" de ícone de app. */
function insideRounded(u, v, r = CORNER) {
  const x = Math.min(u, 1 - u);
  const y = Math.min(v, 1 - v);
  if (x >= r || y >= r) return true;
  return Math.hypot(r - x, r - y) <= r;
}

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const over = (dst, src, alpha) => mix(dst, src, alpha);
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Cor de um ponto do ícone, em coordenadas normalizadas (0..1). */
function sample(u, v, k) {
  // 1. placa: gradiente vertical, claro em cima
  let c = mix(PLATE_TOP, PLATE_BOTTOM, v);

  // 2. fio de luz no topo — é ele que faz a placa descolar do fundo
  if (v < THREAD) c = over(c, [255, 255, 255], 0.09);

  const dx = u - 0.5;
  const dy = v - 0.5;
  const d = Math.hypot(dx, dy);

  // 3. halo de ouro atrás da moeda (cor como luz, não como tinta)
  if (d < HALO_R) {
    const t = 1 - d / HALO_R;
    c = over(c, GOLD_LIGHT, HALO_A * Math.pow(t, 1.7));
  }

  // 4. medida mínima: o losango é o próprio ouro, sem moeda em volta
  if (!k.disc) {
    if (insideGem(dx, dy, k.gemW)) c = mix(GOLD_TOP, GOLD_BOTTOM, clamp01((v - 0.28) / 0.44));
    return c;
  }

  // 5. moeda de ouro, gradiente vertical
  if (d < k.discR) {
    const top = 0.5 - k.discR;
    c = mix(GOLD_TOP, GOLD_BOTTOM, clamp01((v - top) / (k.discR * 2)));

    // fio de luz na aba de cima da moeda (inset do hub da mesa)
    const edge = k.discR - d;
    if (edge < HILITE && dy < 0) {
      const strength = (1 - edge / HILITE) * (-dy / k.discR);
      c = over(c, [255, 255, 255], 0.5 * clamp01(strength));
    }

    // 6. losango escuro no centro, vazado no ouro
    if (insideGem(dx, dy, k.gemW)) c = GEM;
  }

  return c;
}

/**
 * Renderiza o ícone em `size` px. `rounded` recorta o canto e devolve alfa por
 * pixel — a cobertura das amostras é o próprio antialias da borda.
 */
function render(size, ss = 4, { rounded = false } = {}) {
  const k = opticalFor(size);
  const px = Buffer.alloc(size * size * 4);
  const step = 1 / (size * ss);
  const total = ss * ss;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, hits = 0;

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (x * ss + sx + 0.5) * step;
          const v = (y * ss + sy + 0.5) * step;
          if (rounded && !insideRounded(u, v)) continue;

          const c = sample(u, v, k);
          r += c[0]; g += c[1]; b += c[2];
          hits++;
        }
      }

      const i = (y * size + x) * 4;
      if (hits === 0) continue; // fora da máscara: pixel transparente

      px[i] = Math.round(r / hits);
      px[i + 1] = Math.round(g / hits);
      px[i + 2] = Math.round(b / hits);
      px[i + 3] = Math.round((hits / total) * 255);
    }
  }
  return px;
}

/* ── Codificação PNG (RGBA de 8 bits, sem filtro por linha) ─────── */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(px, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // profundidade
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filtro adaptativo
  ihdr[12] = 0; // sem entrelace

  // Uma linha = 1 byte de filtro (0) + os pixels.
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const at = y * (size * 4 + 1);
    raw[at] = 0;
    px.copy(raw, at + 1, y * size * 4, (y + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ── Codificação ICO ────────────────────────────────────────────────
   O .ico é um contêiner: cabeçalho, uma entrada de diretório por medida e os
   dados. As medidas pequenas vão como DIB (BMP sem cabeçalho de arquivo), que
   é o que todo Windows lê desde sempre; a de 256 vai como PNG, porque em DIB
   ela custaria 256 kB. Navegador atual lê as duas formas.                   */

/** DIB de 32 bits: altura dobrada (cor + máscara AND), linhas de baixo para cima. */
function encodeDib(px, size) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);
  header.writeInt32LE(size, 4);
  header.writeInt32LE(size * 2, 8); // cor + máscara, como o formato exige
  header.writeUInt16LE(1, 12); // planos
  header.writeUInt16LE(32, 14); // bits por pixel
  header.writeUInt32LE(0, 16); // BI_RGB, sem compressão

  const xor = Buffer.alloc(size * size * 4);
  // Máscara AND de 1 bit, linhas alinhadas em 4 bytes. Bit 1 = transparente:
  // é o que faz o canto arredondado existir em leitor antigo, que ignora o alfa.
  const maskRow = Math.ceil(size / 32) * 4;
  const mask = Buffer.alloc(maskRow * size);

  for (let y = 0; y < size; y++) {
    const src = (size - 1 - y) * size * 4;
    const dst = y * size * 4;

    for (let x = 0; x < size; x++) {
      const alpha = px[src + x * 4 + 3];
      xor[dst + x * 4] = px[src + x * 4 + 2];
      xor[dst + x * 4 + 1] = px[src + x * 4 + 1];
      xor[dst + x * 4 + 2] = px[src + x * 4];
      xor[dst + x * 4 + 3] = alpha;

      if (alpha < 128) mask[y * maskRow + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }

  return Buffer.concat([header, xor, mask]);
}

function encodeIco(entries) {
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2); // 1 = ícone
  dir.writeUInt16LE(entries.length, 4);

  const table = Buffer.alloc(16 * entries.length);
  let offset = 6 + table.length;

  entries.forEach((entry, i) => {
    const at = i * 16;
    // 0 significa 256: o campo tem um byte só.
    table[at] = entry.size >= 256 ? 0 : entry.size;
    table[at + 1] = entry.size >= 256 ? 0 : entry.size;
    table[at + 2] = 0; // paleta
    table[at + 3] = 0;
    table.writeUInt16LE(1, at + 4); // planos
    table.writeUInt16LE(32, at + 6); // bits por pixel
    table.writeUInt32LE(entry.data.length, at + 8);
    table.writeUInt32LE(offset, at + 12);
    offset += entry.data.length;
  });

  return Buffer.concat([dir, table, ...entries.map(e => e.data)]);
}

/* ── Saída ───────────────────────────────────────────────────────── */
const outDir = process.argv[2];
if (!outDir) {
  console.error('uso: node scripts/gen-icons.mjs <pasta-de-icones>');
  process.exit(1);
}

const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of PWA_SIZES) {
  const ss = size > 256 ? 3 : 4;
  const png = encodePng(render(size, ss), size);
  const file = join(outDir, `icon-${size}x${size}.png`);
  writeFileSync(file, png);
  console.log(`${file} — ${size}×${size} cheio, ${(png.length / 1024).toFixed(1)} kB`);
}

/* O favicon.ico mora na raiz de public/, não na pasta de ícones: é onde o
   index.html e os leitores de atalho o procuram. */
const ICO_DIB = [16, 32, 48];
const ICO_PNG = 256;

const ico = encodeIco([
  ...ICO_DIB.map(size => ({ size, data: encodeDib(render(size, 6, { rounded: true }), size) })),
  { size: ICO_PNG, data: encodePng(render(ICO_PNG, 3, { rounded: true }), ICO_PNG) },
]);

const icoPath = join(outDir, '..', 'favicon.ico');
writeFileSync(icoPath, ico);
console.log(
  `${icoPath} — ${[...ICO_DIB, ICO_PNG].join('/')} px arredondado, ${(ico.length / 1024).toFixed(1)} kB`,
);
