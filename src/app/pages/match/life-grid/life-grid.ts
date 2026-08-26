import { ChangeDetectionStrategy, Component, computed, input, OnDestroy, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { SeatColorCode, SeatPaint, paintSeats, seatPaint } from '../seat-colors';
import { SeatSlot, TapZone, gridRows, lifeFontSize, seatSlots } from './grid-layout';
import { CounterMap, CounterType } from '../counters';
import { MTG_ICON_PATHS, MTG_ICON_VIEWBOX } from '../../../shared/icons/mtg-icons';
import { commanderArtUrl } from '../../../shared/match-utils';
import { FLOAT_WINDOW_MS, LifeFloat, markLeaving, removeFloat, upsertFloat } from './float-deltas';
import {
  cycleCounter,
  SEAT_COUNTER_DEFS,
  SEAT_COUNTER_ORDER,
  SeatCounterKind,
  SWIPE_THRESHOLD,
  swipeTowardPlayer,
} from './seat-counters';

export interface SeatPlayer {
  id: number;
  name: string;
  life: number;
  seatColor: SeatColorCode;
  /** Marcadores de veneno; 10 ou mais eliminam o jogador. */
  poison?: number;
  /** Contadores extras (energia, experiência, tesouro, radiação). */
  counters?: CounterMap;
  /** Comandante da partida — a arte dele forra o assento. Ausente = placa lisa. */
  commander?: string | null;
}

export const POISON_LETHAL = 10;
/** Vida igual ou abaixo disso acende o anel de alerta no assento. */
export const LIFE_ALERT = 10;

interface SeatBadge {
  kind: SeatCounterKind;
  /** Path do ícone da família, para desenhar inline no chip. */
  iconPath: string;
  label: string;
  value: number;
  lethal: boolean;
}

interface SeatVM {
  player: SeatPlayer;
  slot: SeatSlot;
  transform: string;
  /** Camada de luz da cor do assento (halo, borda, sombra, glow, numeral). */
  paint: SeatPaint;
  /** Letra da cor — sempre visível: é o que separa dois assentos da mesma cor. */
  pip: string;
  /** Contador ativo do assento (vida por padrão; deslize troca). */
  kind: SeatCounterKind;
  kindIconPath: string;
  kindLabel: string;
  /** Valor do contador ativo, exibido no numeral grande. */
  value: number;
  /** Resumo dos outros contadores com valor (vida sempre entra quando não é a ativa). */
  badges: SeatBadge[];
  lifeMode: boolean;
  lethal: boolean;
  low: boolean;
  out: boolean;
  /** art_crop do comandante; null quando não há comandante ou a arte falhou. */
  artUrl: string | null;
  /** Gira a arte junto com o assento, a partir do centro da placa. */
  artTransform: string;
  /** Assento girado ±90°: a arte precisa das medidas trocadas para cobrir. */
  quarterTurn: boolean;
}

interface SwipeStart {
  seatId: number;
  x: number;
  y: number;
}

/**
 * Mesa de vidas em grade (2 colunas, 1–6 jogadores). Cada jogador lê o próprio
 * número na horizontal, girado para a lateral em que está sentado. Deslizar na
 * vertical (do ponto de vista do jogador) troca o contador ativo do assento.
 */
@Component({
  selector: 'app-life-grid',
  standalone: true,
  imports: [NgClass],
  templateUrl: './life-grid.html',
  styleUrl: './life-grid.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LifeGrid implements OnDestroy {
  players = input.required<SeatPlayer[]>();
  /** Modo de troca de assentos: as zonas de vida dão lugar ao toque de seleção. */
  arranging = input(false);
  /** Assento já escolhido, aguardando o par para trocar. */
  pickedId = input<number | null>(null);

  lifeChange = output<{ id: number; delta: number }>();
  counterChange = output<{ id: number; kind: 'poison' | CounterType; delta: number }>();
  menu = output<void>();
  pick = output<number>();

  /** Contador ativo por assento; ausente = vida. Estado só de apresentação. */
  private modes = signal<Record<number, SeatCounterKind>>({});

  /** Deltas flutuantes agregados (§2.1), ancorados ao lado do numeral. */
  protected floats = signal<LifeFloat[]>([]);
  private floatSeq = 0;
  private floatTimers = new Map<number, ReturnType<typeof setTimeout>>();

  /**
   * Assentos cuja art_crop não carregou — nome que a Scryfall não achou pelo
   * fuzzy devolve 404. O assento volta a ser placa lisa, sem imagem quebrada.
   */
  private artFailed = signal<ReadonlySet<number>>(new Set());

  private swipeStart: SwipeStart | null = null;
  /** Um deslize consome o clique que o navegador dispara logo depois. */
  private swallowTapSeatId: number | null = null;

  protected readonly iconViewBox = MTG_ICON_VIEWBOX;

  protected rowsTemplate = computed(() => `repeat(${gridRows(this.players().length)}, minmax(0, 1fr))`);
  protected lifeSize = computed(() => lifeFontSize(this.players().length));

  /**
   * Brilho de fundo da mesa: as duas primeiras cores de assento, uma em cada
   * canto oposto. Dá direção de luz ao fundo sem inventar cor nova.
   */
  protected ambient = computed(() => {
    const codes = this.players().map(p => p.seatColor);
    const first = codes[0] ?? 'U';
    const second = codes[1] ?? codes[0] ?? 'R';
    return { first: seatPaint(first).rgb, second: seatPaint(second).rgb };
  });

  protected seats = computed<SeatVM[]>(() => {
    const players = this.players();
    const slots = seatSlots(players.length);
    const paints = paintSeats(players.map(p => p.seatColor));
    const modes = this.modes();
    const artFailed = this.artFailed();

    return players.map((player, i) => {
      const slot = slots[i]!;
      const paint = paints[i]!;
      const poison = player.poison ?? 0;
      const kind = modes[player.id] ?? 'life';
      const def = SEAT_COUNTER_DEFS[kind];
      const value = this.counterValue(player, kind);

      return {
        player,
        slot,
        transform: `rotate(${slot.rotation}deg)`,
        paint,
        pip: player.seatColor,
        kind,
        kindIconPath: MTG_ICON_PATHS[def.icon],
        kindLabel: def.label,
        value,
        badges: this.buildBadges(player, kind),
        lifeMode: kind === 'life',
        lethal: kind === 'poison' && poison >= POISON_LETHAL,
        low: player.life > 0 && player.life <= LIFE_ALERT,
        out: player.life <= 0 || poison >= POISON_LETHAL,
        artUrl: artFailed.has(player.id) ? null : commanderArtUrl(player.commander),
        artTransform: `translate(-50%, -50%) rotate(${slot.rotation}deg)`,
        quarterTurn: Math.abs(slot.rotation) === 90,
      };
    });
  });

  ngOnDestroy(): void {
    for (const timer of this.floatTimers.values()) clearTimeout(timer);
    this.floatTimers.clear();
  }

  protected change(id: number, delta: number): void {
    if (this.swallowTapSeatId === id) {
      this.swallowTapSeatId = null;
      return;
    }

    const kind = this.kindFor(id);
    if (kind === 'life') {
      this.lifeChange.emit({ id, delta });
      this.pushFloat(id, delta);
      return;
    }

    // Contadores têm piso 0: toque que não muda nada não emite nem anima.
    const player = this.players().find(p => p.id === id);
    if (!player) return;
    const current = this.counterValue(player, kind);
    const effective = Math.max(0, current + delta) - current;
    if (effective === 0) return;

    this.counterChange.emit({ id, kind, delta });
    this.pushFloat(id, effective);
  }

  protected setKind(id: number, kind: SeatCounterKind): void {
    this.closeFloat(id);
    this.modes.update(modes => ({ ...modes, [id]: kind }));
  }

  protected onPointerDown(event: PointerEvent, seat: SeatVM): void {
    if (this.arranging()) return;
    this.swipeStart = { seatId: seat.player.id, x: event.clientX, y: event.clientY };
  }

  protected onPointerUp(event: PointerEvent, seat: SeatVM): void {
    const start = this.swipeStart;
    this.swipeStart = null;
    if (!start || start.seatId !== seat.player.id || this.arranging()) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const toward = swipeTowardPlayer(seat.slot.orientation, dx, dy);
    const across = seat.slot.orientation === 'left' || seat.slot.orientation === 'right' ? dy : dx;

    // Só vale como troca se o gesto for claramente no eixo do ciclo.
    if (Math.abs(toward) < SWIPE_THRESHOLD || Math.abs(toward) < Math.abs(across)) return;

    this.setKind(seat.player.id, cycleCounter(seat.kind, toward > 0 ? 1 : -1));
    this.swallowTapSeatId = seat.player.id;
    setTimeout(() => {
      if (this.swallowTapSeatId === seat.player.id) this.swallowTapSeatId = null;
    }, 300);
  }

  protected onArtError(id: number): void {
    this.artFailed.update(set => new Set(set).add(id));
  }

  protected onPointerCancel(): void {
    this.swipeStart = null;
  }

  protected floatsFor(seatId: number): LifeFloat[] {
    return this.floats().filter(f => f.seatId === seatId);
  }

  protected onFloatDone(key: number): void {
    this.floats.update(list => removeFloat(list, key));
  }

  protected zoneClass(zone: TapZone): string {
    return zone;
  }

  private kindFor(id: number): SeatCounterKind {
    return this.modes()[id] ?? 'life';
  }

  private counterValue(player: SeatPlayer, kind: SeatCounterKind): number {
    if (kind === 'life') return player.life;
    if (kind === 'poison') return player.poison ?? 0;
    return player.counters?.[kind] ?? 0;
  }

  private buildBadges(player: SeatPlayer, activeKind: SeatCounterKind): SeatBadge[] {
    const badges: SeatBadge[] = [];
    for (const kind of SEAT_COUNTER_ORDER) {
      if (kind === activeKind) continue;
      const value = this.counterValue(player, kind);
      // Vida aparece sempre que não é o contador ativo; o resto só quando > 0.
      if (kind !== 'life' && value <= 0) continue;
      const def = SEAT_COUNTER_DEFS[kind];
      badges.push({
        kind,
        iconPath: MTG_ICON_PATHS[def.icon],
        label: def.label,
        value,
        lethal: kind === 'poison' && value >= POISON_LETHAL,
      });
    }
    return badges;
  }

  private pushFloat(seatId: number, delta: number): void {
    this.floats.update(list => upsertFloat(list, seatId, delta, ++this.floatSeq));

    clearTimeout(this.floatTimers.get(seatId));
    this.floatTimers.set(
      seatId,
      setTimeout(() => {
        this.floats.update(list => markLeaving(list, seatId));
        this.floatTimers.delete(seatId);
      }, FLOAT_WINDOW_MS),
    );
  }

  /** Fecha o float ativo do assento na hora (troca de contador no meio da janela). */
  private closeFloat(seatId: number): void {
    clearTimeout(this.floatTimers.get(seatId));
    this.floatTimers.delete(seatId);
    this.floats.update(list => markLeaving(list, seatId));
  }
}
