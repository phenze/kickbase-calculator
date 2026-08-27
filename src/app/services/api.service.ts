import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

import { KickbaseLeague } from '../model/kickbase-league';
import { KickbaseMarket } from '../model/kickbase-market';
import { KickbasePlayerStats } from '../model/kickbase-player-stats';
import { KickbaseGift } from '../model/kickbase-gift';
import { AppComponent } from '../app.component';

export interface AppSettings {
  calculatorActive: string;
  lastLeagueId: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  /**
   * ARCHITEKTUR-HINWEIS: API-Proxy-Routing & User-Agent
   *
   * Alle Anfragen an die API müssen zwingend über das eigene Proxy-Skript geroutet werden.
   *
   * Gründe:
   * 1. User-Agent Header (Kritisch): Die Ziel-API verweigert ohne einen spezifischen
   *    `User-Agent` die Ausgabe des Refresh-Tokens. Da moderne Browser das manuelle
   *    Überschreiben des `User-Agent`-Headers aus Sicherheitsgründen verbieten,
   *    muss dieser serverseitig im Proxy gesetzt werden.
   * 2. CORS-Bypass: Umgeht die Same-Origin-Policy (SOP) des Browsers und fehlende CORS-Header.
   * 3. Datensicherheit: Verhindert das Preisgeben von API-Keys und Secrets im Browser-Netzwerk-Tab.
   * 4.
   *  The Proxy file can be shown any time at: https://pascalhenze.de/kickbase-proxy/proxy.php
   *  https://github.com/phenze/kickbase-calculator/blob/main/proxy/proxy.php
   * 5. I dont steal your passwords !
   */
  private readonly baseUrl = 'https://pascalhenze.de/kickbase-proxy/api/v4/';

  // Reactive State via Signals
  public isLoggedIn = signal<boolean>(false);
  public userID = signal<string | null>(null);
  public leagues = signal<KickbaseLeague[]>([]);
  public appSettings = signal<AppSettings>({
    calculatorActive: AppComponent.display_mode_calculator,
    lastLeagueId: -1,
  });

  constructor(private http: HttpClient) {
    // 1. Einmalige Migration alter localStorage-Daten ausführen
    this.migrateLegacyData();

    // 2. Initialen State aus den neuen Speichern laden
    const token = sessionStorage.getItem('kb_token');
    const storedUserId = sessionStorage.getItem('kb_user_id');

    if (token && storedUserId) {
      this.userID.set(storedUserId);
      this.isLoggedIn.set(true);
    }

    this.appSettings.set(this.loadSettings());
  }

  /**
   * Liest die alte `data`-Struktur aus dem localStorage aus, überführt sie
   * in die neue Struktur und löscht das alte Objekt (inkl. Passwort).
   */
  private migrateLegacyData(): void {
    const rawLegacyData = localStorage.getItem('data');
    if (!rawLegacyData) {
      return;
    }

    try {
      const legacy = JSON.parse(rawLegacyData);

      if (legacy) {
        // Session-Daten in den sessionStorage übertragen (falls vorhanden)
        if (legacy.token) {
          // Token ohne "Bearer "-Präfix speichern, falls noch enthalten
          const cleanToken = legacy.token.replace(/^Bearer\s+/i, '');
          sessionStorage.setItem('kb_token', cleanToken);
        }
        if (legacy.userID !== undefined && legacy.userID !== null) {
          sessionStorage.setItem('kb_user_id', String(legacy.userID));
        }

        // Unkritische App-Einstellungen in neuen localStorage-Key überführen
        const migratedSettings: AppSettings = {
          calculatorActive: legacy.calculatorActive ?? AppComponent.display_mode_calculator,
          lastLeagueId: legacy.lastLeagueId ?? -1,
        };
        localStorage.setItem('app_settings', JSON.stringify(migratedSettings));

        // Ligen-Cache sichern (falls vorhanden)
        if (Array.isArray(legacy.leagues) && legacy.leagues.length > 0) {
          this.leagues.set(KickbaseLeague.createArrayInstance(legacy.leagues));
        }
      }
    } catch (e) {
      console.error('Fehler bei der Migration der alten Kickbase-Daten:', e);
    } finally {
      // Altes data-Objekt (inkl. Passwort im Klartext) unwiderruflich löschen
      localStorage.removeItem('data');
    }
  }

  public getToken(): string | null {
    return sessionStorage.getItem('kb_token');
  }

  // --- Auth API ---

