import { ApplicationConfig, inject, isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptors';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideServiceWorker } from '@angular/service-worker';
import { NavigationHistoryService } from './shared/navigation/navigation-history.service';
import { ThemeService } from './shared/theme/theme.service';
import { UpdateService } from './shared/update/update.service';
import { ScreenService } from './shared/screen/screen.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // A transição entre telas usa a View Transitions API do navegador: o
    // fade + 8px de subida ficam em styles.css (::view-transition-new). Quem
    // não suporta navega instantâneo, sem quebrar nada.
    //
    // 'computed': navegação de voltar recusada por guard (o gesto lateral na
    // mesa) devolve o histórico para a posição de antes. Com o padrão, o
    // histórico ficava um passo atrás e o próximo gesto saía de vez.
    provideRouter(routes, withViewTransitions(), withRouterConfig({ canceledNavigationResolution: 'computed' })),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideCharts(withDefaultRegisterables()),
    provideAppInitializer(() => inject(ThemeService).init()),
    // Precisa subir junto com o app para contar a primeira navegação.
    provideAppInitializer(() => {
      inject(NavigationHistoryService);
    }),
    // Sem isto, o worker baixa a versão nova e nunca a usa: um PWA instalado
    // quase não tem "lançamento limpo", que é quando o Angular trocaria.
    provideAppInitializer(() => inject(UpdateService).init()),
    // Mesa de jogo: a tela não apaga e, no app instalado, ocupa tudo.
    provideAppInitializer(() => inject(ScreenService).init()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
