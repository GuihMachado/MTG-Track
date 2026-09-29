/**
 * Mensagem de validação por campo, no texto que o usuário lê embaixo do poço.
 *
 * Módulo puro porque é a mesma frase em várias telas (entrar, criar conta,
 * recuperar e criar PIN) e porque o handoff pede a mensagem *no campo culpado*,
 * não num toast genérico: quem decide o texto é o erro do controle, não a página.
 *
 * O toast continua existindo, mas só para resposta da API — as duas camadas não
 * competem.
 */
import type { ValidationErrors } from '@angular/forms';

export type FieldName = 'name' | 'email' | 'pin';

/**
 * Entrar e criar pedem o PIN por motivos diferentes: num caso ele já existe, no
 * outro ele está sendo inventado. É o único texto que muda.
 */
export type FormKind = 'login' | 'signup';

const REQUIRED: Record<FieldName, Record<FormKind, string>> = {
  name: {
    login: 'Informe o seu nome.',
    signup: 'Informe o seu nome.',
  },
  email: {
    login: 'Informe o seu e-mail.',
    signup: 'Informe o seu e-mail.',
  },
  pin: {
    login: 'Digite o seu PIN.',
    signup: 'Crie um PIN de 6 números.',
  },
};

export const PIN_MISMATCH_MESSAGE = 'Os PINs não conferem. Digite o PIN de novo.';

/**
 * Primeira mensagem que cabe nos erros de um controle, ou `null` quando o
 * controle está válido. A ordem importa: `required` vem antes de tudo, porque um
 * campo vazio também dispara `email` em alguns navegadores.
 */
export function fieldMessage(
  field: FieldName,
  errors: ValidationErrors | null | undefined,
  kind: FormKind = 'signup'
): string | null {
  if (!errors) {
    return null;
  }

  if (errors['required']) {
    return REQUIRED[field][kind];
  }

  if (errors['email']) {
    return 'Esse e-mail não parece válido.';
  }

  if (errors['minlength']) {
    const min = Number(errors['minlength']?.requiredLength) || 0;
    return `Use ao menos ${min} letras.`;
  }

  if (errors['pinLength']) {
    return 'O PIN tem 6 números.';
  }

  if (errors['pinWeak']) {
    return 'Esse PIN é fácil demais de adivinhar. Evite números repetidos ou em sequência.';
  }

  if (errors['pinMismatch']) {
    return PIN_MISMATCH_MESSAGE;
  }

  // Erro que não sabemos nomear ainda vale um aviso: campo em vermelho sem
  // texto deixa o usuário adivinhando.
  return 'Revise este campo antes de continuar.';
}
