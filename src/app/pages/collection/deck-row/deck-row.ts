import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ManaSymbolPipe } from '../../../shared/pipes/mana-symbol-pipe';
import { DeckDto } from '../../../models/collection.models';
import { deckProgress } from '../deck-progress';
import { seatPaint, SeatColorCode } from '../../match/seat-colors';
import { usd } from '../money';

/**
 * Cartão de deck. A placa é tingida pela identidade de cor com a mesma receita
 * do assento de nova partida — e com **duas ou mais cores usa a primeira**: um
 * gradiente entre elas soma sombras e vira lama.
 *
 * O elemento principal do cartão é a barra, não o nome: o que se quer saber
 * olhando a lista é o quanto falta, não como o deck se chama.
 */
@Component({
  selector: 'app-deck-row',
  standalone: true,
  imports: [ManaSymbolPipe],
  templateUrl: './deck-row.html',
  styleUrl: './deck-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckRow {
  deck = input.required<DeckDto>();
  open = output<string>();

  protected progress = computed(() => deckProgress(this.deck()));

  /** Canais RGB da primeira cor da identidade; incolor não tinge a placa. */
  protected rgb = computed(() => {
    const first = this.deck().colors[0] as SeatColorCode | undefined;
    return first ? seatPaint(first).rgb : null;
  });

  protected symbols = computed(() => this.deck().colors.map(color => `{${color}}`).join(''));

  /** "completo · US$ 1.420" ou "faltam 13 · US$ 186 para fechar". */
  protected context = computed(() => {
    const deck = this.deck();
    const base = this.progress().context;

    if (deck.missingCards === 0 || deck.totalCards === 0) return base;
    return `${base} · ${usd(deck.missingValueUsd)} para fechar`;
  });
}
