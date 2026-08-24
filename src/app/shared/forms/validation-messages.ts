/**
 * Mensagem de validação por campo, no texto que o usuário lê embaixo do poço.
 *
 * Módulo puro porque é a mesma frase em duas telas (login e cadastro) e porque
 * o handoff pede a mensagem *no campo culpado*, não num toast genérico: quem
 * decide o texto é o erro do controle, não a página.
 *
 * O toast continua existindo, mas só para resposta da API — as duas camadas não
 * competem.
 */
import type { ValidationErrors } from '@angular/forms';

export type FieldName = 'name' | 'email' | 'password';

/**
 * Entrar e criar conta pedem a mesma senha por motivos diferentes: num caso ela
 * já existe, no outro ela está sendo inventada. É o único texto que muda.
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
  password: {
    login: 'Informe a sua senha.',
    signup: 'Crie uma senha para continuar.',
  },
};

/**
 * Primeira mensagem que cabe nos erros de um controle, ou `null` quando o
 * controle está válido. A ordem importa: `required` vem antes de tudo, porque um
 * campo vazio também dispara `email` e `minlength` em alguns navegadores.
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
    return `A senha precisa ter ao menos ${min} caracteres.`;
  }

  // Erro que não sabemos nomear ainda vale um aviso: campo em vermelho sem
  // texto deixa o usuário adivinhando.
  return 'Revise este campo antes de continuar.';
}
