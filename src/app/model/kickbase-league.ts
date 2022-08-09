

export class KickbaseLeague {

    public id: number;
    public name: string;
    public teamValue: number;
    public budget: number;




    constructor(json: any) {
        Object.assign(this, json);
        if (json != null) {
            if (json.hasOwnProperty('lm')) {
                let lm = json["lm"];
                this.teamValue = lm["teamValue"]
                this.budget = lm["budget"]
            }
        }
    }

    public static createArrayInstance(json: any): KickbaseLeague[] {

        const retVal: KickbaseLeague[] = new Array<KickbaseLeague>();
        if (json != null) {
            if (json.hasOwnProperty('leagues')) {
                let tmp = json["leagues"];
                for (let tmpitem of tmp as any) {
                    const post: KickbaseLeague = new KickbaseLeague(tmpitem);
                    retVal.push(post);
                }
            }
        }

        return retVal;
    }




}