import { Injectable } from '@angular/core';
import { PrintSettings, ProxyCard } from '../models/proxy.models';

/** Carta MTG impressa: 63×88mm exatos — sem isso a proxy não serve para jogar. */
const CARD_W = 63;
const CARD_H = 88;
/** Comprimento dos traços de corte nas margens, em mm. */
const CUT_TICK = 4;

export interface PdfProgress {
  done: number;
  total: number;
  cardName: string;
}

interface PageGeometry {
  cols: number;
  rows: number;
  startX: number;
  startY: number;
  gap: number;
}

@Injectable({ providedIn: 'root' })
export class ProxyPdfService {
  /**
   * Gera e baixa o PDF da lista. Falha de uma imagem vira um placeholder com
   * o nome da carta — nunca derruba o documento inteiro.
   */
  async generatePdf(
    cards: ProxyCard[],
    settings: PrintSettings,
    onProgress: (progress: PdfProgress) => void,
  ): Promise<void> {
    // Import dinâmico: o jspdf só entra no bundle de quem gera PDF.
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({
      orientation: settings.orientation,
      unit: 'mm',
      format: settings.pageSize === 'letter' ? 'letter' : 'a4',
    });

    const slots = this.flatten(cards);
    const geometry = this.pageGeometry(doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), settings);
    const perPage = geometry.cols * geometry.rows;

    // Cada imagem única é baixada e rasterizada uma vez; quantidades repetem o dataURL.
    const imageCache = new Map<string, string | null>();

    try {
      for (let i = 0; i < slots.length; i++) {
        const card = slots[i]!;
        onProgress({ done: i, total: slots.length, cardName: card.name });

        if (i > 0 && i % perPage === 0) doc.addPage();

        const indexOnPage = i % perPage;
        const col = indexOnPage % geometry.cols;
        const row = Math.floor(indexOnPage / geometry.cols);
        const x = geometry.startX + col * (CARD_W + geometry.gap);
        const y = geometry.startY + row * (CARD_H + geometry.gap);

        const url = card.largeImageUrl ?? card.imageUrl;
        if (!imageCache.has(url)) {
          imageCache.set(url, await this.loadImageAsDataUrl(url));
        }

        const dataUrl = imageCache.get(url);
        if (dataUrl) {
          try {
            doc.addImage(dataUrl, 'JPEG', x, y, CARD_W, CARD_H);
          } catch {
            this.drawPlaceholder(doc, x, y, card.name);
          }
        } else {
          this.drawPlaceholder(doc, x, y, card.name);
        }
      }

      if (settings.cutLines && slots.length > 0) {
        this.drawCutTicks(doc, geometry, slots.length, perPage);
      }

      onProgress({ done: slots.length, total: slots.length, cardName: '' });
      doc.save(`proxies-mtg-${this.totalCount(cards)}-cartas.pdf`);
    } finally {
      imageCache.clear();
    }
  }

  /** quantity: 3 → 3 slots na grade. */
  private flatten(cards: ProxyCard[]): ProxyCard[] {
    return cards.flatMap(card => Array.from({ length: card.quantity }, () => card));
  }

  private totalCount(cards: ProxyCard[]): number {
    return cards.reduce((sum, card) => sum + card.quantity, 0);
  }

  /** Grade sempre centralizada — cabe em qualquer papel × orientação × gap. */
  private pageGeometry(pageW: number, pageH: number, settings: PrintSettings): PageGeometry {
    const landscape = settings.orientation === 'landscape';
    const cols = landscape ? 4 : 3;
    const rows = landscape ? 2 : 3;
    const gap = settings.gapMm;

    const gridW = cols * CARD_W + (cols - 1) * gap;
    const gridH = rows * CARD_H + (rows - 1) * gap;

    return {
      cols,
      rows,
      gap,
      startX: Math.max(5, (pageW - gridW) / 2),
      startY: Math.max(5, (pageH - gridH) / 2),
    };
  }

  /** Traços curtos nas margens, alinhados às bordas das cartas, em todas as páginas. */
  private drawCutTicks(
    doc: import('jspdf').jsPDF,
    geometry: PageGeometry,
    totalSlots: number,
    perPage: number,
  ): void {
    const { cols, rows, gap, startX, startY } = geometry;

    const xEdges = new Set<number>();
    for (let c = 0; c < cols; c++) {
      const x = startX + c * (CARD_W + gap);
      xEdges.add(x);
      xEdges.add(x + CARD_W);
    }
    const yEdges = new Set<number>();
    for (let r = 0; r < rows; r++) {
      const y = startY + r * (CARD_H + gap);
      yEdges.add(y);
      yEdges.add(y + CARD_H);
    }

    const gridBottom = startY + rows * CARD_H + (rows - 1) * gap;
    const gridRight = startX + cols * CARD_W + (cols - 1) * gap;
    const pages = Math.ceil(totalSlots / perPage);

    for (let page = 1; page <= pages; page++) {
      doc.setPage(page);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.1);

      for (const x of xEdges) {
        doc.line(x, Math.max(0, startY - CUT_TICK), x, startY);
        doc.line(x, gridBottom, x, gridBottom + CUT_TICK);
      }
      for (const y of yEdges) {
        doc.line(Math.max(0, startX - CUT_TICK), y, startX, y);
        doc.line(gridRight, y, gridRight + CUT_TICK, y);
      }
    }
  }

  private drawPlaceholder(doc: import('jspdf').jsPDF, x: number, y: number, name: string): void {
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);
    doc.rect(x, y, CARD_W, CARD_H);
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(name, CARD_W - 10) as string[];
    doc.text(lines, x + CARD_W / 2, y + CARD_H / 2, { align: 'center', baseline: 'middle' });
  }

  /**
   * Baixa a imagem e rasteriza em JPEG via canvas. `crossOrigin` é obrigatório:
   * sem ele o canvas fica "sujo" e o toDataURL lança SecurityError.
   * Qualquer falha (rede, CORS) devolve null — o slot vira placeholder.
   */
  private loadImageAsDataUrl(url: string): Promise<string | null> {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 672;
          canvas.height = img.naturalHeight || 936;
          const context = canvas.getContext('2d');
          if (!context) return resolve(null);
          context.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }
}
