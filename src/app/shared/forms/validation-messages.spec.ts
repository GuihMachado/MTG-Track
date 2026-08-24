import { describe, expect, it } from 'vitest';
import { fieldMessage } from './validation-messages';

describe('fieldMessage', () => {
  it('controle válido não tem mensagem', () => {
    expect(fieldMessage('email', null)).toBeNull();
    expect(fieldMessage('email', undefined)).toBeNull();
  });

  it('required vence os outros erros do mesmo controle', () => {
    expect(fieldMessage('email', { required: true, email: true })).toBe('Informe o seu e-mail.');
  });

  it('a senha muda de texto entre entrar e criar conta', () => {
    expect(fieldMessage('password', { required: true }, 'login')).toBe('Informe a sua senha.');
    expect(fieldMessage('password', { required: true }, 'signup')).toBe(
      'Crie uma senha para continuar.'
    );
  });

  it('e-mail malformado tem texto próprio', () => {
    expect(fieldMessage('email', { email: true })).toBe('Esse e-mail não parece válido.');
  });

  it('minlength lê o tamanho exigido do próprio erro', () => {
    expect(fieldMessage('password', { minlength: { requiredLength: 6, actualLength: 3 } })).toBe(
      'A senha precisa ter ao menos 6 caracteres.'
    );
  });

  it('erro desconhecido não deixa o campo vermelho sem explicação', () => {
    expect(fieldMessage('name', { emAlgumLugar: true })).toBe(
      'Revise este campo antes de continuar.'
    );
  });
});