  login(username: string, pass: string): Observable<boolean> {
    const url = `${this.baseUrl}user/login`;
    const payload = {
      ext: true,
      em: username,
      loy: false,
      pass: pass,
      rep: {},
    };

    return this.http.post<any>(url, payload).pipe(
      map((response) => {
        if (!response || !response.tkn) {
          throw new Error('Invalid login response');
        }

        const userIdStr = String(response.u?.id);
        const leagues = KickbaseLeague.createArrayInstance(response.srvl);

        // Token & User-ID im sessionStorage speichern
        sessionStorage.setItem('kb_token', response.tkn);
        sessionStorage.setItem('kb_user_id', userIdStr);
        sessionStorage.setItem('kb_refresh_token', response.rtkn);

        // Signals aktualisieren
        this.userID.set(userIdStr);
        this.leagues.set(leagues);
        this.isLoggedIn.set(true);

        return true;
      }),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      }),
    );
  }

  refreshToken(): Observable<string> {
    const refreshToken = sessionStorage.getItem('kb_refresh_token');
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    // Kickbase v4 Token Refresh Request
    return this.http.post<any>(`${this.baseUrl}user/refreshtokens`, { rtkn: refreshToken }).pipe(
      map((response) => {
        if (!response || !response.tkn) {
          throw new Error('Invalid refresh response');
        }
        sessionStorage.setItem('kb_token', response.tkn);
        if (response.rtkn) {
          sessionStorage.setItem('kb_refresh_token', response.rtkn);
        }
        return response.tkn;
      }),
      catchError((err) => {
        this.logout();
        return throwError(() => err);
      }),
    );
  }

  logout(): void {
    sessionStorage.removeItem('kb_token');
    sessionStorage.removeItem('kb_refresh_token');
    sessionStorage.removeItem('kb_user_id');
    this.userID.set(null);
    this.leagues.set([]);
    this.isLoggedIn.set(false);
  }

  // --- Kickbase API Methods ---

  getLeagues(): Observable<KickbaseLeague[]> {
    if (this.leagues().length > 0) {
      return new Observable((subscriber) => {
        subscriber.next(this.leagues());
        subscriber.complete();
      });
    }

    return this.http.get<any>(`${this.baseUrl}leagues/selection`).pipe(
      map((response) => {
        const leagues = KickbaseLeague.createArrayInstance(response.it || response);
        this.leagues.set(leagues);
        return leagues;
      }),
    );
  }

  getMarket(leagueId: number): Observable<KickbaseMarket> {
    const url = `${this.baseUrl}leagues/${leagueId}/market?sort=expiry`;
    return this.http.get<any>(url).pipe(
      // userID() wird garantiert als string übergeben (oder '' als Fallback)
      map((result) => new KickbaseMarket(result, this.userID() ?? '')),
    );
  }

  getLineup(leagueId: number): Observable<KickbaseMarket> {
    const url = `${this.baseUrl}leagues/${leagueId}/squad`;
    return this.http
      .get<any>(url)
      .pipe(map((result) => new KickbaseMarket(result, this.userID() ?? '')));
  }

  getGiftStatus(leagueId: number): Observable<KickbaseGift> {
    const url = `${this.baseUrl}leagues/${leagueId}/currentgift`;
    return this.http.get<any>(url).pipe(map((result) => new KickbaseGift(result)));
  }

  collectGift(leagueId: number): Observable<any> {
    const url = `${this.baseUrl}leagues/${leagueId}/collectgift`;
    return this.http.post<any>(url, {});
  }

  getPlayerStats(leagueId: number, playerId: number): Observable<KickbasePlayerStats> {
    const url = `${this.baseUrl}leagues/${leagueId}/players/${playerId}`;
    return this.http.get<any>(url).pipe(map((result) => new KickbasePlayerStats(result)));
  }

  getMarketValuePlayerStats(leagueId: number, playerId: number): Observable<KickbasePlayerStats> {
    const url = `${this.baseUrl}competitions/1/players/${playerId}/marketValue/92?leagueId=${leagueId}`;
    return this.http.get<any>(url).pipe(map((result) => new KickbasePlayerStats(result)));
  }

  // --- LocalStorage Management (Einstellungen & gelöschte Spieler) ---

  private loadSettings(): AppSettings {
    const saved = localStorage.getItem('app_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback bei Fehler
      }
    }
    return {
      calculatorActive: AppComponent.display_mode_calculator,
      lastLeagueId: -1,
    };
  }

  private saveSettings(settings: AppSettings): void {
    this.appSettings.set(settings);
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }

  public setLastDisplay(displayMode: string): void {
    const current = this.appSettings();
    this.saveSettings({ ...current, calculatorActive: displayMode });
  }

  public setLastLeague(leagueId: number): void {
    const current = this.appSettings();
    this.saveSettings({ ...current, lastLeagueId: leagueId });
  }

  public setPlayerPermanentDeleted(leagueId: number, playerId: number, deleted: boolean): void {
    const key = `permantDeletedPlayer_${leagueId}`;
    const rawData = localStorage.getItem(key);

    // Parsing & Absicherung auf Array-Typ
    let parsedPlayers: unknown;
    try {
      parsedPlayers = rawData ? JSON.parse(rawData) : [];
    } catch {
      parsedPlayers = [];
    }

    const tmpArray = Array.isArray(parsedPlayers) ? parsedPlayers.map((id) => String(id)) : [];

    const playerIdStr = playerId.toString();
    const playerIndex = tmpArray.indexOf(playerIdStr);

    if (deleted && playerIndex === -1) {
      tmpArray.push(playerIdStr);
    } else if (!deleted && playerIndex !== -1) {
      tmpArray.splice(playerIndex, 1);
    }

    localStorage.setItem(key, JSON.stringify(tmpArray));
  }
}
