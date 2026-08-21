

export class KickbaseLeague {

    public id = 0;
    public name = '';
    public teamValue = 0;
    public budget = 0;
    public amd = false;

    constructor(json: any) {
        Object.assign(this, json);
        if (json != null) {
            if (json.hasOwnProperty('lm')) {
                let lm = json["lm"];
                this.teamValue = lm["teamValue"]
                this.budget = lm["budget"]
                this.amd = lm["amd"] ?? json["amd"] ?? false;
            } else if (json.hasOwnProperty('amd')) {
                this.amd = json["amd"];
            }
        }
    }

    public static createArrayInstance(json: any): KickbaseLeague[] {

        const retVal: KickbaseLeague[] = new Array<KickbaseLeague>();
        if (json != null) {
            let tmp = json;
            for (let tmpitem of tmp as any) {
                const post: KickbaseLeague = new KickbaseLeague(tmpitem);
                retVal.push(post);
            }
        }

        return retVal;
    }




}