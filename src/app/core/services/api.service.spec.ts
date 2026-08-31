import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { KickbaseLeague } from '../models/kickbase-league';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  const baseUrl = 'https://api.kickbase.com/v4/';
  const baseUrlProxy = 'https://pascalhenze.de/kickbase-proxy/api/v4/';
  const mockUserResponse = {
    u: { id: 123 },
    tkn: 'mock-token-123',
    srvl: [],
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('sollte den Service ohne Session-Daten initialisieren', () => {
    service = TestBed.inject(ApiService);

    expect(service.isLoggedIn()).toBeFalse();
    expect(service.userID()).toBeNull();
    expect(service.getToken()).toBeNull();
  });

  it('sollte bei vorhandenem localStorage die Sitzung wiederherstellen', () => {
    localStorage.setItem('kb_token', 'saved-token');
    localStorage.setItem('kb_user_id', '456');

    service = TestBed.inject(ApiService);

    expect(service.isLoggedIn()).toBeTrue();
    expect(service.userID()).toBe('456');
    expect(service.getToken()).toBe('saved-token');
  });

  it('sollte alte legacy localData Daten beim Start migrieren', () => {
    const legacyData = {
      token: 'Bearer legacy-token',
      userID: 789,
      calculatorActive: 'marketOverview',
      lastLeagueId: 5,
    };
    localStorage.setItem('data', JSON.stringify(legacyData));

    service = TestBed.inject(ApiService);

    expect(localStorage.getItem('kb_token')).toBe('legacy-token');
    expect(localStorage.getItem('kb_user_id')).toBe('789');
    expect(localStorage.getItem('data')).toBeNull();
    expect(service.appSettings().lastLeagueId).toBe(5);
  });

  describe('Authentication & Token', () => {
    beforeEach(() => {
      service = TestBed.inject(ApiService);
    });

    it('sollte login erfolgreich ausführen und Daten im sessionStorage speichern', () => {
      let result = false;

      service.login('testuser', 'testpass').subscribe((res) => {
        result = res;
      });

      const req = httpMock.expectOne(`${baseUrlProxy}user/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.em).toBe('testuser');

      req.flush(mockUserResponse);

      expect(result).toBeTrue();
      expect(service.isLoggedIn()).toBeTrue();
      expect(service.userID()).toBe('123');
      expect(service.getToken()).toBe('mock-token-123');
      expect(localStorage.getItem('kb_token')).toBe('mock-token-123');
    });

    it('sollte bei Fehlschlagen von login den Status zurücksetzen', () => {
      let errorOccurred = false;

      service.login('wrong', 'pass').subscribe({
        error: () => (errorOccurred = true),
      });

      const req = httpMock.expectOne(`${baseUrlProxy}user/login`);
      req.flush(null, { status: 400, statusText: 'Bad Request' });

      expect(errorOccurred).toBeTrue();
      expect(service.isLoggedIn()).toBeFalse();
      expect(service.userID()).toBeNull();
      expect(service.getToken()).toBeNull();
    });

    it('sollte logout ausführen und Session löschen', () => {
      localStorage.setItem('kb_token', 'abc');
      localStorage.setItem('kb_user_id', '123');
      service = TestBed.inject(ApiService);

      service.logout();

      expect(service.userID()).toBeNull();
      expect(service.isLoggedIn()).toBeFalse();
      expect(localStorage.getItem('kb_token')).toBeNull();
      expect(localStorage.getItem('kb_user_id')).toBeNull();
    });

    it('sollte login-Anfragen über die baseUrlProxy routen', () => {
      service.login('testuser', 'pass').subscribe();

      // Prüft exakt, dass baseUrlProxy verwendet wurde und NICHT https://api.kickbase.com/v4/
      const req = httpMock.expectOne('https://pascalhenze.de/kickbase-proxy/api/v4/user/login');
      expect(req.request.method).toBe('POST');
      req.flush(mockUserResponse);
    });

    it('sollte refreshToken-Anfragen über die baseUrlProxy routen', () => {
      localStorage.setItem('kb_refresh_token', 'valid-rtkn');

      service.refreshToken().subscribe();

      const req = httpMock.expectOne(
        'https://pascalhenze.de/kickbase-proxy/api/v4/user/refreshtokens',
      );
      expect(req.request.method).toBe('POST');
      req.flush({ tkn: 'new-token' });
    });
  });

  describe('API Requests', () => {
    beforeEach(() => {
      localStorage.setItem('kb_token', 'mock-token');
      localStorage.setItem('kb_user_id', '123');
      service = TestBed.inject(ApiService);
    });

    it('sollte getMarket aufrufen und die Daten zurückgeben', () => {
      const leagueId = 10;
      let response: any;

      service.getMarket(leagueId).subscribe((data) => {
        response = data;
      });

      const req = httpMock.expectOne(`${baseUrl}leagues/${leagueId}/market?sort=expiry`);
      expect(req.request.method).toBe('GET');

      req.flush({ players: [] });
      expect(response).toBeDefined();
    });

    it('sollte getLineup aufrufen', () => {
      const leagueId = 10;
      let response: any;

      service.getLineup(leagueId).subscribe((data) => {
        response = data;
      });

      const req = httpMock.expectOne(`${baseUrl}leagues/${leagueId}/squad`);
      expect(req.request.method).toBe('GET');

      req.flush({ players: [] });
      expect(response).toBeDefined();
    });

    it('sollte collectGift aufrufen', () => {
      const leagueId = 10;
      let response: any;

      service.collectGift(leagueId).subscribe((data) => {
        response = data;
      });

      const req = httpMock.expectOne(`${baseUrl}leagues/${leagueId}/collectgift`);
      expect(req.request.method).toBe('POST');

      req.flush({ success: true });
      expect(response).toBeDefined();
    });

    it('sollte getPlayerStats aufrufen', () => {
      let response: any;

      service.getPlayerStats(10, 99).subscribe((data) => {
        response = data;
      });

      const req = httpMock.expectOne(`${baseUrl}leagues/10/players/99`);
      expect(req.request.method).toBe('GET');

      req.flush({});
      expect(response).toBeDefined();
    });

    it('sollte getMarketValuePlayerStats aufrufen', () => {
      let response: any;

      service.getMarketValuePlayerStats(10, 55).subscribe((data) => {
        response = data;
      });

      const req = httpMock.expectOne(
        `${baseUrl}competitions/1/players/55/marketValue/92?leagueId=10`,
      );
      expect(req.request.method).toBe('GET');

      req.flush({});
      expect(response).toBeDefined();
    });
  });

  describe('LocalStorage Management (AppSettings & gelöschte Spieler)', () => {
    beforeEach(() => {
      service = TestBed.inject(ApiService);
    });

    it('sollte setLastDisplay in AppSettings und localStorage aktualisieren', () => {
      service.setLastDisplay('marketOverview');

      expect(service.appSettings().calculatorActive).toBe('marketOverview');
      expect(localStorage.getItem('app_settings')).toContain('marketOverview');
    });

    it('sollte setLastLeague in AppSettings und localStorage aktualisieren', () => {
      service.setLastLeague(42);

      expect(service.appSettings().lastLeagueId).toBe(42);
      expect(localStorage.getItem('app_settings')).toContain('42');
    });

    it('sollte Spieler dauerhaft als gelöscht im localStorage speichern und entfernen', () => {
      const leagueId = 10;
      const key = `permantDeletedPlayer_${leagueId}`;

      // Spieler hinzufügen
      service.setPlayerPermanentDeleted(leagueId, 100, true);
      expect(localStorage.getItem(key)).toBe(JSON.stringify(['100']));

      // Zweiten Spieler hinzufügen
      service.setPlayerPermanentDeleted(leagueId, 200, true);
      expect(localStorage.getItem(key)).toBe(JSON.stringify(['100', '200']));

      // Ersten Spieler wieder entfernen
      service.setPlayerPermanentDeleted(leagueId, 100, false);
      expect(localStorage.getItem(key)).toBe(JSON.stringify(['200']));
    });

    it('sollte ungültige Speicherwerte in setPlayerPermanentDeleted abfangen', () => {
      const key = 'permantDeletedPlayer_1';

      localStorage.setItem(key, JSON.stringify('ungueltiger_wert'));
      service.setPlayerPermanentDeleted(1, 99, true);

      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      expect(stored).toContain('99');
    });
  });

  describe('getLeagues()', () => {
    beforeEach(() => {
      service = TestBed.inject(ApiService);
    });

    it('sollte Ligen direkt aus dem Signal zurückgeben, falls bereits vorhanden', () => {
      const mockLeague = new KickbaseLeague(null);
      mockLeague.id = 1;
      service.leagues.set([mockLeague]);

      let result: KickbaseLeague[] = [];
      service.getLeagues().subscribe((res) => (result = res));

      expect(result.length).toBe(1);
      httpMock.expectNone(`${baseUrl}leagues/selection`);
    });

    it('sollte Ligen per HTTP abrufen, falls das Signal leer ist', () => {
      let result: KickbaseLeague[] = [];

      service.getLeagues().subscribe((res) => (result = res));

      const req = httpMock.expectOne(`${baseUrl}leagues/selection`);
      expect(req.request.method).toBe('GET');

      req.flush([{ id: '1', name: 'Liga 1' }]);

      expect(result.length).toBe(1);
      expect(service.leagues().length).toBe(1);
    });
  });
});
