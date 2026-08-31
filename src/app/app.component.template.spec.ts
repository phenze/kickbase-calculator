import { CurrencyPipe, DatePipe, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { DEFAULT_CURRENCY_CODE, LOCALE_ID, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsModalService } from 'ngx-bootstrap/modal';
import { of } from 'rxjs';

import { AppComponent } from './app.component';
import { DisplayMode } from './core/models/display-mode';
import { SortMode } from './core/models/sort-mode';
import { ApiService } from './core/services/api.service';
import { ErrorService } from './core/services/error.service';
import { UpdateService } from './core/services/update.service';
import { FormattedNumberDirective } from './shared/directives/formatted-number.directive';
import { EuroPipe } from './shared/pipes/euro.pipe';

/**
 * Diese Suite rendert das Template wirklich - im Gegensatz zur Logik-Suite in
 * app.component.spec.ts, die nur die Klasse anfasst. Sie sichert vor allem die
 * ngModel-Bindungen ab: die Signals werden einseitig gelesen und ueber
 * (ngModelChange) zurueckgeschrieben, und genau dieser Weg faellt sonst durch
 * jedes Netz. Die Kind-Komponenten sind bewusst ausgeblendet.
 */
registerLocaleData(localeDe, 'de-DE');

describe('AppComponent (Template)', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  const query = <T extends HTMLElement>(selector: string): T => {
    const element = fixture.nativeElement.querySelector(selector);
    expect(element).withContext(`Element ${selector} fehlt im Template`).toBeTruthy();
    return element as T;
  };

  beforeEach(async () => {
    localStorage.clear();

    const apiService = jasmine.createSpyObj(
      'ApiService',
      [
        'getLeagues',
        'getMarket',
        'getLineup',
        'getLeagueOverview',
        'setLastLeague',
        'setLastDisplay',
        'logout',
      ],
      {
        isLoggedIn: signal(true),
        userID: signal('user123'),
        leagues: signal([]),
        appSettings: signal({ calculatorActive: DisplayMode.calculator, lastLeagueId: -1 }),
      },
    );
    apiService.getLeagues.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: BsModalService, useValue: jasmine.createSpyObj('BsModalService', ['show']) },
        {
          provide: UpdateService,
          useValue: { isUpdateAvailable: () => false, reloadPage: () => {} },
        },
        {
          provide: ErrorService,
          useValue: { errorMessage: signal(null), showError: () => {}, clearError: () => {} },
        },
        CurrencyPipe,
        { provide: LOCALE_ID, useValue: 'de-DE' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'EUR' },
      ],
    })
      // Die Kind-Komponenten sind hier nicht das Testobjekt - ohne sie bleibt
      // der Test schnell und unabhaengig von deren Abhaengigkeiten.
      .overrideComponent(AppComponent, {
        set: {
          imports: [FormsModule, DatePipe, EuroPipe, FormattedNumberDirective],
          schemas: [NO_ERRORS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;

    // Verhindert, dass ngAfterViewInit das Release-Notes-Modal oeffnet.
    localStorage.setItem('last_seen_version', component.currentVersion);

    // Erster Durchlauf: ngOnInit laeuft und setzt selectedLeague selbst auf null.
    fixture.detectChanges();
    await fixture.whenStable();

    // Danach den Zustand herstellen, in dem der Rechner sichtbar ist.
    component.selectedLeague.set(1);
    component.loadingData.set(false);
    fixture.detectChanges();
  });

  afterEach(() => localStorage.clear());

  it('sollte den Rechner rendern, wenn eine Liga gewaehlt ist', () => {
    expect(query('#customSwitch1')).toBeTruthy();
    expect(query('#daysToFriday')).toBeTruthy();
  });

  describe('Checkbox-Optionen', () => {
    const switches: ReadonlyArray<[string, keyof AppComponent & string]> = [
      ['#customSwitch1', 'includeAdditionalAmount'],
      ['#customSwitch2', 'includeMinusMarketValues'],
      ['#customSwitch3', 'loadStatsAlways'],
      ['#customSwitch4', 'includeAchievements'],
      ['#customSwitchGrouped', 'isGroupedView'],
      ['#customSwitchKeepInitially', 'keepPlayersInitially'],
    ];

    switches.forEach(([selector, field]) => {
      it(`sollte ${field} in beide Richtungen mit ${selector} verbinden`, fakeAsync(() => {
        const state = component[field] as unknown as { (): boolean; set(v: boolean): void };
        const input = query<HTMLInputElement>(selector);

        // Signal -> DOM
        state.set(true);
        fixture.detectChanges();
        tick();
        expect(input.checked).withContext('Signal wird nicht ins Feld geschrieben').toBeTrue();

        state.set(false);
        fixture.detectChanges();
        tick();
        expect(input.checked).toBeFalse();

        // DOM -> Signal
        input.click();
        fixture.detectChanges();
        tick();
        expect(state()).withContext('Klick landet nicht im Signal').toBeTrue();
      }));
    });
  });

  it('sollte die Sortierung aus dem Select in das Signal schreiben', fakeAsync(() => {
    const select = query<HTMLSelectElement>('.form-select.mb-3');

    component.selectedSorting.set(SortMode.marketValueAsc);
    fixture.detectChanges();
    tick();

    select.selectedIndex = 1;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    tick();

    expect(component.selectedSorting()).toBe(SortMode.marketValueDesc);
  }));

  it('sollte den Offset-Wert aus dem Feld uebernehmen', fakeAsync(() => {
    const input = query<HTMLInputElement>('#offerOffset');

    input.value = '2,5';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    tick();

    expect(component.offerOffset()).toBe('2.5');
  }));

  it('sollte den Druckmodus ueber die Kopfleiste umschalten', () => {
    query<HTMLButtonElement>('[title="Druckmodus aktivieren"]').click();
    fixture.detectChanges();

    expect(component.printMode()).toBeTrue();

    query<HTMLButtonElement>('[title="Druckmodus deaktivieren"]').click();
    fixture.detectChanges();

    expect(component.printMode()).toBeFalse();
  });

  it('sollte deaktivierte Spieler ein- und ausblenden', () => {
    query<HTMLButtonElement>('[title="Deaktivierte Spieler ausblenden"]').click();
    fixture.detectChanges();

    expect(component.showPermanentDeletedPlayers()).toBeFalse();

    query<HTMLButtonElement>('[title="Deaktivierte Spieler einblenden"]').click();
    fixture.detectChanges();

    expect(component.showPermanentDeletedPlayers()).toBeTrue();
  });

  it('sollte den festen Kader auf Klick zusammenklappen', () => {
    const header = query<HTMLElement>('.collapsible-wrapper').previousElementSibling as HTMLElement;

    header.click();
    fixture.detectChanges();

    expect(component.isCardExpanded()).toBeFalse();
  });

  it('sollte den Ladezustand statt des Rechners anzeigen', () => {
    component.loadingData.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#customSwitch1')).toBeNull();
    expect(fixture.nativeElement.querySelector('.spinner-border')).toBeTruthy();
  });
});
