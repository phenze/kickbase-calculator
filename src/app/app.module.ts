import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';

import { ApiService } from './services/api.service';
import { LocalApiService } from './services/local-api.service';

import { BsDropdownModule } from 'ngx-bootstrap/dropdown';
import { ModalModule } from 'ngx-bootstrap/modal';
import { NumberformatterDirective } from './numberformatter.directive';
import { MyCurrencyPipe } from './my-currency.pipe';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ModalComponent } from './components/modal/modal.component';

import { NgbTypeahead } from './typeahead/typeahead';
import { NgbTypeaheadWindow } from './typeahead/typeahead-window';
import { NgbHighlight } from './typeahead/highlight';

import { RouterModule } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { HelpComponent } from './components/help/help.component';
import { PlayerItemComponent } from './components/player-item/player-item.component';

import { AutocompleteLibModule } from 'angular-ng-autocomplete';

@NgModule({
    declarations: [
        AppComponent,
        NumberformatterDirective,
        MyCurrencyPipe,
        ModalComponent,
        NgbTypeahead,
        NgbTypeaheadWindow,
        NgbHighlight,
        LoginComponent,
        HelpComponent,
        PlayerItemComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        HttpClientModule,
        BsDropdownModule.forRoot(),
        ModalModule.forRoot(),
        AngularSvgIconModule.forRoot(),
        RouterModule.forRoot([], { relativeLinkResolution: 'legacy' }),
        AutocompleteLibModule
        // ServiceWorkerModule.register('ngsw-worker.js', { enabled: environment.production }),
    ],
    entryComponents: [ModalComponent, NgbTypeaheadWindow],
    providers: [MyCurrencyPipe, ApiService, LocalApiService],
    bootstrap: [AppComponent]
})
export class AppModule { }
