import { Component, computed, HostListener, inject, output, signal, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AuthService } from '../../../services/auth-service';
import { NotificationService } from '../../../shared/notification/notification.service';
import { isValidPin, isWeakPin } from '../../../shared/forms/pin-rules';
import { fieldMessage, PIN_MISMATCH_MESSAGE } from '../../../shared/forms/validation-messages';
import { PinField } from '../../../shared/pin-field/pin-field';

type Step = 'current' | 'new' | 'confirm';

const STEPS: Record<Step, { index: number; title: string; hint: string; label: string }> = {
  current: { index: 1, title: 'Trocar PIN', hint: 'Primeiro o PIN que você usa hoje.', label: 'PIN atual' },
  new: { index: 2, title: 'Novo PIN', hint: 'Seis números que você lembre e os outros não chutem.', label: 'Novo PIN' },
  confirm: { index: 3, title: 'Confirme o novo PIN', hint: 'Digite de novo, para ter certeza.', label: 'Confirmar PIN' },
};

/**
 * Troca de PIN com a sessão aberta, numa folha: atual, novo e confirmação.
 * O PIN atual só é conferido pela API no fim — errado, a folha volta ao
 * primeiro passo com o aviso (400, que não derruba a sessão).
 */
@Component({
  selector: 'app-change-pin-sheet',
  imports: [ReactiveFormsModule, NgIcon, HlmIcon, HlmSpinnerImports, PinField],
  providers: [provideIcons({ lucideX })],
  templateUrl: './change-pin-sheet.html',
  styleUrls: ['../../new-match/seat-sheet.css', './change-pin-sheet.css'],
})
export class ChangePinSheet {
  closed = output<void>();
  /** "Esqueci o PIN atual": a página leva ao fluxo de recuperação. */
  forgot = output<void>();

  protected readonly current = new FormControl('', { nonNullable: true });
  protected readonly fresh = new FormControl('', { nonNullable: true });
  protected readonly confirm = new FormControl('', { nonNullable: true });

  protected step = signal<Step>('current');
  protected info = computed(() => STEPS[this.step()]);
  protected error = signal<string | null>(null);
  protected saving = signal(false);

  private field = viewChild(PinField);
  private authService = inject(AuthService);
  private notify = inject(NotificationService);

  protected controlFor(step: Step): FormControl<string> {
    return step === 'current' ? this.current : step === 'new' ? this.fresh : this.confirm;
  }

  protected advance(): void {
    const step = this.step();
    const value = this.controlFor(step).value;

    if (!isValidPin(value)) {
      this.error.set(fieldMessage('pin', { pinLength: true }));
      return;
    }

    if (step === 'current') {
      this.go('new');
      return;
    }

    if (step === 'new') {
      if (isWeakPin(value)) {
        this.error.set(fieldMessage('pin', { pinWeak: true }));
        this.field()?.reset();
        return;
      }
      if (value === this.current.value) {
        this.error.set('O novo PIN precisa ser diferente do atual.');
        this.field()?.reset();
        return;
      }
      this.go('confirm');
      return;
    }

    if (value !== this.fresh.value) {
      this.error.set(PIN_MISMATCH_MESSAGE);
      this.field()?.reset();
      return;
    }

    this.save();
  }

  private go(step: Step): void {
    this.error.set(null);
    this.step.set(step);
  }

  private save(): void {
    if (this.saving()) return;
    this.saving.set(true);

    this.authService.changePin(this.current.value, this.fresh.value).subscribe({
      next: () => {
        this.saving.set(false);
        this.notify.success('PIN alterado.', { description: 'Da próxima vez, entre com o novo.' });
        this.closed.emit();
      },
      error: error => {
        this.saving.set(false);

        if (error instanceof HttpErrorResponse && error.status === 400) {
          const message = this.notify.messageFrom(error, 'Não foi possível trocar o PIN.');
          // PIN atual errado volta ao começo; regra do PIN novo volta ao passo dele.
          const wrongCurrent = /atual/i.test(message);
          this.current.setValue(wrongCurrent ? '' : this.current.value);
          this.fresh.setValue('');
          this.confirm.setValue('');
          this.step.set(wrongCurrent ? 'current' : 'new');
          this.error.set(message);
          return;
        }

        // 429: conta travada. O aviso vem da API; a folha fecha.
        this.notify.apiError(error, { fallback: 'Não foi possível trocar o PIN agora.' });
        if (error instanceof HttpErrorResponse && error.status === 429) this.closed.emit();
      },
    });
  }

  @HostListener('document:keydown.escape')
  protected close(): void {
    this.closed.emit();
  }
}
