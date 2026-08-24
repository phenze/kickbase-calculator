import { ApiService } from '../services/api.service';
import { KickbasePlayerStats } from './kickbase-player-stats';
import { KickbaseGroup } from './kickbase-group';

export class KickbasePlayer {
  public id!: number;
  public name!: string;
  public value!: number;
  public marketValue!: number;
  public uoid!: string;
  public pim!: string;

  // local api fields
  public nameHash!: string;

  // market fields
  public expiryDate!: string;
  public expiry!: number;
  public expiryColor!: string;
  public priceMarketValueDiffer!: number;
  public price!: number;

  // custom fields
  public status!: number;
  public leagueId!: number;
  public stats: KickbasePlayerStats | null = null;
  public offervalue = 0;
  public imageUrl = '';
  public color = '';
  public colorMarketValue = '';
  public colorOfferValue = '';
  public colorSuccessValue = '';
  public colorOffsetValue = '';

  public hasOfferFromAny!: boolean;

  public isFixedSquad: boolean;
  public isKept: boolean;
  public isDeleted: boolean;

  public isInEditMode!: boolean;

  public marketValuesShown!: boolean;
  public username!: string;

  public expectedSaleValue: number | null = null;

  constructor(json: any, userID: string | number) {
    this.offervalue = 0;
    this.hasOfferFromAny = false;
    this.isKept = false;
    this.isDeleted = false;
    this.marketValuesShown = false;
    this.isFixedSquad = false;
    this.nameHash = '';
    this.leagueId = -1;
    this.username = '';
    this.pim = '';
    Object.assign(this, json);
    if (json != null) {
      this.id = json['i'];
      this.value = json['mv'];
      this.marketValue = json['mv'];
      this.status = json['st'];
      this.price = json['prc'];
      if (json.hasOwnProperty('n')) {
        this.name = json['n'];
      }

      this.price = json['prc'] ?? 0;

      // Nur wenn uoid/uop explizit im Payload übergeben werden (z. B. bei eigenen Angeboten)
      if (json.hasOwnProperty('uoid') && json['uoid'] !== '0') {
        this.price = json['uop'] ?? this.price;
      }

      this.priceMarketValueDiffer = this.price - this.marketValue;

      if (json.hasOwnProperty('u') && json['u'] != null && json['u']['n']) {
        this.username = json['u']['n'];
      } else {
        this.username = '';
      }
      if (json.hasOwnProperty('ofs')) {
        const offers = json['ofs'] as unknown[];
        let lastOfferPrice = 0;

        for (const offer of offers) {
          console.log(offer);
          const typedOffer = offer as Record<string, unknown>;
          const userIDOffer = typedOffer['u'];
          const price = Number(typedOffer['uop']);
          if (Number(price) !== 1) {
            if (userIDOffer == userID) {
              this.offervalue = Number(price);
            }
            this.value = Math.max(price, lastOfferPrice);
            lastOfferPrice = price;
          }
        }
      }
      this.expiry = json['exs'];
      const safeExpiry = Number(this.expiry) || 0;

      const date = this.addSeconds(new Date(), safeExpiry);
      this.expiryDate = this.formatGermanDateTime(date);
    }

    if (this.pim.length === 0) {
      this.imageUrl = 'https://kickbase.b-cdn.net/pool/playersbig/' + this.id + '.png';
    } else {
      this.imageUrl = 'https://kickbase.b-cdn.net/' + this.pim;
    }

    this.calcValues();
  }

  public calcValues() {
    if (this.stats !== null) {
      this.stats.calcValues();
    }
  }

  private addSeconds(baseDate: Date, seconds: number): Date {
    return new Date(baseDate.getTime() + seconds * 1000);
  }

  private formatGermanDateTime(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  }

