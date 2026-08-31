import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketOverviewComponent } from './market-overview.component';
import { ApiService } from '../../core/services/api.service';
import { KickbasePlayer } from '../../core/models/kickbase-player';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CurrencyPipe } from '@angular/common';
import { EuroPipe } from '../../shared/pipes/euro.pipe';

describe('MarketOverviewComponent', () => {
  let component: MarketOverviewComponent;
  let fixture: ComponentFixture<MarketOverviewComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;

  // Typ-Erweiterung für den Helper, um isUntilMarketValueUpdate übergeben zu können
  function makePlayer(
    overrides: Partial<KickbasePlayer> & { isUntilMarketValueUpdate?: boolean } = {},
  ): KickbasePlayer {
    const player = new KickbasePlayer(null, 'user123');
    player.price = 1000;
    player.marketValue = 800;
    player.username = 'User1';

    const { isUntilMarketValueUpdate, ...restOverrides } = overrides;
    Object.assign(player, restOverrides);

    // Da isUntilMarketValueUpdate ein Getter ist, überschreiben wir ihn sauber via Object.defineProperty
    Object.defineProperty(player, 'isUntilMarketValueUpdate', {
      get: () => isUntilMarketValueUpdate ?? false,
      configurable: true,
    });

    return player;
  }

  beforeEach(async () => {
    localStorage.clear();
    mockApiService = jasmine.createSpyObj('ApiService', ['getPlayerStats']);

    await TestBed.configureTestingModule({
      imports: [MarketOverviewComponent, CurrencyPipe, EuroPipe],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        provideHttpClient(),
        provideHttpClientTesting(),
        CurrencyPipe,
      ],
    }).compileComponents();
  });

  function createComponent(): void {
    fixture = TestBed.createComponent(MarketOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('sollte die Komponente erfolgreich erstellen', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  describe('localStorage & Initialisierung', () => {
    it('sollte Filter-Flags aus dem localStorage auslesen', () => {
      localStorage.setItem('onlyManualPrices', 'true');
      localStorage.setItem('onlyKickbasePlayers', 'true');
      localStorage.setItem('onlyUntilMwUpdate', 'true');

      createComponent();

      expect(component.onlyManualPrices).toBeTrue();
      expect(component.onlyKickbasePlayers).toBeTrue();
      expect(component.onlyUntilMwUpdate).toBeTrue();
    });

    it('sollte Standardwerte setzen, wenn localStorage leer ist', () => {
      createComponent();

      expect(component.onlyManualPrices).toBeFalse();
      expect(component.onlyKickbasePlayers).toBeFalse();
      expect(component.onlyUntilMwUpdate).toBeFalse();
    });
  });

  describe('Filter-Methoden & localStorage-Sync', () => {
    beforeEach(() => {
      createComponent();
    });

    it('sollte onOnlyManualPricesChanges im localStorage speichern und filtern', () => {
      component.onlyManualPrices = true;
      component.onOnlyManualPricesChanges();

      expect(localStorage.getItem('onlyManualPrices')).toBe('true');
    });

    it('sollte onOnlyKickbasePlayersChanged im localStorage speichern und filtern', () => {
      component.onlyKickbasePlayers = true;
      component.onOnlyKickbasePlayersChanged();

      expect(localStorage.getItem('onlyKickbasePlayers')).toBe('true');
    });

    it('sollte onOnlyUntilMwUpdateChanged im localStorage speichern und filtern', () => {
      component.onlyUntilMwUpdate = true;
      component.onOnlyUntilMwUpdateChanged();

      expect(localStorage.getItem('onlyUntilMwUpdate')).toBe('true');
    });
  });

  describe('Filter-Logik (filterPlayersToShow)', () => {
    let p1: KickbasePlayer; // Manueller Preis von User
    let p2: KickbasePlayer; // Standard 500k Preis von User
    let p3: KickbasePlayer; // Kickbase-eigener Spieler (ohne User)
    let p4: KickbasePlayer; // Preis == Marktwert
    let p5: KickbasePlayer; // Läuft bis MW-Update ab

    beforeEach(() => {
      p1 = makePlayer({ price: 1200, marketValue: 1000, username: 'UserA' });
      p2 = makePlayer({ price: 500000, marketValue: 1000, username: 'UserB' });
      p3 = makePlayer({ price: 1500, marketValue: 1000, username: '' });
      p4 = makePlayer({ price: 1000, marketValue: 1000, username: 'UserC' });
      p5 = makePlayer({
        price: 2000,
        marketValue: 1500,
        username: '',
        isUntilMarketValueUpdate: true,
      });

      createComponent();
      component.sortedPlayers = [p1, p2, p3, p4, p5];
    });

    it('sollte alle Spieler anzeigen, wenn keine Filter aktiv sind', () => {
      component.ngOnChanges();

      expect(component.playersToShow.length).toBe(5);
    });

    it('sollte nur manuelle Preise filtern (onlyManualPrices = true)', () => {
      component.onlyManualPrices = true;
      component.ngOnChanges();

      expect(component.playersToShow).toEqual([p1]);
    });

    it('sollte nur Kickbase-Spieler filtern (onlyKickbasePlayers = true)', () => {
      component.onlyKickbasePlayers = true;
      component.ngOnChanges();

      expect(component.playersToShow).toEqual([p3, p5]);
    });

    it('sollte nur Spieler anzeigen, die bis zum MW-Update ablaufen (onlyUntilMwUpdate = true)', () => {
      component.onlyUntilMwUpdate = true;
      component.ngOnChanges();

      expect(component.playersToShow).toEqual([p5]);
    });

    it('sollte bei aktivierten gegensätzlichen Filtern ein leeres Array zurückgeben', () => {
      component.onlyManualPrices = true;
      component.onlyKickbasePlayers = true;
      component.onlyUntilMwUpdate = true;
      component.ngOnChanges();

      expect(component.playersToShow.length).toBe(0);
    });

    it('should filter out user-offered players when onlyKickbasePlayers is true', () => {
      const playerSystem = makePlayer({ name: 'Weiser', username: '' });
      const playerUser = makePlayer({ name: 'Grifo', username: 'harti' });

      component.sortedPlayers = [playerSystem, playerUser];
      component.onlyKickbasePlayers = true;
      component.onlyManualPrices = false;
      component.onlyUntilMwUpdate = false;

      component.ngOnChanges();

      expect(component.playersToShow.length).toBe(1);
      expect(component.playersToShow[0].name).toBe('Weiser');
    });

    it('should filter only user-offered players with manual prices when onlyManualPrices is true', () => {
      const playerSystem = makePlayer({
        name: 'Weiser',
        marketValue: 4673252,
        price: 4673252,
        username: '',
      });

      const playerUserManual = makePlayer({
        name: 'Grifo',
        marketValue: 12316047,
        price: 16500000,
        username: 'harti',
      });

      component.sortedPlayers = [playerSystem, playerUserManual];
      component.onlyKickbasePlayers = false;
      component.onlyManualPrices = true;
      component.onlyUntilMwUpdate = false;

      component.ngOnChanges();

      expect(component.playersToShow.length).toBe(1);
      expect(component.playersToShow[0].name).toBe('Grifo');
    });
  });

  describe('Outputs / EventEmitters', () => {
    beforeEach(() => {
      createComponent();
    });

    it('sollte loadDetails emitten, wenn onLoadAllDetailsForPlayer aufgerufen wird', () => {
      spyOn(component.loadDetails, 'emit');
      const testPlayer = makePlayer();

      component.onLoadAllDetailsForPlayer(testPlayer);

      expect(component.loadDetails.emit).toHaveBeenCalledWith(testPlayer);
    });

    it('sollte onReload emitten, wenn reload aufgerufen wird', () => {
      spyOn(component.onReload, 'emit');

      component.reload();

      expect(component.onReload.emit).toHaveBeenCalled();
    });
  });
});
