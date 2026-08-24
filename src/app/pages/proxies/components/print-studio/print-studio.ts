import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronLeft, lucideChevronRight, lucideFileDown } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ProxyListService } from '../../../../services/proxy-list-service';
import { pageGeometry, PdfProgress, ProxyPdfService } from '../../../../services/proxy-pdf-service';
import { NotificationService } from '../../../../shared/notification/notification.service';
import { PrintSettings } from '../../../../models/proxy.models';

interface PreviewSlot {
  name: string;
  imageUrl: string;
}

/** Estúdio de impressão: configurações, preview da folha e geração do PDF. */
@Component({
  selector: 'app-print-studio',
  standalone: true,
  imports: [NgIcon, HlmIcon, HlmButtonImports],
  providers: [provideIcons({ lucideFileDown, lucideChevronLeft, lucideChevronRight })],
  templateUrl: './print-studio.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintStudio {
  protected proxyList = inject(ProxyListService);
  private pdf = inject(ProxyPdfService);
  private notify = inject(NotificationService);

  protected generating = signal(false);
  protected progress = signal<PdfProgress | null>(null);
  protected page = signal(0);

  /** Slots achatados pela quantidade — o que o PDF vai renderizar, em ordem. */
  protected slots = computed<PreviewSlot[]>(() =>
    this.proxyList
      .list()
      .flatMap(card =>
        Array.from({ length: card.quantity }, () => ({ name: card.name, imageUrl: card.imageUrl })),
      ),
  );

  protected landscape = computed(() => this.proxyList.settings().orientation === 'landscape');

  /**
   * A mesma geometria que o PDF usa. O preview é uma maquete em escala: a
   * proporção da folha, a margem e o gap saem daqui em porcentagem, então cada
   * célula cai exatamente na proporção de 63×88mm — sem isso a tela mostra uma
   * carta e o arquivo imprime outra.
   */
  protected geometry = computed(() => pageGeometry(this.proxyList.settings()));

  protected cols = computed(() => this.geometry().cols);
  protected rows = computed(() => this.geometry().rows);
  protected perPage = computed(() => this.geometry().perPage);
  protected pageCount = computed(() => Math.max(1, Math.ceil(this.slots().length / this.perPage())));

  protected sheetRatio = computed(() => {
    const g = this.geometry();
    return `${g.pageW} / ${g.pageH}`;
  });

  /** Margem da folha em % da largura — em CSS, padding % sempre é da largura. */
  protected sheetPadding = computed(() => {
    const g = this.geometry();
    return `${(g.startY / g.pageW) * 100}% ${(g.startX / g.pageW) * 100}%`;
  });

  /** Gap por eixo: em CSS, % de row-gap é da altura e de column-gap é da largura. */
  protected columnGap = computed(() => {
    const g = this.geometry();
    return (g.gap / (g.pageW - 2 * g.startX)) * 100;
  });

  protected rowGap = computed(() => {
    const g = this.geometry();
    return (g.gap / (g.pageH - 2 * g.startY)) * 100;
  });

  /** Slots da página visível, completados com null (slot vazio). */
  protected pageSlots = computed<(PreviewSlot | null)[]>(() => {
    const perPage = this.perPage();
    const page = Math.min(this.page(), this.pageCount() - 1);
    const visible = this.slots().slice(page * perPage, (page + 1) * perPage);
    return [...visible, ...Array(perPage - visible.length).fill(null)];
  });

  protected progressPercent = computed(() => {
    const progress = this.progress();
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.done / progress.total) * 100);
  });

  protected setPageSize(pageSize: PrintSettings['pageSize']): void {
    this.proxyList.updateSettings({ pageSize });
  }

  protected setOrientation(orientation: PrintSettings['orientation']): void {
    this.proxyList.updateSettings({ orientation });
    this.page.set(0);
  }

  protected toggleCutLines(): void {
    this.proxyList.updateSettings({ cutLines: !this.proxyList.settings().cutLines });
  }

  protected setGap(gapMm: PrintSettings['gapMm']): void {
    this.proxyList.updateSettings({ gapMm });
  }

  protected previousPage(): void {
    this.page.update(page => Math.max(0, page - 1));
  }

  protected nextPage(): void {
    this.page.update(page => Math.min(this.pageCount() - 1, page + 1));
  }

  protected async generate(): Promise<void> {
    if (this.generating() || this.slots().length === 0) return;

    this.generating.set(true);
    try {
      await this.pdf.generatePdf(this.proxyList.list(), this.proxyList.settings(), progress =>
        this.progress.set(progress),
      );
      this.notify.success('PDF gerado!', {
        description: 'Imprima em escala 100% (tamanho real) para as cartas saírem com 63×88mm.',
      });
    } catch {
      this.notify.error('Não foi possível gerar o PDF.', {
        description: 'Tente de novo; se persistir, remova a última carta adicionada.',
      });
    } finally {
      this.generating.set(false);
      this.progress.set(null);
    }
  }
}
