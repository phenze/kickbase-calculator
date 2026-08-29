export class KickbaseLeague {
  public id = 0;
  public name = '';
  public teamValue = 0;
  public budget = 0;
  public amd = false;

  constructor(json: any) {
    Object.assign(this, json);
    if (json != null) {
      this.id = json['i'];
      this.name = json['n'];
      this.budget = json['b'];
      this.teamValue = json['tv'];
      this.amd = json['amd'] ?? false;
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
