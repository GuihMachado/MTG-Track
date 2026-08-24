import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { LoginResponse } from '../../services/auth-service';
import { NotificationService } from '../notification/notification.service';
import { ProfileService } from '../profile/profile.service';

/**
 * O que identifica o usuário neste aparelho. Escrito no login, apagado no
 * logout e na sessão expirada.
 */
const SESSION_KEYS = ['auth-token', 'user-name', 'user-id', 'user-avatar'] as const;

/**
 * O que descreve a mesa aberta neste aparelho. Sai junto com a sessão: a
 * partida continua viva no servidor (e volta pela tela de Partidas), mas vidas
 * e assentos são estado local — deixá-los para trás faria o próximo login abrir
 * a mesa de outra pessoa.
 */
const MATCH_KEYS = [
  'matchId',
  'match-start',
  'match-seats',
  'match-starting-life',
  'players',
] as const;

/**
 * Dono da sessão no navegador. Existe para a lista de chaves morar num lugar só:
 * antes o login escrevia três chaves e o interceptor apagava cinco, e qualquer
 * chave nova nascia esquecida em um dos dois lados.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private notify = inject(NotificationService);
  private profile = inject(ProfileService);

  /** Há partida aberta guardada aqui? É o que faz o logout pedir confirmação. */
  get hasMatchInProgress(): boolean {
    return isPlatformBrowser(this.platformId) && !!localStorage.getItem('matchId');
  }

  signIn(response: LoginResponse): void {
    if (!isPlatformBrowser(this.platformId)) return;

    localStorage.setItem('auth-token', response.token);
    localStorage.setItem('user-name', response.user.name);
    localStorage.setItem('user-id', String(response.user.id));
    this.profile.load();
  }

  /** Apaga a sessão sem navegar nem avisar — para quem já tem o próprio aviso. */
  clear(): void {
    this.profile.clear();

    if (!isPlatformBrowser(this.platformId)) return;

    for (const key of [...SESSION_KEYS, ...MATCH_KEYS]) {
      localStorage.removeItem(key);
    }
  }

  /** Saída pedida pelo usuário: apaga, avisa e volta para o login. */
  signOut(): void {
    this.clear();
    this.notify.success('Você saiu da sua conta.', { description: 'Até a próxima mesa!' });
    this.router.navigate(['/']);
  }

  /**
   * Saída com pergunta quando há mesa aberta: vidas e assentos são locais e não
   * voltam. Sem mesa aberta não há o que perder, então sai direto.
   */
  confirmSignOut(): void {
    if (!this.hasMatchInProgress) {
      this.signOut();
      return;
    }

    this.notify.confirm('Sair agora encerra o acompanhamento da mesa aberta.', () => this.signOut(), {
      description: 'A partida continua registrada, mas as vidas e os assentos deste aparelho somem.',
      confirmLabel: 'Sair',
    });
  }
}
