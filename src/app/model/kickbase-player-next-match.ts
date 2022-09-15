

export class KickbasePlayerNextMatch {

  public date: Date;
  public matchDay: number;
  public teamName: string;
  public teamId: string;
  public teamShortName: string;
  public imageUrl: string;
  public isHomeGame: boolean;

  constructor(json: any, teamId: string) {
    const team1TeamId = json["t1i"];
    const team2TeamId = json["t2i"];
    this.isHomeGame = false;
    if (team1TeamId !== teamId) {
      this.teamName = json["t1n"];
      this.teamId = team1TeamId;
      this.teamShortName = json["t1y"];
    } else {
      this.isHomeGame = true;
      this.teamName = json["t2n"];
      this.teamId = team2TeamId;
      this.teamShortName = json["t2y"];
    }

    this.matchDay = json["md"];
    this.date = new Date(json["d"]);
    this.imageUrl = 'https://api.kickbase.com/files/teams/' + this.teamId + '/10';

  }
}
