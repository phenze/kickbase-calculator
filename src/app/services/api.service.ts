import { Injectable } from '@angular/core';

import { KickbaseLeague } from '../model/kickbase-league';
import { KickbaseMarket } from '../model/kickbase-market';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { KickbasePlayerStats } from '../model/kickbase-player-stats';
import { KickbaseLiveData } from '../model/kickbase-live-data';
import { KickbaseGift } from '../model/kickbase-gift';
import { AppComponent } from '../app.component';

export class Data {
  public userID!: number;
  public token!: string;
  public username!: string;
  public password!: string;
  public calculatorActive!: string;
  public lastLeagueId!: number;
  public leagues!: KickbaseLeague[];

}

@Injectable()
export class ApiService {


  private baseUrl = "https://api.kickbase.com/v4/"

  public token = '';
  public userID: any = null;
  public data: any = null;
  public isLoggedIn = false;

  constructor(private http: HttpClient) {
    let data = localStorage.getItem('data');
    if (data !== null) {
      this.data = JSON.parse(data);
      if (this.data !== null) {
        this.token = `Bearer ${this.data.token}`;
        this.userID = this.data.userID;
        this.isLoggedIn = true;
        console.log(this.userID);
        if (this.userID === undefined || this.userID === null) {
          this.refreshToken();
        }
      }


    }
  }

  private customApiHeaders() {
    return new HttpHeaders()
      .set('Accept', 'application/json')
      .set('Authorization', this.token);

  }

  async getLeagues(): Promise<KickbaseLeague[]> {
    // let url = this.baseUrl + 'leagues';
    try {
      // if ((this.data.leagues === undefined || this.data.leagues.length === 0) && this.data.loggedInWithoutApi === false) {
      // }
      await this.refreshToken();
      return this.data.leagues;
    } catch (e) {
      const error = e as any;
      console.log(error);
      if (error.status === 401 || error.status === 403) {
        await this.refreshToken();
        return this.getLeagues();
      } else {
        // TODO : Handle Api Errors
        return Promise.reject('error');
      }
    };
  }

  async getMarket(league: number): Promise<KickbaseMarket> {


    let url = this.baseUrl + 'leagues/' + league + '/market?sort=expiry';
    try {
      const result = await this.http.get(url, {
        headers: this.customApiHeaders(),
        responseType: 'json'
      }).toPromise()
      return new KickbaseMarket(result, this.userID);
    } catch (e) {
      const error = e as any;
      console.log(error);
      if (error.status === 401 || error.status === 403) {
        await this.refreshToken();
        return this.getMarket(league);
      } else {
        // TODO : Handle Api Errors
        return Promise.reject('error');
      }
    };
  }

  logout() {
    this.data = null;
    this.isLoggedIn = false;
    localStorage.removeItem('data');
  }

  refreshToken(): Promise<boolean> {
    const url = this.baseUrl + 'user/login';

    const payload = {
      "ext": true,
      "em": this.data.username,
      "loy": false,
      "pass": this.data.password,
      "rep": {}
    }
    return this.http.post(url, payload, {
      responseType: 'json'
    }).toPromise()
      .then((response: any) => {
        if (!response) {
          return Promise.reject('error');
        }
        const user = response['u'];
        const userId = user['id'];
        this.userID = userId;
        this.data.userID = userId;
        this.data.token = response['tkn'];
        this.data.leagues = KickbaseLeague.createArrayInstance(response['srvl']);
        localStorage.setItem('data', JSON.stringify(this.data))
        this.token = `Bearer ${response['tkn']}`;
        return true;

      })
      .catch((e) => {
        console.log(e);
        this.logout();
        return Promise.reject('error');
      });
  }


  getToken(username: string, password: string): Promise<boolean> {


    const url = this.baseUrl + 'user/login';
    // const payload = {
    //   'email': username,
    //   'password': password
    // };

    const payload = {
      'ext': true,
      'em': username,
      'loy': false,
      'pass': password,
    }
    return this.http.post(url, payload, {
      responseType: 'json'
    }).toPromise()
      .then((response: any) => {
        if (!response) {
          return Promise.reject('error');
        }
        const user = response['u'];
        const userId = user['id'];
        this.userID = userId;
        this.data = {
          username: username,
          password: password,
          token: response['tkn'],
          userID: userId,
          calculatorActive: this.data !== null ? this.data.calculatorActive : AppComponent.display_mode_calculator,
          lastLeagueId: this.data !== null ? this.data.lastLeagueId : -1,
          leagues: KickbaseLeague.createArrayInstance(response['srvl'])
        }
        localStorage.setItem('data', JSON.stringify(this.data))
        this.token = `Bearer ${response['tkn']}`;
        this.isLoggedIn = true;
        return true;

      })
      .catch((e) => {
        console.log(e);
        this.logout();
        return Promise.reject('error');
      });
  }


