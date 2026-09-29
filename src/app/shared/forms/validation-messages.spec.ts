import { describe, expect, it } from 'vitest';
import { fieldMessage, PIN_MISMATCH_MESSAGE } from './validation-messages';

describe('fieldMessage', () => {
  it('controle válido não tem mensagem', () => {
    expect(fieldMessage('email', null)).toBeNull();
    expect(fieldMessage('email', undefined)).toBeNull();
  });

  it('required vence os outros erros do mesmo controle', () => {
    expect(fieldMessage('email', { required: true, email: true })).toBe('Informe o seu e-mail.');
  });

  it('o PIN muda de texto entre entrar e criar', () => {
    expect(fieldMessage('pin', { required: true }, 'login')).toBe('Digite o seu PIN.');
    expect(fieldMessage('pin', { required: true }, 'signup')).toBe('Crie um PIN de 6 números.');
  });

  it('e-mail malformado tem texto próprio', () => {
    expect(fieldMessage('email', { email: true })).toBe('Esse e-mail não parece válido.');
  });

  it('minlength lê o tamanho exigido do próprio erro', () => {
    expect(fieldMessage('name', { minlength: { requiredLength: 3, actualLength: 2 } })).toBe(
      'Use ao menos 3 letras.'
    );
  });

  it('erros de PIN têm texto próprio', () => {
    expect(fieldMessage('pin', { pinLength: true })).toBe('O PIN tem 6 números.');
    expect(fieldMessage('pin', { pinWeak: true })).toContain('fácil demais');
    expect(fieldMessage('pin', { pinMismatch: true })).toBe(PIN_MISMATCH_MESSAGE);
  });

  it('erro desconhecido não deixa o campo vermelho sem explicação', () => {
    expect(fieldMessage('name', { emAlgumLugar: true })).toBe(
      'Revise este campo antes de continuar.'
    );
  });
});
