

export class KickbasePlayerNextMatch {

  public date: Date;
  public matchDay: number;
  public teamId: string;
  public imageUrl: string;
  public isHomeGame: boolean;

  constructor(json: any, teamId: string) {
    const team1TeamId = json["t1"];
    const team2TeamId = json["t2"];
    this.isHomeGame = false;
    if (team1TeamId !== teamId) {
      this.teamId = team1TeamId;

    } else {
      this.isHomeGame = true;
      this.teamId = team2TeamId;
    }

    this.matchDay = json["md"];
    this.date = new Date(json["d"]);
    
    this.imageUrl = 'https://kickbase.b-cdn.net/pool/teams/' + this.teamId + '.png';

  }
}
