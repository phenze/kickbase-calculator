import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerItemComponent } from './player-item.component';
import { ApiService } from 'src/app/services/api.service';
import { KickbasePlayer } from 'src/app/model/kickbase-player';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AngularSvgIconModule } from 'angular-svg-icon';

describe('PlayerItemComponent', () => {
  let component: PlayerItemComponent;
  let fixture: ComponentFixture<PlayerItemComponent>;
  let mockApiService: jasmine.SpyObj<ApiService>;
  let mockPlayer: KickbasePlayer;

  beforeEach(async () => {
    mockApiService = jasmine.createSpyObj('ApiService', ['setPlayerPermanentDeleted']);

    await TestBed.configureTestingModule({
      imports: [PlayerItemComponent, AngularSvgIconModule.forRoot()],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PlayerItemComponent);
    component = fixture.componentInstance;

    // Standard-Inputs setzen (Required Inputs)
    mockPlayer = new KickbasePlayer(null, 'user123');
    mockPlayer.id = 42;
    mockPlayer.leagueId = 100;
    mockPlayer.isPersitantDeleted = false;

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
            isFinished: false // Zukünftiges Spiel
          },
          {
            imageUrl: 'assets/team2.svg',
            isHomeGame: false,
            dayLabel: 'Spieltag 32',
            dateString: '02.05.',
            resultString: '3:3',
            isFinished: true // Vergangenes Spiel
          }
        ]
      }
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
      const mockEvent = jasmine.createSpyObj<MouseEvent>('MouseEvent', ['stopImmediatePropagation', 'preventDefault']);
      spyOn(component.playerChanged, 'emit');

      component.onSetPlayerPermanentDeleted(mockEvent, mockPlayer, true);

      expect(mockEvent.stopImmediatePropagation).toHaveBeenCalled();
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockPlayer.isPersitantDeleted).toBeTrue();
      expect(mockApiService.setPlayerPermanentDeleted).toHaveBeenCalledWith(100, 42, true);
      expect(component.playerChanged.emit).toHaveBeenCalled();
    });
  });
});