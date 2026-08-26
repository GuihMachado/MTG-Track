import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideSparkles } from '@ng-icons/lucide';
import { ManaSymbolPipe } from '../../../shared/pipes/mana-symbol-pipe';
import { CollectionEntryDto } from '../../../models/collection.models';

/**
 * Célula da grade. A arte é o convite e os indicadores respondem embaixo:
 * nome, custo de mana, tipo e raridade — e **não** o preço: a grade é para
 * folhear, e é a lista que responde "quanto vale".
 */
@Component({
  selector: 'app-entry-tile',
  standalone: true,
  imports: [NgIcon, HlmIcon, ManaSymbolPipe],
  providers: [provideIcons({ lucideSparkles })],
  templateUrl: './entry-tile.html',
  styleUrl: './entry-tile.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryTile {
  entry = input.required<CollectionEntryDto>();
  edit = output<CollectionEntryDto>();

  protected plenty = computed(() => this.entry().quantity >= 2);

  /** "1 cópia", "4 cópias" — o leitor de tela lê a frase, não o "×4". */
  protected copies = computed(() => {
    const quantity = this.entry().quantity;
    return quantity === 1 ? '1 cópia' : quantity + ' cópias';
  });

  /**
   * Só o tipo principal, sem subtipo: "Criatura — Humano Guerreiro" não cabe
   * numa célula de 110px, e o travessão é onde a informação nova acaba.
   */
  protected mainType = computed(() => {
    const line = this.entry().typeLine;
    const cut = line.search(/\s[—–-]\s/);
    return cut > 0 ? line.slice(0, cut) : line;
  });
}
