import { Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideMail } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AuthService } from '../../services/auth-service';
import { BackButton } from '../../shared/back-button/back-button';
import { NotificationService } from '../../shared/notification/notification.service';
import { fieldMessage } from '../../shared/forms/validation-messages';
import type { LoginArrival } from '../login/login';

/** O mesmo intervalo do backend entre dois envios para a mesma conta. */
const RESEND_SECONDS = 120;

/**
 * "Esqueci meu PIN". Também é a porta de quem tinha senha: desde o login por
 * PIN ninguém tem senha, e o primeiro acesso de todo mundo passa por aqui.
 * A resposta é a mesma exista a conta ou não.
 */
@Component({
  selector: 'app-recover-pin',
  imports: [ReactiveFormsModule, NgIcon, HlmIcon, HlmSpinnerImports, BackButton],
  providers: [provideIcons({ lucideMail, lucideCheck })],
  templateUrl: './recover-pin.html',
})
export class RecoverPin {
  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  protected loading = signal(false);
  /** Email para o qual o último pedido saiu; null antes do primeiro envio. */
  protected sentTo = signal<string | null>(null);
  protected secondsLeft = signal(0);
  protected countdown = computed(() => {
    const s = this.secondsLeft();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const fromNav = this.router.currentNavigation()?.extras.state as { email?: string } | undefined;
    const fromHistory = isPlatformBrowser(inject(PLATFORM_ID)) ? (history.state as { email?: string } | null) : null;
    const email = fromNav?.email ?? fromHistory?.email;
    if (email) this.email.setValue(email);

    inject(DestroyRef).onDestroy(() => this.stopTimer());
  }

  protected emailError(): string | null {
    return this.email.touched ? fieldMessage('email', this.email.errors) : null;
  }

  protected send(): void {
    if (this.loading() || this.secondsLeft() > 0) return;

    if (this.email.invalid) {
      this.email.markAsTouched();
      return;
    }

    const email = this.email.value.trim();
    this.loading.set(true);

    this.authService.forgotPin(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.sentTo.set(email);
        this.startTimer();
      },
      error: error => {
        this.loading.set(false);
        this.notify.apiError(error, { fallback: 'Não foi possível enviar o PIN agora.' });
      },
    });
  }

  protected goToLogin(): void {
    const arrival: LoginArrival = { email: this.sentTo() ?? this.email.value.trim(), notice: 'recover' };
    this.router.navigate(['/'], { state: arrival });
  }

  private startTimer(): void {
    this.stopTimer();
    this.secondsLeft.set(RESEND_SECONDS);
    this.timer = setInterval(() => {
      this.secondsLeft.update(s => s - 1);
      if (this.secondsLeft() <= 0) this.stopTimer();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
