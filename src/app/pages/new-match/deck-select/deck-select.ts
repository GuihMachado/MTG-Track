import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideArrowLeftRight, lucideCheck, lucideChevronDown, lucidePlus } from '@ng-icons/lucide';
import { ManaSymbolPipe } from '../../../shared/pipes/mana-symbol-pipe';
import { DeckOption } from '../../../models/collection.models';
import { colorsToSymbols, deckArt } from '../../../shared/deck-choice';

/**
 * O select de deck do assento. Não é o `brn-select` do jogador porque a linha
 * do deck é rica (arte, commander, mana e a etiqueta de empréstimo) e o valor
 * exibido do select genérico achata tudo em texto. A lista abre **dentro** da
 * placa, empurrando o que vem embaixo — é o desenho aprovado, e dispensa
 * overlay.
 *
 * Só os decks do jogador aparecem aqui. Deck de outra conta entra pela folha
 * "Emprestar deck"; o escolhido de lá aparece no gatilho com "de <dono>".
 */
@Component({
  selector: 'app-deck-select',
  standalone: true,
  imports: [NgIcon, HlmIcon, ManaSymbolPipe],
  providers: [provideIcons({ lucideChevronDown, lucideCheck, lucideArrowLeftRight, lucidePlus })],
  templateUrl: './deck-select.html',
  styleUrl: './deck-select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckSelect {
  /** Decks do jogador do assento. */
  decks = input<DeckOption[]>([]);
  selected = input<DeckOption | null>(null);
  playerId = input<number | null>(null);
  playerName = input('');
  /** Deck → número do assento que já o usa nesta mesa. */
  takenBy = input<Record<string, number>>({});
  /** Existe deck de outra conta para emprestar? */
  canBorrow = input(false);
  loading = input(false);
  /** Seletor do id do gatilho, para o rótulo apontar para ele. */
  triggerId = input('deck-select');

  picked = output<string>();
  borrow = output<void>();
  create = output<void>();

  private host = inject(ElementRef<HTMLElement>);

  protected open = signal(false);

  protected disabled = computed(() => this.playerId() === null);

  protected borrowed = computed(() => {
    const deck = this.selected();
    const player = this.playerId();
    return deck !== null && player !== null && deck.owner.id !== player;
  });

  protected placeholder = computed(() => {
    if (this.disabled()) return 'Escolha o jogador primeiro';
    if (this.loading()) return 'Carregando decks…';
    return 'Escolher deck';
  });

  protected artOf = deckArt;
  protected symbolsOf = (deck: DeckOption) => colorsToSymbols(deck.colors);

  /** A arte vem da Scryfall por nome no deck do histórico; 404 vira placa lisa. */
  protected brokenArt = signal<ReadonlySet<string>>(new Set());

  protected markBroken(id: string): void {
    this.brokenArt.update(set => new Set(set).add(id));
  }

  protected toggle(): void {
    if (this.disabled()) return;
    this.open.update(open => !open);
  }

  protected choose(deck: DeckOption): void {
    if (this.takenBy()[deck.id]) return;
    this.open.set(false);
    this.picked.emit(deck.id);
  }

  protected askBorrow(): void {
    this.open.set(false);
    this.borrow.emit();
  }

  protected askCreate(): void {
    this.open.set(false);
    this.create.emit();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('keydown.escape')
  protected onEscape(): void {
    this.open.set(false);
  }
}
