import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LowerCasePipe } from '@angular/common';
import { DeckStats } from '../../../models/match.models';
import { ManaSymbolPipe } from '../../../shared/pipes/mana-symbol-pipe';
import { TimeAgoPipe } from '../../../shared/pipes/time-ago-pipe';
import { colorsToManaSymbols, commanderArtUrl, manaRgbVar } from '../../../shared/match-utils';
import { winRateBand } from '../../../shared/deck-stats';

/**
 * Linha de deck (tela 1 e seletor de Confrontos). A placa é tingida pela
 * primeira cor do deck — lei 2: a mana entra como borda e sombra, nunca como
 * preenchimento. Deck aposentado perde a cor: não é candidato à pergunta
 * "qual levo hoje".
 */
@Component({
  selector: 'app-deck-row',
  standalone: true,
  imports: [LowerCasePipe, ManaSymbolPipe, TimeAgoPipe],
  templateUrl: './deck-row.html',
  styleUrl: './deck-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeckRow {
  readonly deck = input.required<DeckStats>();

  readonly open = output<void>();

  /** Nome que não resolve na Scryfall cai para a placa neutra — nunca buraco. */
  protected artFailed = signal(false);

  protected rgb = computed(() => manaRgbVar(this.deck().colors));
  protected symbols = computed(() => colorsToManaSymbols(this.deck().colors));
  protected band = computed(() => winRateBand(this.deck().winRate));
  protected artUrl = computed(() =>
    this.deck().invalid ? null : commanderArtUrl(this.deck().commander),
  );

  /** Amostra curta perde o glow: o número existe, mas vem sem festa. */
  protected glow = computed(() => this.band().glow && !this.deck().smallSample);

  protected ariaLabel = computed(() => {
    const d = this.deck();
    const wins = d.wins === 1 ? '1 vitória' : `${d.wins} vitórias`;
    return `${d.commander}: ${d.winRate} por cento, ${wins} em ${d.total} partida${d.total > 1 ? 's' : ''}`;
  });
}