  async getLineup(league: number): Promise<KickbaseMarket> {


    let url = this.baseUrl + 'leagues/' + league + '/squad';
    try {
      const result = await this.http.get(url, {
        headers: this.customApiHeaders(),
        responseType: 'json'
      }).toPromise()
      return new KickbaseMarket(result, this.userID);
    } catch (e) {
      const error = e as any;
      console.log(error);
      if (error.status === 401 || error.status === 403) {
        await this.refreshToken();
        return this.getLineup(league);
      } else {
        // TODO : Handle Api Errors
        return Promise.reject('error');
      }
    };
  }

  async getGiftStatus(league: number): Promise<KickbaseGift> {


    let url = this.baseUrl + 'leagues/' + league + '/currentgift';
    try {
      const result = await this.http.get(url, {
        headers: this.customApiHeaders(),
        responseType: 'json'
      }).toPromise()
      return new KickbaseGift(result);
    } catch (e) {
      const error = e as any;
      console.log(error);
      if (error.status === 401 || error.status === 403) {
        await this.refreshToken();
        return this.getGiftStatus(league);
      } else {
        // TODO : Handle Api Errors
        return Promise.reject('error');
      }
    };
  }

  async collectGift(league: number): Promise<any> {


    let url = this.baseUrl + 'leagues/' + league + '/collectgift';
    try {
      const result = await this.http.post(url, {}, {
        headers: this.customApiHeaders(),
        responseType: 'json'
      }).toPromise();
      return result;
    } catch (e) {
      const error = e as any;
      console.log(error);
      if (error.status === 401 || error.status === 403) {
        await this.refreshToken();
        return this.collectGift(league);
      } else {
        // TODO : Handle Api Errors
        return Promise.reject(error.error);
      }
    };
  }

  async getPlayerStats(league: number, playerID: number): Promise<KickbasePlayerStats> {
    // https://api.kickbase.com/leagues/868390/players/2322/stats
    let url = this.baseUrl + 'competitions/1/players/' + playerID + '?leagueId=' + league;
    try {
      const result = await this.http.get(url, {
        headers: this.customApiHeaders(),
        responseType: 'json'
      }).toPromise()
      return new KickbasePlayerStats(result);

    } catch (e) {
      const error = e as any;
      console.log(error);
      if (error.status === 401 || error.status === 403) {
        await this.refreshToken();
        return this.getPlayerStats(league, playerID);
      } else {
        // TODO : Handle Api Errors
        return Promise.reject('error');
      }
    };
  }

  async getMarketValuePlayerStats(league: number, playerID: number): Promise<KickbasePlayerStats> {
    // https://api.kickbase.com/leagues/868390/players/2322/stats
    let url = this.baseUrl + 'competitions/1/players/' + playerID + '/marketValue/92?leagueId=' + league;
    try {
      const result = await this.http.get(url, {
        headers: this.customApiHeaders(),
        responseType: 'json'
      }).toPromise()
      return new KickbasePlayerStats(result);

    } catch (e) {
      const error = e as any;
      console.log(error);
      if (error.status === 401 || error.status === 403) {
        await this.refreshToken();
        return this.getPlayerStats(league, playerID);
      } else {
        // TODO : Handle Api Errors
        return Promise.reject('error');
      }
    };
  }

  public setLastDisplay(displayMode: string) {
    this.data.calculatorActive = displayMode;
    localStorage.setItem('data', JSON.stringify(this.data))
  }

  public setLastLeague(leagueId: number) {
    this.data.lastLeagueId = leagueId;
    localStorage.setItem('data', JSON.stringify(this.data))
  }

  public setPlayerPermanentDeleted(leagueId: number, playerId: number, deleted: boolean) {
    const key = 'permantDeletedPlayer_' + leagueId.toString();
    const permantDeletedPlayer = localStorage.getItem(key);
    if ((permantDeletedPlayer === null || permantDeletedPlayer === undefined) && deleted) {
      localStorage.setItem(key, JSON.stringify([playerId]))
    } else {
      const parsedPlayers = JSON.parse(permantDeletedPlayer ?? '[]') as unknown;
      const tmpArray = Array.isArray(parsedPlayers) ? parsedPlayers.map(player => String(player)) : [];
      const playerIdAsString = playerId.toString();
      const playerIndex = tmpArray.findIndex(player => player === playerIdAsString);
      if (deleted && playerIndex === -1) {
        tmpArray.push(playerIdAsString)
      }
      if (!deleted && playerIndex !== -1) {
        tmpArray.splice(playerIndex, 1)
      }
      localStorage.setItem(key, JSON.stringify(tmpArray))
    }

  }

}
