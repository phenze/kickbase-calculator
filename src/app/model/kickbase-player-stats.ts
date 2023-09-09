

import * as numeral from 'numeral';
import { KickbasePlayerNextMatch } from './kickbase-player-next-match';
export class KickbasePlayerStats {

  public id: string;
  public teamId: string;
  public userId: string;
  public userProfileUrl: string;
  public userName: string;
  public userFlags: string;
  public firstName: string;
  public lastName: string;
  public profileUrl: string;
  public teamUrl: string;
  public teamCoverUrl: string;
  public status: string;
  public position: string;
  public number: string;
  public points: string;
  public averagePoints: string;
  public marketValue: number;
  public mvTrend: string;
  public mvHigh: string;
  public mvHighDate: string;
  public mvLow: string;
  public mvLowDate: string;
  public buyDate: string;
  public buyPrice: number;
  public matchesTotal: string;
  public marketValueChange: string;
  public marketValueChangePercent: string;

  public realMarketValueChange: number;

  public seasons: string;

  public marketValues: any[];

  public threeDaysValues: any[];
  public threeDaysValuesPercent: any[];
  public threeDays = '';

  public realMarketValueChangeValue = '';
  public realMarketValueChangeValuePrecent = '';
  public buyPriceValue = '';

  public nextThreeOpponents: KickbasePlayerNextMatch[];


  constructor(json: any) {
    Object.assign(this, json);
    this.threeDaysValues = new Array();
    this.threeDaysValuesPercent = new Array();
    if (json != null) {
      const leaguePlayer = json["leaguePlayer"];
      if (leaguePlayer !== undefined) {
        this.buyDate = leaguePlayer['buyDate'];
        this.buyPrice = leaguePlayer['buyPrice'];
      }

      this.nextThreeOpponents = new Array();
      const nextMatches = json["nm"];
      if (nextMatches !== undefined) {
        for (const nm of nextMatches) {
          this.nextThreeOpponents.push(new KickbasePlayerNextMatch(nm, this.teamId));
        }
      }
    }
  }

  public calcValues() {
    this.calcThreeDays();
    this.calcrealMarketValueChangeValue();
    this.calcbuyPriceValue();
  }

  calcrealMarketValueChangeValue() {
    if (this.realMarketValueChange !== -1) {
      let n = numeral(this.realMarketValueChange);
      let np = numeral((this.realMarketValueChange / this.marketValue));
      this.realMarketValueChangeValue = n.format('0,0 $');

      this.realMarketValueChangeValuePrecent = np.format('0.000%');
    } else {
      this.realMarketValueChangeValue = 'Kann noch nicht berechnet werden'
    }
  }

  calcThreeDays() {
    this.threeDaysValues = new Array();
    this.threeDaysValuesPercent = new Array();
    if (this.marketValues.length > 1) {
      const lastValue = this.marketValues[this.marketValues.length - 2]['m'];
      const newestValue = this.marketValues[this.marketValues.length - 1]['m'];
      let offset = 4;
      if (newestValue === this.marketValue) {
        this.realMarketValueChange = this.marketValue - lastValue;
      } else {
        this.realMarketValueChange = this.marketValue - newestValue;
        offset -= 1;
      }

      const tmp = new Array();
      for (let i = offset; i >= 1; i--) {
        if (this.marketValues.length - i >= 0) {
          tmp.push(this.marketValues[this.marketValues.length - i]['m']);
        }
      }
      for (let i = 0; i < tmp.length; i++) {
        const value = tmp[i];
        if (i + 1 < tmp.length) {
          const nextValue = tmp[i + 1];
          const change = nextValue - value;
          let n = numeral(change);
          this.threeDaysValues.push(n.format('0,0 $'));
          let np = numeral(change / this.marketValue);

          this.threeDaysValuesPercent.push(np.format('0.000%'));
        }
      }
    }
  }

  calcbuyPriceValue() {
    let n = numeral(this.buyPrice);
    this.buyPriceValue = n.format('0,0 $');
  }

}
