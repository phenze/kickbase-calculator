import { KickbasePlayer } from './kickbase-player';
import numeral from 'numeral';

export class KickbaseLivePlayer {
  public name = '';
  public lastname = '';
  public teamID = '';
  public id = 0;
  public a = 0;
  public g = 0;
  public nr = 0;
  public p = 0;
  public r = 0;
  public s = 0;
  public t = 0;
  public y = 0;
  public yr = 0;
  public image = '';

  constructor(json: any) {
    Object.assign(this, json);
    if (json !== null) {
      this.lastname = json['n'];
      this.name = json['fn'];
      this.teamID = json['tid'];
      // this.image = `kkstr.s3.amazonaws.com/pool/playersbig/${this.id}.jpg`;
      this.image = `api.kickbase.com/files/players/${this.id}/1`;
    }
  }
}

export class KickbaseLiveUser {
  public players: KickbaseLivePlayer[] = [];
  public userID = '';
  public image = '';
  public name = '';

  constructor(json: any) {
    Object.assign(this, json);
    if (json !== null) {
      this.userID = json['id'];
      this.image = json['i'];
      this.name = json['n'];

      const players = json['pl'];
      if (players !== undefined) {
        for (let player of players) {
          this.players.push(new KickbaseLivePlayer(player));
        }
      }
      this.players = this.players.sort((a: KickbaseLivePlayer, b: KickbaseLivePlayer) => {
        if (a.t > b.t) {
          return -1;
        } else if (a.t < b.t) {
          return 1;
        } else {
          return 0;
        }
      });
    }
  }

  points() {
    let retVal = 0;
    for (let player of this.players) {
      retVal += player.t;
    }
    return retVal;
  }
}

export class KickbaseLiveTeam {
  public name = '';
  public points = 0;
  public ps = 0;

  constructor(json: any) {
    Object.assign(this, json);
    if (json !== null) {
      this.name = json['tn'];
      this.points = json['p'];
    }
  }
}

export class KickbaseLiveData {
  public users: KickbaseLiveUser[] = [];
  public notLinedPlayers: KickbaseLivePlayer[] = [];
  public teams: KickbaseLiveTeam[] = [];
  public userID = '';

  constructor(json: any, jsonTeams: any, jsonNotLined: any, userID: string) {
    Object.assign(this, json);
    this.userID = userID;
    if (json !== null) {
      const users = json['u'];
      for (let user of users) {
        this.users.push(new KickbaseLiveUser(user));
      }
    }
    if (jsonNotLined !== null) {
      const users = jsonNotLined['pl'];
      for (let user of users) {
        this.notLinedPlayers.push(new KickbaseLivePlayer(user));
      }
    }
    if (jsonTeams !== null) {
      const teams = jsonTeams['t'];
      for (let team of teams) {
        this.teams.push(new KickbaseLiveTeam(team));
      }
    }
    this.teams = this.teams.sort((a: KickbaseLiveTeam, b: KickbaseLiveTeam) => {
      if (a.points > b.points) {
        return -1;
      } else if (a.points < b.points) {
        return 1;
      } else {
        return 0;
      }
    });
  }
}
