import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app.component';

import { ApiService } from './services/api.service';

import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ModalModule } from 'ngx-bootstrap/modal';
import { NumberformatterDirective } from './numberformatter.directive';
import { MyCurrencyPipe } from './my-currency.pipe';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ModalComponent } from './components/modal/modal.component';

import { LoginComponent } from './components/login/login.component';
import { HelpComponent } from './components/help/help.component';
import { PlayerItemComponent } from './components/player-item/player-item.component';
import { MarketOverviewComponent } from './components/market-overview/market-overview.component';

@NgModule({
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  imports: [
    BrowserModule,
    FormsModule,
    BsDropdownModule,
    ModalModule,
    AngularSvgIconModule.forRoot(),
    NumberformatterDirective,
    MyCurrencyPipe,
    ModalComponent,
    LoginComponent,
    HelpComponent,
    PlayerItemComponent,
    MarketOverviewComponent,
    // ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
  ],
  providers: [
    MyCurrencyPipe,
    ApiService,
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideRouter([]),
  ],
})
export class AppModule {}
