

import * as numeral from 'numeral';


export class KickbaseGift {


    public isAvailable: boolean;
    public amount: number;
    public level: number;
    public value = '';

    constructor(json: any) {


        Object.assign(this, json);

        let n = numeral(this.amount);
        this.value = n.format('0,0 $');
    }
}