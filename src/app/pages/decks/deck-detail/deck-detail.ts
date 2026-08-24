import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import {
  lucideChevronDown,
  lucideChevronLeft,
  lucideCircleCheck,
  lucideCircleDashed,
  lucidePencil,
  lucidePrinter,
  lucideTrash2,
} from '@ng-icons/lucide';
import { ManaSymbolPipe } from '../../../shared/pipes/mana-symbol-pipe';
import { NotificationService } from '../../../shared/notification/notification.service';
import { DeckService } from '../../../services/deck-service';
import { ProxyListService } from '../../../services/proxy-list-service';
import { DeckCardDto, DeckDto } from '../../../models/collection.models';
import { deckProgress } from '../../collection/deck-progress';
import { usd } from '../../collection/money';

/** Quantas faltantes aparecem antes do "+ N cartas · toque para ver todas". */
const PREVIEW_MISSING = 4;

/**
 * Deck contra a coleção. A tela é ordenada pela pergunta que ela responde:
 * quanto falta, o que falta, e — recolhido — o que já está resolvido. Oitenta e
 * sete linhas de coisa resolvida não merecem scroll.
 *
 * O rodapé liga esta tela ao módulo de proxies que já existe: as que faltam
 * entram na lista de impressão de uma vez.
 */
@Component({
  selector: 'app-deck-detail',
  standalone: true,
  imports: [NgIcon, HlmIcon, ManaSymbolPipe],
  providers: [
    provideIcons({
      lucideChevronLeft,
      lucideChevronDown,
      lucidePencil,
      lucidePrinter,
      lucideCircleDashed,
      lucideCircleCheck,
      lucideTrash2,
    }),
  ],
  templateUrl: './deck-detail.html',
  styleUrl: './deck-detail.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private decks = inject(DeckService);
  private proxyList = inject(ProxyListService);
  private notify = inject(NotificationService);

  protected deck = signal<DeckDto | null>(null);
  protected loading = signal(true);
  protected ownedOpen = signal(false);
  protected allMissing = signal(false);

  protected progress = computed(() => {
    const deck = this.deck();
    return deck ? deckProgress(deck) : null;
  });

  protected symbols = computed(() =>
    (this.deck()?.colors ?? []).map(color => `{${color}}`).join(''),
  );

  /** Sideboard fica fora: o deck é o que vai à mesa. */
  private counted = computed(() =>
    (this.deck()?.cards ?? []).filter(card => card.section === 'main' || card.section === 'commander'),
  );

  protected missing = computed(() => this.counted().filter(card => !card.owned));
  protected owned = computed(() => this.counted().filter(card => card.owned));

  protected visibleMissing = computed(() =>
    this.allMissing() ? this.missing() : this.missing().slice(0, PREVIEW_MISSING),
  );

  protected hiddenMissing = computed(() => Math.max(0, this.missing().length - PREVIEW_MISSING));

  protected missingValue = computed(() => usd(this.deck()?.missingValueUsd ?? 0));

  protected progressLine = computed(() => {
    const deck = this.deck();
    if (!deck) return '';

    if (deck.missingCards === 0) return 'deck completo';
    return `${deck.missingCards} carta${deck.missingCards > 1 ? 's' : ''} faltando · ${this.missingValue()} para fechar`;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/colecao']);
      return;
    }

    this.decks.getDeck(id).subscribe({
      next: deck => {
        this.deck.set(deck);
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.notify.apiError(error, {
          fallback: 'Não foi possível abrir esse deck.',
          byStatus: { 404: 'Esse deck não existe mais.' },
        });
        this.router.navigate(['/colecao']);
      },
    });
  }

  protected priceOf(card: DeckCardDto): string {
    return usd(card.priceUsd);
  }

  protected back(): void {
    this.router.navigate(['/colecao']);
  }

  /** Uma carta que falta vai para a lista de proxies — o atalho da linha. */
  protected proxyOne(card: DeckCardDto): void {
    const quantity = card.quantity - card.ownedQuantity;
    this.proxyList.addByName(card.name, Math.max(1, quantity));
    this.notify.success(`${card.name} na lista de impressão.`);
  }

  /** Todas as que faltam de uma vez, e a tela de proxies já abre com a lista. */
  protected proxyAllMissing(): void {
    const missing = this.missing();
    if (missing.length === 0) return;

    for (const card of missing) {
      this.proxyList.addByName(card.name, Math.max(1, card.quantity - card.ownedQuantity));
    }

    this.notify.success(`${missing.length} cartas na lista de impressão.`);
    this.router.navigate(['/proxies']);
  }

  protected rename(): void {
    const deck = this.deck();
    if (!deck) return;

    // `prompt` é feio, mas é o único jeito honesto de pedir um texto curto sem
    // inventar um diálogo que o handoff não desenhou.
    const name = window.prompt('Nome do deck', deck.name);
    if (!name || name.trim() === deck.name) return;

    this.decks.rename(deck.id, name.trim()).subscribe({
      next: updated => {
        this.deck.set(updated);
        this.notify.success('Deck renomeado.');
      },
      error: error => this.notify.apiError(error, { fallback: 'Não foi possível renomear.' }),
    });
  }

  protected removeDeck(): void {
    const deck = this.deck();
    if (!deck) return;

    this.notify.confirm(
      `Apagar o deck ${deck.name}? A coleção não muda.`,
      () => {
        this.decks.remove(deck.id).subscribe({
          next: () => {
            this.notify.success('Deck apagado.');
            this.router.navigate(['/colecao']);
          },
          error: error => this.notify.apiError(error, { fallback: 'Não foi possível apagar.' }),
        });
      },
      { confirmLabel: 'Apagar' },
    );
  }
}
