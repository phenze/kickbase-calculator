import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { DisplayMode } from './core/models/display-mode';
import { SortMode } from './core/models/sort-mode';
import { ApiService } from './core/services/api.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ChangeDetectorRef, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { KickbasePlayer } from './core/models/kickbase-player';
import { KickbaseLeague } from './core/models/kickbase-league';
import { KickbaseMarket } from './core/models/kickbase-market';
import { KickbasePlayerStats } from './core/models/kickbase-player-stats';
import { CurrencyPipe } from '@angular/common';
import { EuroPipe } from './shared/pipes/euro.pipe';
import { UpdateService } from './core/services/update.service';
import { of, throwError } from 'rxjs';
import { ErrorService } from './core/services/error.service';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockModalService: jasmine.SpyObj<BsModalService>;
  let errorService: jasmine.SpyObj<ErrorService>;

  function makePlayer(
    id: number,
    name: string,
    marketValue: number,
    change = 0,
    position = 0,
  ): KickbasePlayer {
    const player = new KickbasePlayer(null, 'user123');
    player.id = id;
    player.name = name;
    player.marketValue = marketValue;
    player.value = marketValue;
    player.price = marketValue;
    player.expiry = id * 100;
    player.position = position;

    const stats = new KickbasePlayerStats(null);
    stats.realMarketValueChange = change;
    player.stats = stats;

    return player;
  }

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    mockApiService = jasmine.createSpyObj(
      'ApiService',
      [
        'getToken',
        'getLeagues',
        'getLeagueOverview',
        'getMarket',
        'getLineup',
        'setLastLeague',
        'setLastDisplay',
        'collectGift',
        'login',
        'logout',
      ],
      {
        appSettings: signal({
          calculatorActive: DisplayMode.calculator,
          lastLeagueId: -1,
        }),
        isLoggedIn: signal(true),
        userID: signal('user123'),
        leagues: signal([]),
      },
    );

    errorService = jasmine.createSpyObj('ErrorService', ['showError', 'clearError'], {
      errorMessage: signal(null),
    });

    const sampleMarketPlayer = makePlayer(1, 'Müller', 10000000);
    sampleMarketPlayer.loadStats = jasmine.createSpy('loadStats').and.resolveTo();

    mockApiService.getToken.and.returnValue('mock-token-123');
    mockApiService.getLeagues.and.returnValue(
      of([{ id: 10, name: 'Liga 1', budget: 10000000 } as any]),
    );
    mockApiService.getMarket.and.returnValue(
      of({
        players: [sampleMarketPlayer],
        offerAmountForUser: '500000',
      } as any),
    );
    mockApiService.getLineup.and.returnValue(
      of({
        players: [sampleMarketPlayer],
      } as any),
    );

    mockModalService = jasmine.createSpyObj('BsModalService', ['show']);

    const mockUpdateService = {
      isUpdateAvailable: jasmine.createSpy('isUpdateAvailable').and.returnValue(false),
      reloadPage: jasmine.createSpy('reloadPage'),
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: BsModalService, useValue: mockModalService },
        { provide: UpdateService, useValue: mockUpdateService },
        { provide: ErrorService, useValue: errorService },
        ChangeDetectorRef,
        CurrencyPipe,
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('sollte die Komponente erfolgreich erstellen', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit & Initialisierung', () => {
    it('sollte Einstellungen aus dem localStorage auslesen', () => {
      localStorage.setItem('sorting', '2');
      localStorage.setItem('loadStatsAlways', 'false');
      localStorage.setItem('offerOffset', '1.5');

      component.ngOnInit();

      expect(component.selectedSorting).toBe(2);
      expect(component.loadStatsAlways).toBeFalse();
      expect(component.offerOffset).toBe('1.5');
    });

    it('sollte Ligen laden, wenn ApiService.isLoggedIn true ist', () => {
      mockApiService.getLeagues.and.returnValue(of([]));

      component.ngOnInit();

      expect(mockApiService.getLeagues).toHaveBeenCalled();
    });

    it('sollte dayUntilFriday und fridayDate korrekt initialisieren', () => {
      component.ngOnInit();

      expect(component.dayUntilFriday).toBeGreaterThanOrEqual(0);
      expect(component.fridayDate).toBeInstanceOf(Date);
    });
  });

  describe('Login & Logout', () => {
    it('sollte bei erfolgreichem Login Ligen laden und den Display-Modus setzen', fakeAsync(() => {
      mockApiService.login.and.returnValue(of(true));
      mockApiService.getLeagues.and.returnValue(of([]));

      component.login({ username: 'testuser', password: 'password' });
      tick();

      expect(mockApiService.login).toHaveBeenCalledWith('testuser', 'password');
      expect(component.displayMode).toBe(DisplayMode.calculator);
      expect(mockApiService.getLeagues).toHaveBeenCalled();
    }));

    it('sollte bei fehlerhaftem Login einen Alert anzeigen', fakeAsync(() => {
      mockApiService.login.and.returnValue(throwError(() => new Error('Bad Request')));

      component.login({ username: 'wrong', password: 'bad' });
      tick();

      expect(errorService.showError).toHaveBeenCalledWith(
        'Fehler beim Login. Bitte überprüfen Sie Ihre Zugangsdaten.',
      );
      expect(component.doLogin).toBeFalse();
    }));

    it('sollte beim Logout die Session und Gruppe zurücksetzen', () => {
      component.kickbaseGroup.players = [makePlayer(1, 'Müller', 1000)];

      component.logout();

      expect(mockApiService.logout).toHaveBeenCalled();
      expect(component.kickbaseGroup.players.length).toBe(0);
    });
  });

  describe('loadLeagues & onSelectedLeagueChanged', () => {
    beforeEach(() => {
      const mockLeague10: KickbaseLeague = { id: 10, name: 'Bundesliga', budget: 10000000 } as any;
      const mockLeague20: KickbaseLeague = {
        id: 20,
        name: '2. Bundesliga',
        budget: 5000000,
      } as any;
      mockApiService.getLeagueOverview.and.returnValue(of({} as any));
      mockApiService.getLeagues.and.returnValue(of([mockLeague10, mockLeague20]));
      mockApiService.getMarket.and.returnValue(
        of({ players: [], offerAmountForUser: '500000' } as any),
      );
      mockApiService.getLineup.and.returnValue(
        of({ players: [makePlayer(1, 'Neuer', 5000000)] } as any),
      );
    });

    it('sollte eine Liga als String aus lastLeagueId korrekt als Zahl auswählen', fakeAsync(() => {
      mockApiService.appSettings.set({ calculatorActive: 'calculator', lastLeagueId: 20 });

      component.loadLeagues();
      tick();

      expect(component.selectedLeague).toBe(20);
      expect(mockApiService.setLastLeague).toHaveBeenCalledWith(20);
      expect(component.kickbaseGroup.players.length).toBe(1);
    }));

    it('sollte eine Liga als Number aus lastLeagueId auswählen', fakeAsync(() => {
      mockApiService.appSettings.set({ calculatorActive: 'calculator', lastLeagueId: 10 });

      component.loadLeagues();
      tick();

      expect(component.selectedLeague).toBe(10);
      expect(mockApiService.setLastLeague).toHaveBeenCalledWith(10);
    }));

    it('sollte selectedLeague auf null setzen, wenn lastLeagueId = -1 ist', fakeAsync(() => {
      mockApiService.appSettings.set({ calculatorActive: 'calculator', lastLeagueId: -1 });

      component.loadLeagues();
      tick();

      expect(component.selectedLeague).toBeNull();
      expect(mockApiService.setLastLeague).not.toHaveBeenCalled();
    }));

    it('sollte selectedLeague auf null setzen, wenn lastLeagueId undefined ist', fakeAsync(() => {
      mockApiService.appSettings.set({
        calculatorActive: 'calculator',
        lastLeagueId: undefined as any,
      });

      component.loadLeagues();
      tick();

      expect(component.selectedLeague).toBeNull();
      expect(mockApiService.setLastLeague).not.toHaveBeenCalled();
    }));

    it('sollte selectedLeague auf null setzen, wenn die gespeicherte lastLeagueId in den geladenen Ligen nicht existiert', fakeAsync(() => {
      mockApiService.appSettings.set({ calculatorActive: 'calculator', lastLeagueId: 999 });

      component.loadLeagues();
      tick();

      expect(component.selectedLeague).toBeNull();
      expect(mockApiService.setLastLeague).not.toHaveBeenCalled();
    }));

    it('sollte die Werte zurücksetzen, wenn null als Liga ausgewählt wird', fakeAsync(() => {
      component.onSelectedLeagueChanged(null);
      tick();

      expect(component.selectedLeague).toBeNull();
      expect(component.currentMarket).toBeNull();
      expect(component.currentGift).toBeNull();
    }));
  });

  describe('Spieler-Management & Interaktionen', () => {
    it('sollte einen Spieler als gelöscht markieren (onRemovePlayer)', () => {
      const player = makePlayer(1, 'Kane', 20000000);
      component.kickbaseGroup.players = [player];

      component.onRemovePlayer(player);

      expect(player.isDeleted).toBeTrue();
    });

    it('sollte den Deaktivierungs-Status eines Spielers umschalten (onDeactivatePlayer)', () => {
      const player = makePlayer(1, 'Musiala', 18000000);
      player.isKept = false;

      component.onDeactivatePlayer(player);

      expect(player.isKept).toBeTrue();
    });

    it('sollte filterbezogene Sichtbarkeit mit showPlayer prüfen', () => {
      const pNormal = makePlayer(1, 'A', 1000);
      const pDeleted = makePlayer(2, 'B', 1000);
      pDeleted.isDeleted = true;

      const pPermDeleted = makePlayer(3, 'C', 1000);
      pPermDeleted.isFixedSquad = true;

      expect(component.showPlayer(pNormal)).toBeTrue();
      expect(component.showPlayer(pDeleted)).toBeFalse();

      component.showPermanentDeletedPlayers = false;
      expect(component.showPlayer(pPermDeleted)).toBeFalse();
    });
  });

  describe('Achievements / Erfolge', () => {
    it('sollte achievementsDisabled und includeAchievements beim Ligawechsel übernehmen (amd = true)', async () => {
      const mockLeagueWithAmd = new KickbaseLeague({
        i: 1,
        n: 'Liga 1',
        tv: 50000000,
        b: 10000000,
      });
      component.leagues = [mockLeagueWithAmd];

      mockApiService.getLeagueOverview.and.returnValue(of({ amd: true } as any));
      mockApiService.getMarket.and.returnValue(of([] as any));
      mockApiService.getLineup.and.returnValue(of({ players: [] } as any));

      await component.onSelectedLeagueChanged(1);

      expect(component.achievementsDisabled).toBeTrue();
      expect(component.includeAchievements).toBeFalse();
    });

    it('sollte achievementsDisabled = false und includeAchievements = true setzen, wenn amd = false ist', async () => {
      const mockLeagueNormal = new KickbaseLeague({ id: 2, name: 'Liga 2', lm: { amd: false } });
      component.leagues = [mockLeagueNormal];

      mockApiService.getMarket.and.returnValue(of([] as any));
      mockApiService.getLineup.and.returnValue(of({ players: [] } as any));

      await component.onSelectedLeagueChanged(2);

      expect(component.achievementsDisabled).toBeFalse();
      expect(component.includeAchievements).toBeTrue();
    });

    it('sollte !includeAchievements als 4. Argument an kickbaseGroup.calcValues übergeben', () => {
      spyOn(component.kickbaseGroup, 'calcValues');
      component.includeAchievements = false;

      component.refreshGroups();

      expect(component.kickbaseGroup.calcValues).toHaveBeenCalledWith(
        component.amountValue,
        component.includeMinusMarketValues,
        component.dayUntilFriday,
        true, // !includeAchievements
      );
    });

    it('sollte refreshGroups aufrufen, wenn onIncludeAchievementsChanged ausgeführt wird', () => {
      spyOn(component, 'refreshGroups');

      component.onIncludeAchievementsChanged();

      expect(component.refreshGroups).toHaveBeenCalled();
    });

    it('sollte calcValues mit aktuellem includeAchievements-Status in onPlayerValueChanged aufrufen', () => {
      spyOn(component.kickbaseGroup, 'calcValues');
      component.includeAchievements = true;
      const player = makePlayer(1, 'Kane', 10000000);

      component.onPlayerValueChanged(player);

      expect(component.kickbaseGroup.calcValues).toHaveBeenCalledWith(
        component.amountValue,
        component.includeMinusMarketValues,
        component.dayUntilFriday,
        false, // !includeAchievements
      );
    });
  });

  describe('Sortierung (sortCurrentPlayers)', () => {
    let p1: KickbasePlayer;
    let p2: KickbasePlayer;

    beforeEach(() => {
      p1 = makePlayer(1, 'Spieler 1', 10000000, 50000);
      p2 = makePlayer(2, 'Spieler 2', 5000000, -20000);
      component.kickbaseGroup.players = [p1, p2];
    });

    it('sollte Spieler nach Position sortieren (TW -> ABW -> MF -> ST)', () => {
      const pTW = makePlayer(1, 'Neuer', 1000, 0, 1);
      const pST = makePlayer(2, 'Kane', 1000, 0, 4);
      const pMF = makePlayer(3, 'Musiala', 1000, 0, 3);
      const pABW = makePlayer(4, 'Davies', 1000, 0, 2);

      component.kickbaseGroup.players = [pST, pTW, pMF, pABW];

      component.selectedSorting = SortMode.position;
      component.sortCurrentPlayers();

      expect(component.kickbaseGroup.players[0].name).toBe('Neuer');
      expect(component.kickbaseGroup.players[1].name).toBe('Davies');
      expect(component.kickbaseGroup.players[2].name).toBe('Musiala');
      expect(component.kickbaseGroup.players[3].name).toBe('Kane');
    });

    it('should sort Kickbase players by expiry and move user-offered players to the end', () => {
      component.displayMode = DisplayMode.marketOverview;
      component.selectedSorting = SortMode.default;

      const playerKbLate = new KickbasePlayer({ i: '1', n: 'Müller', exs: 10000 }, '123');
      const playerKbEarly = new KickbasePlayer({ i: '2', n: 'Goretzka', exs: 1000 }, '123');
      const playerUser = new KickbasePlayer({ i: '3', n: 'Grifo', u: { n: 'harti' } }, '123');

      component.currentMarket = {
        players: [playerUser, playerKbLate, playerKbEarly],
      } as any;

      component.sortCurrentPlayers();

      const result = component.marketOverviewPlayers.map((p) => p.name);

      expect(result).toEqual(['Goretzka', 'Müller', 'Grifo']);
    });

    it('sollte Spieler nach Marktwert aufsteigend sortieren', () => {
      component.selectedSorting = SortMode.marketValueAsc;
      component.sortCurrentPlayers();

      expect(component.kickbaseGroup.players[0].id).toBe(2);
      expect(component.kickbaseGroup.players[1].id).toBe(1);
    });

    it('sollte Spieler nach Marktwert absteigend sortieren', () => {
      component.selectedSorting = SortMode.marketValueDesc;
      component.sortCurrentPlayers();

      expect(component.kickbaseGroup.players[0].id).toBe(1);
      expect(component.kickbaseGroup.players[1].id).toBe(2);
    });

    it('sollte Spieler nach Marktwertveränderung aufsteigend sortieren', () => {
      component.selectedSorting = SortMode.marketValueChangeAsc;
      component.sortCurrentPlayers();

      expect(component.kickbaseGroup.players[0].id).toBe(2);
      expect(component.kickbaseGroup.players[1].id).toBe(1);
    });

    it('sollte Spieler nach Marktwertveränderung absteigend sortieren', () => {
      component.selectedSorting = SortMode.marketValueChangeDesc;
      component.sortCurrentPlayers();

      expect(component.kickbaseGroup.players[0].id).toBe(1);
      expect(component.kickbaseGroup.players[1].id).toBe(2);
    });

    // Die Auswahlliste in app.component.html bindet diese Zahlen. Sie landen auch im
    // localStorage, deshalb pruefen die beiden Tests bewusst die Werte und nicht die
    // Konstanten - genau hier lag der vertauschte Fall aus Issue #15.
    it('sollte "MW Änderung ↓" (Wert 3) mit dem groessten Anstieg oben sortieren', () => {
      component.selectedSorting = 3;
      component.sortCurrentPlayers();

      expect(component.kickbaseGroup.players[0].id).toBe(1);
      expect(component.kickbaseGroup.players[1].id).toBe(2);
    });

    it('sollte "MW Änderung ↑" (Wert 4) mit dem groessten Verlust oben sortieren', () => {
      component.selectedSorting = 4;
      component.sortCurrentPlayers();

      expect(component.kickbaseGroup.players[0].id).toBe(2);
      expect(component.kickbaseGroup.players[1].id).toBe(1);
    });

    it('sollte "MW ↓" (Wert 1) und "MW ↑" (Wert 2) unveraendert lassen', () => {
      component.selectedSorting = 1;
      component.sortCurrentPlayers();
      expect(component.kickbaseGroup.players[0].id).toBe(1);

      component.selectedSorting = 2;
      component.sortCurrentPlayers();
      expect(component.kickbaseGroup.players[0].id).toBe(2);
    });

    it('sollte Spieler ohne geladene Details ans Ende sortieren', () => {
      const pOhneStats = makePlayer(3, 'Ohne Details', 7000000);
      pOhneStats.stats = null;
      component.kickbaseGroup.players = [pOhneStats, p2, p1];

      component.selectedSorting = SortMode.marketValueChangeDesc;
      component.sortCurrentPlayers();

      expect(component.kickbaseGroup.players.map((p) => p.id)).toEqual([1, 2, 3]);

      component.selectedSorting = SortMode.marketValueChangeAsc;
      component.sortCurrentPlayers();

      expect(component.kickbaseGroup.players.map((p) => p.id)).toEqual([2, 1, 3]);
    });

    it('sollte Speichern der Sortierung im localStorage ausführen', () => {
      component.onSelectedSortingChanged(SortMode.marketValueDesc);

      expect(localStorage.getItem('sorting')).toBe('1');
    });
  });

  describe('Startzustand der Verkaufsauswahl', () => {
    let lineupPlayers: KickbasePlayer[];

    beforeEach(() => {
      lineupPlayers = [makePlayer(1, 'Neuer', 5000000), makePlayer(2, 'Kane', 8000000)];

      component.leagues = [{ id: 10, name: 'Liga 1', budget: 1000000 } as any];
      mockApiService.getLeagueOverview.and.returnValue(of({} as any));
      mockApiService.getMarket.and.returnValue(of({ players: [], offerAmountForUser: '0' } as any));
      mockApiService.getLineup.and.returnValue(of({ players: lineupPlayers } as any));
    });

    it('sollte die Option aus dem localStorage lesen', () => {
      localStorage.setItem('keepPlayersInitially', 'true');

      component.ngOnInit();

      expect(component.keepPlayersInitially).toBeTrue();
    });

    it('sollte ohne Eintrag im localStorage beim bisherigen Verhalten bleiben', () => {
      component.ngOnInit();

      expect(component.keepPlayersInitially).toBeFalse();
    });

    it('sollte standardmäßig alle geladenen Spieler zum Verkauf vormarkieren', fakeAsync(() => {
      component.onSelectedLeagueChanged(10);
      tick();

      expect(lineupPlayers.some((p) => p.isKept)).toBeFalse();
    }));

    it('sollte bei aktiver Option niemanden zum Verkauf vormarkieren', fakeAsync(() => {
      component.keepPlayersInitially = true;

      component.onSelectedLeagueChanged(10);
      tick();

      expect(lineupPlayers.every((p) => p.isKept)).toBeTrue();
    }));

    it('sollte die Auswahl beim Umschalten sofort übernehmen und speichern', () => {
      component.kickbaseGroup.players = lineupPlayers;

      component.keepPlayersInitially = true;
      component.onKeepPlayersInitiallyChanged();

      expect(localStorage.getItem('keepPlayersInitially')).toBe('true');
      expect(lineupPlayers.every((p) => p.isKept)).toBeTrue();

      component.keepPlayersInitially = false;
      component.onKeepPlayersInitiallyChanged();

      expect(localStorage.getItem('keepPlayersInitially')).toBe('false');
      expect(lineupPlayers.some((p) => p.isKept)).toBeFalse();
    });

    it('sollte den festen Kader beim Umschalten nicht zum Verkauf stellen', () => {
      const fixedPlayer = makePlayer(3, 'Kimmich', 12000000);
      fixedPlayer.isFixedSquad = true;
      component.kickbaseGroup.players = [...lineupPlayers, fixedPlayer];

      component.keepPlayersInitially = false;
      component.onKeepPlayersInitiallyChanged();

      expect(fixedPlayer.isFixedSquad).toBeTrue();
      expect(component.kickbaseGroup.players.filter((p) => !p.isFixedSquad).length).toBe(2);
    });
  });

  describe('Geschenk abholen & Fehlerbehandlung', () => {
    it('sollte Modal öffnen, wenn getGift fehlschlägt', fakeAsync(() => {
      component.selectedLeague = 10;
      mockApiService.collectGift.and.returnValue(throwError(() => 'Gift already collected'));
      mockModalService.show.and.returnValue({ content: {} } as BsModalRef);

      component.getGift();
      tick();

      expect(mockModalService.show).toHaveBeenCalled();
    }));

    it('sollte errorHandler das Not-Found Bild zuweisen', () => {
      const mockImg = document.createElement('img');
      const mockEvent = { target: mockImg } as unknown as Event;

      component.errorHandler(mockEvent);

      expect(mockImg.src).toBe('https://cdn.browshot.com/static/images/not-found.png');
    });
  });

  describe('Display Modus & Wechsel', () => {
    it('sollte den Modus auf Marktübersicht wechseln und Markt laden', fakeAsync(() => {
      component.selectedLeague = 10;
      mockApiService.getMarket.and.returnValue(of({ players: [] } as any));

      component.switchDisplay(DisplayMode.marketOverview);
      tick();

      expect(component.displayMode).toBe(DisplayMode.marketOverview);
      expect(mockApiService.setLastDisplay).toHaveBeenCalledWith(DisplayMode.marketOverview);
      expect(mockApiService.getMarket).toHaveBeenCalledWith(10);
    }));
  });

  describe('reloadMarket & onLoadAllDetails', () => {
    beforeEach(() => {
      component.selectedLeague = 10;
    });

    it('sollte reloadMarket frühzeitig abbrechen, wenn keine Liga ausgewählt ist', fakeAsync(() => {
      component.selectedLeague = null;
      component.reloadMarket(true);
      tick();

      expect(mockApiService.getMarket).not.toHaveBeenCalled();
    }));

    it('sollte den Markt neu laden und Stats aktualisieren (fullRefresh = true)', fakeAsync(() => {
      const p1 = makePlayer(1, 'Müller', 5000000);
      spyOn(p1, 'loadStats').and.resolveTo();
      spyOn(p1, 'calcValues');
      spyOn(p1, 'calcColors');

      mockApiService.getMarket.and.returnValue(
        of({ players: [p1], offerAmountForUser: '0' } as any),
      );

      component.reloadMarket(true);
      tick();

      expect(component.loadingData).toBeFalse();
      expect(p1.loadStats).toHaveBeenCalled();
      expect(p1.calcValues).toHaveBeenCalled();
      expect(p1.isKept).toBeTrue();
    }));

    it('sollte onLoadAllDetails im Market Overview Modus für alle Spieler laden', fakeAsync(() => {
      component.displayMode = DisplayMode.marketOverview;
      const p1 = makePlayer(1, 'Müller', 5000000);
      spyOn(p1, 'loadStats').and.resolveTo();
      spyOn(p1, 'calcValues');
      component.currentMarket = { players: [p1] } as any;

      component.onLoadAllDetails(true);
      tick();

      expect(p1.loadStats).toHaveBeenCalledWith(10, mockApiService);
      expect(p1.calcValues).toHaveBeenCalled();
      expect(component.loadingAllDetailsManual).toBeFalse();
    }));

    it('sollte onLoadAllDetails im Calculator Modus für die Gruppe laden', fakeAsync(() => {
      component.displayMode = DisplayMode.calculator;
      const p1 = makePlayer(1, 'Müller', 5000000);
      spyOn(p1, 'loadStats').and.resolveTo();
      component.kickbaseGroup.players = [p1];

      component.onLoadAllDetails(true);
      tick();

      expect(p1.loadStats).toHaveBeenCalledWith(10, mockApiService);
      expect(component.loadingAllDetailsManual).toBeFalse();
    }));
  });

  describe('onLoadAllDetailsForPlayer & Spieler-Interaktionen', () => {
    it('sollte abbrechen, wenn der Spieler im Edit-Modus ist', fakeAsync(() => {
      component.selectedLeague = 10;
      const player = makePlayer(1, 'Kimmich', 10000000);
      player.isInEditMode = true;

      component.onLoadAllDetailsForPlayer(player);
      tick();

      expect(player.stats).not.toBeNull();
    }));

    it('sollte Stats laden und Farben berechnen, wenn stats null ist', fakeAsync(() => {
      component.selectedLeague = 10;
      const player = makePlayer(1, 'Kimmich', 10000000);
      player.stats = null;
      spyOn(player, 'loadStats').and.resolveTo();

      component.onLoadAllDetailsForPlayer(player);
      tick();

      expect(player.loadStats).toHaveBeenCalledWith(10, mockApiService);
    }));

    it('sollte Spieler deaktivieren, wenn stats bereits geladen ist', fakeAsync(() => {
      component.selectedLeague = 10;
      const player = makePlayer(1, 'Kimmich', 10000000);
      player.isKept = false;

      component.onLoadAllDetailsForPlayer(player);
      tick();

      expect(player.isKept).toBeTrue();
    }));

    it('sollte onPlayerValueChanged die Spieleranzahl und Werte neu berechnen', () => {
      const player = makePlayer(1, 'Musiala', 10000000);
      player.isFixedSquad = true;

      component.kickbaseGroup.players = [player];

      component.onPlayerValueChanged(player);

      expect(component.amountPlayers).toBe(1);
    });
  });

  describe('Eingabefelder & Numeral-Berechnungen', () => {
    it('sollte onIncludeAdditionalAmountChanged mit und ohne ExtraAmount berechnen', () => {
      component.minusValue = 1000000;
      component.extraAmount = 200000;

      component.includeAdditionalAmount = true;
      component.onIncludeAdditionalAmountChanged();
      expect(component.amountValue).toBe(800000);

      component.includeAdditionalAmount = false;
      component.onIncludeAdditionalAmountChanged();
      expect(component.amountValue).toBe(1000000);
    });

    it('sollte onOfferOffsetChange im localStorage speichern', () => {
      component.onOfferOffsetChange('2,5');

      expect(component.offerOffset).toBe('2.5');
      expect(localStorage.getItem('offerOffset')).toBe('2.5');
    });

    it('sollte onFridayDateChanged verarbeiten', () => {
      component.onFridayDateChanged('4');

      expect(component.dayUntilFriday).toBe(4);
    });

    it('sollte onLoadStatsAlwaysChanged im localStorage sichern', () => {
      component.loadStatsAlways = false;
      component.onLoadStatsAlwaysChanged();

      expect(localStorage.getItem('loadStatsAlways')).toBe('false');
    });
  });

  describe('amountPlayers Getter', () => {
    it('sollte exakt die Spieler zählen, die behalten werden (isKept) oder fest im Kader sind (isFixedSquad)', () => {
      const p1 = makePlayer(1, 'Spieler 1', 1000);
      const p2 = makePlayer(2, 'Spieler 2', 1000);
      p2.isKept = true;

      const p3 = makePlayer(3, 'Spieler 3', 1000);
      p3.isFixedSquad = true;

      const p4 = makePlayer(4, 'Spieler 4', 1000);
      p4.isFixedSquad = true;
      p4.isDeleted = true;

      component.kickbaseGroup.players = [p1, p2, p3, p4];

      expect(component.amountPlayers).toBe(3);
    });
  });

  describe('Positions-Trenner (shouldShowPositionDivider)', () => {
    beforeEach(() => {
      component.selectedSorting = SortMode.position;
      spyOn(component, 'showPlayer').and.returnValue(true);
    });

    it('sollte false zurückgeben, wenn nicht nach Position sortiert wird', () => {
      component.selectedSorting = SortMode.marketValueDesc;
      const players = [makePlayer(1, 'Neuer', 1000, 0, 1)];

      expect(component.shouldShowPositionDivider(players, 0, false)).toBeFalse();
    });

    it('sollte true für den ersten Spieler einer Position in der Verkaufskandidaten-Sektion zurückgeben', () => {
      const players = [makePlayer(1, 'Neuer', 1000, 0, 1), makePlayer(2, 'Davies', 1000, 0, 2)];

      expect(component.shouldShowPositionDivider(players, 0, false)).toBeTrue();
      expect(component.shouldShowPositionDivider(players, 1, false)).toBeTrue();
    });

    it('sollte false für aufeinanderfolgende Spieler derselben Position in der gleichen Sektion zurückgeben', () => {
      const players = [makePlayer(1, 'Davies', 1000, 0, 2), makePlayer(2, 'Upamecano', 1000, 0, 2)];

      expect(component.shouldShowPositionDivider(players, 0, false)).toBeTrue();
      expect(component.shouldShowPositionDivider(players, 1, false)).toBeFalse();
    });

    it('sollte Spieler des festen Kaders bei der Trenner-Berechnung der Verkaufskandidaten ignorieren', () => {
      const pFixed = makePlayer(1, 'Davies', 1000, 0, 2);
      pFixed.isFixedSquad = true;
      const pSale = makePlayer(2, 'Upamecano', 1000, 0, 2);

      const players = [pFixed, pSale];

      expect(component.shouldShowPositionDivider(players, 1, false)).toBeTrue();
    });

    it('sollte sich auf den vorherigen sichtbaren Spieler derselben Sektion beziehen', () => {
      const p1 = makePlayer(1, 'Neuer', 1000, 0, 1);
      const p2 = makePlayer(2, 'Davies', 1000, 0, 2);
      p2.isFixedSquad = true;
      const p3 = makePlayer(3, 'Nübel', 1000, 0, 1);

      const players = [p1, p2, p3];

      expect(component.shouldShowPositionDivider(players, 2, false)).toBeFalse();
    });

    it('sollte die Filterlogik von showPlayer berücksichtigen', () => {
      const p1 = makePlayer(1, 'Neuer', 1000, 0, 1);
      const p2 = makePlayer(2, 'Nübel', 1000, 0, 1);

      (component.showPlayer as jasmine.Spy).and.callFake((p: KickbasePlayer) => p.id !== 1);

      const players = [p1, p2];

      expect(component.shouldShowPositionDivider(players, 1, false)).toBeTrue();
    });
  });

  describe('Release Notes / Changelog Modal', () => {
    beforeEach(() => {
      component.modalRef = undefined;
    });

    it('sollte das Release Notes Modal öffnen (openReleaseNotes)', () => {
      const mockModalRef = { content: {} } as BsModalRef;
      mockModalService.show.and.returnValue(mockModalRef);

      component.openReleaseNotes();

      expect(mockModalService.show).toHaveBeenCalledWith(
        component.releaseNotesModal,
        jasmine.objectContaining({ class: 'modal-xl' }),
      );
      expect(component.modalRef).toBe(mockModalRef);
    });

    it('sollte das Modal automatisch öffnen, wenn eine neue Version erkannt wird (checkAutoShowReleaseNotes)', () => {
      spyOn(component, 'openReleaseNotes');
      localStorage.removeItem('last_seen_version');

      (component as any).checkAutoShowReleaseNotes();

      expect(component.openReleaseNotes).toHaveBeenCalled();
      expect(localStorage.getItem('last_seen_version')).toBe(component.currentVersion);
    });

    it('sollte das Modal NICHT automatisch öffnen, wenn die Version bereits gesehen wurde', () => {
      spyOn(component, 'openReleaseNotes');
      localStorage.setItem('last_seen_version', component.currentVersion);

      (component as any).checkAutoShowReleaseNotes();

      expect(component.openReleaseNotes).not.toHaveBeenCalled();
    });
  });

  describe('AppComponent - Zusätzliche Abdeckung & Edge Cases', () => {
    describe('createPayPalButton & Window PayPal Integration', () => {
      it('sollte den PayPal Button rendern, wenn window.PayPal vorhanden ist', () => {
        const renderSpy = jasmine.createSpy('render');
        const buttonSpy = jasmine.createSpy('Button').and.returnValue({ render: renderSpy });

        (window as any).PayPal = {
          Donation: {
            Button: buttonSpy,
          },
        };

        component.createPayPalButton();

        expect(buttonSpy).toHaveBeenCalledWith(
          jasmine.objectContaining({
            env: 'production',
            hosted_button_id: 'XV5QAMT6RUMB8',
          }),
        );
        expect(renderSpy).toHaveBeenCalledWith('#donate-button');
      });

      it('sollte abbrechen, wenn window.PayPal.Donation undefiniert ist', () => {
        (window as any).PayPal = {};

        expect(() => component.createPayPalButton()).not.toThrow();
      });

      it('sollte createPayPalButton in ngAfterViewInit aufrufen', () => {
        spyOn(component, 'createPayPalButton');
        spyOn<any>(component, 'checkAutoShowReleaseNotes');

        component.ngAfterViewInit();

        expect(component.createPayPalButton).toHaveBeenCalled();
      });
    });

    describe('ngOnInit Datums- und Uhrzeitlogik', () => {
      it('sollte bei Samstag (dow = 6) dayUntilFriday auf 6 setzen', () => {
        jasmine.clock().mockDate(new Date(2025, 4, 10, 12, 0, 0));

        component.ngOnInit();

        expect(component.dayUntilFriday).toBe(6);
      });

      it('sollte nach 22 Uhr unter der Woche (nicht Freitag) dayUntilFriday dekrementieren', () => {
        jasmine.clock().mockDate(new Date(2025, 4, 14, 23, 0, 0));

        component.ngOnInit();

        expect(component.dayUntilFriday).toBe(1);
      });

      it('sollte am Freitag nach 22 Uhr dayUntilFriday auf 7 setzen', () => {
        jasmine.clock().mockDate(new Date(2025, 4, 16, 22, 30, 0));

        component.ngOnInit();

        expect(component.dayUntilFriday).toBe(7);
      });
    });

    describe('Fehlerbehandlung & Edge Cases in loadLeagues & onSelectedLeagueChanged', () => {
      it('sollte Fehler in loadLeagues abfangen und console.error aufrufen', fakeAsync(() => {
        spyOn(console, 'error');
        mockApiService.getLeagues.and.returnValue(throwError(() => new Error('API Error')));

        component.loadLeagues();
        tick();

        expect(console.error).toHaveBeenCalled();
        expect(component.loadingData).toBeFalse();
      }));

      it('sollte selectedLeague auf null setzen, wenn die API eine leere Ligen-Liste zurückgibt', fakeAsync(() => {
        mockApiService.getLeagues.and.returnValue(of([]));

        component.loadLeagues();
        tick();

        expect(component.selectedLeague).toBeNull();
      }));

      it('sollte abbrechen, wenn eine gewählte Liga nicht in this.leagues gefunden wird', fakeAsync(() => {
        component.leagues = [{ id: 10, name: 'Liga 1' } as any];
        mockApiService.getMarket.and.returnValue(of({ players: [] } as any));

        component.onSelectedLeagueChanged(99);
        tick();

        expect(component.kickbaseGroup.players.length).toBe(0);
      }));

      it('sollte Fehler beim Laden der Liga abfangen (Catch-Block in onSelectedLeagueChanged)', fakeAsync(() => {
        spyOn(console, 'error');
        component.leagues = [{ id: 10, name: 'Liga 1' } as any];
        mockApiService.getMarket.and.returnValue(
          throwError(() => new Error('Market fetch failed')),
        );

        component.onSelectedLeagueChanged(10);
        tick();

        expect(console.error).toHaveBeenCalledWith(
          'Fehler beim Wechseln der Liga:',
          jasmine.any(Error),
        );
        expect(component.loadingData).toBeFalse();
      }));

      it('sollte dauerhaft gelöschte Spieler als isFixedSquad markieren', fakeAsync(() => {
        localStorage.setItem('permantDeletedPlayer_10', JSON.stringify(['101', '102']));
        component.leagues = [{ id: 10, name: 'Liga 1' } as any];

        const p1 = makePlayer(101, 'Kimmich', 1000);
        const p2 = makePlayer(200, 'Musiala', 1000);

        mockApiService.getLeagueOverview.and.returnValue(of({} as any));
        mockApiService.getMarket.and.returnValue(of({ players: [] } as any));
        mockApiService.getLineup.and.returnValue(of({ players: [p1, p2] } as any));

        component.onSelectedLeagueChanged(10);
        tick();

        expect(component.kickbaseGroup.players.find((p) => p.id === 101)?.isFixedSquad).toBeTrue();
        expect(component.kickbaseGroup.players.find((p) => p.id === 200)?.isFixedSquad).toBeFalse();
      }));
    });

    describe('getGift Erfolgsfall', () => {
      it('sollte ein Geschenk erfolgreich einsammeln und reload aufrufen', fakeAsync(() => {
        component.selectedLeague = 10;
        spyOn(component, 'reload');
        mockApiService.collectGift.and.returnValue(of({} as any));

        component.getGift();
        tick();

        expect(mockApiService.collectGift).toHaveBeenCalledWith(10);
        expect(component.reload).toHaveBeenCalled();
      }));

      it('sollte abbrechen, wenn keine Liga ausgewaehlt ist', fakeAsync(() => {
        component.selectedLeague = null;

        component.getGift();
        tick();

        expect(mockApiService.collectGift).not.toHaveBeenCalled();
      }));
    });

    describe('Sortierung Edge Cases', () => {
      it('sollte bei gleicher Marktwertänderung 0 zurückgeben', () => {
        const p1 = makePlayer(1, 'A', 1000, 500);
        const p2 = makePlayer(2, 'B', 1000, 500);

        component.kickbaseGroup.players = [p1, p2];
        component.selectedSorting = SortMode.marketValueChangeAsc;

        component.sortCurrentPlayers();

        expect(component.kickbaseGroup.players.length).toBe(2);
      });

      it('sollte bei undefinierter Marktwertänderung 0 zurückgeben', () => {
        const p1 = makePlayer(1, 'A', 1000);
        p1.stats = null as any;
        const p2 = makePlayer(2, 'B', 1000);

        component.kickbaseGroup.players = [p1, p2];
        component.selectedSorting = SortMode.marketValueChangeDesc;

        component.sortCurrentPlayers();

        expect(component.kickbaseGroup.players.length).toBe(2);
      });

      it('sollte bei gleichem Marktwert 0 zurückgeben (sorting_mw_asc)', () => {
        const p1 = makePlayer(1, 'A', 5000);
        const p2 = makePlayer(2, 'B', 5000);

        component.kickbaseGroup.players = [p1, p2];
        component.selectedSorting = SortMode.marketValueAsc;

        component.sortCurrentPlayers();

        expect(component.kickbaseGroup.players.length).toBe(2);
      });
    });

    describe('Weitere Hilfsmethoden', () => {
      it('sollte getActivePlayersCount und getDisabledPlayersCount korrekt ermitteln', () => {
        const p1 = makePlayer(1, 'A', 1000);
        const p2 = makePlayer(2, 'B', 1000);
        p2.isFixedSquad = true;

        component.kickbaseGroup.players = [p1, p2];

        expect(component.getActivePlayersCount()).toBe(1);
        expect(component.getDisabledPlayersCount()).toBe(1);
      });

      it('sollte onGroupedViewChanged verarbeiten und im localStorage speichern', () => {
        component.isGroupedView = true;
        component.onGroupedViewChanged();

        expect(localStorage.getItem('groupedView')).toBe('true');
        expect(component.showPermanentDeletedPlayers).toBeTrue();
      });

      it('sollte setPrintMode umschalten', () => {
        component.printMode = false;
        component.setPrintMode();
        expect(component.printMode).toBeTrue();
        component.setPrintMode();
        expect(component.printMode).toBeFalse();
      });

      it('sollte onExtraAmountChange ohne Fehler ausführen', () => {
        spyOn(component, 'onIncludeAdditionalAmountChanged');
        component.onExtraAmountChange(500);
        expect(component.onIncludeAdditionalAmountChanged).toHaveBeenCalled();
      });

      it('sollte reload aufrufen', () => {
        spyOn(component, 'loadLeagues');
        component.reload();
        expect(component.loadLeagues).toHaveBeenCalled();
      });
    });
  });
});
