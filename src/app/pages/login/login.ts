import { Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowRight,
  lucideEye,
  lucideEyeOff,
  lucideLock,
  lucideMail,
} from '@ng-icons/lucide';
import { AuthService } from '../../services/auth-service';
import { Subject, takeUntil } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { NotificationService } from '../../shared/notification/notification.service';
import { SessionService } from '../../shared/session/session.service';
import { FieldName, fieldMessage } from '../../shared/forms/validation-messages';

@Component({
  selector: 'app-login',
  imports: [NgIcon, HlmIcon, HlmSpinnerImports, RouterLink, ReactiveFormsModule],
  providers: [provideIcons({ lucideMail, lucideLock, lucideEye, lucideEyeOff, lucideArrowRight })],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  protected mainForm: FormGroup;
  // Zoneless: mutado dentro do subscribe, precisa ser signal para a view reagir.
  protected loading = signal(false);
  /** Olho de mostrar/ocultar senha. */
  protected showPassword = signal(false);

  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  // Dono das chaves da sessão: grava o token e busca o perfil (inclui o ícone).
  private session = inject(SessionService);
  private readonly destroy = new Subject<void>();

  constructor() {
    this.mainForm = new FormGroup({});
    this.mainForm.addControl('email', new FormControl('', [Validators.required, Validators.email]));
    this.mainForm.addControl('password', new FormControl('', [Validators.required]));
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  protected togglePassword() {
    this.showPassword.update((shown) => !shown);
  }

  protected emailError(): string | null {
    return this.errorOf('email');
  }

  protected passwordError(): string | null {
    return this.errorOf('password');
  }

  protected login() {
    if (this.mainForm.invalid) {
      // Sem toast: o erro de validação é resolvido no campo, e as duas camadas
      // de erro não competem. O toast fica para a resposta da API.
      this.mainForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    this.authService.login(this.bodybuilder())
      .pipe(takeUntil(this.destroy))
      .subscribe({
      next: (data) => {
        this.loading.set(false);
        this.session.signIn(data);

        this.notify.success(`Bem-vindo, ${data.user.name}!`, { description: 'Login efetuado com sucesso.' });
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.loading.set(false);
        this.notify.apiError(error, {
          fallback: 'Não foi possível entrar agora.',
          description: 'Confira os dados e tente de novo.',
          byStatus: {
            400: 'E-mail ou senha inválidos.',
            401: 'E-mail ou senha inválidos.',
            404: 'Não encontramos nenhuma conta com esse e-mail.'
          }
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

    return fieldMessage(field, control.errors, 'login');
  }

  private bodybuilder() {
    return this.mainForm.value;
  }
}
