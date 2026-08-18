

import numeral from 'numeral';


export class KickbaseGift {


    public isAvailable = false;
    public amount = 0;
    public level = 0;
    public value = '';

    constructor(json: any) {


        Object.assign(this, json);

        let n = numeral(this.amount);
        this.value = n.format('0,0 $');
    }
}