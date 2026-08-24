import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { markSessionExpired } from '../shared/http/session-expired';
import { NotificationService } from '../shared/notification/notification.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Só a nossa API leva o token; chamadas externas (ex.: Scryfall) passam
  // limpas — anexar o Bearer nelas vazaria o JWT para terceiros.
  if (!req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const router = inject(Router);
  const notify = inject(NotificationService);
  const token = localStorage.getItem('auth-token');

  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      // 401 mesmo tendo mandado token = token expirado ou inválido: derruba a sessão.
      if (token && error instanceof HttpErrorResponse && error.status === 401) {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user-name');
        localStorage.removeItem('user-id');
        localStorage.removeItem('matchId');

        markSessionExpired(error);

        // A API diz se o token expirou ou é inválido; a mensagem dela é mais precisa.
        notify.warning(notify.messageFrom(error, 'Sua sessão expirou. Faça login novamente.'));
        router.navigate(['/']);
      }

      return throwError(() => error);
    })
  );
};
