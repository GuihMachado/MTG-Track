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
import { lucideChevronLeft, lucideLibraryBig, lucidePlus, lucideSearch } from '@ng-icons/lucide';
import { NotificationService } from '../../../shared/notification/notification.service';
import { CollectionService } from '../../../services/collection-service';
import { SetBinderCardDto, SetBinderDto } from '../../../models/collection.models';
import { progressBar } from '../deck-progress';
import { formatCount, usd } from '../money';
import { AddCard } from '../add-card/add-card';

type BinderFilter = 'all' | 'owned' | 'missing' | 'rare';

/** Quantas cartas entram de uma vez. Uma coleção tem centenas; o celular não
 *  precisa desenhar todas para responder "o quanto eu tenho". */
const PAGE = 120;

/**
 * A coleção aberta como fichário: todas as cartas da família, na ordem do
 * número de coleção, com as que faltam apagadas atrás do vidro.
 *
 * A diferença para a tela de deck é de propósito. O deck vira **lista de
 * compras** — o que falta, com preço, do mais caro para o mais barato — porque
 * o deck se fecha comprando 13 cartas. Uma coleção de 310 não se fecha assim:
 * ela se folheia. Por isso aqui o que falta é espaço vazio, não linha de lista.
 */
@Component({
  selector: 'app-set-binder',
  standalone: true,
  imports: [NgIcon, HlmIcon, AddCard],
  providers: [
    provideIcons({ lucideChevronLeft, lucidePlus, lucideSearch, lucideLibraryBig }),
  ],
  templateUrl: './set-binder.html',
  styleUrl: './set-binder.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetBinder implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private collection = inject(CollectionService);
  private notify = inject(NotificationService);

  protected binder = signal<SetBinderDto | null>(null);
  protected loading = signal(true);
  protected filter = signal<BinderFilter>('all');
  protected shown = signal(PAGE);

  /** Carta escolhida num slot: abre a folha de adicionar já com o nome dela. */
  protected picked = signal<string | null>(null);

  protected readonly filters: { key: BinderFilter; label: string }[] = [
    { key: 'all', label: 'Todas' },
    { key: 'owned', label: 'Tenho' },
    { key: 'missing', label: 'Faltam' },
    { key: 'rare', label: 'Raras e míticas' },
  ];

  protected matching = computed(() => {
    const cards = this.binder()?.cards ?? [];

    switch (this.filter()) {
      case 'owned':
        return cards.filter(card => card.ownedQuantity > 0);
      case 'missing':
        return cards.filter(card => card.ownedQuantity === 0);
      case 'rare':
        return cards.filter(card => card.rarity === 'rare' || card.rarity === 'mythic');
      default:
        return cards;
    }
  });

  protected visible = computed(() => this.matching().slice(0, this.shown()));
  protected hidden = computed(() => Math.max(0, this.matching().length - this.shown()));

  protected progress = computed(() => {
    const set = this.binder();
    return progressBar(set?.ownedUnique ?? 0, set?.totalUnique ?? null);
  });

  protected missingCount = computed(() => {
    const set = this.binder();
    if (!set?.totalUnique) return 0;
    return Math.max(0, set.totalUnique - set.ownedUnique);
  });

  /** "faltam 276 · US$ 96 na estante" — o que você tem e o que falta, juntos. */
  protected context = computed(() => {
    const set = this.binder();
    if (!set) return '';

    const value = `${usd(set.valueUsd)} na estante`;
    if (set.totalUnique === null) return `${formatCount(set.ownedCards)} cópias · ${value}`;
    if (this.missingCount() === 0) return `coleção completa · ${value}`;

    return `faltam ${formatCount(this.missingCount())} · ${value}`;
  });

  protected year = computed(() => this.binder()?.releasedAt?.slice(0, 4) ?? '');

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code') ?? '';
    this.load(code);
  }

  private load(code: string): void {
    this.loading.set(true);

    this.collection.binder(code).subscribe({
      next: binder => {
        this.binder.set(binder);
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.notify.apiError(error, { fallback: 'Não foi possível abrir essa coleção.' });
      },
    });
  }

  protected setFilter(filter: BinderFilter): void {
    this.filter.set(filter);
    // Trocar de filtro recomeça a contagem: quem pediu "faltam" quer ver as
    // primeiras que faltam, não continuar de onde a lista anterior parou.
    this.shown.set(PAGE);
  }

  protected showMore(): void {
    this.shown.update(current => current + PAGE);
  }

  protected readonly trackByCard = (_: number, card: SetBinderCardDto) => card.scryfallId;

  protected open(card: SetBinderCardDto): void {
    this.picked.set(card.name);
  }

  protected closeSheet(): void {
    this.picked.set(null);
  }

  /** Gravou alguma cópia: o fichário e o resumo mudaram, então recarrega. */
  protected onChanged(): void {
    const code = this.binder()?.code;
    if (code) this.load(code);
  }

  protected priceOf(card: SetBinderCardDto): string {
    return card.priceUsd === null ? '—' : usd(card.priceUsd);
  }

  protected back(): void {
    this.router.navigate(['/colecao']);
  }

  /** Ver, na aba Cartas, só o que você tem desta coleção. */
  protected seeMine(): void {
    const code = this.binder()?.code;
    if (code) this.router.navigate(['/colecao'], { queryParams: { edicao: code } });
  }
}
