import { Component, inject, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AuthService } from '../../services/auth-service';
import { NotificationService } from '../../shared/notification/notification.service';
import { SessionService } from '../../shared/session/session.service';
import { isValidPin, isWeakPin } from '../../shared/forms/pin-rules';
import { fieldMessage, PIN_MISMATCH_MESSAGE } from '../../shared/forms/validation-messages';
import { PinField } from '../../shared/pin-field/pin-field';

/**
 * Criar o PIN próprio, logo depois de entrar com o PIN do email. Dois passos
 * numa fileira só (digitar e confirmar): doze casas numa tela de celular ficam
 * apertadas. Só sai daqui com o PIN criado — a sessão abre no fim, sem pedir
 * login de novo.
 */
@Component({
  selector: 'app-set-pin',
  imports: [ReactiveFormsModule, HlmSpinnerImports, PinField],
  templateUrl: './set-pin.html',
  styleUrl: './set-pin.css',
})
export class SetPin {
  protected readonly pin = new FormControl('', { nonNullable: true });
  protected readonly confirm = new FormControl('', { nonNullable: true });

  protected step = signal<1 | 2>(1);
  protected error = signal<string | null>(null);
  protected saving = signal(false);

  private field = viewChild(PinField);

  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private session = inject(SessionService);

  /** O guard da rota garante o passe; o nome só cumprimenta. */
  protected readonly name = this.session.pinSetup()?.name ?? '';

  protected next(): void {
    if (this.step() === 1) this.choose();
    else this.save();
  }

  protected back(): void {
    this.pin.setValue('');
    this.confirm.setValue('');
    this.error.set(null);
    this.step.set(1);
  }

  /** Passo 1: o PIN novo. Fraco não passa para a confirmação. */
  protected choose(): void {
    const value = this.pin.value;
    if (!isValidPin(value)) {
      this.error.set(fieldMessage('pin', { pinLength: true }));
      return;
    }
    if (isWeakPin(value)) {
      this.error.set(fieldMessage('pin', { pinWeak: true }));
      this.field()?.reset();
      return;
    }
    this.error.set(null);
    this.step.set(2);
  }

  /** Passo 2: a confirmação. Bateu, grava e abre a sessão. */
  protected save(): void {
    if (this.saving()) return;

    if (this.confirm.value !== this.pin.value) {
      this.error.set(PIN_MISMATCH_MESSAGE);
      this.field()?.reset();
      return;
    }

    const setup = this.session.pinSetup();
    if (!setup) {
      this.router.navigate(['/']);
      return;
    }

    this.error.set(null);
    this.saving.set(true);

    this.authService.setPin(this.pin.value, setup.token).subscribe({
      next: data => {
        this.saving.set(false);
        this.session.signIn(data);
        this.notify.success(`PIN criado. Bem-vindo, ${data.user.name}!`, {
          description: 'Da próxima vez, entre com ele.',
        });
        this.router.navigate(['/dashboard']);
      },
      error: error => {
        this.saving.set(false);

        // O passe de 15 min venceu: o PIN do email ainda vale, é só entrar de novo.
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.session.clearPinSetup();
          this.notify.warning('O tempo para criar o PIN acabou.', {
            description: 'Entre de novo com o PIN do email.',
          });
          this.router.navigate(['/']);
          return;
        }

        // A API recusou o PIN (regra que o front não conhece): volta ao passo 1.
        if (error instanceof HttpErrorResponse && error.status === 400) {
          this.back();
          this.error.set(this.notify.messageFrom(error, 'Escolha outro PIN.'));
          return;
        }

        this.notify.apiError(error, { fallback: 'Não foi possível criar o PIN agora.' });
      },
    });
  }
}
