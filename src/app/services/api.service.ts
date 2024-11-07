import { Injectable } from '@angular/core';

import { KickbaseLeague } from '../model/kickbase-league';
import { KickbaseMarket } from '../model/kickbase-market';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { KickbasePlayerStats } from '../model/kickbase-player-stats';
import { KickbaseLiveData } from '../model/kickbase-live-data';
import { KickbaseGift } from '../model/kickbase-gift';
import { AppComponent } from '../app.component';

export class Data {
  public userID: number;
  public token: string;
  public username: string;
  public password: string;
  public calculatorActive: string;
  public lastLeagueId: number;
  public loggedInWithoutApi: boolean;
  public leagues: KickbaseLeague[];

}

@Injectable()
export class ApiService {


  private baseUrl = "https://api.kickbase.com/v4/"

  public token = '';
  public userID = null;
  public data: Data = null;
  public isLoggedIn = false;

  constructor(private http: HttpClient) {
    let data = localStorage.getItem('data');
    if (data !== null) {
      this.data = JSON.parse(data);
      if (this.data !== null) {
        if (this.data.loggedInWithoutApi) {
          this.isLoggedIn = true;
          return;
        }
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

  loginWithoutApi() {
    this.isLoggedIn = true;
    this.data = {
      username: '',
      password: '',
      token: '',
      userID: -1,
      calculatorActive: AppComponent.display_mode_calculator,
      lastLeagueId: -1,
      loggedInWithoutApi: true,
      leagues: []
    }
    localStorage.setItem('data', JSON.stringify(this.data))
  }

  private customApiHeaders() {
    return new HttpHeaders()
      .set('Accept', 'application/json')
      .set('Authorization', this.token);

  }

  async getMarketWinner(): Promise<string> {
    // 
    try {
      const result = await this.http.get(
        'https://pascalhenze.de/kickbase/corsproxy.php?url=https://www.ligainsider.de/stats/kickbase/marktwerte/tag/gewinner/', {
        responseType: 'json'
      }).toPromise()

      return Promise.resolve(result['contents']);
    } catch {
      return Promise.reject('error');
    }
  }

  async getMarketLooser(): Promise<string> {
    // 
    try {
      const result = await this.http.get(
        'https://pascalhenze.de/kickbase/corsproxy.php?url=https://www.ligainsider.de/stats/kickbase/marktwerte/tag/verlierer/', {
        responseType: 'json'
      }).toPromise()

      return Promise.resolve(result['contents']);
    } catch {
      return Promise.reject('error');
    }
  }

  async getMarketAll(): Promise<string> {
    // 
    try {
      const result = await this.http.get(
        'https://pascalhenze.de/kickbase/corsproxy.php?url=https://www.ligainsider.de/stats/kickbase/marktwerte/gesamt/', {
        responseType: 'json'
      }).toPromise()

      return Promise.resolve(result['contents']);
    } catch {
      return Promise.reject('error');
    }
  }

  async getLeagues(): Promise<KickbaseLeague[]> {
    // let url = this.baseUrl + 'leagues';
    try {
      if ((this.data.leagues === undefined || this.data.leagues.length === 0) && this.data.loggedInWithoutApi === false) {
      }
      await this.refreshToken();
      // const result = await this.http.get(url, {
      //   headers: this.customApiHeaders(),
      //   responseType: 'json'
      // }).toPromise()
      // return KickbaseLeague.createArrayInstance(result);
      return this.data.leagues;
    } catch (e) {
      console.log(e);
      if (e.status === 401 || e.status === 403) {
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
      console.log(e);
      if (e.status === 401 || e.status === 403) {
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
      .then((response) => {
        const user = response['u'];
        this.userID = user['id'];
        this.data.userID = this.userID;
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


  getToken(username, password): Promise<boolean> {


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
      .then((response) => {
        const user = response['u'];
        this.userID = user['id'];
        this.data = {
          username: username,
          password: password,
          token: response['tkn'],
          userID: this.userID,
          calculatorActive: this.data !== null ? this.data.calculatorActive : AppComponent.display_mode_calculator,
          lastLeagueId: this.data !== null ? this.data.lastLeagueId : -1,
          loggedInWithoutApi: false,
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
      console.log(e);
      if (e.status === 401 || e.status === 403) {
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
      console.log(e);
      if (e.status === 401 || e.status === 403) {
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
      console.log(e);
      if (e.status === 401 || e.status === 403) {
        await this.refreshToken();
        return this.collectGift(league);
      } else {
        // TODO : Handle Api Errors
        return Promise.reject(e.error);
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
      console.log(e);
      if (e.status === 401 || e.status === 403) {
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
      console.log(e);
      if (e.status === 401 || e.status === 403) {
        await this.refreshToken();
        return this.getPlayerStats(league, playerID);
      } else {
        // TODO : Handle Api Errors
        return Promise.reject('error');
      }
    };
  }

  public setLastDisplay(displayMode) {
    this.data.calculatorActive = displayMode;
    localStorage.setItem('data', JSON.stringify(this.data))
  }

  public setLastLeague(leagueId) {
    this.data.lastLeagueId = leagueId;
    localStorage.setItem('data', JSON.stringify(this.data))
  }

  public setPlayerPermanentDeleted(leagueId: number, playerId: number, deleted: boolean) {
    const key = 'permantDeletedPlayer_' + leagueId.toString();
    const permantDeletedPlayer = localStorage.getItem(key);
    if ((permantDeletedPlayer === null || permantDeletedPlayer === undefined) && deleted) {
      localStorage.setItem(key, JSON.stringify([playerId]))
    } else {
      const tmpArray = JSON.parse(permantDeletedPlayer)
      const playerIndex = tmpArray.findIndex(t => t === playerId.toString());
      if (deleted && playerIndex === -1) {
        tmpArray.push(playerId)
      }
      if (!deleted && playerIndex !== -1) {
        tmpArray.splice(playerIndex, 1)
      }
      localStorage.setItem(key, JSON.stringify(tmpArray))
    }

  }

}
