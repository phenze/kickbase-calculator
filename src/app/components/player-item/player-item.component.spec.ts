import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerItemComponent } from './player-item.component';
import { ApiService } from 'src/app/services/api.service';
import { KickbasePlayer } from 'src/app/model/kickbase-player';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { CurrencyPipe, registerLocaleData } from '@angular/common';
import { EuroPipe } from 'src/app/no-decimals.pipe';

import localeDe from '@angular/common/locales/de';

// Deutsche Sprachdaten für den Test registrieren
registerLocaleData(localeDe, 'de-DE');

describe('PlayerItemComponent', () => {
  let component: PlayerItemComponent;
  let fixture: ComponentFixture<PlayerItemComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockPlayer: KickbasePlayer;

  beforeEach(async () => {
    mockApiService = jasmine.createSpyObj('ApiService', ['setPlayerPermanentDeleted']);

    await TestBed.configureTestingModule({
      imports: [PlayerItemComponent, AngularSvgIconModule.forRoot(), CurrencyPipe, EuroPipe],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        provideHttpClient(),
        provideHttpClientTesting(),
        CurrencyPipe,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerItemComponent);
    component = fixture.componentInstance;

    // Standard-Inputs setzen (Required Inputs)
    mockPlayer = new KickbasePlayer(null, 'user123');
    mockPlayer.id = 42;
    mockPlayer.leagueId = 100;
    mockPlayer.isFixedSquad = false;

    component.player = mockPlayer;
    component.printMode = false;

    fixture.detectChanges();
  });

  it('sollte die Komponente erfolgreich erstellen', () => {
    expect(component).toBeTruthy();
  });

  describe('matches', () => {
    it('should render result for finished matches and date for upcoming matches', () => {
      component.player = {
        name: 'Test Player',
        stats: {
          points: 500,
          averagePoints: 50,
          nextThreeOpponents: [
            {
              imageUrl: 'assets/team1.svg',
              isHomeGame: true,
              dayLabel: 'Spieltag 1',
              dateString: '30.08.',
              resultString: '0:0',
              isFinished: false, // Zukünftiges Spiel
            },
            {
              imageUrl: 'assets/team2.svg',
              isHomeGame: false,
              dayLabel: 'Spieltag 32',
              dateString: '02.05.',
              resultString: '3:3',
              isFinished: true, // Vergangenes Spiel
            },
          ],
        },
      } as any;

      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const cardText = compiled.textContent || '';

      // Für das zukünftige Spiel soll das Datum rendern
      expect(cardText).toContain('30.08.');
      // Für das vergangene Spiel soll das Ergebnis rendern
      expect(cardText).toContain('3:3');
      // Beide Spieltage sollen gerendert werden
      expect(cardText).toContain('Spieltag 1');
      expect(cardText).toContain('Spieltag 32');
    });
  });

  describe('Outputs / EventEmitters', () => {
    it('sollte loadDetails emitten, wenn onLoadAllDetailsForPlayer aufgerufen wird', async () => {
      spyOn(component.loadDetails, 'emit');

      await component.onLoadAllDetailsForPlayer();

      expect(component.loadDetails.emit).toHaveBeenCalled();
    });

    it('sollte removePlayer emitten, wenn onRemovePlayer aufgerufen wird', () => {
      spyOn(component.removePlayer, 'emit');

      component.onRemovePlayer();

      expect(component.removePlayer.emit).toHaveBeenCalled();
    });
  });

  describe('errorHandler', () => {
    it('sollte die src-Eigenschaft auf das Not-Found-Bild setzen, wenn das Target ein HTMLImageElement ist', () => {
      const mockImgElement = document.createElement('img');
      const mockEvent = { target: mockImgElement } as unknown as Event;

      component.errorHandler(mockEvent);

      expect(mockImgElement.src).toBe('https://cdn.browshot.com/static/images/not-found.png');
    });

    it('sollte keinen Fehler werfen, wenn das Event-Target null ist', () => {
      const mockEvent = { target: null } as unknown as Event;

      expect(() => component.errorHandler(mockEvent)).not.toThrow();
    });
  });

  describe('onSetPlayerPermanentDeleted', () => {
    it('sollte Event-Propagation stoppen, den Status aktualisieren, die API aufrufen und playerChanged emitten', () => {
      const mockEvent = jasmine.createSpyObj<MouseEvent>('MouseEvent', [
        'stopImmediatePropagation',
        'preventDefault',
      ]);
      spyOn(component.playerChanged, 'emit');

      component.onSetPlayerPermanentDeleted(mockEvent, mockPlayer, true);

      expect(mockEvent.stopImmediatePropagation).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockPlayer.isFixedSquad).toBeTrue();
      expect(mockApiService.setPlayerPermanentDeleted).toHaveBeenCalledWith(100, 42, true);
      expect(component.playerChanged.emit).toHaveBeenCalled();
    });
  });

  describe('Achivements', () => {
    beforeEach(async () => {
      // Dummy Spieler initialisieren
      const mockPlayer = new KickbasePlayer(
        {
          id: '1',
          firstName: 'Max',
          lastName: 'Mustermann',
          mv: 10000000,
          value: 10000000,
          expectedSaleValue: null,
        },
        'user123',
      );
      mockPlayer.stats = {
        buyPriceValue: '10.000.000 €',
        realMarketValueChangeValue: '+100.000 €',
        realMarketValueChangeValuePrecent: '1%',
        threeDaysValues: [],
        threeDaysValuesPercent: [],
        points: 500,
        averagePoints: 50,
        nextThreeOpponents: [],
        buyPrice: 5000000,
      } as any;

      component.player = mockPlayer;
      component.printMode = false;
      component.isMarketOverview = false;

      fixture.detectChanges();
    });

    it('sollte den Erfolgswert anzeigen, wenn achievementsDisabled false ist', () => {
      component.achievementsDisabled = false;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      // Label steht jetzt ohne Doppelpunkt in einer eigenen .metric-label-Box
      expect(compiled.textContent).toContain('Erfolge');
      expect(compiled.textContent).toMatch(/750\.000\s*€/);
    });

    it('sollte "0 €" durchgestrichen anzeigen, wenn achievementsDisabled true ist', () => {
      component.achievementsDisabled = true;
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const strikeElement = compiled.querySelector('.text-decoration-line-through');

      // Label steht jetzt ohne Doppelpunkt in einer eigenen .metric-label-Box
      expect(compiled.textContent).toContain('Erfolge');
      expect(strikeElement).not.toBeNull();
      expect(strikeElement?.textContent).toContain('0 €');
    });
  });
  describe('Print Mode', () => {
    beforeEach(() => {
      component.player = {
        name: 'Max Mustermann',
        marketValue: 15000000,
        color: '#ffffff',
        status: 0,
        imageUrl: 'assets/player.jpg',
        hasOfferFromAny: true,
        value: 16000000,
        valuePercentString: '+6.6%',
        colorOfferValue: '#00ff00',
        isFixedSquad: false,
        isKept: false,
        offsetNumber: 5000000,
        successValue: 750000,
        stats: {
          buyPrice: 10000000,
          realMarketValueChange: 500000,
          realMarketValueChangePercent: '+3.3%',
          threeDaysValues: [{ key: '1', value: 15000000 }],
          threeDaysValuesPercent: [{ key: '1', value: '0%' }],
          points: 1200,
          averagePoints: 120,
          nextThreeOpponents: [
            {
              imageUrl: 'assets/team.png',
              isHomeGame: true,
              dayLabel: 'Spieltag 1',
              dateString: '30.08.',
              resultString: '2:1',
              isFinished: false,
            },
          ],
        },
      } as any;

      component.printMode = true;
      fixture.detectChanges();
    });

    it('sollte Spielername und Marktwert im Print Mode anzeigen', () => {
      const compiled = fixture.nativeElement as HTMLElement;

      // Name prüfen
      expect(compiled.textContent).toContain('Max Mustermann');

      // Marktwert prüfen (mit Euro-Pipe formatiert)
      expect(compiled.textContent).toContain('Marktwert:');
      expect(compiled.textContent).toMatch(/15\.000\.000\s*€/);
    });

    it('sollte keine Finanz-Metriken (Gekauft, MW-Änderung, Gewinn/Verlust, Erfolge) anzeigen', () => {
      const compiled = fixture.nativeElement as HTMLElement;

      expect(compiled.querySelector('.metric-chip')).toBeNull();
      expect(compiled.textContent).not.toContain('Gekauft');
      expect(compiled.textContent).not.toContain('MW-Änderung');
      expect(compiled.textContent).not.toContain('Verlust/Gewinn');
      expect(compiled.textContent).not.toContain('Erfolge');
    });

    it('sollte Angebote, Fixpreis-Eingabe, 3-Tage-Trend, Punkte und Spiele ausblenden', () => {
      const compiled = fixture.nativeElement as HTMLElement;

      // Angebot-Box
      expect(compiled.querySelector('.offer-box')).toBeNull();
      expect(compiled.textContent).not.toContain('Angebot:');

      // Fixpreis-Input
      expect(compiled.querySelector('input[appFormattedNumber]')).toBeNull();
      expect(compiled.textContent).not.toContain('Fixpreis:');

      // Trend-Tabelle
      expect(compiled.querySelector('.trend-box')).toBeNull();
      expect(compiled.textContent).not.toContain('3 Tage Trend');

      // Punkte & Schnitt
      expect(compiled.textContent).not.toContain('Punkte');
      expect(compiled.textContent).not.toContain('Schnitt');

      // Nächste / Vergangene Spiele
      expect(compiled.querySelector('.match-chip')).toBeNull();
      expect(compiled.textContent).not.toContain('Spiele / Gegner');
    });
  });

  describe('Positions-Badge', () => {
    it('sollte das Positions-Badge (z.B. TW) korrekt rendern, wenn eine Position vorhanden ist', () => {
      // Getter überschreiben, um die Logik des Models für diesen Test zu simulieren
      Object.defineProperty(component.player, 'positionLabel', { get: () => 'TW' });
      Object.defineProperty(component.player, 'positionBadgeClass', {
        get: () => 'bg-warning text-dark',
      });

      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const badge = compiled.querySelector('.badge');

      expect(badge).not.toBeNull();
      expect(badge?.textContent?.trim()).toBe('TW');
      expect(badge?.classList.contains('bg-warning')).toBeTrue();
    });

    it('sollte kein Positions-Badge rendern, wenn keine Position (bzw. kein Label) vorhanden ist', () => {
      Object.defineProperty(component.player, 'positionLabel', { get: () => '' });

      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      // Sucht spezifisch nach einem Badge, das durch die Position erzeugt wird
      // (Achte darauf, ob andere Badges im DOM existieren)
      const badgeText = compiled.textContent || '';
      expect(badgeText).not.toContain('TW');
      expect(badgeText).not.toContain('ABW');
    });
  });
});
