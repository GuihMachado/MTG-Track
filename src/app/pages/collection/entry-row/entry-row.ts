import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideSparkles } from '@ng-icons/lucide';
import { CollectionEntryDto } from '../../../models/collection.models';
import { usd } from '../money';

/**
 * Uma linha por impressão. Ela responde as duas perguntas mais frequentes sem
 * nenhum toque: "eu tenho essa carta?" (a badge de quantidade) e "quanto vale?"
 * (o preço), que é justamente o que a grade não faz.
 */
@Component({
  selector: 'app-entry-row',
  standalone: true,
  imports: [NgIcon, HlmIcon],
  providers: [provideIcons({ lucideSparkles })],
  templateUrl: './entry-row.html',
  styleUrl: './entry-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryRow {
  entry = input.required<CollectionEntryDto>();

  /** Tocar a linha abre a folha de edição (quantidade e remover). */
  edit = output<CollectionEntryDto>();

  /**
   * "Tenho de sobra" começa em duas cópias — é a partir daí que a resposta a
   * "eu tenho?" deixa de ser apertada.
   */
  protected plenty = computed(() => this.entry().quantity >= 2);

  /**
   * Preço em destaque. O corte é em US$ 25: o handoff pedia R$ 150, e como a
   * Scryfall só publica dólar (nunca BRL), o degrau foi convertido em vez de
   * copiado — R$ 150 no câmbio da época é dessa ordem. Sem converter, nenhuma
   * carta cruzaria a linha e o destaque nunca apareceria.
   */
  protected expensive = computed(() => (this.entry().priceUsd ?? 0) >= 25);

  protected language = computed(() => this.entry().language.toUpperCase());
  protected price = computed(() => usd(this.entry().priceUsd));

  /** "1 cópia", "4 cópias" — o leitor de tela lê a frase, não o "×4". */
  protected copies = computed(() => {
    const quantity = this.entry().quantity;
    return quantity === 1 ? '1 cópia' : quantity + ' cópias';
  });
}
