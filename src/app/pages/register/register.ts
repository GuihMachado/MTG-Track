import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService, RegisterPayload } from '../../services/auth-service';
import { Subject, takeUntil } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff, lucideLock, lucideMail, lucideUser } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { BackButton } from '../../shared/back-button/back-button';
import { NotificationService } from '../../shared/notification/notification.service';
import { FieldName, fieldMessage } from '../../shared/forms/validation-messages';
import { MIN_PASSWORD_LENGTH, passwordStrength } from './password-strength';

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
  providers: [provideIcons({ lucideUser, lucideMail, lucideLock, lucideEye, lucideEyeOff })],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  // Tipado e nonNullable porque a régua de senha lê o valor do controle como
  // signal: sem isso o `string | null` vaza para dentro do medidor.
  protected readonly mainForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)],
    }),
  });

  // Zoneless: mutado dentro do subscribe, precisa ser signal para a view reagir.
  protected loading = signal(false);
  /** Olho de mostrar/ocultar senha. */
  protected showPassword = signal(false);

  /** Os três segmentos da régua, para o @for do template. */
  protected readonly METER_SEGMENTS = [1, 2, 3] as const;

  private readonly passwordValue = toSignal(this.mainForm.controls.password.valueChanges, {
    initialValue: '',
  });

  /** Espelha o minLength(6) do formulário — não valida nada por conta própria. */
  protected readonly strength = computed(() => passwordStrength(this.passwordValue()));

  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private readonly destroy = new Subject<void>();

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  protected togglePassword() {
    this.showPassword.update((shown) => !shown);
  }

  protected nameError(): string | null {
    return this.errorOf('name');
  }

  protected emailError(): string | null {
    return this.errorOf('email');
  }

  protected passwordError(): string | null {
    return this.errorOf('password');
  }

  protected signUp() {
    if (this.mainForm.invalid) {
      // Sem toast: o erro de validação é resolvido no campo, e as duas camadas
      // de erro não competem. O toast fica para a resposta da API.
      this.mainForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    this.authService.register(this.bodybuilder())
      .pipe(takeUntil(this.destroy))
      .subscribe({
      next: () => {
        this.loading.set(false);
        this.notify.success('Cadastro realizado!', { description: 'Faça login para começar a registrar suas partidas.' });
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.loading.set(false);
        this.notify.apiError(error, {
          fallback: 'Não foi possível concluir o cadastro.',
          byStatus: { 409: 'Esse e-mail já está cadastrado. Tente fazer login.' }
        });
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
    const { name, email, password } = this.mainForm.getRawValue();

    return { name: name.trim(), email: email.trim(), password };
  }
}
