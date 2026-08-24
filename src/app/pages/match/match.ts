import { Component, OnInit, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { BrnSheetImports } from '@spartan-ng/brain/sheet';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { BrnDialogImports } from '@spartan-ng/brain/dialog';
import { HlmDialogImports, HlmDialog } from '@spartan-ng/helm/dialog';
import { HlmRadioGroupImports } from '@spartan-ng/helm/radio-group';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { LifeGrid, POISON_LETHAL, SeatPlayer } from './life-grid/life-grid';
import { SEAT_COLOR_ORDER, SEAT_COLORS, SeatColorCode } from './seat-colors';
import { CounterMap, CounterType, emptyCounters, normalizeCounters } from './counters';
import { RadialItem, RadialMenu } from './radial-menu/radial-menu';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { MTG_ICONS } from '../../shared/icons/mtg-icons';
import { NotificationService } from '../../shared/notification/notification.service';
import { MatchService } from '../../services/match-service';
import { MatchDto } from '../../models/match.models';

const SEATS_KEY = 'match-seats';
/** Vida escolhida na tela de nova partida; ausente cai no padrão de Commander. */
const STARTING_LIFE_KEY = 'match-starting-life';
const STARTING_LIFE = 40;
/** Vidas iniciais oferecidas no submenu da rosca. */
const LIFE_PRESETS = [20, 30, 40, 50] as const;

/** Estado da mesa (ordem, cor, vida, veneno e contadores), preso à partida que o gerou. */
interface StoredSeats {
  matchId: number;
  // `counters` é opcional na leitura: saves gravados antes da feature não têm o campo.
  seats: {
    userId: number;
    seatColor: SeatColorCode;
    life: number;
    poison: number;
    counters?: CounterMap;
  }[];
}

/** Assento da mesa + o usuário real por trás dele. */
interface MatchSeat extends SeatPlayer {
  userId: number;
  poison: number;
  counters: CounterMap;
}

@Component({
  selector: 'app-match',
  standalone: true,
  imports: [
    LifeGrid,
    RadialMenu,
    BrnDialogImports,
    HlmDialogImports,
    HlmRadioGroupImports,
    HlmButtonImports,
    HlmSkeletonImports,
    NgIcon,
    HlmIcon,
  ],
  providers: [provideIcons({ mtgPoison: MTG_ICONS['mtgPoison']! })],
  templateUrl: './match.html',
  styleUrls: ['./match.css'],
})
export class Match implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private notify = inject(NotificationService);
  private matchService = inject(MatchService);

  protected players = signal<MatchSeat[]>([]);
  protected loading = signal(true);
  protected finishing = signal(false);
  protected selectedWinnerId = signal<number | null>(null);
  /** Modo de trocar assentos de lugar. */
  protected arranging = signal(false);
  protected pickedSeatId = signal<number | null>(null);
  /** Menu em rosca aberto pelo hub central da mesa. */
  protected radialOpen = signal(false);
  /** Resultado de dado/sorteio mostrado no centro da rosca. */
  protected diceResult = signal<string | null>(null);
  private matchId: number | null = null;


  protected playersByLife = computed(() =>
    [...this.players()].sort((a, b) => b.life - a.life)
  );

  /** Árvore do menu em rosca; "Cores" tem uma fatia por jogador da mesa. */
  protected radialItems = computed<RadialItem[]>(() => [
    {
      id: 'life',
      icon: 'life',
      label: 'Vidas',
      children: LIFE_PRESETS.map(value => ({
        id: `life-${value}`,
        icon: null,
        label: String(value),
      })),
    },
    { id: 'seats', icon: 'swap', label: 'Assentos' },
    {
      id: 'colors',
      icon: 'colors',
      label: 'Cores',
      children: this.players().map(player => ({
        id: `color-${player.id}`,
        icon: null,
        label: player.name,
        // Lei 2: na fatia a cor de mana entra como tinta fraca, não como fill
        // chapado — é o que mantém o rótulo branco legível em qualquer cor.
        fill: `rgb(var(${SEAT_COLORS[player.seatColor].rgbVarName}) / 0.22)`,
        labelColor: '#EDEAF5',
      })),
    },
    {
      id: 'dice',
      icon: 'dice',
      label: 'Dado',
      children: [
        { id: 'dice-d20', icon: null, label: 'd20' },
        { id: 'dice-d6', icon: null, label: 'd6' },
        { id: 'dice-coin', icon: null, label: 'Moeda' },
        { id: 'dice-first', icon: null, label: 'Quem começa' },
      ],
    },
    { id: 'finish', icon: 'finish', label: 'Encerrar', danger: true },
  ]);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const matchId = Number(localStorage.getItem('matchId'));
    if (!matchId || isNaN(matchId)) {
      this.clearMatchKeys();
      this.notify.warning('Partida inválida.', {
        description: 'Inicie uma nova partida para abrir a mesa.'
      });
      this.router.navigate(['/play']);
      return;
    }

    this.matchId = matchId;
    this.matchService.getMatchById(matchId).subscribe({
      next: (match) => {
        // Partida antiga que já foi encerrada: limpa e volta para a home.
        if (match.winner) {
          this.clearMatchKeys();
          this.router.navigate(['/dashboard']);
          return;
        }

        this.players.set(this.buildSeats(match, this.getStoredSeats(matchId)));
        this.loading.set(false);
      },
      error: (error) => {
        this.notify.apiError(error, { fallback: 'Não foi possível carregar a partida.' });
        this.clearMatchKeys();
        this.router.navigate(['/play']);
      }
    });
  }

  /** Retoma a mesa como ela estava: mesma ordem, cores, vidas e veneno. */
  private buildSeats(match: MatchDto, stored: StoredSeats | null): MatchSeat[] {
    const order = stored?.seats.map(s => s.userId) ?? [];
    const savedByUser = new Map((stored?.seats ?? []).map(s => [s.userId, s]));

    const ordered = [...match.playersConnection].sort((a, b) => {
      const ia = order.indexOf(a.user.id);
      const ib = order.indexOf(b.user.id);
      if (ia === -1 && ib === -1) return a.id - b.id;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    return ordered.map((mp, i) => {
      const saved = savedByUser.get(mp.user.id);
      return {
        id: mp.user.id,
        userId: mp.user.id,
        name: mp.user.name,
        life: saved?.life ?? this.startingLife(),
        poison: saved?.poison ?? 0,
        counters: normalizeCounters(saved?.counters),
        seatColor: saved?.seatColor ?? SEAT_COLOR_ORDER[i % SEAT_COLOR_ORDER.length]!,
      };
    });
  }

  /** Vida inicial da mesa: o que a tela de nova partida escolheu, ou 40. */
  private startingLife(): number {
    if (!isPlatformBrowser(this.platformId)) return STARTING_LIFE;
    const raw = Number(localStorage.getItem(STARTING_LIFE_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : STARTING_LIFE;
  }

  private getStoredSeats(matchId: number): StoredSeats | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = localStorage.getItem(SEATS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      // Assentos de outra partida não valem para esta.
      if (!parsed || parsed.matchId !== matchId || !Array.isArray(parsed.seats)) return null;
      return parsed as StoredSeats;
    } catch {
      return null;
    }
  }

  private persistSeats(): void {
    if (!isPlatformBrowser(this.platformId) || this.matchId === null) return;
    const payload: StoredSeats = {
      matchId: this.matchId,
      seats: this.players().map(p => ({
        userId: p.userId,
        seatColor: p.seatColor,
        life: p.life,
        poison: p.poison,
        counters: p.counters,
      })),
    };
    localStorage.setItem(SEATS_KEY, JSON.stringify(payload));
  }

  protected onLifeChange(event: { id: number; delta: number }): void {
    const before = this.players().find(p => p.id === event.id);

    this.players.update(players =>
      players.map(p => (p.id === event.id ? { ...p, life: p.life + event.delta } : p)),
    );

    const after = this.players().find(p => p.id === event.id);
    this.persistSeats();

    // Avisa só na virada para zero, para não repetir o toast a cada toque.
    if (before && after && before.life > 0 && after.life <= 0) {
      this.notify.warning(`${after.name} está fora!`, {
        description: `Chegou a ${after.life} pontos de vida.`
      });
    }
  }

  protected updatePoison(id: number, delta: number): void {
    const before = this.players().find(p => p.id === id);

    this.players.update(players =>
      players.map(p => (p.id === id ? { ...p, poison: Math.max(0, p.poison + delta) } : p)),
    );

    const after = this.players().find(p => p.id === id);
    this.persistSeats();

    // Avisa só quando cruza o letal, para não repetir o toast a cada toque.
    if (before && after && before.poison < POISON_LETHAL && after.poison >= POISON_LETHAL) {
      this.notify.warning(`${after.name} está fora!`, {
        description: `Chegou a ${after.poison} marcadores de veneno.`
      });
    }
  }

  /** Toque de ± num assento cujo contador ativo não é a vida. */
  protected onCounterChange(event: { id: number; kind: 'poison' | CounterType; delta: number }): void {
    if (event.kind === 'poison') {
      this.updatePoison(event.id, event.delta);
      return;
    }
    this.updateCounter(event.id, event.kind, event.delta);
  }

  protected updateCounter(id: number, type: CounterType, delta: number): void {
    this.players.update(players =>
      players.map(p =>
        p.id === id
          ? { ...p, counters: { ...p.counters, [type]: Math.max(0, p.counters[type] + delta) } }
          : p,
      ),
    );
    this.persistSeats();
  }

  /** Cicla a cor do assento entre os 6 tokens de mana — repetição permitida. */
  protected cycleSeatColor(id: number): void {
    this.players.update(players =>
      players.map(p => {
        if (p.id !== id) return p;
        const next =
          SEAT_COLOR_ORDER[(SEAT_COLOR_ORDER.indexOf(p.seatColor) + 1) % SEAT_COLOR_ORDER.length]!;
        return { ...p, seatColor: next };
      }),
    );
    this.persistSeats();
  }

  protected startArranging(): void {
    this.pickedSeatId.set(null);
    this.arranging.set(true);
  }

  protected stopArranging(): void {
    this.arranging.set(false);
    this.pickedSeatId.set(null);
  }

  /** Primeiro toque escolhe o assento, o segundo troca os dois de lugar. */
  protected onSeatPick(id: number): void {
    const picked = this.pickedSeatId();

    if (picked === null || picked === id) {
      this.pickedSeatId.set(picked === id ? null : id);
      return;
    }

    this.players.update(list => {
      const from = list.findIndex(p => p.id === picked);
      const to = list.findIndex(p => p.id === id);
      const first = list[from];
      const second = list[to];
      if (!first || !second) return list;

      const next = [...list];
      next[from] = second;
      next[to] = first;
      return next;
    });

    this.pickedSeatId.set(null);
    this.persistSeats();
  }

  /** Reinicia a mesa no valor escolhido na rosca, zerando veneno e contadores. */
  protected setAllLife(value: number): void {
    this.players.update(players =>
      players.map(p => ({ ...p, life: value, poison: 0, counters: emptyCounters() })),
    );
    this.persistSeats();
    this.notify.info(`Vidas reiniciadas em ${value}, veneno e contadores zerados.`);
  }

  /** Despacha a fatia escolhida na rosca. */
  protected onRadialAction(id: string, dialog: HlmDialog): void {
    if (id.startsWith('life-')) {
      this.setAllLife(Number(id.slice('life-'.length)));
      this.closeRadial();
      return;
    }

    if (id.startsWith('color-')) {
      // Fica no submenu: dá para ciclar a cor de vários jogadores em sequência.
      this.cycleSeatColor(Number(id.slice('color-'.length)));
      return;
    }

    if (id.startsWith('dice-')) {
      this.diceResult.set(this.roll(id));
      return;
    }

    if (id === 'seats') {
      this.closeRadial();
      this.startArranging();
      return;
    }

    if (id === 'finish') {
      this.closeRadial();
      this.openEndDialog(dialog);
    }
  }

  protected closeRadial(): void {
    this.radialOpen.set(false);
    this.diceResult.set(null);
  }

  private roll(id: string): string {
    switch (id) {
      case 'dice-d20':
        return String(1 + Math.floor(Math.random() * 20));
      case 'dice-d6':
        return String(1 + Math.floor(Math.random() * 6));
      case 'dice-coin':
        return Math.random() < 0.5 ? 'Cara' : 'Coroa';
      case 'dice-first': {
        const seats = this.players();
        if (seats.length === 0) return '—';
        return seats[Math.floor(Math.random() * seats.length)]!.name;
      }
      default:
        return '—';
    }
  }

  protected openEndDialog(dialog: HlmDialog): void {
    if (this.loading() || this.players().length === 0) return;
    // Sugestão: pré-seleciona quem tem mais vida; a escolha final é manual.
    this.selectedWinnerId.set(this.playersByLife()[0]!.userId);
    dialog.open();
  }

  protected onWinnerChange(value: unknown): void {
    this.selectedWinnerId.set(Number(value));
  }

  protected confirmFinish(dialog: HlmDialog): void {
    const winnerId = this.selectedWinnerId();
    if (this.matchId === null || winnerId === null || this.finishing()) return;

    const winner = this.players().find(p => p.userId === winnerId);
    this.finishing.set(true);

    this.matchService.finishMatch(this.matchId, {
      winnerId,
      matchTimeInMinutes: this.getElapsedMinutes()
    }).subscribe({
      next: () => {
        this.notify.success('Partida encerrada!', {
          description: `Vencedor: ${winner?.name ?? ''}.`
        });
        this.clearMatchKeys();
        dialog.close(null);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.notify.apiError(error, { fallback: 'Não foi possível encerrar a partida.' });
        this.finishing.set(false);
      }
    });
  }

  private getElapsedMinutes(): number {
    const start = Number(localStorage.getItem('match-start'));
    if (!start || isNaN(start)) return 0;
    return Math.max(0, Math.round((Date.now() - start) / 60000));
  }

  private clearMatchKeys(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    localStorage.removeItem('matchId');
    localStorage.removeItem('match-start');
    localStorage.removeItem(SEATS_KEY);
    localStorage.removeItem(STARTING_LIFE_KEY);
    localStorage.removeItem('players');
  }
}
