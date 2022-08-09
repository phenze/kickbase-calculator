

import { KickbasePlayer } from './kickbase-player';
import * as numeral from 'numeral';


export class KickbaseMarket {

    public players: KickbasePlayer[]

    public offerAmountForUser = 0;

    constructor(json: any, userID: string) {

        this.players = new Array();
        this.offerAmountForUser = 0;
        Object.assign(this, json);
        if (json != null) {
            if (json.hasOwnProperty("players")) {
                let p = json["players"]
                this.players = KickbasePlayer.createArrayInstance(p, userID);
            }
        }

        for (const player of this.players) {
            this.offerAmountForUser = this.offerAmountForUser + player.offervalue;
        }

        // let player = new KickbasePlayer();
        // player.name = "Bakalorz";
        // player.value = 12000435
        // this.players.push(player)


        // let player2 = new KickbasePlayer();
        // player2.name = "Bakalorz";
        // player2.value = 12000435

        // this.players.push(player2)

        this.players = this.players.sort((a: KickbasePlayer, b: KickbasePlayer) => {
            if (a.expiry < b.expiry) {
                return -1;
            } else if (a.expiry > b.expiry) {
                return 1;
            } else {
                return 0;
            }
        })

    }


    getValue() {
        let n = numeral(this.getNumberValue());
        return n.format('0,0 $');
    }

    getNumberValue() {
        let retVal = 0;
        for (let p of this.players) {
            retVal = retVal + p.value;
        }
        return retVal;
    }

}