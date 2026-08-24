import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import {
  CENTER_R,
  CX,
  CY,
  labelPoint,
  R_OUTER,
  slicePath,
  VIEWBOX,
} from './radial-geometry';
import { MTG_ICON_PATHS, MtgIconName } from '../../../shared/icons/mtg-icons';

export interface RadialItem {
  id: string;
  /** Ícone da família; null quando o texto basta (valores de vida, faces do dado). */
  icon: MtgIconName | null;
  label: string;
  /** Fatias filhas: a rosca troca de conteúdo no lugar, sem fechar. */
  children?: RadialItem[];
  /** Pinta o hover em danger (encerrar partida). */
  danger?: boolean;
  /** Preenchimento próprio da fatia (cor do assento no submenu de cores). */
  fill?: string;
  /** Cor do rótulo quando a fatia tem preenchimento próprio. */
  labelColor?: string;
}

interface SliceVM {
  item: RadialItem;
  path: string;
  labelX: number;
  labelY: number;
  /** Rótulo já truncado para caber no arco da fatia. */
  text: string;
  /** Path do ícone e transform que o põe acima do texto, na escala certa. */
  iconPath: string | null;
  iconTransform: string;
}

/** Máximo de caracteres por rótulo — o arco cabe ~14 no pior caso (6 fatias). */
const MAX_LABEL = 13;
/** Lado do ícone dentro da fatia, em unidades do viewBox da rosca. */
const ICON_SIZE = 32;

/**
 * Menu em rosca da partida. Puramente apresentacional: recebe a árvore de
 * itens, emite a ação escolhida e quem controla o `open` é a tela de partida.
 * O centro volta um nível quando há submenu aberto e fecha na raiz.
 */
@Component({
  selector: 'app-radial-menu',
  standalone: true,
  templateUrl: './radial-menu.html',
  styleUrl: './radial-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadialMenu {
  open = input(false);
  items = input.required<RadialItem[]>();
  /** Resultado de dado/sorteio exibido no centro; null esconde. */
  result = input<string | null>(null);

  action = output<string>();
  closed = output<void>();
  /** Toque no centro enquanto um resultado está à mostra. */
  resultDismissed = output<void>();

  protected readonly viewBox = `0 0 ${VIEWBOX} ${VIEWBOX}`;
  protected readonly cx = CX;
  protected readonly cy = CY;
  protected readonly centerR = CENTER_R;
  protected readonly rimR = R_OUTER + 5;

  /** Trilha de ids até o submenu aberto (hoje um nível). */
  private path = signal<string[]>([]);

  constructor() {
    // Fechar por fora volta a rosca para a raiz.
    effect(() => {
      if (!this.open()) this.path.set([]);
    });
  }

  protected currentParent = computed<RadialItem | null>(() => {
    const [id] = this.path();
    if (!id) return null;
    return this.items().find(item => item.id === id) ?? null;
  });

  protected title = computed(() => this.currentParent()?.label ?? '');

  protected slices = computed<SliceVM[]>(() => {
    const parent = this.currentParent();
    const items = parent?.children ?? this.items();
    const count = items.length;

    return items.map((item, index) => {
      const point = labelPoint(index, count);
      // O ícone tem grade 24×24: escala para ICON_SIZE e centraliza acima do texto.
      const scale = ICON_SIZE / 24;
      const iconX = point.x - ICON_SIZE / 2;
      const iconY = point.y - ICON_SIZE - 2;

      return {
        item,
        path: slicePath(index, count),
        labelX: point.x,
        labelY: point.y,
        text: item.label.length > MAX_LABEL ? `${item.label.slice(0, MAX_LABEL - 1)}…` : item.label,
        iconPath: item.icon ? MTG_ICON_PATHS[item.icon] : null,
        iconTransform: `translate(${iconX} ${iconY}) scale(${scale})`,
      };
    });
  });

  protected centerLabel = computed(() => (this.path().length > 0 ? '←' : '✕'));

  protected select(item: RadialItem): void {
    if (item.children?.length) {
      this.path.set([item.id]);
      return;
    }
    this.action.emit(item.id);
  }

  protected onCenter(): void {
    if (this.result()) {
      this.resultDismissed.emit();
      return;
    }
    if (this.path().length > 0) {
      this.path.set([]);
      return;
    }
    this.closed.emit();
  }

  /** Clique no véu, fora da rosca, fecha. */
  protected onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }
}
