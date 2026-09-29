/**
 * Regras do PIN — as mesmas do backend (`MTG/src/services/pin.ts`). A API
 * decide de verdade; aqui elas só evitam uma ida ao servidor para dizer o óbvio.
 */
import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const PIN_LENGTH = 6;

export function isValidPin(pin: string | null | undefined): pin is string {
  return typeof pin === 'string' && /^\d{6}$/.test(pin);
}

/**
 * PIN que qualquer um chuta primeiro: todos os dígitos iguais ("000000") ou uma
 * sequência de passo 1 ("123456", "654321").
 */
export function isWeakPin(pin: string): boolean {
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((digit, i) => digit - digits[i]!);
  return steps.every(step => step === 0) || steps.every(step => step === 1) || steps.every(step => step === -1);
}

/** Casas preenchidas mas não 6 números: `pinLength`. Vazio fica com o `required`. */
export const pinValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value as string | null;
  if (!value) return null;
  return isValidPin(value) ? null : { pinLength: true };
};

/** Para o PIN que a pessoa está criando: além de válido, não pode ser fraco. */
export const newPinValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value as string | null;
  if (!value) return null;
  if (!isValidPin(value)) return { pinLength: true };
  return isWeakPin(value) ? { pinWeak: true } : null;
};
