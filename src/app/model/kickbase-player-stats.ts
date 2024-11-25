

import * as numeral from 'numeral';
import { KickbasePlayerNextMatch } from './kickbase-player-next-match';
export class KickbasePlayerStats {

  // api fields
  public id: string;
  public tid: string;
  public status: string;
  public mv: number;

  // custom fields
  public points: string;
  public averagePoints: string;
  public buyPrice: number;
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
      this.points = json['tp'];
      this.averagePoints = json['ap'];
      this.status = json['st'];
      this.realMarketValueChange = json['tfhmvt'];

      this.nextThreeOpponents = new Array();
      const nextMatches = json["mdsum"];
      if (nextMatches !== undefined) {
        let index = 0;
        for (const nm of nextMatches) {
          if (index > 0) {
            this.nextThreeOpponents.push(new KickbasePlayerNextMatch(nm, this.tid));
          }
          index++
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
      let np = numeral((this.realMarketValueChange / this.mv));
      this.realMarketValueChangeValue = n.format('0,0 $');

      this.realMarketValueChangeValuePrecent = np.format('0.000%');
    } else {
      this.realMarketValueChangeValue = 'Kann noch nicht berechnet werden'
    }
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
          let n = numeral(change);
          this.threeDaysValues.push(n.format('0,0 $'));
          let np = numeral(change / this.mv);

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
