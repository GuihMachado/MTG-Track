import { Component, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { UserService } from '../../services/user-service';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { ManaSymbolPipe } from "../../shared/pipes/mana-symbol-pipe";
import { MatchService } from '../../services/match-service';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { BackButton } from '../../shared/back-button/back-button';
import { NotificationService } from '../../shared/notification/notification.service';
import { CreateMatchPayload } from '../../models/match.models';

/** Id fixo: um novo aviso substitui o anterior em vez de empilhar. */
const FORM_WARNING = 'form-validation';

/** A mesa desenha de 2 a 6 assentos — o mesmo intervalo que a API aceita. */
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 6;

@Component({
  selector: 'app-game',
  imports: [
    HlmSeparatorImports,
    HlmButtonImports,
    HlmCardImports,
    HlmInputImports,
    HlmLabelImports,
    BrnSelectImports,
    HlmSelectImports,
    ManaSymbolPipe,
    ReactiveFormsModule,
    BackButton
],
  templateUrl: './new-match.html',
  styleUrl: './new-match.css',
})
export class NewMatch {
  private readonly destroy = new Subject<void>();
  private router = inject(Router);
  protected gameForm: FormGroup;
  protected usersList: { id: number; name: string }[] = [];
  protected loading = false;
  private userService = inject(UserService);
  private matchService = inject(MatchService);
  private notify = inject(NotificationService);

  /* Identidade de mana do deck — a cor visual vem do mana-font + tokens --color-mana-* */
  protected manaColors = [
    { code: 'W', label: 'White' },
    { code: 'U', label: 'Blue' },
    { code: 'B', label: 'Black' },
    { code: 'R', label: 'Red' },
    { code: 'G', label: 'Green' },
  ];

  constructor(private fb: FormBuilder) {
    this.gameForm = this.fb.group({
      players: this.fb.array([])
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
      commander: [''],
      colors: [[]]
    });
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
    this.notify.info(`Jogador ${index + 1} removido da mesa.`);
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
      this.notify.warning('Escolha o jogador de cada assento antes de começar.', { id: FORM_WARNING });
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
      players: rawValue.players.map((p: any) => ({
        userId: Number(p.userId),
        commander: p.commander,
        colors: p.colors
          .join('/')
      }))
    };

    this.loading = true;

    this.matchService.startMatch(payload)
      .pipe(takeUntil(this.destroy))
      .subscribe({
        next: (data) => {
          this.loading = false;

          localStorage.setItem('matchId', String(data.matchId));
          localStorage.setItem('match-start', Date.now().toString());

          this.notify.success('Partida iniciada!', {
            description: `Boa sorte para os ${this.playersArray.length} jogadores da mesa.`
          });
          this.router.navigate(['/match']);
        },
        error: (error) => {
          this.loading = false;
          this.notify.apiError(error, { fallback: 'Não foi possível iniciar a partida.' });
        }
      }
    )
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
