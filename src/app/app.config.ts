import { ApplicationConfig, inject, isDevMode, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptors';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideServiceWorker } from '@angular/service-worker';
import { NavigationHistoryService } from './shared/navigation/navigation-history.service';
import { ThemeService } from './shared/theme/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // A transição entre telas usa a View Transitions API do navegador: o
    // fade + 8px de subida ficam em styles.css (::view-transition-new). Quem
    // não suporta navega instantâneo, sem quebrar nada.
    provideRouter(routes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideCharts(withDefaultRegisterables()),
    provideAppInitializer(() => inject(ThemeService).init()),
    // Precisa subir junto com o app para contar a primeira navegação.
    provideAppInitializer(() => {
      inject(NavigationHistoryService);
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
