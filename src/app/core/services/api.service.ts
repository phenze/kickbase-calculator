import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, catchError, throwError, of } from 'rxjs';

import { KickbaseLeague } from '../models/kickbase-league';
import { KickbaseMarket } from '../models/kickbase-market';
import { KickbasePlayerStats } from '../models/kickbase-player-stats';
import { KickbaseGift } from '../models/kickbase-gift';
import { DisplayMode } from '../models/display-mode';

export interface AppSettings {
  calculatorActive: DisplayMode;
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
  private readonly baseUrlProxy = 'https://pascalhenze.de/kickbase-proxy/api/v4/';
  private readonly baseUrl = 'https://api.kickbase.com/v4/';

  // Reactive State via Signals
  public isLoggedIn = signal<boolean>(false);
  public userID = signal<string | null>(null);
  public leagues = signal<KickbaseLeague[]>([]);
  public appSettings = signal<AppSettings>({
    calculatorActive: DisplayMode.calculator,
    lastLeagueId: -1,
  });

  private readonly http = inject(HttpClient);

  constructor() {
    // 1. Einmalige Migration alter localStorage-Daten ausführen
    this.migrateLegacyData();

    // 2. Initialen State aus dem localStorage (statt sessionStorage) laden
    const token = localStorage.getItem('kb_token');
    const storedUserId = localStorage.getItem('kb_user_id');

    if (token && storedUserId) {
      this.userID.set(storedUserId);
      this.isLoggedIn.set(true);
    }

    this.appSettings.set(this.loadSettings());
  }

  private migrateLegacyData(): void {
    const rawLegacyData = localStorage.getItem('data');
    if (!rawLegacyData) {
      return;
    }

    try {
      const legacy = JSON.parse(rawLegacyData);

      if (legacy) {
        if (legacy.token) {
          const cleanToken = legacy.token.replace(/^Bearer\s+/i, '');
          localStorage.setItem('kb_token', cleanToken);
        }
        if (legacy.userID !== undefined && legacy.userID !== null) {
          localStorage.setItem('kb_user_id', String(legacy.userID));
        }

        const migratedSettings: AppSettings = {
          calculatorActive: legacy.calculatorActive ?? DisplayMode.calculator,
          lastLeagueId: legacy.lastLeagueId ?? -1,
        };
        localStorage.setItem('app_settings', JSON.stringify(migratedSettings));
      }
    } catch (e) {
      console.error('Fehler bei der Migration der alten Kickbase-Daten:', e);
    } finally {
      localStorage.removeItem('data');
    }
  }

  public getToken(): string | null {
    return localStorage.getItem('kb_token');
  }

  // --- Auth API ---

  login(username: string, pass: string): Observable<boolean> {
    const url = `${this.baseUrlProxy}user/login`;
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

        // Token & User-ID im localStorage speichern (dauerhafter PWA-Session-State)
        localStorage.setItem('kb_token', response.tkn);
        localStorage.setItem('kb_user_id', userIdStr);
        if (response.rtkn) {
          localStorage.setItem('kb_refresh_token', response.rtkn);
        }

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
    const refreshToken = localStorage.getItem('kb_refresh_token');
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<any>(`${this.baseUrlProxy}user/refreshtokens`, { rtkn: refreshToken })
      .pipe(
        map((response) => {
          if (!response || !response.tkn) {
            throw new Error('Invalid refresh response');
          }
          localStorage.setItem('kb_token', response.tkn);
          if (response.rtkn) {
            localStorage.setItem('kb_refresh_token', response.rtkn);
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
    localStorage.removeItem('kb_token');
    localStorage.removeItem('kb_refresh_token');
    localStorage.removeItem('kb_user_id');
    this.userID.set(null);
    this.leagues.set([]);
    this.isLoggedIn.set(false);
  }

  // --- Kickbase API Methods ---

  getLeagues(): Observable<KickbaseLeague[]> {
    if (this.leagues().length > 0) {
      return of(this.leagues());
    }

    return this.http.get<any>(`${this.baseUrl}leagues/selection`).pipe(
      map((response) => {
        const leagues = KickbaseLeague.createArrayInstance(response.it || response);
        this.leagues.set(leagues);
        return leagues;
      }),
    );
  }

  getLeagueOverview(leagueId: number): Observable<KickbaseLeague> {
    const url = `${this.baseUrl}leagues/${leagueId}/overview`;
    return this.http.get<any>(url).pipe(map((result) => new KickbaseLeague(result)));
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

  getPlayerTransferHistory(leagueId: number, playerId: number): Observable<{ it: any[] }> {
    const url = `${this.baseUrl}leagues/${leagueId}/players/${playerId}/transferHistory?start=0`;
    return this.http.get<{ it: any[] }>(url);
  }

  getMarketValuePlayerStats(leagueId: number, playerId: number): Observable<{ it: any[] }> {
    const url = `${this.baseUrl}competitions/1/players/${playerId}/marketValue/92?leagueId=${leagueId}`;
    return this.http.get<{ it: any[] }>(url);
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
      calculatorActive: DisplayMode.calculator,
      lastLeagueId: -1,
    };
  }

  private saveSettings(settings: AppSettings): void {
    this.appSettings.set(settings);
    localStorage.setItem('app_settings', JSON.stringify(settings));
  }

  public setLastDisplay(displayMode: DisplayMode): void {
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
