import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { UserService } from '../../services/user-service';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { lucideCirclePlus, lucideDice5, lucidePlay, lucideX } from '@ng-icons/lucide';
import { MatchService } from '../../services/match-service';
import { DeckService } from '../../services/deck-service';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { BackButton } from '../../shared/back-button/back-button';
import { NotificationService } from '../../shared/notification/notification.service';
import { CreateMatchPayload } from '../../models/match.models';
import { PlayerOption } from '../../models/user.models';
import { DeckOption, TableDecks } from '../../models/collection.models';
import { colorsRgb, preselectDeck } from '../../shared/deck-choice';
import { DeckSelect } from './deck-select/deck-select';
import { LendSheet } from './lend-sheet/lend-sheet';
import { QuickDeckSheet } from './quick-deck-sheet/quick-deck-sheet';

/** Id fixo: um novo aviso substitui o anterior em vez de empilhar. */
const FORM_WARNING = 'form-validation';

/** A mesa desenha de 2 a 6 assentos — o mesmo intervalo que a API aceita. */
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

/** Vidas iniciais oferecidas — as mesmas do submenu da rosca na mesa. */
const LIFE_PRESETS = [20, 30, 40, 50] as const;

/** Chave lida pela mesa ao montar os assentos de uma partida nova. */
const STARTING_LIFE_KEY = 'match-starting-life';

type FirstTurnMode = 'manual' | 'random';

/** Um assento: jogador e deck. `key` só dá identidade estável ao @for. */
interface Seat {
  key: number;
  userId: number | null;
  deckId: string | null;
}

/** A folha aberta sobre a mesa, e para qual assento. */
type SeatSheet = { kind: 'lend' | 'new'; seat: number } | null;

/**
 * Nova partida. Cada assento pede duas coisas: o jogador e um deck. O deck já
 * traz commander, arte e cores — o que antes era busca de commander e cinco
 * orbes a cada partida virou cadastro de uma vez só.
 *
 * O deck pode ser do próprio jogador ou emprestado de outra conta; quem joga é
 * o assento (vitória e estatística são dele), o deck só empresta commander e
 * cores ao retrato da partida.
 */
@Component({
  selector: 'app-game',
  imports: [
    BrnSelectImports,
    HlmSelectImports,
    NgIcon,
    HlmIconImports,
    BackButton,
    DeckSelect,
    LendSheet,
    QuickDeckSheet,
  ],
  providers: [provideIcons({ lucideCirclePlus, lucideDice5, lucidePlay, lucideX })],
  templateUrl: './new-match.html',
  styleUrl: './new-match.css',
})
export class NewMatch implements OnInit, OnDestroy {
  private readonly destroy = new Subject<void>();
  private router = inject(Router);
  private userService = inject(UserService);
  private matchService = inject(MatchService);
  private deckService = inject(DeckService);
  private notify = inject(NotificationService);

  protected readonly minPlayers = MIN_PLAYERS;
  protected readonly maxPlayers = MAX_PLAYERS;

  // Zoneless: tudo o que muda dentro de subscribe é signal, senão a view não reage.
  protected users = signal<PlayerOption[]>([]);
  protected table = signal<TableDecks | null>(null);
  protected loadingDecks = signal(true);
  protected loading = signal(false);

  protected seats = signal<Seat[]>([]);
  protected isFun = signal(false);
  /** Vida com que a mesa começa; a mesa lê pelo localStorage. */
  protected startingLife = signal<number>(40);
  /** Sortear anuncia quem começa assim que a partida abre. */
  protected firstTurnMode = signal<FirstTurnMode>('random');

  protected sheet = signal<SeatSheet>(null);

  private nextKey = 0;

  private decksById = computed(
    () => new Map((this.table()?.decks ?? []).map(deck => [deck.id, deck] as const)),
  );

  /** Deck → número do assento que o usa. Um deck físico não joga em dois lugares. */
  protected takenBy = computed(() => {
    const taken: Record<string, number> = {};
    this.seats().forEach((seat, index) => {
      if (seat.deckId) taken[seat.deckId] = index + 1;
    });
    return taken;
  });

  /**
   * Cor da mesa: a primeira cor do primeiro assento com deck. Tinge o brilho
   * do topo da tela — a luz vem do dado, não da marca.
   */
  protected tableRgb = computed(() => {
    for (let i = 0; i < this.seats().length; i++) {
      const rgb = this.seatRgb(i);
      if (rgb) return rgb;
    }
    return null;
  });

  protected sheetPlayer = computed(() => {
    const sheet = this.sheet();
    return sheet ? this.userAt(sheet.seat) ?? null : null;
  });

