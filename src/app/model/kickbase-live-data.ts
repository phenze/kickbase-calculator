

import { KickbasePlayer } from './kickbase-player';
import * as numeral from 'numeral';


export class KickbaseLivePlayer {
    public name: string;
    public lastname: string;
    public teamID: string;
    public id: number;
    public a: number;
    public g: number;
    public nr: number;
    public p: number;
    public r: number;
    public s: number;
    public t: number;
    public y: number;
    public yr: number;
    public image: string;

    constructor(json: any) {
        Object.assign(this, json);
        if (json !== null) {
            this.lastname = json["n"];
            this.name = json["fn"];
            this.teamID = json["tid"];
            // this.image = `kkstr.s3.amazonaws.com/pool/playersbig/${this.id}.jpg`;
            this.image = `api.kickbase.com/files/players/${this.id}/1`;
        }
    }
}

export class KickbaseLiveUser {
    public players = new Array();
    public userID: string;
    public image: string;
    public name: string;

    constructor(json: any) {
        Object.assign(this, json);
        if (json !== null) {
            this.userID = json["id"];
            this.image = json["i"];
            this.name = json["n"];

            const players = json["pl"];
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
            })
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
    public name: string;
    public points: number;
    public ps: number;

    constructor(json: any) {
        Object.assign(this, json);
        if (json !== null) {
            this.name = json["tn"];
            this.points = json["p"];
        }
    }
}


export class KickbaseLiveData {

    public users = new Array();
    public notLinedPlayers = new Array();
    public teams = new Array();
    public userID: string;

    constructor(json: any, jsonTeams: any, jsonNotLined: any, userID: string) {
        Object.assign(this, json);
        this.userID = userID;
        if (json !== null) {
            const users = json["u"];
            for (let user of users) {
                this.users.push(new KickbaseLiveUser(user));
            }
        }
        if (jsonNotLined !== null) {
            const users = jsonNotLined["pl"];
            for (let user of users) {
                this.notLinedPlayers.push(new KickbaseLivePlayer(user));
            }
        }
        if (jsonTeams !== null) {
            const teams = jsonTeams["t"];
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