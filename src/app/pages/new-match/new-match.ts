import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/user-service';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { lucideCirclePlus, lucideDice5, lucidePlay, lucideX } from '@ng-icons/lucide';
import { ManaSymbolPipe } from '../../shared/pipes/mana-symbol-pipe';
import { MatchService } from '../../services/match-service';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { BackButton } from '../../shared/back-button/back-button';
import { NotificationService } from '../../shared/notification/notification.service';
import { CreateMatchPayload } from '../../models/match.models';
import { PlayerOption } from '../../models/user.models';
import { CardPicker } from '../../shared/card-picker/card-picker';
import { FormControl } from '@angular/forms';

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

@Component({
  selector: 'app-game',
  imports: [
    BrnSelectImports,
    HlmSelectImports,
    NgIcon,
    HlmIconImports,
    ManaSymbolPipe,
    ReactiveFormsModule,
    BackButton,
    CardPicker
  ],
  providers: [provideIcons({ lucideCirclePlus, lucideDice5, lucidePlay, lucideX })],
  templateUrl: './new-match.html',
  styleUrl: './new-match.css',
})
export class NewMatch {
  private readonly destroy = new Subject<void>();
  private router = inject(Router);
  protected gameForm: FormGroup;
  protected usersList: PlayerOption[] = [];
  // Zoneless: mutado dentro do subscribe, precisa ser signal para a view reagir.
  protected loading = signal(false);
  /** Vida com que a mesa começa; a mesa lê pelo localStorage. */
  protected startingLife = signal<number>(40);
  /** Sortear anuncia quem começa assim que a partida abre. */
  protected firstTurnMode = signal<FirstTurnMode>('random');

  private userService = inject(UserService);
  private matchService = inject(MatchService);
  private notify = inject(NotificationService);

  protected readonly minPlayers = MIN_PLAYERS;
  protected readonly maxPlayers = MAX_PLAYERS;

  /* Identidade de mana do deck. `rgb` alimenta a camada de luz da orbe e da
     placa do assento — a cor nunca preenche a área. */
  protected manaColors = [
    { code: 'W', label: 'White', rgb: 'var(--mana-w-rgb)' },
    { code: 'U', label: 'Blue', rgb: 'var(--mana-u-rgb)' },
    { code: 'B', label: 'Black', rgb: 'var(--mana-b-rgb)' },
    { code: 'R', label: 'Red', rgb: 'var(--mana-r-rgb)' },
    { code: 'G', label: 'Green', rgb: 'var(--mana-g-rgb)' },
  ];

  constructor(private fb: FormBuilder) {
    this.gameForm = this.fb.group({
      players: this.fb.array([]),
      // Flag de partida (não de jogador): 4Fun entra no histórico, fora do ranking.
      isFun: [false]
    });

    this.userService.getUsers()
      .pipe(takeUntil(this.destroy))
      .subscribe({
        next: users => {
          this.usersList = users ?? [];

          if (this.usersList.length === 0) {
            this.notify.warning('Nenhum jogador cadastrado ainda.', {
              description: 'Cadastre os jogadores antes de iniciar uma partida.'
            });
          }
        },
        error: error => {
          this.notify.apiError(error, { fallback: 'Não foi possível carregar a lista de jogadores.' });
        }
      });
  }

