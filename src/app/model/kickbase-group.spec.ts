import { KickbaseGroup } from './kickbase-group';
import { KickbasePlayer } from './kickbase-player';
import numeral from 'numeral';
import { KickbasePlayerStats } from './kickbase-player-stats';

function makePlayer(overrides: Partial<KickbasePlayer> = {}): KickbasePlayer {
  const player = new KickbasePlayer(null, 1);
  player.value = 0;
  player.marketValue = 0;
  player.successValue = 0;
  player.isDeactivated = false;
  player.isDeleted = false;
  player.isPersitantDeleted = false;
  player.stats = null as any;
  Object.assign(player, overrides);
  return player;
}

describe('KickbaseGroup', () => {
  let group: KickbaseGroup;

  beforeEach(() => {
    group = new KickbaseGroup();
  });

  beforeAll(() => {
    numeral.locale('de');
  });

  it('sollte mit einem leeren players-Array erzeugt werden', () => {
    expect(group.players).toEqual([]);
  });

  describe('calcValues - Summenbildung', () => {
    it('summiert nur aktive Spieler in numberValue', () => {
      group.players = [
        makePlayer({ value: 1000000 }),
        makePlayer({ value: 2000000, isDeactivated: true }),
        makePlayer({ value: 3000000, isDeleted: true }),
        makePlayer({ value: 4000000, isPersitantDeleted: true }),
        makePlayer({ value: 500000 }),
      ];

      group.calcValues(0, false, 0);

      expect(group.numberValue).toBe(1500000);
    });

    it('summiert successValue nur ueber aktive Spieler', () => {
		// Erzeugt einen Offset von 5 Mio -> ergibt 250.000 + 500.000 = 750.000 successValue
		const statsA = new KickbasePlayerStats(null);
		statsA.buyPrice = 0;

		const activePlayer1 = makePlayer({ value: 5000000, stats: statsA });
		const activePlayer2 = makePlayer({ value: 5000000, stats: statsA });
		const deactivatedPlayer = makePlayer({ value: 5000000, isDeactivated: true, stats: statsA });

		group.players = [activePlayer1, activePlayer2, deactivatedPlayer];

		group.calcValues(0, false, 0);

		// successValue berechnet sich automatisch aus den aktiven Spielern
		expect(group.successValue).toBe(activePlayer1.successValue + activePlayer2.successValue);
		expect(group.successValue).toBeGreaterThan(0);
		});

    it('teamValue summiert marketValue NUR ueber inaktive Spieler', () => {
      group.players = [
        makePlayer({ marketValue: 1000, isDeactivated: true }),
        makePlayer({ marketValue: 2000, isDeleted: true }),
        makePlayer({ marketValue: 3000, isPersitantDeleted: true }),
        makePlayer({ marketValue: 4000 }),
      ];

      group.calcValues(0, false, 0);

      expect(group.teamValue).toBe(6000);
    });

    it('differenceValue entspricht currentAmount + numberValue', () => {
      group.players = [makePlayer({ value: 500 })];

      group.calcValues(1000, false, 0);

      expect(group.differenceValue).toBe(1500);
    });

    it('ruft calcValues() auf jedem enthaltenen Spieler auf', () => {
      const player = makePlayer();
      spyOn(player, 'calcValues');
      group.players = [player];

      group.calcValues(0, false, 0);

      expect(player.calcValues).toHaveBeenCalled();
    });
  });

  describe('calcValues - Trend und Verlust', () => {
    function playerWithChange(change: number, opts: Partial<KickbasePlayer> = {}) {
      const stats = new KickbasePlayerStats(null);
	stats.realMarketValueChange = change;

	return makePlayer({ stats, ...opts });
    }

    it('trendValue summiert nur positive realMarketValueChange, wenn includeMinusMarketValues=false', () => {
      group.players = [
        playerWithChange(100),
        playerWithChange(-50),
        playerWithChange(30),
      ];

      group.calcValues(0, false, 0);

      expect(group.trendValue).toBe(130);
    });

    it('trendValue summiert auch negative Werte, wenn includeMinusMarketValues=true', () => {
      group.players = [
        playerWithChange(100),
        playerWithChange(-50),
      ];

      group.calcValues(0, true, 0);

      expect(group.trendValue).toBe(50);
    });

    it('lossValue summiert nur negative realMarketValueChange', () => {
      group.players = [
        playerWithChange(100),
        playerWithChange(-50),
        playerWithChange(-30),
      ];

      group.calcValues(0, false, 0);

      expect(group.lossValue).toBe(-80);
    });
  });

  describe('calcValues - differenceValueFriday', () => {

	
    it('berechnet den Freitagswert unter Einbezug von Trend * Tage', () => {
		const stats = new KickbasePlayerStats(null);
		stats.realMarketValueChange = 50;
		stats.buyPrice = 3000000;

		// value = 6.000.000, buyPrice = 3.000.000 -> offset = 3.000.000 -> successValue = 250.000
		const player = makePlayer({ value: 6000000, stats });
		group.players = [player];

		group.calcValues(0, false, 3);

		const expectedSuccessValue = player.successValue; // 250.000
		const expectedValue = 6000000 + expectedSuccessValue + (50 * 3);

		expect(group.differenceValueFriday).toBe(expectedValue);
	});
  });

  describe('calcColors', () => {
    it('setzt color auf gruen, wenn currentAmount + numberValue >= 0', () => {
      group.players = [makePlayer({ value: 100 })];
      group.calcValues(0, false, 0);

      group.calcColors(0);

      expect(group.color).toBe(KickbaseGroup.color_green);
    });

    it('setzt color auf rot, wenn currentAmount + numberValue negativ ist', () => {
      group.players = [makePlayer({ value: -100 })];
      group.calcValues(0, false, 0);

      group.calcColors(-1000);

      expect(group.color).toBe(KickbaseGroup.color_red);
    });

    it('ruft calcColors() auf jedem Spieler auf', () => {
      const player = makePlayer({ value: 500 });
      spyOn(player, 'calcColors');
      group.players = [player];
      group.calcValues(1000, false, 0);

      group.calcColors(1000);

      expect(player.calcColors).toHaveBeenCalledWith(group.differenceValue);
    });
  });

  describe('Randfaelle', () => {
    it('funktioniert fehlerfrei mit einer leeren Spielerliste', () => {
      expect(() => group.calcValues(0, false, 0)).not.toThrow();
      expect(() => group.calcColors(0)).not.toThrow();
      expect(group.numberValue).toBe(0);
      expect(group.color).toBe(KickbaseGroup.color_green);
    });
  });
});