import { BrowserModule } from '@angular/platform-browser';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';

import { ApiService } from './services/api.service';

import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ModalModule } from 'ngx-bootstrap/modal';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ModalComponent } from './components/modal/modal.component';

import { LoginComponent } from './components/login/login.component';
import { HelpComponent } from './components/help/help.component';
import { PlayerItemComponent } from './components/player-item/player-item.component';
import { MarketOverviewComponent } from './components/market-overview/market-overview.component';
import { ThemeToggleComponent } from './components/theme-toggle/theme-toggle.component';

import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { EuroPipe } from './no-decimals.pipe';
import { FormattedNumberDirective } from './formatted-number.directive';

import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from 'src/environments/environment';

registerLocaleData(localeDe, 'de-DE');

@NgModule({
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    FormsModule,
    BsDropdownModule,
    ModalModule,
    AngularSvgIconModule.forRoot(),
    ModalComponent,
    LoginComponent,
    HelpComponent,
    PlayerItemComponent,
    MarketOverviewComponent,
    ThemeToggleComponent,
    EuroPipe,
    FormattedNumberDirective,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Prüft die Registrierung erst, wenn die App stabil gelaufen ist
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
  providers: [
    ApiService,
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideRouter([]),
    CurrencyPipe,
    { provide: LOCALE_ID, useValue: 'de-DE' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR' },
  ],
})
export class AppModule {}
