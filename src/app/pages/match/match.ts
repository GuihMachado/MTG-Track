import { Component, OnDestroy, OnInit, computed, inject, PLATFORM_ID, signal } from '@angular/core';
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
import { LifeGrid, SeatPlayer } from './life-grid/life-grid';
import { SEAT_COLOR_ORDER, SEAT_COLORS, SeatColorCode } from './seat-colors';
import { CounterMap, CounterType, emptyCounters, normalizeCounters } from './counters';
import { TableCommand, TableMenu } from './table-menu/table-menu';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { MTG_ICONS } from '../../shared/icons/mtg-icons';
import { NotificationService } from '../../shared/notification/notification.service';
import { MatchService } from '../../services/match-service';
import { MatchDto, TableState } from '../../models/match.models';
import { AUTOSAVE_MS, clockTime, describeDiff, lifeLine, sameTable, toTableState } from './table-state';

const SEATS_KEY = 'match-seats';
/** Vida escolhida na tela de nova partida; ausente cai no padrão de Commander. */
const STARTING_LIFE_KEY = 'match-starting-life';
const STARTING_LIFE = 40;

/** Estado da mesa (ordem, cor, vida, veneno e contadores), preso à partida que o gerou. */
interface StoredSeats {
  matchId: number;
  /** Quando esta mesa mudou pela última vez neste celular (ms) — a pergunta
   *  "qual mesa usar" mostra a hora das duas. Ausente em saves antigos. */
  updatedAt?: number;
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

/** A mesa salva no servidor diverge da deste celular: quem continua? */
interface RestoreChoice {
  server: TableState;
  serverAt: Date;
  local: TableState;
  localAt: Date | null;
  /** "cor de Ana, vida de Bruno": o motivo da pergunta. */
  diff: string;
}

@Component({
  selector: 'app-match',
  standalone: true,
  imports: [
    LifeGrid,
    TableMenu,
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
export class Match implements OnInit, OnDestroy {
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
  /** Comandos da mesa, abertos pelo hub central. */
  protected menuOpen = signal(false);
  /** Resultado do último sorteio, mostrado na vista de Dado. */
  protected diceResult = signal<string | null>(null);
  /** Salvamento no servidor, para o cartão Salvar dizer a verdade. */
  protected saveStatus = signal<{ saving: boolean; failed: boolean; savedAt: Date | null }>({
    saving: false,
    failed: false,
    savedAt: null,
  });
  /** Pergunta de qual mesa usar quando a salva e a local divergem. */
  protected restoreChoice = signal<RestoreChoice | null>(null);
  /** Início da partida (ms), para o cronômetro dos comandos. */
  protected startedAt = signal(Date.now());
  private matchId: number | null = null;
  /** Mudou algo desde o último salvamento no servidor? O automático só sai se sim. */
  private dirty = false;
  private autosave: ReturnType<typeof setInterval> | null = null;

  protected menuSeats = computed(() =>
    this.players().map(p => ({ id: p.id, name: p.name, seatColor: p.seatColor })),
  );

  protected lifeOf = lifeLine;
  protected timeOf = clockTime;
  /** Vida inicial da mesa (a de "Voltar todo mundo para 40"). */
  protected startingLifeValue = signal(STARTING_LIFE);


  protected playersByLife = computed(() =>
    [...this.players()].sort((a, b) => b.life - a.life)
  );

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

        this.restoreTable(match, matchId);
        this.loading.set(false);
        this.autosave = setInterval(() => this.saveTable(false), AUTOSAVE_MS);
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
        // Vem sempre da API, nunca do localStorage: o comandante é da partida,
        // não do estado da mesa, e não muda no meio do jogo.
        commander: mp.commander,
      };
    });
  }

  /**
   * Qual mesa abre. Sem nada neste celular, vale a salva no servidor (é o caso
   * de continuar em outro aparelho). As duas existindo e diferentes, a mesa
   * abre com a local e pergunta — escolher sem mostrar seria arriscar apagar
   * a vida de alguém. Iguais, nada a perguntar.
   */
  private restoreTable(match: MatchDto, matchId: number): void {
    const local = this.getStoredSeats(matchId);
    const server = match.tableState ?? null;
    const serverAt = match.tableSavedAt ? new Date(match.tableSavedAt) : null;

    if (server && !local) {
      this.applyServerTable(match, server);
    } else {
      this.players.set(this.buildSeats(match, local));
      if (server && local) {
        const localTable = toTableState(this.players(), this.startingLife());
        if (!sameTable(server, localTable)) {
          this.restoreChoice.set({
            server,
            serverAt: serverAt ?? new Date(),
            local: localTable,
            localAt: local.updatedAt ? new Date(local.updatedAt) : null,
            diff: describeDiff(server, localTable, new Map(this.players().map(p => [p.userId, p.name]))),
          });
        }
      }
    }

    this.startingLifeValue.set(this.startingLife());
    const start = Number(localStorage.getItem('match-start'));
    this.startedAt.set(start > 0 ? start : new Date(match.matchDate).getTime() || Date.now());
    this.saveStatus.set({ saving: false, failed: false, savedAt: serverAt });
    // Servidor e tela iguais: nada a salvar. Sem mesa no servidor, ou com a
    // pergunta aberta, o próximo automático tem o que gravar.
    this.dirty = this.restoreChoice() !== null || !server;
  }

