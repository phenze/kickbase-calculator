import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { ApiService } from './services/api.service';
import { BsModalService, BsModalRef } from 'ngx-bootstrap/modal';
import { ChangeDetectorRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { KickbasePlayer } from './model/kickbase-player';
import { KickbaseLeague } from './model/kickbase-league';
import { KickbaseMarket } from './model/kickbase-market';
import { KickbasePlayerStats } from './model/kickbase-player-stats';
import numeral from 'numeral';

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockModalService: jasmine.SpyObj<BsModalService>;

  function makePlayer(id: number, name: string, marketValue: number, change = 0): KickbasePlayer {
    const player = new KickbasePlayer(null, 'user123');
    player.id = id;
    player.name = name;
    player.marketValue = marketValue;
    player.value = marketValue;
    player.price = marketValue;
    player.expiry = id * 100;

    const stats = new KickbasePlayerStats(null);
    stats.realMarketValueChange = change;
    player.stats = stats;

    return player;
  }

  beforeEach(async () => {
    localStorage.clear();
    numeral.locale('de');

    mockApiService = jasmine.createSpyObj('ApiService', [
      'getToken',
      'getLeagues',
      'getMarket',
      'getLineup',
      'setLastLeague',
      'setLastDisplay',
      'collectGift',
      'logout'
    ], {
      data: { lastLeagueId: -1 },
      isLoggedIn: true,
      userID: 'user123'
    });

    // Test-Spieler fuer den Markt anlegen
    const sampleMarketPlayer = makePlayer(1, 'Müller', 10000000);
    sampleMarketPlayer.loadStats = jasmine.createSpy('loadStats').and.resolveTo();

    // Standard-Mocks mit befülltem Markt konfigurieren
    mockApiService.getLeagues.and.resolveTo([{ id: 10, name: 'Liga 1', budget: 10000000 } as any]);
    mockApiService.getMarket.and.resolveTo({ 
      players: [sampleMarketPlayer], 
      offerAmountForUser: '500000' 
    } as any);
    mockApiService.getLineup.and.resolveTo({ 
      players: [sampleMarketPlayer] 
    } as any);

    mockModalService = jasmine.createSpyObj('BsModalService', ['show']);

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: BsModalService, useValue: mockModalService },
        ChangeDetectorRef
      ],
      schemas: [NO_ERRORS_SCHEMA]
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

    it('sollte Leuchten laden, wenn ApiService.isLoggedIn true ist', () => {
      mockApiService.getLeagues.and.resolveTo([]);

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
      mockApiService.getToken.and.resolveTo(true);
      mockApiService.getLeagues.and.resolveTo([]);

      component.login({ username: 'testuser', password: 'password' });
      tick();

      expect(mockApiService.getToken).toHaveBeenCalledWith('testuser', 'password');
      expect(component.displayMode).toBe(AppComponent.display_mode_calculator);
      expect(mockApiService.getLeagues).toHaveBeenCalled();
    }));

    it('sollte bei fehlerhaftem Login einen Alert anzeigen', fakeAsync(() => {
      spyOn(window, 'alert');
      mockApiService.getToken.and.resolveTo(false);

      component.login({ username: 'wrong', password: 'bad' });
      tick();

      expect(window.alert).toHaveBeenCalledWith('Bitte Username und Passwort überprüfen');
      expect(component.doLogin).toBeFalse();
    }));

    it('sollte beim Logout die Session und Gruppe zurücksetzen', () => {
      component.newplayername = 'Test';
      component.kickbaseGroup.players = [makePlayer(1, 'Müller', 1000)];

      component.logout();

      expect(mockApiService.logout).toHaveBeenCalled();
      expect(component.newplayername).toBe('');
      expect(component.kickbaseGroup.players.length).toBe(0);
    });
  });

  describe('loadLeagues & onSelectedLeagueChanged', () => {
    beforeEach(() => {
      const mockLeague10: KickbaseLeague = { id: 10, name: 'Bundesliga', budget: 10000000 } as any;
      const mockLeague20: KickbaseLeague = { id: 20, name: '2. Bundesliga', budget: 5000000 } as any;
      mockApiService.getLeagues.and.resolveTo([mockLeague10, mockLeague20]);
      mockApiService.getMarket.and.resolveTo({ players: [], offerAmountForUser: '500000' } as any);
      mockApiService.getLineup.and.resolveTo({ players: [makePlayer(1, 'Neuer', 5000000)] } as any);
    });

    it('sollte eine Liga als String aus lastLeagueId korrekt als Zahl auswählen', fakeAsync(() => {
      // Spy-Property mit Object.defineProperty überschreiben, damit der Getter '20' zurückgibt
      Object.defineProperty(mockApiService, 'data', {
        get: () => ({ lastLeagueId: '20' }),
        configurable: true
      });

      component.loadLeagues();
      tick();

      expect(component.selectedLeague).toBe(20);
      expect(mockApiService.setLastLeague).toHaveBeenCalledWith(20);
      expect(component.kickbaseGroup.players.length).toBe(1);
    }));

    it('sollte eine Liga als Number aus lastLeagueId auswählen', fakeAsync(() => {
      Object.defineProperty(mockApiService, 'data', {
        get: () => ({ lastLeagueId: 10 }),
        configurable: true
      });

      component.loadLeagues();
      tick();

      expect(component.selectedLeague).toBe(10);
      expect(mockApiService.setLastLeague).toHaveBeenCalledWith(10);
    }));

    it('sollte selectedLeague auf null setzen, wenn lastLeagueId = -1 ist', fakeAsync(() => {
      Object.defineProperty(mockApiService, 'data', {
        get: () => ({ lastLeagueId: -1 }),
        configurable: true
      });

      component.loadLeagues();
      tick();

      expect(component.selectedLeague).toBeNull();
      expect(mockApiService.setLastLeague).not.toHaveBeenCalled();
    }));

    it('sollte selectedLeague auf null setzen, wenn lastLeagueId undefined ist', fakeAsync(() => {
      Object.defineProperty(mockApiService, 'data', {
        get: () => ({ lastLeagueId: undefined }),
        configurable: true
      });

      component.loadLeagues();
      tick();

      expect(component.selectedLeague).toBeNull();
      expect(mockApiService.setLastLeague).not.toHaveBeenCalled();
    }));

    it('sollte selectedLeague auf null setzen, wenn die gespeicherte lastLeagueId in den geladenen Ligen nicht existiert', fakeAsync(() => {
      Object.defineProperty(mockApiService, 'data', {
        get: () => ({ lastLeagueId: '999' }),
        configurable: true
      });

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
    it('sollte einen neuen Spieler manuell hinzufügen', () => {
      component.newplayername = 'Kimmich';
      component.newplayeramount = 15000000;

      component.onAddPlayer();

      expect(component.kickbaseGroup.players.length).toBe(1);
      expect(component.kickbaseGroup.players[0].name).toBe('Kimmich');
      expect(component.newplayername).toBe('');
      expect(component.newplayeramount).toBe(0);
    });

    it('sollte einen Spieler als gelöscht markieren (onRemovePlayer)', () => {
      const player = makePlayer(1, 'Kane', 20000000);
      component.kickbaseGroup.players = [player];

      component.onRemovePlayer(player);

      expect(player.isDeleted).toBeTrue();
    });

    it('sollte den Deaktivierungs-Status eines Spielers umschalten (onDeactivatePlayer)', () => {
      const player = makePlayer(1, 'Musiala', 18000000);
      player.isDeactivated = false;

      component.onDeactivatePlayer(player);

      expect(player.isDeactivated).toBeTrue();
    });

    it('sollte filterbezogene Sichtbarkeit mit showPlayer prüfen', () => {
      const pNormal = makePlayer(1, 'A', 1000);
      const pDeleted = makePlayer(2, 'B', 1000);
      pDeleted.isDeleted = true;

      const pPermDeleted = makePlayer(3, 'C', 1000);
      pPermDeleted.isPersitantDeleted = true;

      expect(component.showPlayer(pNormal)).toBeTrue();
      expect(component.showPlayer(pDeleted)).toBeFalse();

      component.showPermanentDeletedPlayers = false;
      expect(component.showPlayer(pPermDeleted)).toBeFalse();
    });
  });

  describe('achivements', () => {
    it('sollte achievementsDisabled beim Ligawechsel aus der Liga übernehmen', async () => {
    const mockLeagueWithAmd = new KickbaseLeague({ id: 1, name: 'Liga 1', lm: { amd: true } });
    component.leagues = [mockLeagueWithAmd];

    mockApiService.getMarket.and.resolveTo([] as any);
    mockApiService.getLineup.and.resolveTo({ players: [] } as any);

    await component.onSelectedLeagueChanged(1);

    expect(component.achievementsDisabled).toBeTrue();
  });

  it('sollte achievementsDisabled = false setzen, wenn die Liga amd = false hat', async () => {
    const mockLeagueNormal = new KickbaseLeague({ id: 2, name: 'Liga 2', lm: { amd: false } });
    component.leagues = [mockLeagueNormal];

    mockApiService.getMarket.and.resolveTo([] as any);
    mockApiService.getLineup.and.resolveTo({ players: [] } as any);

    await component.onSelectedLeagueChanged(2);

    expect(component.achievementsDisabled).toBeFalse();
  });

  it('sollte achievementsDisabled an kickbaseGroup.calcValues übergeben', () => {
    spyOn(component.kickbaseGroup, 'calcValues');
    component.achievementsDisabled = true;

    component.refreshGroups();

    expect(component.kickbaseGroup.calcValues).toHaveBeenCalledWith(
      component.amountValue,
      component.includeMinusMarketValues,
      component.dayUntilFriday,
      true
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

    it('should sort Kickbase players by expiry and move user-offered players to the end', () => {
      component.displayMode = AppComponent.display_mode_market_overview;
      component.selectedSorting = component.sorting_default;

      // Test-Spieler-Setup:
      // 1. Kickbase-Spieler (läuft spät ab)
      const playerKbLate = new KickbasePlayer({ i: '1', n: 'Müller', exs: 10000 }, '123');
      // 2. Kickbase-Spieler (läuft früh ab)
      const playerKbEarly = new KickbasePlayer({ i: '2', n: 'Goretzka', exs: 1000 }, '123');
      // 3. User-Spieler (kein exs, von Mitspieler angeboten)
      const playerUser = new KickbasePlayer({ i: '3', n: 'Grifo', u: { n: 'harti' } }, '123');

      // Unsortierte Ausgangslage: User-Spieler zuerst, dann später KB-Spieler, dann früher KB-Spieler
      component.currentMarket = {
        players: [playerUser, playerKbLate, playerKbEarly]
      } as any;

      component.sortCurrentPlayers();

      const result = component.marketOverviewPlayers.map(p => p.name);

      // Erwartete Reihenfolge: Goretzka (1000s), Müller (10000s), Grifo (User)
      expect(result).toEqual(['Goretzka', 'Müller', 'Grifo']);
    });

    it('sollte Spieler nach Marktwert aufsteigend sortieren', () => {
      component.selectedSorting = component.sorting_mw_asc;
      component.sortCurrentPlayers();

      expect(component.kickbaseGroup.players[0].id).toBe(2);
      expect(component.kickbaseGroup.players[1].id).toBe(1);
    });

    it('sollte Spieler nach Marktwert absteigend sortieren', () => {
      component.selectedSorting = component.sorting_mw_desc;
      component.sortCurrentPlayers();

      expect(component.kickbaseGroup.players[0].id).toBe(1);
      expect(component.kickbaseGroup.players[1].id).toBe(2);
    });

    it('sollte Spieler nach Marktwertveränderung aufsteigend sortieren', () => {
      component.selectedSorting = component.sorting_mw_change_asc;
      component.sortCurrentPlayers();

      expect(component.kickbaseGroup.players[0].id).toBe(2);
      expect(component.kickbaseGroup.players[1].id).toBe(1);
    });

    it('sollte Speichern der Sortierung im localStorage ausführen', () => {
      component.onSelectedSortingChanged(component.sorting_mw_desc);

      expect(localStorage.getItem('sorting')).toBe('1');
    });
  });

  describe('Geschenk abholen & Fehlerbehandlung', () => {
    it('sollte Modal öffnen, wenn getGift fehlschlägt', fakeAsync(() => {
      component.selectedLeague = 10;
      mockApiService.collectGift.and.rejectWith('Gift already collected');
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
      mockApiService.getMarket.and.resolveTo({ players: [] } as any);

      component.switchDisplay(AppComponent.display_mode_market_overview);
      tick();

      expect(component.displayMode).toBe(AppComponent.display_mode_market_overview);
      expect(mockApiService.setLastDisplay).toHaveBeenCalledWith(AppComponent.display_mode_market_overview);
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

      mockApiService.getMarket.and.resolveTo({ players: [p1], offerAmountForUser: '0' } as any);

      component.reloadMarket(true);
      tick();

      expect(component.loadingData).toBeFalse();
      expect(p1.loadStats).toHaveBeenCalled();
      expect(p1.calcValues).toHaveBeenCalled();
      expect(p1.isDeactivated).toBeTrue();
    }));

    it('sollte onLoadAllDetails im Market Overview Modus für alle Spieler laden', fakeAsync(() => {
      component.displayMode = AppComponent.display_mode_market_overview;
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
      component.displayMode = AppComponent.display_mode_calculator;
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
      player.isDeactivated = false;

      component.onLoadAllDetailsForPlayer(player);
      tick();

      expect(player.isDeactivated).toBeTrue();
    }));

    it('sollte onPlayerValueChanged die Spieleranzahl und Werte neu berechnen', () => {
      const player = makePlayer(1, 'Musiala', 10000000);
      player.isPersitantDeleted = true;

      component.onPlayerValueChanged(player);

      expect(component.amountPlayers).toBe(1);
    });
  });

  describe('Eingabefelder & Numeral-Berechnungen', () => {
    it('sollte onMinusValueChanged verarbeiten', () => {
      component.onMinusValueChanged('1.500.000');

      expect(component.minusValue).toBe(1500000);
      expect(component.minusValueString).toBe('1 500 000');
    });

    it('sollte onExtraAmountChange verarbeiten', () => {
      component.onExtraAmountChange('250.000');

      expect(component.extraAmount).toBe(250000);
      expect(component.extraAmountString).toBe('250 000');
    });

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
});