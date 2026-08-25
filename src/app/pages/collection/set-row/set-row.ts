import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CollectionSetDto } from '../../../models/collection.models';
import { progressBar } from '../deck-progress';
import { usd } from '../money';

/**
 * Cartão de coleção — uma família de edições, não um código de três letras.
 *
 * Como no cartão de deck, a barra é o elemento principal: o que se quer saber
 * olhando a lista é o quanto falta. A diferença é o denominador, que aqui vem
 * da Scryfall e pode faltar; sem ele a placa mostra o que tem e cala sobre o
 * que falta, em vez de inventar uma porcentagem.
 */
@Component({
  selector: 'app-set-row',
  standalone: true,
  templateUrl: './set-row.html',
  styleUrl: './set-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetRow {
  set = input.required<CollectionSetDto>();
  open = output<string>();

  protected progress = computed(() => progressBar(this.set().ownedUnique, this.set().totalUnique));

  protected year = computed(() => this.set().releasedAt?.slice(0, 4) ?? '');

  /** "hob + hoc" — a família explicada, para o total não parecer arbitrário. */
  protected memberLine = computed(() => {
    const members = this.set().members;
    if (members.length <= 1) return this.set().code.toLowerCase();

    const shown = members.slice(0, 3).map(member => member.code);
    const rest = members.length - shown.length;

    // Família longa não cabe na linha: três siglas e o resto vira contagem.
    return rest > 0 ? `${shown.join(' + ')} +${rest}` : shown.join(' + ');
  });

  protected context = computed(() => {
    const set = this.set();
    const value = usd(set.valueUsd);

    if (set.totalUnique === null) return `${set.ownedCards} cartas · ${value}`;

    const missing = Math.max(0, set.totalUnique - set.ownedUnique);
    if (missing === 0) return `coleção completa · ${value}`;

    return `${this.progress().percent}% da coleção · ${value}`;
  });

  /** Sigla de três letras quando o símbolo da Scryfall não carrega. */
  protected sigil = computed(() => this.set().code.toUpperCase().slice(0, 4));
}
