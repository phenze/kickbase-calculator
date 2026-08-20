import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerItemComponent } from './player-item.component';
import { ApiService } from '../../services/api.service';
import { KickbasePlayer } from '../../model/kickbase-player';
import { AngularSvgIconModule } from 'angular-svg-icon';

describe('PlayerItemComponent', () => {
  let component: PlayerItemComponent;
  let fixture: ComponentFixture<PlayerItemComponent>;

  beforeEach(async () => {
    const apiServiceSpy = jasmine.createSpyObj<ApiService>(
      'ApiService',
      ['getLeagues', 'getMarket', 'getLineup', 'getToken', 'getGiftStatus', 'collectGift', 'logout'],
      { isLoggedIn: false, userID: 1, data: { lastLeagueId: -1 } }
    );

    await TestBed.configureTestingModule({
      imports: [PlayerItemComponent, AngularSvgIconModule.forRoot()],
      providers: [{ provide: ApiService, useValue: apiServiceSpy }],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlayerItemComponent);
    component = fixture.componentInstance;

    // player/printMode sind required Inputs - muessen vor dem ersten
    // Rendern gesetzt sein, sonst greift das Template auf undefined
    // Properties zu (z.B. player.<irgendwas>.color). calcValues()/
    // calcColors() spiegeln, was AppComponent vor dem Anzeigen eines
    // Spielers ebenfalls immer aufruft.
    const player = new KickbasePlayer(null, 1);
    player.calcValues();
    player.calcColors(0);

    component.player = player;
    component.printMode = false;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
});