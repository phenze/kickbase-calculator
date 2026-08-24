export class KickbaseGift {
  public isAvailable = false;
  public amount = 0;
  public level = 0;

  constructor(json: any) {
    Object.assign(this, json);
  }
}
