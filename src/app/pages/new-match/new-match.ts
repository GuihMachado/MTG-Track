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
import { CreateMatchPayload, MatchService } from '../../services/match-service';
import { Subject, takeUntil } from 'rxjs';
import { toast } from 'ngx-sonner';
import { Router } from '@angular/router';

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
    ReactiveFormsModule
],
  templateUrl: './new-match.html',
  styleUrl: './new-match.css',
})
export class NewMatch {
  private readonly destroy = new Subject<void>();
  private router = inject(Router);
  protected gameForm: FormGroup;
  protected usersList: any[] = [];
  private userService = inject(UserService);
  private matchService = inject(MatchService);

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

    this.userService.getUsers().subscribe(users => {
      this.usersList = users;
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
    this.playersArray.push(this.createPlayerGroup());
  }

  protected removePlayer(index: number) {
    this.playersArray.removeAt(index);
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
      return;
    }

    const rawValue = this.gameForm.getRawValue();

    const payload: CreateMatchPayload = {
      players: rawValue.players.map((p: any) => ({
        userId: Number(p.userId),
        commander: p.commander,
        colors: p.colors
          .join('/')
      }))
    };

    this.matchService.startMatch(payload)
      .pipe(takeUntil(this.destroy))
      .subscribe({
        next: (data) => {
          toast('Partida iniciada com sucesso', {
              action: {
                  label: 'Ok',
                  onClick: () => { },
              }
          });
          localStorage.setItem('matchId', data.matchId.id);
          localStorage.setItem('players', this.playersArray.value.length.toString());
          this.router.navigate(['/match']);
        },
        error: (error) => {
          toast(error.error.message);
        }
      }
    )
  }
}
