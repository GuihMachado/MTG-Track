import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideSparkles } from '@ng-icons/lucide';
import { CollectionEntryDto } from '../../../models/collection.models';

/**
 * Célula da grade. Mostra arte, nome, quantidade e foil — e **não** mostra
 * preço: a grade é para folhear, e é a lista que responde "quanto vale". Se a
 * falta do preço incomodar no uso real, é o sinal de que a lista era a escolha
 * certa.
 */
@Component({
  selector: 'app-entry-tile',
  standalone: true,
  imports: [NgIcon, HlmIcon],
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
}
