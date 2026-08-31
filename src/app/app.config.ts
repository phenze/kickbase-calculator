import { CurrencyPipe, registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeDe from '@angular/common/locales/de';
import {
  ApplicationConfig,
  DEFAULT_CURRENCY_CODE,
  LOCALE_ID,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/interceptors/auth.interceptor';

registerLocaleData(localeDe, 'de-DE');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter([]),
    // Wird von der EuroPipe als Delegat injiziert.
    CurrencyPipe,
    { provide: LOCALE_ID, useValue: 'de-DE' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR' },
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      // Prüft die Registrierung erst, wenn die App stabil gelaufen ist
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
