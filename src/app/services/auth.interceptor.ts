import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { ApiService } from './api.service';
import { ErrorService } from './error.service'; // <-- Importieren

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const apiService = inject(ApiService);
  const errorService = inject(ErrorService); // <-- Injezieren
  const token = apiService.getToken();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint =
        req.url.includes('user/login') || req.url.includes('user/refreshtokens');

      if ((error.status === 401 || error.status === 403) && !isAuthEndpoint) {
        return apiService.refreshToken().pipe(
          switchMap((newToken) => {
            const retriedReq = req.clone({
              setHeaders: {
                Accept: 'application/json',
                Authorization: `Bearer ${newToken}`,
              },
            });
            return next(retriedReq);
          }),
          catchError((refreshError) => {
            // Refresh fehlgeschlagen -> Banner anzeigen & Ausloggen
            errorService.showError('Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.');
            apiService.logout();
            return throwError(() => refreshError);
          }),
        );
      }

      if ((error.status === 401 || error.status === 403) && isAuthEndpoint) {
        apiService.logout();
      }

      // Allgemeine Server-Fehler (z.B. 500, Offline, etc.) global abfangen
      if (error.status === 0) {
        errorService.showError('Keine Verbindung zum Server möglich.');
      } else if (error.status >= 500) {
        errorService.showError('Serverfehler. Bitte versuche es später erneut.');
      }

      return throwError(() => error);
    }),
  );
};