  ngOnInit(): void {
    // A mesa nasce com dois lugares: é o mínimo que a partida aceita.
    this.addPlayer();
    this.addPlayer();

    this.userService.getUsers()
      .pipe(takeUntil(this.destroy))
      .subscribe({
        next: users => {
          this.users.set(users ?? []);

          if (this.users().length === 0) {
            this.notify.warning('Nenhum jogador cadastrado ainda.', {
              description: 'Cadastre os jogadores antes de iniciar uma partida.'
            });
          }
        },
        error: error => {
          this.notify.apiError(error, { fallback: 'Não foi possível carregar a lista de jogadores.' });
        }
      });

    this.loadDecks();
  }

  ngOnDestroy(): void {
    this.destroy.next();
    this.destroy.complete();
  }

  protected loadDecks(): void {
    this.loadingDecks.set(true);
    this.deckService.table()
      .pipe(takeUntil(this.destroy))
      .subscribe({
        next: table => {
          this.table.set(table);
          this.loadingDecks.set(false);
          // Jogador escolhido antes de os decks chegarem ganha a pré-seleção agora.
          this.seats().forEach((seat, index) => {
            if (seat.userId !== null && !seat.deckId) this.preselect(index);
          });
        },
        error: error => {
          this.loadingDecks.set(false);
          this.notify.apiError(error, { fallback: 'Não foi possível carregar os decks.' });
        }
      });
  }

  /* ─── Assentos ─────────────────────────────────────────────── */

  protected addPlayer(): void {
    if (this.seats().length >= MAX_PLAYERS) {
      this.notify.warning(`Uma partida aceita no máximo ${MAX_PLAYERS} jogadores.`, { id: FORM_WARNING });
      return;
    }

    this.seats.update(seats => [...seats, { key: this.nextKey++, userId: null, deckId: null }]);
  }

  protected removePlayer(index: number): void {
    this.seats.update(seats => seats.filter((_, i) => i !== index));
    this.notify.info(`Assento ${index + 1} removido da mesa.`);
  }

  /** Trocar o jogador limpa o deck: o deck do assento anterior não é dele. */
  protected setPlayer(index: number, value: unknown): void {
    const userId = value === null || value === undefined || value === '' ? null : Number(value);
    this.patchSeat(index, { userId, deckId: null });
    if (userId !== null) this.preselect(index);
  }

  protected pickDeck(index: number, deckId: string): void {
    this.patchSeat(index, { deckId });
  }

  /** O último deck que o jogador levou à mesa (próprio ou emprestado), se estiver livre. */
  private preselect(index: number): void {
    const table = this.table();
    const seat = this.seats()[index];
    if (!table || !seat || seat.userId === null) return;

    const taken = new Set(Object.keys(this.takenBy()));
    if (seat.deckId) taken.delete(seat.deckId);

    const deckId = preselectDeck(seat.userId, table.decks, table.lastDeckByUser, taken);
    if (deckId) this.patchSeat(index, { deckId });
  }

  private patchSeat(index: number, patch: Partial<Seat>): void {
    this.seats.update(seats => seats.map((seat, i) => (i === index ? { ...seat, ...patch } : seat)));
  }

  /* ─── Leitura do assento, para o template ──────────────────── */

  protected userAt(index: number): PlayerOption | undefined {
    const userId = this.seats()[index]?.userId;
    return userId === null || userId === undefined
      ? undefined
      : this.users().find(user => user.id === userId);
  }

  protected deckAt(index: number): DeckOption | null {
    const deckId = this.seats()[index]?.deckId;
    return deckId ? this.decksById().get(deckId) ?? null : null;
  }

  /** Decks do próprio jogador — os emprestados entram pela folha. */
  protected ownDecks(index: number): DeckOption[] {
    const userId = this.seats()[index]?.userId;
    if (userId === null || userId === undefined) return [];
    return (this.table()?.decks ?? []).filter(deck => deck.owner.id === userId);
  }

  /** Existe deck de outra conta para emprestar a este assento? */
  protected canBorrow(index: number): boolean {
    const userId = this.seats()[index]?.userId;
    return (this.table()?.decks ?? []).some(deck => deck.owner.id !== userId);
  }

  /**
   * Canais RGB da primeira cor do deck escolhido — é o que tinge a placa.
   * `null` (assento sem deck, ou deck incolor) deixa a placa neutra.
   */
  protected seatRgb(index: number): string | null {
    const deck = this.deckAt(index);
    return deck ? colorsRgb(deck.colors) : null;
  }

