

import { KickbasePlayer } from './kickbase-player';
import * as numeral from 'numeral';
import * as moment from 'moment';

export class KickbaseGroup {


	public static readonly color_red = '#C10020';
	public static readonly color_green = '#007D34';

	public players: KickbasePlayer[]
	public value = '';
	public numberValue = 0;
	public success = '';
	public successValue = 0;
	public difference = '';
	public differenceValue = 0;

	public differenceFriday = '';
	public differenceValueFriday = 0;

	public trendValue = 0;
	public trend = '';
	public trendFriday = '';
	public color = '';
	public colorFriday = '';


	public profitValue = 0;
	public profit = '';

	public lossValue = 0;
	public loss = '';

	public team = '';
	public possibleMinus = '';
	public possibleOffer = '';
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

	public calcValues(currentAmount: number, includeMinusMarketValues: boolean, dayUntilFriday: number) {
		for (const pl of this.players) {
			pl.calcValues();
		}
		this.numberValue = this.getNumberValueTmp();
		let n = numeral(this.numberValue);
		this.value = n.format('0,0 $');
		this.successValue = this.getSuccessValueTmp();
		this.teamValue = this.getTeamValueTmp(false);
		this.differenceValue = currentAmount + this.numberValue;
		this.trendValue = this.getTrend(includeMinusMarketValues);
		this.lossValue = this.getLoss();

		this.profitValue = this.getTrend(false);

		// let di = numeral(this.differenceValue * -1);
		let di = numeral(this.differenceValue);
		this.difference = di.format('0,0 $');

		let tm = numeral(this.teamValue);

		let minusReferenceValue = this.teamValue;
		// if we are in minus substract it from kaderwert
		if (this.differenceValue < 0 && this.teamValue > 0) {
			minusReferenceValue += this.differenceValue;
		}
		// take 33% of real kaderwert
		minusReferenceValue *= 0.33;
		minusReferenceValue = Math.floor(minusReferenceValue);

		// let minusAvailable = minusReferenceValue;
		// if (this.differenceValue < 0) {
		// 	minusAvailable += this.differenceValue;
		// }

		let minus = numeral(minusReferenceValue);
		// let ma = numeral(minusAvailable);
		this.team = tm.format('0,0 $');
		this.possibleMinus = minus.format('0,0 $');

		let availOfferValue = numeral(minusReferenceValue + this.differenceValue)
		this.possibleOffer = availOfferValue.format('0,0 $');

		this.differenceValueFriday = currentAmount +
			(this.numberValue +
				this.successValue +
				(this.trendValue * dayUntilFriday));
		// let dif = numeral((this.differenceValueFriday * -1));
		let dif = numeral(this.differenceValueFriday);
		this.differenceFriday = dif.format('0,0 $');

		let tv = numeral(this.trendValue);
		this.trend = tv.format('0,0 $');

		let pf = numeral(this.profitValue);
		this.profit = pf.format('0,0 $');

		let sv = numeral(this.successValue);
		this.success = sv.format('0,0 $');

		let lv = numeral(this.lossValue);
		this.loss = lv.format('0,0 $');

		let tvf = numeral(this.trendValue * dayUntilFriday);
		this.trendFriday = tvf.format('0,0 $');
		this.calcColors(currentAmount, dayUntilFriday);
	}

	public calcColors(currentAmount: number, dayUntilFriday: number) {
		for (const pl of this.players) {
			// pl.calcColors(this.differenceValue * -1);
			pl.calcColors(this.differenceValue);
		}
		if (currentAmount + this.numberValue < 0) {
			this.color = KickbaseGroup.color_red;
		} else {
			this.color = KickbaseGroup.color_green;
		}
		if (this.differenceValueFriday > 0) {
			this.colorFriday = "#007D34";
		} else {
			this.colorFriday = "#C10020";
		}
	}

	getTrend(includeMinusMarketValues: boolean) {
		let value = 0;
		for (let player of this.players) {
			if (!player.isDeactivated && !player.isDeleted && !player.isPersitantDeleted) {
				if (player.stats !== null) {
					if (player.stats.realMarketValueChange > 0 || includeMinusMarketValues) {
						value += player.stats.realMarketValueChange;
					}
				}
			}
		}
		return value;
	}

	getLoss() {
		let value = 0;
		for (let player of this.players) {
			if (!player.isDeactivated && !player.isDeleted && !player.isPersitantDeleted) {
				if (player.stats !== null) {
					if (player.stats.realMarketValueChange < 0) {
						value += player.stats.realMarketValueChange;
					}
				}
			}
		}
		return value;
	}


	private getNumberValueTmp() {
		let retVal = 0;
		for (let p of this.players) {
			if (!p.isDeactivated && !p.isDeleted && !p.isPersitantDeleted) {
				retVal = retVal + p.value;
			}
		}
		return retVal;
	}

	private getSuccessValueTmp() {
		let retVal = 0;
		for (let p of this.players) {
			if (!p.isDeactivated && !p.isDeleted && !p.isPersitantDeleted) {
				retVal = retVal + p.successValue;
			}
		}
		return retVal;
	}

	private getTeamValueTmp(force: boolean) {
		let retVal = 0;
		for (let p of this.players) {
			if (p.isDeactivated || p.isDeleted || p.isPersitantDeleted || force) {
				retVal = retVal + p.marketValue;
			}
		}
		return retVal;
	}

}