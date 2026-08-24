import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LENGTH, passwordStrength } from './password-strength';

describe('passwordStrength', () => {
  it('campo vazio não acende nada e ainda assim explica o mínimo', () => {
    expect(passwordStrength('')).toEqual({
      level: 'empty',
      filled: 0,
      text: 'mínimo 6 caracteres',
      valid: false,
    });
    expect(passwordStrength(null)).toEqual(passwordStrength(''));
    expect(passwordStrength(undefined)).toEqual(passwordStrength(''));
  });

  it('abaixo do mínimo reprova, com um segmento aceso', () => {
    const strength = passwordStrength('abc');
    expect(strength.level).toBe('short');
    expect(strength.filled).toBe(1);
    expect(strength.valid).toBe(false);
  });

  it('o limite do validador é o limite do medidor', () => {
    expect(passwordStrength('a'.repeat(MIN_PASSWORD_LENGTH - 1)).valid).toBe(false);
    expect(passwordStrength('a'.repeat(MIN_PASSWORD_LENGTH)).valid).toBe(true);
  });

  it('no mínimo acende 2 de 3 e conta os caracteres', () => {
    expect(passwordStrength('senha1')).toEqual({
      level: 'ok',
      filled: 2,
      text: '6 caracteres · ok',
      valid: true,
    });
  });

  it('comprimento sem variedade não vira "boa"', () => {
    expect(passwordStrength('senhasenhasenha').level).toBe('ok');
  });

  it('variedade sem comprimento também não vira "boa"', () => {
    expect(passwordStrength('Se1!ha').level).toBe('ok');
  });

  it('comprimento e duas famílias de caractere viram "boa"', () => {
    expect(passwordStrength('SenhaBoa123')).toEqual({
      level: 'good',
      filled: 3,
      text: 'senha boa',
      valid: true,
    });
  });

  it('caixa alta sozinha não conta como caixa mista', () => {
    expect(passwordStrength('SENHASENHAS').level).toBe('ok');
  });

  it('símbolo conta como família, acento não', () => {
    expect(passwordStrength('senha-longa').level).toBe('ok');
    expect(passwordStrength('senha-longa1').level).toBe('good');
    expect(passwordStrength('senhalongaá').level).toBe('ok');
  });
});
