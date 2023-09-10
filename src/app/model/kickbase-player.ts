

import * as numeral from 'numeral';
import { ApiService } from '../services/api.service';
import { KickbasePlayerStats } from './kickbase-player-stats';
import * as moment from 'moment';
import { KickbaseGroup } from './kickbase-group';

export class KickbasePlayer {

  public name: string;
  public nameHash: string;
  public profile: string;
  public profileBig: string;
  public value: number;
  public id: number;
  public leagueId: number;
  public expiry: number;
  public expiryColor: string;
  public status: number;
  public isPersitantDeleted: boolean;
  public marketValue: number;
  public priceString: string;
  public priceMarketValueDifferString: string;
  public price: number;
  public expiryDate: string;

  public stats: KickbasePlayerStats;

  public offervalue = 0;

  public imageUrl = '';
  public color = '';
  public colorMarketValue = '';
  public colorOfferValue = '';
  public colorSuccessValue = '';
  public colorOffsetValue = '';

  public hasOfferFromAny: boolean;
  public isDeactivated: boolean;
  public isDeleted: boolean;

  public isInEditMode: boolean;

  public marketValuesShown: boolean;
  public username: string;

  constructor(json: any, userID: string) {
    this.offervalue = 0;
    this.hasOfferFromAny = false;
    this.isDeactivated = false;
    this.isDeleted = false;
    this.marketValuesShown = false;
    this.isPersitantDeleted = false;
    this.nameHash = '';
    this.leagueId = -1;
    this.username = '';
    Object.assign(this, json);
    this.stats = null;
    if (json != null) {
      this.value = json["marketValue"];
      if (json.hasOwnProperty("knownName")) {
        this.name = json["knownName"]
      } else {
        this.name = json["firstName"] + " " + json["lastName"];
      }

      if (json.hasOwnProperty('offers')) {
        let offers = json["offers"];
        let lastOfferPrice = 0;

        for (let offer of offers as any) {
          let userIDOffer = offer['userId'];
          let price = offer["price"];
          if (Number(price) != 1) {
            if (userIDOffer == userID) {
              this.offervalue = Number(price)
            }
            this.value = Math.max(price, lastOfferPrice);
            lastOfferPrice = price;
          }

        }
      }
      let date = moment(new Date()).add(this.expiry, 'seconds');
      this.expiryDate = date.format('DD.MM.YYYY HH:mm:ss');
    }
    // if (this.profile === undefined || this.profile.length === 0) {
    //   this.imageUrl = this.profileBig;
    // } else {
    // }
    this.imageUrl = 'https://api.kickbase.com/files/players/' + this.id + '/1';

    this.calcValues();
  }

  public calcValues() {
    this.valueString = this.getValueTmp();
    this.valuePercentString = this.getValuePercentTmp();
    this.marketValueString = this.getMarketValueTmp();
    this.offset = this.getOffsetTmp();
    this.offsetNumber = this.getOffsetNumberTmp();
    this.successValue = this.getSuccessValueTmp();
    this.successValueString = this.getsuccessValueStringTmp();
    this.priceString = this.getPriceTmp();
    this.priceMarketValueDifferString = this.getPriceMarketValueDifferTmp();
    if (this.stats !== null) {
      this.stats.calcValues();
    }

  }

  public calcColors(differenceValue: number) {
    if (differenceValue >= 0 && Math.abs(differenceValue) >= this.value) {
      this.color = "#007D341F";
    } else {
      this.color = "#C100201F";
    }
    if (this.isDeactivated || this.isPersitantDeleted) {
      this.color = "#260C0C1F";
    }

    if (this.stats !== null) {
      this.colorMarketValue = this.stats.realMarketValueChange > 0 ? KickbaseGroup.color_green : KickbaseGroup.color_red;
    }
    this.colorSuccessValue = this.successValue > 0 ? KickbaseGroup.color_green : KickbaseGroup.color_red;
    this.colorOffsetValue = this.offsetNumber > 0 ? KickbaseGroup.color_green : KickbaseGroup.color_red;
    // add percent when value should turn green
    let offerOffset = 0;
    const offerOffsetTmp = localStorage.getItem('offerOffset')
    if (offerOffsetTmp !== null && offerOffsetTmp !== undefined) {
      try {
        offerOffset = Number.parseFloat(offerOffsetTmp) / 100;
      } catch {
        // no nothing when number could not be parsed
      }
    }
    this.colorOfferValue = this.value >= (this.marketValue * (1 + offerOffset)) ? KickbaseGroup.color_green : KickbaseGroup.color_red;
    this.hasOfferFromAny = this.value !== this.marketValue;
    this.expiryColor = '#212529';
    // one hour
    if (this.expiry <= 60 * 60) {
      this.expiryColor = KickbaseGroup.color_red;
    } else if (this.expiry <= 60 * 60 * 2) {
      this.expiryColor = KickbaseGroup.color_green;
    }

  }


