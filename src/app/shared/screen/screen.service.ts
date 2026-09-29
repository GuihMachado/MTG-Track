import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** O app aberto pelo ícone, mas sem a tela cheia que o manifesto pede. */
const INSTALLED_NOT_FULLSCREEN = '(display-mode: standalone), (display-mode: minimal-ui)';

/**
 * A tela do celular numa mesa de Commander: fica acesa e ocupa tudo.
 *
 * - **Acesa:** Screen Wake Lock enquanto o app estiver em primeiro plano. O
 *   sistema solta a trava sozinho quando o app vai para o fundo, então ela é
 *   pedida de novo a cada volta — e a cada toque, porque o Safari recusa o
 *   pedido feito sem gesto do usuário.
 * - **Tela cheia:** o manifesto já pede `fullscreen`, mas o Android só aplica
 *   quando atualiza o app instalado (e o iPhone nunca aplica). No app
 *   instalado que abriu sem tela cheia, o primeiro toque a pede; se o usuário
 *   sair dela (gesto de voltar), o próximo toque pede de novo. No navegador
 *   comum nada disso acontece: tela cheia numa aba seria intrusivo.
 */
@Injectable({ providedIn: 'root' })
export class ScreenService {
  private platformId = inject(PLATFORM_ID);

  private sentinel: WakeLockSentinel | null = null;
  private requesting = false;

  init(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.keepAwake();
    });
    document.addEventListener('click', () => void this.keepAwake(), { capture: true, passive: true });
    void this.keepAwake();

    this.armFullscreen();
  }

  private async keepAwake(): Promise<void> {
    if (this.sentinel || this.requesting) return;
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;

    this.requesting = true;
    try {
      const sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => {
        if (this.sentinel === sentinel) this.sentinel = null;
      });
      this.sentinel = sentinel;
    } catch {
      // Recusado (bateria fraca, sem gesto, política do navegador): a tela só
      // apaga como apagaria sem o app. O próximo toque tenta de novo.
    } finally {
      this.requesting = false;
    }
  }

  private armFullscreen(): void {
    if (!document.fullscreenEnabled || !matchMedia(INSTALLED_NOT_FULLSCREEN).matches) return;

    // Tela cheia exige gesto: pedir no clique, que é ativação em toque e mouse.
    const request = () => {
      if (document.fullscreenElement) return;
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
    };

    document.addEventListener('click', request, { capture: true, once: true });
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        document.addEventListener('click', request, { capture: true, once: true });
      }
    });
  }
}
