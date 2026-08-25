import { KickbasePlayer } from './kickbase-player';

export class KickbaseGroup {
  public static readonly color_red = '#C10020';
  public static readonly color_green = '#007D34';
  public static readonly color_yellow = '#ffc107';

  public players: KickbasePlayer[];
  public numberValue = 0;
  public successValue = 0;
  public differenceValue = 0;
  public differenceFridayValue = 0;

  public trendValue = 0;
  public trendFridayValue = 0;
  public color = '';
  public colorFriday = '';

  public profitValue = 0;

  public lossValue = 0;

  public possibleMinusValue = 0;
  public possibleOfferValue = 0;
  public teamValue = 0;

  constructor() {
    this.players = new Array();

    // let player = new KickbasePlayer();
    // player.name = "Bakalorz";
    // player.value = 12000435
    // this.players.push(player)

    // let player2 = new KickbasePlayer();
    // player2.name = "Bakalorz";
    // player2.value = 12000435

    // this.players.push(player2)
  }

  public calcValues(
    currentAmount: number,
    includeMinusMarketValues: boolean,
    dayUntilFriday: number,
    achievementsDisabled: boolean = false,
  ) {
    for (const pl of this.players) {
      pl.calcValues();
    }
    this.numberValue = this.calcNumberValue();

    this.successValue = achievementsDisabled ? 0 : this.calcSuccessValue();

    this.teamValue = this.calcTeamValue();
    this.differenceValue = currentAmount + this.numberValue;
    this.trendValue = this.calcTrend(includeMinusMarketValues);
    this.lossValue = this.calcLoss();

    this.profitValue = this.calcTrend(false);

    let minusReferenceValue = this.teamValue;
    if (this.differenceValue < 0 && this.teamValue > 0) {
      minusReferenceValue += this.differenceValue;
    }
    minusReferenceValue *= 0.33;
    minusReferenceValue = Math.floor(minusReferenceValue);

    this.possibleMinusValue = minusReferenceValue;

    let availOfferValue = minusReferenceValue + this.differenceValue;
    this.possibleOfferValue = availOfferValue;

    this.differenceFridayValue =
      currentAmount + (this.numberValue + this.successValue + this.trendValue * dayUntilFriday);

    this.trendFridayValue = this.trendValue * dayUntilFriday;
    this.calcColors(currentAmount);
  }

  public calcColors(currentAmount: number) {
    for (const pl of this.players) {
      // pl.calcColors(this.differenceValue * -1);
      pl.calcColors(this.differenceValue);
    }
    if (currentAmount + this.numberValue < 0) {
      this.color = KickbaseGroup.color_red;
    } else {
      this.color = KickbaseGroup.color_green;
    }
    if (this.differenceFridayValue > 0) {
      this.colorFriday = '#007D34';
    } else {
      this.colorFriday = '#C10020';
    }
  }

  calcTrend(includeMinusMarketValues: boolean) {
    let value = 0;
    for (let player of this.players) {
      if (!player.isDeleted) {
        // NEU: Hat der Spieler einen fixen Verkaufspreis?
        const hasFixedSale = this.isSelling(player) && player.expectedSaleValue !== null;

        // Der Trend greift nur, wenn der Preis NICHT fix ist
        if (!hasFixedSale && this.isSelling(player)) {
          if (player.stats !== null) {
            if (player.stats.realMarketValueChange > 0 || includeMinusMarketValues) {
              value += player.stats.realMarketValueChange;
            }
          }
        }
      }
    }
    return value;
  }

  calcLoss() {
    let value = 0;
    for (let player of this.players) {
      if (!player.isDeleted) {
        // NEU: Wie beim Trend - ignorieren, wenn ein fixer Verkaufswert existiert
        const hasFixedSale = this.isSelling(player) && player.expectedSaleValue !== null;

        if (!hasFixedSale && this.isSelling(player)) {
          if (player.stats !== null && player.stats.realMarketValueChange < 0) {
            value += player.stats.realMarketValueChange;
          }
        }
      }
    }
    return value;
  }

  private calcNumberValue() {
    let retVal = 0;
    for (let p of this.players) {
      if (this.isSelling(p)) {
        // NEU: Nimm den fixen Erwartungswert, falls gesetzt. Sonst den normalen Wert.
        const salePrice = p.expectedSaleValue !== null ? p.expectedSaleValue : p.value;
        retVal += salePrice;
      }
    }
    return retVal;
  }

  private calcSuccessValue() {
    let retVal = 0;
    for (let p of this.players) {
      if (!p.isDeleted && this.isSelling(p)) {
        retVal += p.successValue;
      }
    }
    return retVal;
  }

  private calcTeamValue() {
    let retVal = 0;
    for (let p of this.players) {
      if (p.isKept || p.isFixedSquad || p.isDeleted) {
        retVal += p.marketValue;
      }
    }
    return retVal;
  }

  private isSelling(p: KickbasePlayer): boolean {
    return !p.isKept && !p.isFixedSquad && !p.isDeleted;
  }
}
