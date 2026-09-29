import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/**
 * Moeda do centro da mesa: abre o menu em rosca da partida. Mora fora da
 * `life-grid` só para a folha de estilo dela caber no budget por componente —
 * o comportamento é o mesmo botão de antes.
 */
@Component({
  selector: 'app-table-hub',
  standalone: true,
  template: `
    <button type="button" class="hub" (click)="open.emit()" aria-label="Abrir menu da partida">
      <span class="hub-halo" aria-hidden="true"></span>
      <img class="hub-icon" src="mtg-icon.png" alt="" width="24" height="24" />
    </button>
  `,
  styleUrl: './table-hub.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableHub {
  open = output<void>();
}