  private getPriceTmp() {
    let n = numeral(this.price);
    return n.format('0,0 $');
  }

  private getPriceMarketValueDifferTmp() {
    let n = numeral(this.price - this.marketValue);
    return n.format('0,0 $');
  }

  public valueString = 0;
  private getValueTmp() {
    let n = numeral(this.value);
    return n.format('0,0 $');
  }

  public valuePercentString = 0;
  private getValuePercentTmp() {
    let n = numeral((this.value - this.marketValue) / this.marketValue);
    return n.format('0.000%');
  }

  public marketValueString = '';
  private getMarketValueTmp() {
    let n = numeral(this.marketValue);
    return n.format('0,0 $');
  }

  public offset = '';
  private getOffsetTmp() {
    if (this.stats !== null) {
      let n = numeral(this.value - this.stats.buyPrice);
      return n.format('0,0 $');
    }
    return '';
  }

  public successValueString = '';
  private getsuccessValueStringTmp() {
    let n = numeral(this.successValue);
    return n.format('0,0 $');
  }

  public successValue = 0;
  private getSuccessValueTmp() {
    let retVal = 0;
    if (this.stats !== null) {
      let offset = this.offsetNumber;
      /*
      3000000	5000000	10000000	20000000
      250000	750000	1750000	3750000
       */
      // 25 mio
      if (offset > 25000000) {
        retVal += 2000000;
      }
      // 10 mio
      if (offset >= 10000000) {
        retVal += 1000000;
      }
      // 5 mio
      if (offset >= 5000000) {
        retVal += 500000;
      }
      // 3 mio
      if (offset >= 3000000) {
        retVal += 250000;
      }
    }
    return retVal;
  }

  public offsetNumber = 0;
  private getOffsetNumberTmp() {
    if (this.stats !== null) {
      return this.value - this.stats.buyPrice;
    }
    return 0;
  }

  public static createArrayInstance(json: any, userID: string): KickbasePlayer[] {

    const retVal: KickbasePlayer[] = new Array<KickbasePlayer>();
    if (json != null) {

      for (let tmpitem of json as any) {
        const post: KickbasePlayer = new KickbasePlayer(tmpitem, userID);
        retVal.push(post);
      }

    }

    return retVal;
  }

  loadStats = async (league: number, apiService: ApiService, force = false) => {
    if (this.stats === null || force) {
      this.stats = await apiService.getPlayerStats(league, this.id);
      // sometimes mv from stats differs from the real one which is one the player
      // This happens in Challenges. Dont know why
      if (this.marketValue !== this.stats.marketValue) {
        this.stats.marketValue = this.marketValue;
      }
    }
  }

  copy(userId: string) {
    const retVal = new KickbasePlayer(null, userId);

    retVal.name = this.name;
    retVal.profile = this.profile;
    retVal.profileBig = this.profileBig;
    retVal.value = this.value;
    retVal.id = this.id;
    retVal.expiry = this.expiry;
    retVal.marketValue = this.marketValue;
    retVal.expiryDate = this.expiryDate;

    retVal.stats = this.stats;

    retVal.offervalue = this.offervalue;

    retVal.imageUrl = this.imageUrl;
    retVal.color = this.color;
    retVal.colorMarketValue = this.colorMarketValue;
    retVal.colorSuccessValue = this.colorSuccessValue;
    retVal.colorOffsetValue = this.colorOffsetValue;
    retVal.colorOfferValue = this.colorOfferValue;
    retVal.hasOfferFromAny = this.hasOfferFromAny;
    retVal.isDeactivated = this.isDeactivated;

    retVal.valueString = this.valueString;
    retVal.marketValueString = this.marketValueString;
    retVal.offset = this.offset;
    retVal.successValue = this.successValue;
    retVal.offsetNumber = this.offsetNumber;
    retVal.nameHash = this.nameHash;

    return retVal;
  }

  toJSON() {
    return {
      name: this.name,
      nameHash: this.nameHash,
      value: this.value,
      marketValue: this.marketValue,
      realMarketValueChange: this.stats.realMarketValueChange,
    }
  }

}
