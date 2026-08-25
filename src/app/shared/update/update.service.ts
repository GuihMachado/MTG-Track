import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { filter, take } from 'rxjs';

/** A mesa fica aberta por uma hora; o resto do app, por minutos. */
const CHECK_EVERY_MS = 30 * 60 * 1000;

/** `/match` e `/match?...`, sem engolir `/matchs` (o histórico). */
const MATCH_URL = /^\/match(\/|\?|$)/;

/**
 * Entrega de versão nova num PWA instalado.
 *
 * O service worker do Angular baixa a atualização sozinho, mas só a USA no
 * próximo lançamento limpo — e um PWA instalado quase nunca tem um: voltar
 * pelos recentes é a mesma página de antes. Sem este serviço, um deploy
 * demora dias para chegar ao celular, e "corrigi, sobe de novo que não
 * mudou nada" vira rotina.
 *
 * Duas pontas:
 * - conferir: ao voltar ao primeiro plano (o momento exato em que o usuário
 *   "abriu o app de novo") e a cada meia hora numa sessão longa;
 * - trocar: quando a versão nova está pronta, ativa e recarrega na hora —
 *   exceto na mesa, onde recarregar apagaria as vidas na frente de quatro
 *   pessoas; ali a troca espera a navegação de saída.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private updates = inject(SwUpdate);
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  init(): void {
    // isEnabled já é falso em dev e em navegador sem service worker.
    if (!this.isBrowser || !this.updates.isEnabled) return;

    this.updates.versionUpdates
      .pipe(filter(event => event.type === 'VERSION_READY'))
      .subscribe(() => this.apply());

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.check();
    });

    setInterval(() => this.check(), CHECK_EVERY_MS);
  }

  private check(): void {
    this.updates.checkForUpdate().catch(() => undefined);
  }

  private apply(): void {
    if (MATCH_URL.test(this.router.url)) {
      this.router.events
        .pipe(
          filter(event => event instanceof NavigationEnd),
          take(1),
        )
        .subscribe(() => this.reload());
      return;
    }

    this.reload();
  }

  private reload(): void {
    // Recarrega mesmo se a ativação falhar: o pior caso é voltar igual.
    this.updates
      .activateUpdate()
      .catch(() => undefined)
      .then(() => document.location.reload());
  }
}
