import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideSearch, lucideX } from '@ng-icons/lucide';
import { ManaSymbolPipe } from '../../../shared/pipes/mana-symbol-pipe';
import { DeckOption } from '../../../models/collection.models';
import { colorsToSymbols, deckArt, lendGroups } from '../../../shared/deck-choice';

/**
 * "Emprestar deck para Ana": os decks das outras contas, agrupados por dono.
 * Um select com os decks de todo mundo ficaria longo demais — por isso é
 * folha, com busca. Deck que já está em outro assento aparece apagado: um deck
 * físico não joga em dois lugares da mesma mesa.
 */
@Component({
  selector: 'app-lend-sheet',
  standalone: true,
  imports: [NgIcon, HlmIcon, ManaSymbolPipe],
  providers: [provideIcons({ lucideSearch, lucideX })],
  templateUrl: './lend-sheet.html',
  styleUrls: ['../seat-sheet.css', './lend-sheet.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LendSheet {
  decks = input.required<DeckOption[]>();
  playerId = input.required<number>();
  playerName = input('');
  takenBy = input<Record<string, number>>({});

  picked = output<string>();
  closed = output<void>();

  protected query = signal('');
  protected groups = computed(() => lendGroups(this.decks(), this.playerId(), this.query()));

  protected artOf = deckArt;
  protected symbolsOf = (deck: DeckOption) => colorsToSymbols(deck.colors);

  protected brokenArt = signal<ReadonlySet<string>>(new Set());

  protected markBroken(id: string): void {
    this.brokenArt.update(set => new Set(set).add(id));
  }

  protected choose(deck: DeckOption): void {
    if (this.takenBy()[deck.id]) return;
    this.picked.emit(deck.id);
  }

  @HostListener('document:keydown.escape')
  protected close(): void {
    this.closed.emit();
  }
}
