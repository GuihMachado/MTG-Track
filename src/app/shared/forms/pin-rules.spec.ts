import { describe, expect, it } from 'vitest';
import { FormControl } from '@angular/forms';
import { isValidPin, isWeakPin, newPinValidator, pinValidator } from './pin-rules';

describe('isValidPin', () => {
  it('aceita exatamente 6 números, inclusive com zero à esquerda', () => {
    expect(isValidPin('004271')).toBe(true);
    expect(isValidPin('482913')).toBe(true);
  });

  it('recusa tamanho errado, letras e vazio', () => {
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a456')).toBe(false);
    expect(isValidPin('')).toBe(false);
    expect(isValidPin(null)).toBe(false);
  });
});

describe('isWeakPin', () => {
  it('acusa dígito repetido e sequência nos dois sentidos', () => {
    expect(isWeakPin('000000')).toBe(true);
    expect(isWeakPin('777777')).toBe(true);
    expect(isWeakPin('123456')).toBe(true);
    expect(isWeakPin('654321')).toBe(true);
    expect(isWeakPin('345678')).toBe(true);
  });

  it('não confunde PIN comum com fraco', () => {
    expect(isWeakPin('482913')).toBe(false);
    expect(isWeakPin('123457')).toBe(false);
    // Sequência que dá a volta (8, 9, 0) não é passo 1.
    expect(isWeakPin('789012')).toBe(false);
  });
});

describe('validadores de formulário', () => {
  it('vazio fica para o required', () => {
    expect(pinValidator(new FormControl(''))).toBeNull();
    expect(newPinValidator(new FormControl(''))).toBeNull();
  });

  it('PIN incompleto acusa tamanho', () => {
    expect(pinValidator(new FormControl('1234'))).toEqual({ pinLength: true });
    expect(newPinValidator(new FormControl('1234'))).toEqual({ pinLength: true });
  });

  it('só o PIN novo é recusado por ser fraco', () => {
    expect(pinValidator(new FormControl('123456'))).toBeNull();
    expect(newPinValidator(new FormControl('123456'))).toEqual({ pinWeak: true });
    expect(newPinValidator(new FormControl('482913'))).toBeNull();
  });
});