  private applyServerTable(match: MatchDto, server: TableState): void {
    if (this.matchId === null) return;
    localStorage.setItem(STARTING_LIFE_KEY, String(server.startingLife));
    const stored: StoredSeats = {
      matchId: this.matchId,
      seats: server.seats.map(seat => ({
        userId: seat.userId,
        seatColor: seat.seatColor as SeatColorCode,
        life: seat.life,
        poison: seat.poison,
        counters: normalizeCounters(seat.counters),
      })),
    };
    this.players.set(this.buildSeats(match, stored));
    this.persistSeats(false);
  }

  /** Resposta da pergunta: continuar da mesa salva ou manter a deste celular. */
  protected resolveRestore(useServer: boolean): void {
    const choice = this.restoreChoice();
    if (!choice || this.matchId === null) return;

    if (useServer) {
      this.matchService.getMatchById(this.matchId).subscribe({
        next: match => {
          this.applyServerTable(match, choice.server);
          this.startingLifeValue.set(choice.server.startingLife);
          this.dirty = false;
          this.restoreChoice.set(null);
          this.notify.success('Mesa salva carregada.');
        },
        error: error => this.notify.apiError(error, { fallback: 'Não consegui carregar a mesa salva.' }),
      });
      return;
    }

    // Manter a local: ela passa a ser a salva no próximo salvamento.
    this.dirty = true;
    this.restoreChoice.set(null);
  }

  /**
   * Grava a mesa no servidor. O automático (a cada 10 min) só sai se algo
   * mudou e fica calado; o do botão sempre sai e confirma na tela.
   */
  protected saveTable(manual: boolean): void {
    if (this.matchId === null || this.saveStatus().saving) return;
    if (!manual && !this.dirty) return;
    // Com a pergunta aberta, salvar escolheria por quem não respondeu.
    if (this.restoreChoice()) return;

    const table = toTableState(this.players(), this.startingLife());
    this.saveStatus.update(status => ({ ...status, saving: true, failed: false }));
    this.dirty = false;

    this.matchService.saveTable(this.matchId, table).subscribe({
      next: ({ savedAt }) => {
        this.saveStatus.set({ saving: false, failed: false, savedAt: new Date(savedAt) });
        if (manual) this.notify.success('Mesa salva.', { description: 'Outro celular já continua daqui.' });
      },
      error: error => {
        this.dirty = true;
        this.saveStatus.update(status => ({ ...status, saving: false, failed: true }));
        if (manual) this.notify.apiError(error, { fallback: 'Não consegui salvar a mesa.' });
      },
    });
  }

  ngOnDestroy(): void {
    if (this.autosave) clearInterval(this.autosave);
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

  /** Guarda a mesa neste celular. `changed` marca que o servidor ficou para trás. */
  private persistSeats(changed = true): void {
    if (!isPlatformBrowser(this.platformId) || this.matchId === null) return;
    if (changed) this.dirty = true;
    const payload: StoredSeats = {
      matchId: this.matchId,
      updatedAt: Date.now(),
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
    this.players.update(players =>
      players.map(p => (p.id === event.id ? { ...p, life: p.life + event.delta } : p)),
    );

    this.persistSeats();
  }

  protected updatePoison(id: number, delta: number): void {
    this.players.update(players =>
      players.map(p => (p.id === id ? { ...p, poison: Math.max(0, p.poison + delta) } : p)),
    );

    this.persistSeats();
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

  /** Reinicia a mesa na vida inicial, zerando veneno e contadores. */
  protected setAllLife(value: number): void {
    this.players.update(players =>
      players.map(p => ({ ...p, life: value, poison: 0, counters: emptyCounters() })),
    );
    this.persistSeats();
    this.notify.info(`Vidas reiniciadas em ${value}, veneno e contadores zerados.`);
  }

  /** Despacha o comando escolhido na folha da mesa. */
  protected onCommand(command: TableCommand, dialog: HlmDialog): void {
    switch (command.kind) {
      case 'reset-life':
        this.setAllLife(this.startingLife());
        this.closeMenu();
        return;
      case 'cycle-color':
        // Fica na vista de Cores: dá para trocar vários assentos em sequência.
        this.cycleSeatColor(command.seatId);
        return;
      case 'roll':
        this.diceResult.set(this.roll(command.die));
        return;
      case 'arrange':
        this.closeMenu();
        this.startArranging();
        return;
      case 'finish':
        this.closeMenu();
        this.openEndDialog(dialog);
        return;
      case 'save':
        this.saveTable(true);
        return;
    }
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
    this.diceResult.set(null);
  }

  private roll(id: string): string {
    switch (id) {
      case 'd20':
        return String(1 + Math.floor(Math.random() * 20));
      case 'd6':
        return String(1 + Math.floor(Math.random() * 6));
      case 'coin':
        return Math.random() < 0.5 ? 'Cara' : 'Coroa';
      case 'first': {
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
      matchTimeInMinutes: this.getElapsedMinutes(),
      table: toTableState(this.players(), this.startingLife()),
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
