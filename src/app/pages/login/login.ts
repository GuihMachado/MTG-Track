import { Component, inject, PLATFORM_ID, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideMail } from '@ng-icons/lucide';
import { AuthService, needsPinSetup } from '../../services/auth-service';
import { Subject, takeUntil } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { NotificationService } from '../../shared/notification/notification.service';
import { SessionService } from '../../shared/session/session.service';
import { FieldName, fieldMessage } from '../../shared/forms/validation-messages';
import { pinValidator } from '../../shared/forms/pin-rules';
import { PinField } from '../../shared/pin-field/pin-field';

/**
 * O que as telas de cadastro e de "Esqueci meu PIN" deixam para o login: o
 * email já preenchido e qual aviso mostrar. Vai no state da navegação, nunca
 * na URL — email não é coisa de query string.
 */
export interface LoginArrival {
  email?: string;
  notice?: 'sent' | 'recover';
}

@Component({
  selector: 'app-login',
  imports: [NgIcon, HlmIcon, HlmSpinnerImports, RouterLink, ReactiveFormsModule, PinField],
  providers: [provideIcons({ lucideMail, lucideArrowRight })],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  protected readonly mainForm = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    pin: new FormControl('', { nonNullable: true, validators: [Validators.required, pinValidator] }),
  });
  // Zoneless: mutado dentro do subscribe, precisa ser signal para a view reagir.
  protected loading = signal(false);
  /** Aviso de quem chega do cadastro ou do "Esqueci meu PIN". */
  protected arrival = signal<LoginArrival | null>(null);

  private pinField = viewChild(PinField);

  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  // Dono das chaves da sessão: grava o token e busca o perfil (inclui o ícone).
  private session = inject(SessionService);
  private readonly destroy = new Subject<void>();

  constructor() {
    // Durante a navegação o state está na navegação corrente; num recarregar
    // da página ele continua no history.state.
    const fromNav = this.router.currentNavigation()?.extras.state as LoginArrival | undefined;
    const fromHistory = isPlatformBrowser(inject(PLATFORM_ID)) ? (history.state as LoginArrival | null) : null;
    const arrival = fromNav ?? fromHistory;

    if (arrival?.email) {
      this.mainForm.controls.email.setValue(arrival.email);
    }
    if (arrival?.notice && arrival.email) {
      this.arrival.set(arrival);
    }
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  protected emailError(): string | null {
    return this.errorOf('email');
  }

  protected pinError(): string | null {
    return this.errorOf('pin');
  }

  /** A 6ª casa já entra: na mesa ninguém quer procurar o botão. */
  protected onPinCompleted(): void {
    if (this.mainForm.controls.email.invalid) {
      this.mainForm.controls.email.markAsTouched();
      return;
    }
    this.login();
  }

  protected forgotPin(): void {
    const email = this.mainForm.controls.email.value.trim();
    this.router.navigate(['/recuperar-pin'], { state: { email } });
  }

  protected login() {
    if (this.loading()) return;

    if (this.mainForm.invalid) {
      // Sem toast: o erro de validação é resolvido no campo, e as duas camadas
      // de erro não competem. O toast fica para a resposta da API.
      this.mainForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email, pin } = this.mainForm.getRawValue();

    this.authService.login({ email: email.trim(), pin })
      .pipe(takeUntil(this.destroy))
      .subscribe({
      next: (data) => {
        this.loading.set(false);

        // PIN do email: ainda não é sessão, falta criar o PIN próprio.
        if (needsPinSetup(data)) {
          this.session.startPinSetup(data);
          this.router.navigate(['/criar-pin']);
          return;
        }

        this.session.signIn(data);
        this.notify.success(`Bem-vindo, ${data.user.name}!`, { description: 'Login efetuado com sucesso.' });
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.loading.set(false);
        // PIN recusado: casas limpas e foco de volta, pronto para digitar de novo.
        this.pinField()?.reset();
        this.mainForm.controls.pin.markAsUntouched();
        // 429 (conta travada ou limite do servidor) já vem com o texto certo da API.
        this.notify.apiError(error, {
          fallback: 'Não foi possível entrar agora.',
          byStatus: { 401: 'E-mail ou PIN inválidos.' },
          description: error?.status === 401 ? 'Recebeu o PIN por email? Ele vale 24 horas e só uma vez.' : undefined,
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
}