  ngOnInit() {
    // A mesa nasce com dois lugares: é o mínimo que a partida aceita.
    this.addPlayer();
    this.addPlayer();
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  get playersArray(): FormArray {
    return this.gameForm.get('players') as FormArray;
  }

  private createPlayerGroup(): FormGroup {
    return this.fb.group({
      userId: ['', Validators.required],
      // Só aceita nome escolhido na busca da Scryfall (app-card-picker).
      commander: ['', Validators.required],
      colors: [[]]
    });
  }

  /** O card-picker recebe o controle do assento em vez de um formControlName. */
  protected commanderControl(index: number): FormControl<string> {
    return this.playersArray.at(index).get('commander') as FormControl<string>;
  }

  protected get isFunControl(): FormControl<boolean> {
    return this.gameForm.get('isFun') as FormControl<boolean>;
  }

  protected toggleFun(): void {
    this.isFunControl.setValue(!this.isFunControl.value);
  }

  protected cycleStartingLife(): void {
    const index = LIFE_PRESETS.indexOf(this.startingLife() as (typeof LIFE_PRESETS)[number]);
    this.startingLife.set(LIFE_PRESETS[(index + 1) % LIFE_PRESETS.length]!);
  }

  protected toggleFirstTurn(): void {
    this.firstTurnMode.update(mode => (mode === 'random' ? 'manual' : 'random'));
  }

  /**
   * Cor da mesa: a primeira cor escolhida em qualquer assento. Tinge o brilho
   * do topo da tela, no lugar do antigo halo roxo da marca.
   */
  protected tableRgb(): string | null {
    for (let i = 0; i < this.playersArray.length; i++) {
      const rgb = this.seatRgb(i);
      if (rgb) return rgb;
    }
    return null;
  }

  /**
   * Canais RGB da primeira cor escolhida no assento — é o que tinge a placa.
   * `null` (assento sem cor) deixa a placa neutra.
   */
  protected seatRgb(index: number): string | null {
    const colors: string[] = this.playersArray.at(index).get('colors')?.value ?? [];
    const first = colors[0];
    return first ? `var(--mana-${first.toLowerCase()}-rgb)` : null;
  }

  /** Inicial do jogador escolhido, para o avatar do assento. */
  protected initial(index: number): string {
    return this.userAt(index)?.name.trim().charAt(0).toUpperCase() ?? '?';
  }

  /** Ícone de perfil do jogador do assento, quando ele tem um. */
  protected avatarFor(index: number): string | null {
    return this.userAt(index)?.avatar ?? null;
  }

  private userAt(index: number): PlayerOption | undefined {
    const userId = this.playersArray.at(index).get('userId')?.value;
    return this.usersList.find(u => String(u.id) === String(userId));
  }

  protected addPlayer() {
    if (this.playersArray.length >= MAX_PLAYERS) {
      this.notify.warning(`Uma partida aceita no máximo ${MAX_PLAYERS} jogadores.`, { id: FORM_WARNING });
      return;
    }

    this.playersArray.push(this.createPlayerGroup());
  }

  protected removePlayer(index: number) {
    this.playersArray.removeAt(index);
    this.notify.info(`Assento ${index + 1} removido da mesa.`);
  }

  protected toggleColor(playerIndex: number, colorCode: string) {
    const control = this.playersArray.at(playerIndex).get('colors');
    const currentColors: string[] = control?.value || [];

    if (currentColors.includes(colorCode)) {
      control?.setValue(currentColors.filter(c => c !== colorCode));
    } else {
      control?.setValue([...currentColors, colorCode]);
    }
  }

  protected isColorSelected(playerIndex: number, colorCode: string): boolean {
    const colors = this.playersArray.at(playerIndex).get('colors')?.value || [];
    return colors.includes(colorCode);
  }

  protected onSubmit() {
    if (this.gameForm.invalid) {
      this.gameForm.markAllAsTouched();
      this.notify.warning('Escolha o jogador e o commander de cada assento antes de começar.', { id: FORM_WARNING });
      return;
    }

    if (this.playersArray.length < MIN_PLAYERS) {
      this.notify.warning(`Uma partida precisa de pelo menos ${MIN_PLAYERS} jogadores.`, { id: FORM_WARNING });
      return;
    }

    const rawValue = this.gameForm.getRawValue();

    const repeated = this.findRepeatedPlayer(rawValue.players);
    if (repeated) {
      this.notify.warning(`${repeated} está em mais de um assento.`, {
        id: FORM_WARNING,
        description: 'Cada jogador só pode ocupar um assento da mesa.'
      });
      return;
    }

    const payload: CreateMatchPayload = {
      isFun: rawValue.isFun === true,
      players: rawValue.players.map((p: any) => ({
        userId: Number(p.userId),
        commander: p.commander,
        colors: p.colors
          .join('/')
      }))
    };

    this.loading.set(true);

    this.matchService.startMatch(payload)
      .pipe(takeUntil(this.destroy))
      .subscribe({
        next: (data) => {
          this.loading.set(false);

          localStorage.setItem('matchId', String(data.matchId));
          localStorage.setItem('match-start', Date.now().toString());
          // A vida inicial é estado de mesa, não de partida: só o front a usa.
          localStorage.setItem(STARTING_LIFE_KEY, String(this.startingLife()));

          this.notify.success('Partida iniciada!', {
            description: this.startDescription(rawValue.players)
          });
          this.router.navigate(['/match']);
        },
        error: (error) => {
          this.loading.set(false);
          this.notify.apiError(error, { fallback: 'Não foi possível iniciar a partida.' });
        }
      }
    )
  }

  /** Aviso de abertura: quem começa, quando o primeiro turno é sorteado. */
  private startDescription(players: { userId: string | number }[]): string {
    const seats = players.length;

    if (this.firstTurnMode() !== 'random' || seats === 0) {
      return `Boa sorte para os ${seats} jogadores da mesa.`;
    }

    const drawn = players[Math.floor(Math.random() * seats)]!;
    const name = this.usersList.find(u => String(u.id) === String(drawn.userId))?.name;
    return name ? `${name} começa jogando.` : `Boa sorte para os ${seats} jogadores da mesa.`;
  }

  /** Devolve o nome do primeiro jogador escolhido em dois assentos, se houver. */
  private findRepeatedPlayer(players: { userId: string | number }[]): string | null {
    const seen = new Set<string>();

    for (const player of players) {
      const id = String(player.userId);

      if (seen.has(id)) {
        return this.usersList.find(user => String(user.id) === id)?.name ?? 'Esse jogador';
      }

      seen.add(id);
    }

    return null;
  }
}
