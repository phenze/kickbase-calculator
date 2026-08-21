import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  const baseUrl = 'https://api.kickbase.com/v4/';
  const mockUserResponse = {
    u: { id: 123 },
    tkn: 'mock-token-123',
    srvl: []
  };

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('sollte den Service ohne localStorage-Daten initialisieren', () => {
    service = TestBed.inject(ApiService);

    expect(service.isLoggedIn).toBeFalse();
    expect(service.data).toBeNull();
    expect(service.token).toBe('');
  });

  it('sollte bei vorhandenem localStorage die Sitzung wiederherstellen', () => {
    const mockData = {
      token: 'saved-token',
      userID: 456,
      username: 'user',
      password: 'pass'
    };
    localStorage.setItem('data', JSON.stringify(mockData));

    service = TestBed.inject(ApiService);

    expect(service.isLoggedIn).toBeTrue();
    expect(service.userID).toBe(456);
    expect(service.token).toBe('Bearer saved-token');
  });

  describe('Authentication & Token', () => {
    beforeEach(() => {
      service = TestBed.inject(ApiService);
    });

    it('sollte getToken erfolgreich ausführen und Daten im localStorage speichern', fakeAsync(() => {
      let result = false;
      service.getToken('testuser', 'testpass').then(res => (result = res));

      const req = httpMock.expectOne(`${baseUrl}user/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.em).toBe('testuser');

      req.flush(mockUserResponse);
      tick();

      expect(result).toBeTrue();
      expect(service.isLoggedIn).toBeTrue();
      expect(service.userID).toBe(123);
      expect(service.token).toBe('Bearer mock-token-123');
      expect(localStorage.getItem('data')).toContain('mock-token-123');
    }));

    it('sollte refreshToken ausführen und das Token aktualisieren', fakeAsync(() => {
      service.data = { username: 'testuser', password: 'testpass' };

      let result = false;
      service.refreshToken().then(res => (result = res));

      const req = httpMock.expectOne(`${baseUrl}user/login`);
      req.flush(mockUserResponse);
      tick();

      expect(result).toBeTrue();
      expect(service.token).toBe('Bearer mock-token-123');
    }));

    it('sollte bei Fehlschlagen von getToken ausloggen', fakeAsync(() => {
      let errorOccurred = false;
      service.getToken('wrong', 'pass').catch(() => (errorOccurred = true));

      const req = httpMock.expectOne(`${baseUrl}user/login`);
      req.flush(null, { status: 400, statusText: 'Bad Request' });
      tick();

      expect(errorOccurred).toBeTrue();
      expect(service.isLoggedIn).toBeFalse();
      expect(service.data).toBeNull();
    }));

    it('sollte logout ausführen und Session löschen', () => {
      service.data = { token: 'abc' };
      service.isLoggedIn = true;
      localStorage.setItem('data', JSON.stringify(service.data));

      service.logout();

      expect(service.data).toBeNull();
      expect(service.isLoggedIn).toBeFalse();
      expect(localStorage.getItem('data')).toBeNull();
    });
  });

  describe('API Requests', () => {
    beforeEach(() => {
      service = TestBed.inject(ApiService);
      service.token = 'Bearer mock-token';
      service.data = { username: 'u', password: 'p', leagues: [] };
    });

    it('sollte getMarket aufrufen und die Daten zurückgeben', fakeAsync(() => {
      const leagueId = 10;
      service.getMarket(leagueId);

      const req = httpMock.expectOne(`${baseUrl}leagues/${leagueId}/market?sort=expiry`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-token');

      req.flush({ players: [] });
      tick();
    }));

    it('sollte getLineup aufrufen', fakeAsync(() => {
      const leagueId = 10;
      service.getLineup(leagueId);

      const req = httpMock.expectOne(`${baseUrl}leagues/${leagueId}/squad`);
      expect(req.request.method).toBe('GET');

      req.flush({ players: [] });
      tick();
    }));

    it('sollte collectGift aufrufen', fakeAsync(() => {
      const leagueId = 10;
      service.collectGift(leagueId);

      const req = httpMock.expectOne(`${baseUrl}leagues/${leagueId}/collectgift`);
      expect(req.request.method).toBe('POST');

      req.flush({ success: true });
      tick();
    }));

    it('sollte getPlayerStats aufrufen', fakeAsync(() => {
      service.getPlayerStats(10, 99);

      const req = httpMock.expectOne(`${baseUrl}competitions/1/players/99?leagueId=10`);
      expect(req.request.method).toBe('GET');

      req.flush({});
      tick();
    }));

    it('sollte bei 401-Fehler das Token refreshen und den Call erneut versuchen', fakeAsync(() => {
      const leagueId = 10;
      service.getMarket(leagueId);

      // Erster Request schlägt mit 401 fehl
      const firstReq = httpMock.expectOne(`${baseUrl}leagues/${leagueId}/market?sort=expiry`);
      firstReq.flush(null, { status: 401, statusText: 'Unauthorized' });
      tick();

      // Refresh-Token Request wird ausgelöst
      const refreshReq = httpMock.expectOne(`${baseUrl}user/login`);
      refreshReq.flush(mockUserResponse);
      tick();

      // Erneuter Aufruf des ursprünglichen API-Calls
      const retryReq = httpMock.expectOne(`${baseUrl}leagues/${leagueId}/market?sort=expiry`);
      expect(retryReq.request.headers.get('Authorization')).toBe('Bearer mock-token-123');

      retryReq.flush({ players: [] });
      tick();
    }));
  });

  describe('localStorage Helper-Methoden', () => {
    beforeEach(() => {
      service = TestBed.inject(ApiService);
      service.data = { calculatorActive: 'calc', lastLeagueId: 1 };
    });

    it('sollte setLastDisplay im localStorage aktualisieren', () => {
      service.setLastDisplay('marketOverview');

      expect(service.data.calculatorActive).toBe('marketOverview');
      expect(localStorage.getItem('data')).toContain('marketOverview');
    });

    it('sollte setLastLeague im localStorage aktualisieren', () => {
      service.setLastLeague(42);

      expect(service.data.lastLeagueId).toBe(42);
      expect(localStorage.getItem('data')).toContain('42');
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
  });
  describe('Erweiterte Testabdeckung (Fehlerpfade & fehlende Methoden)', () => {
  beforeEach(() => {
    service = TestBed.inject(ApiService);
    service.token = 'Bearer mock-token';
    service.data = { username: 'user', password: 'pass', calculatorActive: 'calc', lastLeagueId: 1, leagues: [] };
  });

  describe('Constructor & Login Edge Cases', () => {
    it('sollte refreshToken im Constructor aufrufen, wenn userID in localStorage fehlt', () => {
      // Vorab den localStorage präparieren
      localStorage.setItem('data', JSON.stringify({ token: 'xyz', userID: null }));

      // Neues Instance-Testing erzwingen, da TestBed.inject() ein Singleton zurückgibt
      const http = TestBed.inject(HttpClient);
      const newService = new ApiService(http);

      const req = httpMock.expectOne(`${baseUrl}user/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockUserResponse);
    });

    it('sollte getToken mit bestehenden data-Werten korrekt verarbeiten', fakeAsync(() => {
      let result = false;
      service.getToken('newuser', 'newpass').then(res => (result = res));

      const req = httpMock.expectOne(`${baseUrl}user/login`);
      req.flush(mockUserResponse);
      tick();

      expect(result).toBeTrue();
      expect(service.data.calculatorActive).toBe('calc');
      expect(service.data.lastLeagueId).toBe(1);
    }));

    it('sollte im Catch-Block von refreshToken ausloggen', fakeAsync(() => {
      let error: any;
      service.refreshToken().catch(e => (error = e));

      const req = httpMock.expectOne(`${baseUrl}user/login`);
      req.flush('Error', { status: 500, statusText: 'Server Error' });
      tick();

      expect(error).toBe('error');
      expect(service.isLoggedIn).toBeFalse();
    }));
  });

  describe('getLeagues()', () => {
    it('sollte Ligen nach Token-Refresh zurückgeben', fakeAsync(() => {
      const mockLeagues = [{ id: 1, name: 'Liga 1' }];

      service.data.leagues = mockLeagues;
      localStorage.setItem('data', JSON.stringify(service.data));

      let leaguesResult: any;
      service.getLeagues().then(res => (leaguesResult = res));

      const refreshReq = httpMock.expectOne(`${baseUrl}user/login`);

      const mockUserAny = mockUserResponse as any;
      refreshReq.flush({
        ...mockUserResponse,
        srvl: mockLeagues,
        leagues: mockLeagues,
        l: mockLeagues,
        u: { ...(mockUserAny?.u || {}), srvl: mockLeagues, leagues: mockLeagues }
      });
      tick();

      expect(leaguesResult).toEqual([
        jasmine.objectContaining({ id: 1, name: 'Liga 1' })
      ]);
    }));

    it('sollte bei Fehler abbrechen', fakeAsync(() => {
      let error: any;
      service.getLeagues().catch(e => (error = e));

      const refreshReq = httpMock.expectOne(`${baseUrl}user/login`);
      refreshReq.flush(null, { status: 500, statusText: 'Server Error' });
      tick();

      expect(error).toBe('error');
    }));
  });

  describe('getGiftStatus() & collectGift()', () => {
    it('sollte getGiftStatus erfolgreich aufrufen', fakeAsync(() => {
      service.getGiftStatus(10);

      const req = httpMock.expectOne(`${baseUrl}leagues/10/currentgift`);
      expect(req.request.method).toBe('GET');
      req.flush({ level: 1 });
      tick();
    }));

    it('sollte Fehler bei collectGift abfangen', fakeAsync(() => {
      let error: any;
      service.collectGift(10).catch(e => (error = e));

      const req = httpMock.expectOne(`${baseUrl}leagues/10/collectgift`);
      req.flush({ error: 'Gift error' }, { status: 400, statusText: 'Bad Request' });
      tick();

      // Erwartet das geworfene Error-Objekt der API-Antwort
      expect(error).toEqual({ error: 'Gift error' });
    }));
  });

  describe('getMarketValuePlayerStats()', () => {
    it('sollte Marktwerte-Statistiken abrufen', fakeAsync(() => {
      service.getMarketValuePlayerStats(10, 55);

      const req = httpMock.expectOne(`${baseUrl}competitions/1/players/55/marketValue/92?leagueId=10`);
      expect(req.request.method).toBe('GET');
      req.flush({});
      tick();
    }));
  });

  describe('API-Fehlerpfade (Nicht-401 Fehler)', () => {
    it('sollte bei 500er Fehlern in getMarket fehlschlagen', fakeAsync(() => {
      let error: any;
      service.getMarket(10).catch(e => (error = e));

      const req = httpMock.expectOne(`${baseUrl}leagues/10/market?sort=expiry`);
      req.flush(null, { status: 500, statusText: 'Internal Error' });
      tick();

      expect(error).toBe('error');
    }));

    it('sollte bei 500er Fehlern in getLineup fehlschlagen', fakeAsync(() => {
      let error: any;
      service.getLineup(10).catch(e => (error = e));

      const req = httpMock.expectOne(`${baseUrl}leagues/10/squad`);
      req.flush(null, { status: 500, statusText: 'Internal Error' });
      tick();

      expect(error).toBe('error');
    }));

    it('sollte bei 500er Fehlern in getPlayerStats fehlschlagen', fakeAsync(() => {
      let error: any;
      service.getPlayerStats(10, 99).catch(e => (error = e));

      const req = httpMock.expectOne(`${baseUrl}competitions/1/players/99?leagueId=10`);
      req.flush(null, { status: 500, statusText: 'Internal Error' });
      tick();

      expect(error).toBe('error');
    }));
  });

  describe('Erweiterte Fehlerbehandlung & Retry-Pfade', () => {
  it('sollte getLeagues() bei Fehler behandeln', fakeAsync(() => {
    spyOn(service, 'refreshToken').and.returnValue(Promise.reject({ status: 500 }));

    let error: any;
    service.getLeagues().catch(e => (error = e));
    tick();

    expect(service.refreshToken).toHaveBeenCalled();
    expect(error).toBe('error');
  }));

  describe('getGiftStatus()', () => {
    it('sollte GiftStatus erfolgreich abrufen', fakeAsync(() => {
      let giftResult: any;
      service.getGiftStatus(1).then(res => (giftResult = res));
      const req = httpMock.expectOne(`${baseUrl}leagues/1/currentgift`);
      req.flush({ amount: 100 });
      tick();
      expect(giftResult).toBeTruthy();
    }));

    it('sollte bei 401 ein Token-Refresh und erneuten Aufruf durchführen', fakeAsync(() => {
      spyOn(service, 'refreshToken').and.returnValue(Promise.resolve(true));

      service.getGiftStatus(1);

      const req1 = httpMock.expectOne(`${baseUrl}leagues/1/currentgift`);
      req1.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      tick();

      expect(service.refreshToken).toHaveBeenCalled();

      const reqRetry = httpMock.expectOne(`${baseUrl}leagues/1/currentgift`);
      reqRetry.flush({ amount: 100 });
      tick();
    }));

    it('sollte bei Server-Fehler abbrechen', fakeAsync(() => {
      let error: any;
      service.getGiftStatus(1).catch(e => (error = e));
      const req = httpMock.expectOne(`${baseUrl}leagues/1/currentgift`);
      req.flush('Server Error', { status: 500, statusText: 'Server Error' });
      tick();
      expect(error).toBe('error');
    }));
  });

  describe('getMarketValuePlayerStats()', () => {
    it('sollte MarketValuePlayerStats erfolgreich abrufen', fakeAsync(() => {
      let statsResult: any;
      service.getMarketValuePlayerStats(1, 10).then(res => (statsResult = res));
      const req = httpMock.expectOne(`${baseUrl}competitions/1/players/10/marketValue/92?leagueId=1`);
      req.flush({ marketValue: 5000000 });
      tick();
      expect(statsResult).toBeTruthy();
    }));

    it('sollte bei 401 ein Token-Refresh durchführen und getPlayerStats aufrufen', fakeAsync(() => {
      spyOn(service, 'refreshToken').and.returnValue(Promise.resolve(true));

      service.getMarketValuePlayerStats(1, 10);

      const req1 = httpMock.expectOne(`${baseUrl}competitions/1/players/10/marketValue/92?leagueId=1`);
      req1.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      tick();

      expect(service.refreshToken).toHaveBeenCalled();

      // ApiService ruft bei 401 intern getPlayerStats() auf
      const reqRetry = httpMock.expectOne(`${baseUrl}competitions/1/players/10?leagueId=1`);
      reqRetry.flush({ id: '10' });
      tick();
    }));

    it('sollte bei Server-Fehler abbrechen', fakeAsync(() => {
      let error: any;
      service.getMarketValuePlayerStats(1, 10).catch(e => (error = e));
      const req = httpMock.expectOne(`${baseUrl}competitions/1/players/10/marketValue/92?leagueId=1`);
      req.flush('Server Error', { status: 500, statusText: 'Server Error' });
      tick();
      expect(error).toBe('error');
    }));
  });

  it('sollte 401-Retry in getLineup, collectGift und getPlayerStats durchführen', fakeAsync(() => {
    spyOn(service, 'refreshToken').and.returnValue(Promise.resolve(true));

    // 1. getLineup
    service.getLineup(1);
    const reqLineup = httpMock.expectOne(`${baseUrl}leagues/1/squad`);
    reqLineup.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    tick();
    const retryLineup = httpMock.expectOne(`${baseUrl}leagues/1/squad`);
    retryLineup.flush({});

    // 2. collectGift
    service.collectGift(1);
    const reqGift = httpMock.expectOne(`${baseUrl}leagues/1/collectgift`);
    reqGift.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    tick();
    const retryGift = httpMock.expectOne(`${baseUrl}leagues/1/collectgift`);
    retryGift.flush({});

    // 3. getPlayerStats
    service.getPlayerStats(1, 10);
    const reqStats = httpMock.expectOne(`${baseUrl}competitions/1/players/10?leagueId=1`);
    reqStats.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    tick();
    const retryStats = httpMock.expectOne(`${baseUrl}competitions/1/players/10?leagueId=1`);
    retryStats.flush({});

    tick();
    expect(service.refreshToken).toHaveBeenCalledTimes(3);
  }));
});
describe('ApiService Randfälle', () => {
  it('sollte abgebrochen werden, wenn refreshToken eine leere Response erhält', fakeAsync(() => {
    let error: any;
    service.data = { username: 'user', password: 'pass' };
    service.refreshToken().catch(e => (error = e));

    const req = httpMock.expectOne(`${baseUrl}user/login`);
    req.flush(null); // Null-Antwort simuliert !response
    tick();

    expect(error).toBe('error');
  }));

  it('sollte abgebrochen werden, wenn getToken eine leere Response erhält', fakeAsync(() => {
    let error: any;
    service.getToken('user', 'pass').catch(e => (error = e));

    const req = httpMock.expectOne(`${baseUrl}user/login`);
    req.flush(null); // Null-Antwort simuliert !response
    tick();

    expect(error).toBe('error');
  }));

  it('sollte ungültige Speicherwerte in setPlayerPermanentDeleted abfangen', () => {
    const key = 'permantDeletedPlayer_1';
    
    // Simuliere ungültigen Datentyp im LocalStorage (kein Array)
    localStorage.setItem(key, JSON.stringify("ungueltiger_wert"));
    service.setPlayerPermanentDeleted(1, 99, true);

    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    expect(stored).toContain('99');
  });
});
});
});