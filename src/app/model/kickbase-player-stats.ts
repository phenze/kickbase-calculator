export interface NextOpponent {
  imageUrl: string;
  isHomeGame: boolean;
  dayLabel: string; // z. B. "Spieltag 1"
  dateString?: string; // z. B. "30.08." oder "30.08. 17:30"
  resultString?: string; // z. B. "3:3" oder "0:1"
  isFinished: boolean; // true, wenn Ergebnis feststeht
}

export class KickbasePlayerStats {
  // api fields
  public id!: string;
  public tid!: string;
  public status!: string;
  public mv!: number;

  // custom fields
  public points!: string;
  public averagePoints!: string;
  public buyPrice!: number;
  public realMarketValueChange!: number;

  public seasons!: string;

  public marketValues!: any[];

  public threeDaysValues: any[];
  public threeDaysValuesPercent: any[];
  public threeDays = '';

  public nextThreeOpponents!: NextOpponent[];

  constructor(json: any) {
    Object.assign(this, json);
    this.threeDaysValues = new Array();
    this.threeDaysValuesPercent = new Array();
    if (json != null) {
      this.points = json['tp'];
      this.averagePoints = json['ap'];
      this.status = json['st'];
      this.realMarketValueChange = json['tfhmvt'];

      this.nextThreeOpponents = new Array();

      if (json['mdsum'] && Array.isArray(json['mdsum'])) {
        const playerTeamId = String(json['tid']); // Team-ID des Spielers

        this.nextThreeOpponents = json['mdsum'].map((match: any) => {
          const isHome = String(match.t1) === playerTeamId;
          const opponentImgId = isHome ? match.t2 : match.t1;

          // Spiel abgeschlossen? (mdst === 2 bedeutet i.d.R. beendet / t1g & t2g vorhanden)
          const isFinished =
            match.mdst === 2 ||
            (match.t1g !== undefined && match.t1g !== 0) ||
            (match.t2g !== undefined && match.t2g !== 0);

          let dateStr = '';
          if (match.md) {
            const matchDate = new Date(match.md);
            dateStr = matchDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
          }

          return {
            imageUrl: 'https://kickbase.b-cdn.net/pool/teams/' + opponentImgId + '.png',
            isHomeGame: isHome,
            dayLabel: match.mdln || `Spieltag ${match.day}`,
            resultString: `${match.t1g}:${match.t2g}`,
            dateString: dateStr,
            isFinished: isFinished,
          } as NextOpponent;
        });
      }
    }
  }

  public calcValues() {
    this.calcThreeDays();
  }

  get realMarketValueChangePercent(): string {
    if (!this.realMarketValueChange || this.realMarketValueChange === -1)
      return 'Kann noch nicht berechnet werden'; // Schutz vor Division durch 0

    const ratio = this.realMarketValueChange / this.mv;

    return new Intl.NumberFormat('de-DE', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(ratio);
  }

  calcThreeDays() {
    this.threeDaysValues = new Array();
    this.threeDaysValuesPercent = new Array();
    if (this.marketValues !== undefined && this.marketValues.length > 1) {
      const lastValue = this.marketValues[this.marketValues.length - 2]['mv'];
      const newestValue = this.marketValues[this.marketValues.length - 1]['mv'];
      let offset = 4;
      if (newestValue === this.mv) {
        this.realMarketValueChange = this.mv - lastValue;
      } else {
        this.realMarketValueChange = this.mv - newestValue;
        offset -= 1;
      }

      const tmp = new Array();
      for (let i = offset; i >= 1; i--) {
        if (this.marketValues.length - i >= 0) {
          tmp.push(this.marketValues[this.marketValues.length - i]['mv']);
        }
      }
      for (let i = 0; i < tmp.length; i++) {
        const value = tmp[i];
        if (i + 1 < tmp.length) {
          const nextValue = tmp[i + 1];
          const change = nextValue - value;

          this.threeDaysValues.push({
            key: i,
            value: change,
          });

          const ratio = change / this.mv;

          const percentFormat = new Intl.NumberFormat('de-DE', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

          this.threeDaysValuesPercent.push({
            key: i,
            value: percentFormat.format(ratio),
          });
        }
      }
    }
  }
}
