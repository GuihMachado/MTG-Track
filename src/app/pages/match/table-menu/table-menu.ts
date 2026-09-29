import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideChevronLeft, lucideCloudOff, lucideCloudUpload, lucideX } from '@ng-icons/lucide';
import { MTG_ICON_PATHS, MTG_ICON_VIEWBOX, MtgIconName } from '../../../shared/icons/mtg-icons';
import { SEAT_COLORS, SeatColorCode } from '../seat-colors';
import { clockTime, formatClock } from '../table-state';

/** O que a folha pede para a mesa fazer. */
export type TableCommand =
  | { kind: 'reset-life' }
  | { kind: 'arrange' }
  | { kind: 'cycle-color'; seatId: number }
  | { kind: 'roll'; die: 'd20' | 'd6' | 'coin' | 'first' }
  | { kind: 'finish' }
  | { kind: 'save' };

export interface MenuSeat {
  id: number;
  name: string;
  seatColor: SeatColorCode;
}

/** Estado do salvamento no servidor, para o card de Salvar dizer a verdade. */
export interface SaveStatus {
  saving: boolean;
  failed: boolean;
  savedAt: Date | null;
}

type View = 'root' | 'reset' | 'colors' | 'dice';

const DICE: { die: 'd20' | 'd6' | 'coin' | 'first'; label: string }[] = [
  { die: 'd20', label: 'd20' },
  { die: 'd6', label: 'd6' },
  { die: 'coin', label: 'Moeda' },
  { die: 'first', label: 'Quem começa' },
];

/**
 * Comandos da mesa: a folha que sobe do hub central. Substituiu o menu em
 * rosca — cada comando virou um cartão com nome e uma linha dizendo o que faz.
 *
 * Três comandos abrem uma segunda vista dentro da própria folha, sem fechar:
 * Vidas pede confirmação (apaga a mesa inteira), Cores troca a cor de vários
 * assentos em sequência e Dado mostra o resultado no lugar.
 */
@Component({
  selector: 'app-table-menu',
  standalone: true,
  imports: [NgIcon, HlmIcon],
  providers: [provideIcons({ lucideX, lucideChevronLeft, lucideCloudUpload, lucideCloudOff })],
  templateUrl: './table-menu.html',
  styleUrl: './table-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TableMenu {
  seats = input.required<MenuSeat[]>();
  /** Início da partida (ms): o cronômetro do título. */
  startedAt = input.required<number>();
  startingLife = input(40);
  save = input.required<SaveStatus>();
  /** Resultado do último sorteio, mostrado na vista de Dado. */
  diceResult = input<string | null>(null);

  command = output<TableCommand>();
  closed = output<void>();

  protected view = signal<View>('root');
  protected readonly dice = DICE;
  protected readonly viewBox = MTG_ICON_VIEWBOX;

  private now = signal(Date.now());

  protected clock = computed(() => formatClock(this.now() - this.startedAt()));

  protected saveLine = computed(() => {
    const status = this.save();
    if (status.saving) return 'Salvando…';
    if (status.failed) return 'Não salvou. Toque para tentar de novo.';
    return status.savedAt
      ? `Salva às ${clockTime(status.savedAt)} · sozinha a cada 10 min`
      : 'Ainda não salva · sozinha a cada 10 min';
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected icon(name: MtgIconName): string {
    return MTG_ICON_PATHS[name];
  }

  protected rgbOf(color: SeatColorCode): string {
    return `var(${SEAT_COLORS[color].rgbVarName})`;
  }

  protected run(command: TableCommand): void {
    this.command.emit(command);
  }

  @HostListener('document:keydown.escape')
  protected escape(): void {
    if (this.view() !== 'root') this.view.set('root');
    else this.closed.emit();
  }
}
