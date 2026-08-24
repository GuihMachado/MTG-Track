import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { HlmTabsImports } from '@spartan-ng/helm/tabs';
import { BackButton } from '../../shared/back-button/back-button';
import { NotificationService } from '../../shared/notification/notification.service';
import { ProxyListService } from '../../services/proxy-list-service';
import { ScryfallCard } from '../../models/proxy.models';
import { ProxySearch } from './components/proxy-search/proxy-search';
import { ProxyList } from './components/proxy-list/proxy-list';
import { PrintStudio } from './components/print-studio/print-studio';

/** Módulo de proxies: busca Scryfall → lista de impressão → PDF 63×88mm. */
@Component({
  selector: 'app-proxies',
  standalone: true,
  imports: [HlmTabsImports, BackButton, ProxySearch, ProxyList, PrintStudio],
  templateUrl: './proxies.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Proxies {
  protected proxyList = inject(ProxyListService);
  private notify = inject(NotificationService);

  protected onAdd(card: ScryfallCard): void {
    this.proxyList.addFromScryfall(card);
    this.notify.success(`${card.name} na lista de impressão.`);
  }

  protected onAddManual(entry: { name: string; imageUrl: string }): void {
    this.proxyList.addManual(entry.name, entry.imageUrl);
    this.notify.success(`${entry.name} na lista de impressão.`);
  }
}
