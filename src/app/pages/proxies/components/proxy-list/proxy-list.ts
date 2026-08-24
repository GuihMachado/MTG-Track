import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMinus, lucidePlus, lucidePrinter, lucideTrash2 } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmEmptyImports } from '@spartan-ng/helm/empty';
import { ProxyListService } from '../../../../services/proxy-list-service';
import { NotificationService } from '../../../../shared/notification/notification.service';
import { MTG_ICONS } from '../../../../shared/icons/mtg-icons';

/** Lista de impressão — consome direto o estado global persistente. */
@Component({
  selector: 'app-proxy-list',
  standalone: true,
  imports: [NgIcon, HlmIcon, HlmButtonImports, HlmEmptyImports],
  providers: [
    provideIcons({ lucideMinus, lucidePlus, lucideTrash2, lucidePrinter, mtgPrinter: MTG_ICONS['mtgPrinter']! }),
  ],
  templateUrl: './proxy-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProxyList {
  protected proxyList = inject(ProxyListService);
  private notify = inject(NotificationService);

  protected failedImages = signal<ReadonlySet<string>>(new Set());

  protected onImageError(id: string): void {
    this.failedImages.update(set => new Set(set).add(id));
  }

  protected clearAll(): void {
    if (this.proxyList.totalModels() === 0) return;
    this.notify.confirm('Limpar toda a lista de impressão?', () => {
      this.proxyList.clear();
      this.notify.info('Lista de impressão limpa.');
    });
  }
}
