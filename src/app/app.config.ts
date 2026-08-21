import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptors';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { NavigationHistoryService } from './shared/navigation/navigation-history.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideCharts(withDefaultRegisterables()),
    // Precisa subir junto com o app para contar a primeira navegação.
    provideAppInitializer(() => {
      inject(NavigationHistoryService);
    })
  ]
};
