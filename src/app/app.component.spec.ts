import { TestBed, waitForAsync } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';
import { ApiService } from './services/api.service';
import { KickbaseLeague } from './model/kickbase-league';
import { KickbasePlayer } from './model/kickbase-player';

// -----------------------------------------------------------------------
// WICHTIG: Der echte ApiService darf in Unit-Tests NIE injiziert werden.
// Sein Konstruktor kann (abhaengig vom Inhalt von localStorage['data'])
// einen echten, ungeawaiteten HTTP-Call an https://api.kickbase.com
// ausloesen (this.refreshToken() in ApiService). Da Angular/Zone.js
// jede offene HTTP-Request fuer die Stabilitaetspruefung mitverfolgt,
// haengt jeder mit waitForAsync/fakeAsync umschlossene Test dann, bis
// der Call sich aufloest oder Karma nach browserNoActivityTimeout
// abbricht - das war die Ursache des urspruenglichen Hangs.
//
// Loesung: ApiService immer per overrideProvider durch einen Spy
// ersetzen, bevor compileComponents() bzw. createComponent() laeuft.
// -----------------------------------------------------------------------

describe('AppComponent', () => {
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  beforeEach(waitForAsync(() => {
    apiServiceSpy = jasmine.createSpyObj<ApiService>(
      'ApiService',
      [
        'getLeagues',
        'getMarket',
        'getLineup',
        'getToken',
        'getGiftStatus',
        'collectGift',
        'logout',
        'setLastDisplay',
        'setLastLeague',
        'setPlayerPermanentDeleted',
      ],
      {
        // Properties, die AppComponent liest
        isLoggedIn: false,
        userID: 1,
        data: { lastLeagueId: -1 },
      }
    );

    TestBed.configureTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ApiService, { useValue: apiServiceSpy })
      .compileComponents();
  }));

  function createComponent() {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance as AppComponent;
    return { fixture, app };
  }

  it('should create the app', () => {
    const { app } = createComponent();
    expect(app).toBeTruthy();
  });

  it(`should have as title 'app'`, () => {
    const { app } = createComponent();
    expect(app.title).toEqual('app');
  });

  describe('ngOnInit', () => {
    afterEach(() => {
      localStorage.removeItem('sorting');
      localStorage.removeItem('loadStatsAlways');
      localStorage.removeItem('offerOffset');
    });

    it('liest die gespeicherte Sortierung aus localStorage', () => {
      localStorage.setItem('sorting', '2');
      const { app, fixture } = createComponent();
      fixture.detectChanges(); // triggert ngOnInit
      expect(app.selectedSorting).toBe(2);
    });

    it('liest loadStatsAlways aus localStorage', () => {
      localStorage.setItem('loadStatsAlways', 'false');
      const { app, fixture } = createComponent();
      fixture.detectChanges();
      expect(app.loadStatsAlways).toBeFalse();
    });

    it('ruft loadLeagues() nicht auf, wenn nicht eingeloggt', () => {
      const { app, fixture } = createComponent();
      apiServiceSpy.getLeagues.calls.reset();
      fixture.detectChanges();
      expect(apiServiceSpy.getLeagues).not.toHaveBeenCalled();
    });

    it('berechnet dayUntilFriday als Wert zwischen 0 und 7', () => {
      const { app, fixture } = createComponent();
      fixture.detectChanges();
      expect(app.dayUntilFriday).toBeGreaterThanOrEqual(0);
      expect(app.dayUntilFriday).toBeLessThanOrEqual(7);
    });
  });

  describe('login', () => {
    it('zeigt einen Alert, wenn Username oder Passwort fehlen', async () => {
      const { app } = createComponent();
      spyOn(window, 'alert');
      await app.login({ username: '', password: '' } as any);
      expect(window.alert).toHaveBeenCalledWith('Bitte Username und Password angeben');
      expect(app.doLogin).toBeFalse();
    });

    it('wechselt bei Erfolg in den Rechner-Modus und laedt Ligen', async () => {
      const { app } = createComponent();
      apiServiceSpy.getToken.and.resolveTo(true);
      apiServiceSpy.getLeagues.and.resolveTo([]);

      await app.login({ username: 'user', password: 'pw' } as any);

      expect(apiServiceSpy.getToken).toHaveBeenCalledWith('user', 'pw');
      expect(app.displayMode).toBe(AppComponent.display_mode_calculator);
      expect(app.doLogin).toBeFalse();
    });

    it('zeigt bei falschem Login/Passwort einen Alert', async () => {
      const { app } = createComponent();
      spyOn(window, 'alert');
      apiServiceSpy.getToken.and.resolveTo(false);

      await app.login({ username: 'user', password: 'wrong' } as any);

      expect(window.alert).toHaveBeenCalledWith('Bitte Username und Passwort überprüfen');
    });

    it('faengt eine Exception von getToken ab und zeigt einen Alert', async () => {
      const { app } = createComponent();
      spyOn(window, 'alert');
      apiServiceSpy.getToken.and.rejectWith(new Error('network error'));

      await app.login({ username: 'user', password: 'pw' } as any);

      expect(window.alert).toHaveBeenCalledWith('Bitte Username und Passwort überprüfen');
      expect(app.doLogin).toBeFalse();
    });
  });

  describe('loadLeagues', () => {
    it('waehlt die zuletzt genutzte Liga, falls vorhanden', async () => {
      const { app } = createComponent();
      const leagues = [
        { id: 1 } as KickbaseLeague,
        { id: 2 } as KickbaseLeague,
      ];
      apiServiceSpy.getLeagues.and.resolveTo(leagues);
      Object.defineProperty(apiServiceSpy, 'data', {
        value: { lastLeagueId: 2 },
        configurable: true,
      });
      apiServiceSpy.getMarket.and.resolveTo(null as any);
      apiServiceSpy.getLineup.and.resolveTo({ players: [] } as any);

      await app.loadLeagues();

      expect(app.leagues).toEqual(leagues);
      expect(app.selectedLeague).toBe(2);
    });

    it('waehlt die erste Liga, wenn keine zuletzt genutzte existiert', async () => {
      const { app } = createComponent();
      const leagues = [{ id: 5 } as KickbaseLeague];
      apiServiceSpy.getLeagues.and.resolveTo(leagues);
      Object.defineProperty(apiServiceSpy, 'data', {
        value: { lastLeagueId: -1 },
        configurable: true,
      });
      apiServiceSpy.getMarket.and.resolveTo(null as any);
      apiServiceSpy.getLineup.and.resolveTo({ players: [] } as any);

      await app.loadLeagues();

      expect(app.selectedLeague).toBe(5);
    });

    it('geht sauber mit einem Fehler von getLeagues um', async () => {
      const { app } = createComponent();
      spyOn(console, 'log');
      apiServiceSpy.getLeagues.and.rejectWith(new Error('boom'));

      await expectAsync(app.loadLeagues()).toBeResolved();
      expect(app.leagues).toEqual([]);
    });
  });

  describe('onSelectedLeagueChanged', () => {
    it('setzt den Zustand zurueck, wenn null uebergeben wird', async () => {
      const { app } = createComponent();
      await app.onSelectedLeagueChanged(null);

      expect(app.selectedLeague).toBeNull();
      expect(app.currentMarket).toBeNull();
      expect(app.currentGift).toBeNull();
      expect(app.loadingData).toBeFalse();
    });
  });

  describe('onMinusValueChanged / onExtraAmountChange', () => {
    it('parst einen formatierten Wert und aktualisiert minusValue', () => {
      const { app } = createComponent();
      app.onMinusValueChanged('1.234,56');
      expect(app.minusValue).toBeCloseTo(1234.56, 2);
    });

    it('ignoriert ungueltige Eingaben ohne zu werfen', () => {
      const { app } = createComponent();
      expect(() => app.onMinusValueChanged('---')).not.toThrow();
    });
  });

  describe('onIncludeAdditionalAmountChanged', () => {
    it('zieht extraAmount ab, wenn includeAdditionalAmount aktiv ist', () => {
      const { app } = createComponent();
      app.minusValue = 1000;
      app.extraAmount = 200;
      app.includeAdditionalAmount = true;

      app.onIncludeAdditionalAmountChanged();

      expect(app.amountValue).toBe(800);
    });

    it('nutzt minusValue direkt, wenn includeAdditionalAmount aus ist', () => {
      const { app } = createComponent();
      app.minusValue = 1000;
      app.extraAmount = 200;
      app.includeAdditionalAmount = false;

      app.onIncludeAdditionalAmountChanged();

      expect(app.amountValue).toBe(1000);
    });
  });

  describe('Spieler-Verwaltung', () => {
    it('onAddPlayer fuegt einen neuen Spieler hinzu und setzt die Eingabe zurueck', () => {
      const { app } = createComponent();
      app.newplayername = 'Testspieler';
      app.newplayeramount = 5000000;

      app.onAddPlayer();

      expect(app.kickbaseGroup.players.length).toBe(1);
      expect(app.kickbaseGroup.players[0].name).toBe('Testspieler');
      expect(app.newplayername).toBe('');
      expect(app.newplayeramount).toBe(0);
    });

    it('onRemovePlayer markiert den passenden Spieler als geloescht', () => {
      const { app } = createComponent();
      const player = new KickbasePlayer(null, 1);
      player.name = 'Weg damit';
      app.kickbaseGroup.players.push(player);

      app.onRemovePlayer(player);

      expect(player.isDeleted).toBeTrue();
    });

    it('onDeactivatePlayer togglet isDeactivated und passt amountPlayers an', () => {
      const { app } = createComponent();
      const player = new KickbasePlayer(null, 1);
      player.isPersitantDeleted = false;
      player.isDeactivated = false;
      app.amountPlayers = 0;

      app.onDeactivatePlayer(player);

      expect(player.isDeactivated).toBeTrue();
      expect(app.amountPlayers).toBe(1);

      app.onDeactivatePlayer(player);

      expect(player.isDeactivated).toBeFalse();
      expect(app.amountPlayers).toBe(0);
    });
  });

  describe('Sortierung', () => {
    it('onSelectedSortingChanged persistiert die Wahl in localStorage', () => {
      const { app } = createComponent();
      app.onSelectedSortingChanged(app.sorting_mw_desc);
      expect(localStorage.getItem('sorting')).toBe(String(app.sorting_mw_desc));
      localStorage.removeItem('sorting');
    });

    it('sortCurrentPlayers sortiert nach expiry im Default-Modus', () => {
      const { app } = createComponent();
      const p1 = new KickbasePlayer(null, 1);
      p1.expiry = 200;
      const p2 = new KickbasePlayer(null, 1);
      p2.expiry = 100;
      app.kickbaseGroup.players = [p1, p2];
      app.selectedSorting = app.sorting_default;

      app.sortCurrentPlayers();

      expect(app.kickbaseGroup.players[0]).toBe(p2);
      expect(app.kickbaseGroup.players[1]).toBe(p1);
    });
  });

  describe('showPlayer', () => {
    it('gibt false zurueck, wenn der Spieler geloescht ist', () => {
      const { app } = createComponent();
      const player = new KickbasePlayer(null, 1);
      player.isDeleted = true;
      expect(app.showPlayer(player)).toBeFalse();
    });

    it('respektiert showPermanentDeletedPlayers fuer dauerhaft geloeschte Spieler', () => {
      const { app } = createComponent();
      const player = new KickbasePlayer(null, 1);
      player.isDeleted = false;
      player.isPersitantDeleted = true;

      app.showPermanentDeletedPlayers = false;
      expect(app.showPlayer(player)).toBeFalse();

      app.showPermanentDeletedPlayers = true;
      expect(app.showPlayer(player)).toBeTrue();
    });

    it('zeigt normale, nicht geloeschte Spieler an', () => {
      const { app } = createComponent();
      const player = new KickbasePlayer(null, 1);
      player.isDeleted = false;
      player.isPersitantDeleted = false;
      expect(app.showPlayer(player)).toBeTrue();
    });
  });

  describe('setPrintMode', () => {
    it('togglet den printMode', () => {
      const { app } = createComponent();
      expect(app.printMode).toBeFalse();
      app.setPrintMode();
      expect(app.printMode).toBeTrue();
      app.setPrintMode();
      expect(app.printMode).toBeFalse();
    });
  });

  describe('onFridayDateChanged', () => {
    it('uebernimmt einen gueltigen numerischen Wert', () => {
      const { app } = createComponent();
      app.onFridayDateChanged('3');
      expect(app.dayUntilFriday).toBe(3);
    });

    it('ignoriert einen ungueltigen Wert', () => {
      const { app } = createComponent();
      app.dayUntilFriday = 4;
      app.onFridayDateChanged('nicht-numerisch');
      expect(app.dayUntilFriday).toBe(4);
    });
  });

  describe('logout', () => {
    it('setzt den Zustand zurueck und ruft apiService.logout() auf', () => {
      const { app } = createComponent();
      app.newplayername = 'irgendwas';
      app.logout();

      expect(apiServiceSpy.logout).toHaveBeenCalled();
      expect(app.newplayername).toBe('');
    });
  });

  describe('getGift', () => {
    it('laedt bei Erfolg die Ligen neu', async () => {
      const { app } = createComponent();
      app.selectedLeague = 1; // getGift() bricht sonst frueh ab (selectedLeague === null)
      apiServiceSpy.collectGift.and.resolveTo(undefined);
      apiServiceSpy.getLeagues.and.resolveTo([]);

      await app.getGift();

      expect(apiServiceSpy.collectGift).toHaveBeenCalled();
      expect(apiServiceSpy.getLeagues).toHaveBeenCalled();
    });

    it('zeigt bei Fehler ein Modal statt zu werfen', async () => {
      const { app } = createComponent();
      app.selectedLeague = 1;
      spyOn(console, 'log');
      apiServiceSpy.collectGift.and.rejectWith({ message: 'bereits abgeholt' });

      await expectAsync(app.getGift()).toBeResolved();
    });
  });

  describe('errorHandler', () => {
    it('setzt ein Fallback-Bild bei Ladefehler', () => {
      const { app } = createComponent();
      const img = document.createElement('img');
      const event = { target: img } as unknown as Event;

      app.errorHandler(event);

      expect(img.src).toContain('not-found.png');
    });
  });
});