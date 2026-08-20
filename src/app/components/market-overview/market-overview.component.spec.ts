import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MarketOverviewComponent } from './market-overview.component';
import { ApiService } from 'src/app/services/api.service';
import { KickbasePlayer } from 'src/app/model/kickbase-player';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SimpleChange } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

describe('MarketOverviewComponent', () => {
  let component: MarketOverviewComponent;
  let fixture: ComponentFixture<MarketOverviewComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;

  function makePlayer(overrides: Partial<KickbasePlayer> = {}): KickbasePlayer {
    const player = new KickbasePlayer(null, 'user123');
    player.price = 1000;
    player.marketValue = 800;
    player.username = 'User1';
    Object.assign(player, overrides);
    return player;
  }

  beforeEach(async () => {
    localStorage.clear();
    mockApiService = jasmine.createSpyObj('ApiService', ['getPlayerStats']);

    await TestBed.configureTestingModule({
      imports: [MarketOverviewComponent, AngularSvgIconModule.forRoot()],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
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

      createComponent();

      expect(component.onlyManualPrices).toBeTrue();
      expect(component.onlyKickbasePlayers).toBeTrue();
    });

    it('sollte Standardwerte setzen, wenn localStorage leer ist', () => {
      createComponent();

      expect(component.onlyManualPrices).toBeFalse();
      expect(component.onlyKickbasePlayers).toBeFalse();
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
  });

  describe('Filter-Logik (filterPlayersToShow)', () => {
    let p1: KickbasePlayer; // Manueller Preis von User
    let p2: KickbasePlayer; // Standard 500k Preis von User
    let p3: KickbasePlayer; // Kickbase-eigener Spieler (ohne User)
    let p4: KickbasePlayer; // Preis == Marktwerkt

    beforeEach(() => {
      p1 = makePlayer({ price: 1200, marketValue: 1000, username: 'UserA' });
      p2 = makePlayer({ price: 500000, marketValue: 1000, username: 'UserB' });
      p3 = makePlayer({ price: 1500, marketValue: 1000, username: '' });
      p4 = makePlayer({ price: 1000, marketValue: 1000, username: 'UserC' });

      createComponent();
      component.sortedPlayers = [p1, p2, p3, p4];
    });

    it('sollte alle Spieler anzeigen, wenn keine Filter aktiv sind', () => {
      component.ngOnChanges();

      expect(component.playersToShow.length).toBe(4);
    });

    it('sollte nur manuelle Preise filtern (onlyManualPrices = true)', () => {
      component.onlyManualPrices = true;
      component.ngOnChanges();

      expect(component.playersToShow).toEqual([p1]);
    });

    it('sollte nur Kickbase-Spieler filtern (onlyKickbasePlayers = true)', () => {
      component.onlyKickbasePlayers = true;
      component.ngOnChanges();

      expect(component.playersToShow).toEqual([p3]);
    });

    it('sollte bei aktivierten gegensätzlichen Filtern ein leeres Array zurückgeben', () => {
      component.onlyManualPrices = true;
      component.onlyKickbasePlayers = true;
      component.ngOnChanges();

      expect(component.playersToShow.length).toBe(0);
    });

    it('should filter out user-offered players when onlyKickbasePlayers is true', () => {
    const playerSystem = new KickbasePlayer({ i: '1', n: 'Weiser', exs: 2000 }, '123');
    const playerUser = new KickbasePlayer({ i: '2', n: 'Grifo', u: { n: 'harti' } }, '123');

    component.sortedPlayers = [playerSystem, playerUser];
    component.onlyKickbasePlayers = true;
    component.onlyManualPrices = false;

    // Filter ausführen via Lifecycle Hook
    component.ngOnChanges();

    expect(component.playersToShow.length).toBe(1);
    expect(component.playersToShow[0].name).toBe('Weiser');
  });

  it('should filter only user-offered players with manual prices when onlyManualPrices is true', () => {
    const playerSystem = new KickbasePlayer({ i: '1', n: 'Weiser', prc: 5000000, mv: 5000000 }, '123');
    const playerUserManual = new KickbasePlayer({ i: '2', n: 'Grifo', prc: 16500000, mv: 12316047, u: { n: 'harti' } }, '123');

    component.sortedPlayers = [playerSystem, playerUserManual];
    component.onlyKickbasePlayers = false;
    component.onlyManualPrices = true;

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