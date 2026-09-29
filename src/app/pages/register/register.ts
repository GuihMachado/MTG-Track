import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, RegisterPayload } from '../../services/auth-service';
import { Subject, takeUntil } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMail, lucideUser } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { BackButton } from '../../shared/back-button/back-button';
import { NotificationService } from '../../shared/notification/notification.service';
import { FieldName, fieldMessage } from '../../shared/forms/validation-messages';
import type { LoginArrival } from '../login/login';

/** O backend exige 3 letras no nome (`User.alterarNome`); aqui só adianta o aviso. */
const MIN_NAME_LENGTH = 3;

@Component({
  selector: 'app-register',
  imports: [
    NgIcon,
    HlmIcon,
    HlmSpinnerImports,
    RouterLink,
    ReactiveFormsModule,
    BackButton
  ],
  providers: [provideIcons({ lucideUser, lucideMail })],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  // Sem senha: o PIN do primeiro acesso chega por email.
  protected readonly mainForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(MIN_NAME_LENGTH)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  // Zoneless: mutado dentro do subscribe, precisa ser signal para a view reagir.
  protected loading = signal(false);
  /** Email que a API disse já ter conta — o erro fica no campo, com o atalho. */
  protected takenEmail = signal<string | null>(null);

  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private readonly destroy = new Subject<void>();

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  protected nameError(): string | null {
    return this.errorOf('name');
  }

  protected emailError(): string | null {
    return this.errorOf('email');
  }

  /** O aviso de "já tem conta" só vale enquanto o email for o mesmo. */
  protected emailTaken(): boolean {
    const taken = this.takenEmail();
    return !!taken && taken === this.mainForm.controls.email.value.trim().toLowerCase();
  }

  protected forgotPin(): void {
    this.router.navigate(['/recuperar-pin'], { state: { email: this.mainForm.controls.email.value.trim() } });
  }

  protected signUp() {
    if (this.loading()) return;

    if (this.mainForm.invalid) {
      // Sem toast: o erro de validação é resolvido no campo, e as duas camadas
      // de erro não competem. O toast fica para a resposta da API.
      this.mainForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const payload = this.bodybuilder();

    this.authService.register(payload)
      .pipe(takeUntil(this.destroy))
      .subscribe({
      next: () => {
        this.loading.set(false);
        // O login mostra "enviamos um PIN para…" com o email já preenchido.
        const arrival: LoginArrival = { email: payload.email, notice: 'sent' };
        this.router.navigate(['/'], { state: arrival });
      },
      error: (error) => {
        this.loading.set(false);

        if (error instanceof HttpErrorResponse && error.status === 409) {
          this.takenEmail.set(payload.email.toLowerCase());
          return;
        }

        this.notify.apiError(error, { fallback: 'Não foi possível concluir o cadastro.' });
      }
    });
  }

  /**
   * Mensagem só depois que o usuário passou pelo campo (ou tentou enviar): erro
   * em campo que ninguém tocou ainda é acusação, não ajuda.
   */
  private errorOf(field: FieldName): string | null {
    const control = this.mainForm.get(field);

    if (!control || !control.touched) {
      return null;
    }

    return fieldMessage(field, control.errors, 'signup');
  }

  private bodybuilder(): RegisterPayload {
    const { name, email } = this.mainForm.getRawValue();

    return { name: name.trim(), email: email.trim() };
  }
}
