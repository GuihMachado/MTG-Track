/**
 * Medidor de senha do cadastro.
 *
 * Ele **espelha** o `Validators.minLength(MIN_PASSWORD_LENGTH)` que já existe no
 * formulário — não é validação nova. O terceiro segmento é elogio, não
 * requisito: uma senha de 6 caracteres passa, acende 2 de 3 e o botão funciona.
 *
 * Módulo puro porque a regra é de apresentação e tem casos de borda demais para
 * viver num template.
 */

/** O mesmo número que o validador do formulário usa — os dois não podem divergir. */
export const MIN_PASSWORD_LENGTH = 6;

/** A partir daqui a senha pode ser elogiada, se também tiver variedade. */
const GOOD_LENGTH = 10;

/** Quantas famílias de caractere uma senha "boa" precisa misturar. */
const GOOD_CLASSES = 2;

export type PasswordLevel = 'empty' | 'short' | 'ok' | 'good';

export interface PasswordStrength {
  level: PasswordLevel;
  /** Segmentos acesos, de 0 a 3. */
  filled: number;
  /** Texto ao lado da régua, na cor do nível. */
  text: string;
  /** `false` no nível que reprova o validador — é o que pinta a régua de vermelho. */
  valid: boolean;
}

export function passwordStrength(value: string | null | undefined): PasswordStrength {
  const password = value ?? '';

  if (password.length === 0) {
    return { level: 'empty', filled: 0, text: `mínimo ${MIN_PASSWORD_LENGTH} caracteres`, valid: false };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { level: 'short', filled: 1, text: `mínimo ${MIN_PASSWORD_LENGTH} caracteres`, valid: false };
  }

  if (password.length >= GOOD_LENGTH && classesIn(password) >= GOOD_CLASSES) {
    return { level: 'good', filled: 3, text: 'senha boa', valid: true };
  }

  return { level: 'ok', filled: 2, text: `${password.length} caracteres · ok`, valid: true };
}

/**
 * Famílias de caractere presentes: caixa mista conta como uma, dígito como
 * outra, símbolo como a terceira. "Caixa mista" e não "tem maiúscula" porque
 * `SENHASENHA` não é mais variada que `senhasenha`.
 */
function classesIn(password: string): number {
  const mixedCase = /[a-zà-ÿ]/.test(password) && /[A-ZÀ-Ý]/.test(password);
  const digit = /\d/.test(password);
  const symbol = /[^\p{L}\d]/u.test(password);

  return [mixedCase, digit, symbol].filter(Boolean).length;
}