  public calcColors(differenceValue: number) {
    if (differenceValue >= 0 && Math.abs(differenceValue) >= this.value) {
      this.color = '#007D341F';
    } else {
      this.color = '#C100201F';
    }
    if (this.isKept || this.isFixedSquad) {
      this.color = '#260C0C1F';
    }

    if (this.stats !== null) {
      this.colorMarketValue =
        this.stats.realMarketValueChange > 0 ? KickbaseGroup.color_green : KickbaseGroup.color_red;
    }
    this.colorSuccessValue =
      this.successValue !== null && this.successValue > 0
        ? KickbaseGroup.color_green
        : KickbaseGroup.color_red;
    this.colorOffsetValue =
      this.offsetNumber !== null && this.offsetNumber > 0
        ? KickbaseGroup.color_green
        : KickbaseGroup.color_red;
    // add percent when value should turn green
    let offerOffset = 0;
    const offerOffsetTmp = localStorage.getItem('offerOffset');
    if (offerOffsetTmp !== null && offerOffsetTmp !== undefined) {
      try {
        offerOffset = Number.parseFloat(offerOffsetTmp) / 100;
      } catch {
        // no nothing when number could not be parsed
      }
    }
    this.colorOfferValue =
      this.value >= this.marketValue * (1 + offerOffset)
        ? KickbaseGroup.color_green
        : KickbaseGroup.color_red;
    this.hasOfferFromAny = this.value !== this.marketValue;
    this.expiryColor = '#212529';
    // one hour
    if (this.expiry <= 60 * 60) {
      this.expiryColor = KickbaseGroup.color_red;
    } else if (this.isUntilMarketValueUpdate) {
      this.expiryColor = KickbaseGroup.color_yellow;
    }
  }

  get priceMarketValueDifferPercent(): string {
    if (!this.price || this.price === 0) return '0,00%'; // Schutz vor Division durch 0

    const ratio = (this.price - this.marketValue) / this.marketValue;

    return new Intl.NumberFormat('de-DE', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(ratio);
  }

  get valuePercentString(): string {
    if (!this.marketValue) return '0,00%'; // Schutz vor Division durch 0

    const ratio = (this.value - this.marketValue) / this.marketValue;

    return new Intl.NumberFormat('de-DE', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(ratio);
  }

  get successValue(): number {
    let retVal = 0;
    if (this.stats !== null) {
      let offset = this.offsetNumber;
      if (offset === null) {
        return 0;
      }
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

  get offsetNumber(): number | null {
    if (this.stats !== null) {
      return (
        (this.expectedSaleValue !== null ? this.expectedSaleValue : this.value) -
        this.stats.buyPrice
      );
    }
    return null;
  }

  get isUntilMarketValueUpdate(): boolean {
    if (this.expiry <= 0) return false; // expiryDateRaw als Date-Objekt vorausgesetzt

    const now = new Date();
    const today22 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 22, 0, 0);

    const safeExpiry = Number(this.expiry) || 0;

    const date = this.addSeconds(new Date(), safeExpiry);
    // Ablauf liegt am heutigen Tag vor oder genau um 22:00 Uhr
    return date <= today22;
  }

  public static createArrayInstance(json: any, userID: string | number): KickbasePlayer[] {
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
      const marketValueStats = (await apiService.getMarketValuePlayerStats(
        league,
        this.id,
      )) as unknown as Record<string, unknown>;
      this.stats.marketValues = (marketValueStats['it'] as unknown[]) ?? [];
      this.stats.buyPrice = Number(marketValueStats['trp']);
      // sometimes mv from stats differs from the real one which is one the player
      // This happens in Challenges. Dont know why
      if (this.marketValue !== this.stats.mv) {
        this.stats.mv = this.marketValue;
      }
    }
  };

  copy(userId: string | number) {
    const retVal = new KickbasePlayer(null, userId);

    retVal.name = this.name;
    retVal.value = this.value;
    retVal.id = this.id;
    retVal.expiry = this.expiry;
    retVal.marketValue = this.marketValue;
    retVal.expiryDate = this.expiryDate;
    retVal.username = this.username;

    retVal.stats = this.stats;

    retVal.offervalue = this.offervalue;

    retVal.imageUrl = this.imageUrl;
    retVal.color = this.color;
    retVal.colorMarketValue = this.colorMarketValue;
    retVal.colorSuccessValue = this.colorSuccessValue;
    retVal.colorOffsetValue = this.colorOffsetValue;
    retVal.colorOfferValue = this.colorOfferValue;
    retVal.hasOfferFromAny = this.hasOfferFromAny;
    retVal.isKept = this.isKept;
    retVal.isFixedSquad = this.isFixedSquad;
    retVal.isDeleted = this.isDeleted;
    retVal.nameHash = this.nameHash;
    retVal.expectedSaleValue = this.expectedSaleValue;

    return retVal;
  }

  toJSON() {
    return {
      name: this.name,
      nameHash: this.nameHash,
      value: this.value,
      marketValue: this.marketValue,
      realMarketValueChange: this.stats?.realMarketValueChange ?? 0,
    };
  }
}