  /** Inicial do jogador escolhido, para o avatar do assento. */
  protected initial(index: number): string {
    return this.userAt(index)?.name.trim().charAt(0).toUpperCase() ?? '?';
  }

  /** Ícone de perfil do jogador do assento, quando ele tem um. */
  protected avatarFor(index: number): string | null {
    return this.userAt(index)?.avatar ?? null;
  }

  /* ─── Folhas ───────────────────────────────────────────────── */

  protected openSheet(kind: 'lend' | 'new', seat: number): void {
    this.sheet.set({ kind, seat });
  }

  protected closeSheet(): void {
    this.sheet.set(null);
  }

  protected onLent(deckId: string): void {
    const sheet = this.sheet();
    if (sheet) this.pickDeck(sheet.seat, deckId);
    this.closeSheet();
  }

  /** O deck criado entra na lista da mesa e já fica escolhido no assento. */
  protected onCreated(deck: DeckOption): void {
    const sheet = this.sheet();
    this.table.update(table =>
      table ? { ...table, decks: [deck, ...table.decks] } : { decks: [deck], lastDeckByUser: {} },
    );
    if (sheet) this.pickDeck(sheet.seat, deck.id);
    this.closeSheet();
  }

  /* ─── Ajustes da mesa ──────────────────────────────────────── */

  protected toggleFun(): void {
    this.isFun.update(value => !value);
  }

  protected cycleStartingLife(): void {
    const index = LIFE_PRESETS.indexOf(this.startingLife() as (typeof LIFE_PRESETS)[number]);
    this.startingLife.set(LIFE_PRESETS[(index + 1) % LIFE_PRESETS.length]!);
  }

  protected toggleFirstTurn(): void {
    this.firstTurnMode.update(mode => (mode === 'random' ? 'manual' : 'random'));
  }

  /* ─── Começar ──────────────────────────────────────────────── */

  protected onSubmit(): void {
    const seats = this.seats();

    if (seats.length < MIN_PLAYERS) {
      this.notify.warning(`Uma partida precisa de pelo menos ${MIN_PLAYERS} jogadores.`, { id: FORM_WARNING });
      return;
    }

    if (seats.some(seat => seat.userId === null || !seat.deckId)) {
      this.notify.warning('Escolha o jogador e o deck de cada assento antes de começar.', { id: FORM_WARNING });
      return;
    }

    const repeated = this.findRepeatedPlayer(seats);
    if (repeated) {
      this.notify.warning(`${repeated} está em mais de um assento.`, {
        id: FORM_WARNING,
        description: 'Cada jogador só pode ocupar um assento da mesa.'
      });
      return;
    }

    const payload: CreateMatchPayload = {
      isFun: this.isFun(),
      players: seats.map(seat => ({ userId: seat.userId!, deckId: seat.deckId! })),
    };

    this.loading.set(true);

    this.matchService.startMatch(payload)
      .pipe(takeUntil(this.destroy))
      .subscribe({
        next: data => {
          this.loading.set(false);

          localStorage.setItem('matchId', String(data.matchId));
          localStorage.setItem('match-start', Date.now().toString());
          // A vida inicial é estado de mesa, não de partida: só o front a usa.
          localStorage.setItem(STARTING_LIFE_KEY, String(this.startingLife()));

          this.notify.success('Partida iniciada!', {
            description: this.startDescription(seats)
          });
          this.router.navigate(['/match']);
        },
        error: error => {
          this.loading.set(false);
          this.notify.apiError(error, { fallback: 'Não foi possível iniciar a partida.' });
        }
      });
  }

  /** Aviso de abertura: quem começa, quando o primeiro turno é sorteado. */
  private startDescription(seats: Seat[]): string {
    const count = seats.length;

    if (this.firstTurnMode() !== 'random' || count === 0) {
      return `Boa sorte para os ${count} jogadores da mesa.`;
    }

    const drawn = seats[Math.floor(Math.random() * count)]!;
    const name = this.users().find(user => user.id === drawn.userId)?.name;
    return name ? `${name} começa jogando.` : `Boa sorte para os ${count} jogadores da mesa.`;
  }

  /** Devolve o nome do primeiro jogador escolhido em dois assentos, se houver. */
  private findRepeatedPlayer(seats: Seat[]): string | null {
    const seen = new Set<number>();

    for (const seat of seats) {
      if (seat.userId === null) continue;

      if (seen.has(seat.userId)) {
        return this.users().find(user => user.id === seat.userId)?.name ?? 'Esse jogador';
      }

      seen.add(seat.userId);
    }

    return null;
  }
}
