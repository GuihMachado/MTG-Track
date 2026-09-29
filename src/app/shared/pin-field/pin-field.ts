import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BrnInputOtp } from '@spartan-ng/brain/input-otp';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucideEyeOff } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { PIN_LENGTH } from '../forms/pin-rules';

/**
 * As seis casas do PIN. O input de verdade é o do `BrnInputOtp` (um só, por
 * cima das casas, com teclado numérico e `one-time-code`); as casas são
 * desenhadas aqui porque o slot do spartan mostra o número digitado, e o PIN
 * próprio é senha: vai em pontos, com "Mostrar" para conferir.
 */
@Component({
  selector: 'app-pin-field',
  imports: [BrnInputOtp, ReactiveFormsModule, NgIcon, HlmIcon],
  providers: [provideIcons({ lucideEye, lucideEyeOff })],
  templateUrl: './pin-field.html',
  styleUrl: './pin-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.invalid]': 'invalid()',
  },
})
export class PinField {
  control = input.required<FormControl<string>>();
  /** id do input real, para o <label for> da tela apontar para ele. */
  inputId = input.required<string>();
  /** id da mensagem de erro/ajuda embaixo do campo. */
  describedBy = input<string | null>(null);
  invalid = input(false);
  /** Mostra o botão "Mostrar": o PIN do email é código, o próprio é senha. */
  revealable = input(true);
  autofocus = input(false);

  /** As 6 casas preenchidas, digitadas ou coladas. */
  completed = output<string>();

  protected readonly length = PIN_LENGTH;
  protected shown = signal(false);

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** O input real, achado depois da primeira renderização. */
  private inputEl = signal<HTMLInputElement | null>(null);

  /** Colar "482 913" ou "482-913" vale: sobra só o que é número. */
  protected digitsOnly = (text: string) => text.replace(/\D/g, '');

  constructor() {
    // O input nasce dentro do BrnInputOtp, sem id nem aria próprios: eles
    // entram aqui para o label e o leitor de tela acharem o campo.
    effect(() => {
      const el = this.inputEl();
      if (!el) return;
      el.id = this.inputId();
      el.setAttribute('aria-invalid', String(this.invalid()));
      const describedBy = this.describedBy();
      if (describedBy) el.setAttribute('aria-describedby', describedBy);
      else el.removeAttribute('aria-describedby');
    });

    // Teclado de computador aceita letra: ela sai antes de virar casa.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.inputEl.set(this.host.nativeElement.querySelector('input'));
      const sub = this.control().valueChanges.subscribe(value => {
        const digits = (value ?? '').replace(/\D/g, '').slice(0, PIN_LENGTH);
        if (digits !== value) this.control().setValue(digits, { emitEvent: false });
      });
      destroyRef.onDestroy(() => sub.unsubscribe());
      if (this.autofocus()) this.focus();
    });
  }

  focus(): void {
    this.inputEl()?.focus();
  }

  /** Limpa as casas e devolve o foco — depois de um PIN recusado. */
  reset(): void {
    this.control().setValue('');
    this.focus();
  }

  protected toggleShown(): void {
    this.shown.update(shown => !shown);
  }
}
