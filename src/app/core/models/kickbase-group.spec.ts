import { KickbaseGroup } from './kickbase-group';
import { KickbasePlayer } from './kickbase-player';
import { KickbasePlayerStats } from './kickbase-player-stats';

function makePlayer(overrides: Partial<KickbasePlayer> = {}): KickbasePlayer {
  const player = new KickbasePlayer(null, 1);
  player.value = 0;
  player.marketValue = 0;
  player.isKept = false;
  player.isDeleted = false;
  player.isFixedSquad = false;
  player.stats = null as any;
  Object.assign(player, overrides);
  return player;
}

describe('KickbaseGroup', () => {
  let group: KickbaseGroup;

  beforeEach(() => {
    group = new KickbaseGroup();
  });

  beforeAll(() => {});

  it('sollte mit einem leeren players-Array erzeugt werden', () => {
    expect(group.players).toEqual([]);
  });

  describe('calcValues - Summenbildung', () => {
    it('summiert nur aktive Spieler in numberValue', () => {
      group.players = [
        makePlayer({ value: 1000000 }),
        makePlayer({ value: 2000000, isKept: true }),
        makePlayer({ value: 3000000, isDeleted: true }),
        makePlayer({ value: 4000000, isFixedSquad: true }),
        makePlayer({ value: 500000 }),
      ];

      group.calcValues(0, false, 0);

      expect(group.numberValue).toBe(1500000);
    });

    it('summiert successValue nur ueber aktive Spieler', () => {
      // Erzeugt einen Offset von 5 Mio -> ergibt 250.000 + 500.000 = 750.000 successValue
      const statsA = new KickbasePlayerStats(null);
      statsA.buyPrice = 0;
      statsA.isBought = true;
      statsA.isBoughtFromMarket = true;

      const activePlayer1 = makePlayer({ value: 5000000, stats: statsA });
      const activePlayer2 = makePlayer({ value: 5000000, stats: statsA });
      const deactivatedPlayer = makePlayer({ value: 5000000, isKept: true, stats: statsA });

      group.players = [activePlayer1, activePlayer2, deactivatedPlayer];

      group.calcValues(0, false, 0);

      // successValue berechnet sich automatisch aus den aktiven Spielern
      expect(group.successValue).toBe(activePlayer1.successValue + activePlayer2.successValue);
      expect(group.successValue).toBeGreaterThan(0);
    });

    it('teamValue summiert marketValue NUR ueber inaktive Spieler', () => {
      group.players = [
        makePlayer({ marketValue: 1000, isKept: true }),
        makePlayer({ marketValue: 2000, isDeleted: true }),
        makePlayer({ marketValue: 3000, isFixedSquad: true }),
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
      group.players = [playerWithChange(100), playerWithChange(-50), playerWithChange(30)];

      group.calcValues(0, false, 0);

      expect(group.trendValue).toBe(130);
    });

    it('trendValue summiert auch negative Werte, wenn includeMinusMarketValues=true', () => {
      group.players = [playerWithChange(100), playerWithChange(-50)];

      group.calcValues(0, true, 0);

      expect(group.trendValue).toBe(50);
    });

    it('lossValue summiert nur negative realMarketValueChange', () => {
      group.players = [playerWithChange(100), playerWithChange(-50), playerWithChange(-30)];

      group.calcValues(0, false, 0);

      expect(group.lossValue).toBe(-80);
    });
  });

  describe('calcValues - differenceValueFriday', () => {
    it('berechnet den Freitagswert unter Einbezug von Trend * Tage', () => {
      const stats = new KickbasePlayerStats(null);
      stats.realMarketValueChange = 50;
      stats.buyPrice = 3000000;
      stats.isBought = true;
      stats.isBoughtFromMarket = true;

      const player = makePlayer({ value: 6000000, stats });
      group.players = [player];

      group.calcValues(0, false, 3);

      const expectedSuccessValue = player.successValue; // 250.000
      // + 300.000 € Login-Bonus (100k * 3 Tage)
      const expectedValue = 6000000 + expectedSuccessValue + 50 * 3 + group.loginBonusValue;

      expect(group.differenceFridayValue).toBe(expectedValue);
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

  describe('Achivements', () => {
    let group: KickbaseGroup;

    beforeEach(() => {
      group = new KickbaseGroup();
      group.players = [];
    });

    it('sollte successValue berechnen, wenn achievementsDisabled false ist', () => {
      spyOn<any>(group, 'calcSuccessValue').and.returnValue(500000);
      spyOn<any>(group, 'calcNumberValue').and.returnValue(1000000);
      spyOn<any>(group, 'calcTeamValue').and.returnValue(20000000);
      spyOn<any>(group, 'calcTrend').and.returnValue(100000);
      spyOn<any>(group, 'calcLoss').and.returnValue(0);

      group.calcValues(5000000, true, 3, false);

      expect(group.successValue).toBe(500000);
    });

    it('sollte successValue auf 0 setzen, wenn achievementsDisabled true ist', () => {
      spyOn<any>(group, 'calcSuccessValue').and.returnValue(500000);
      spyOn<any>(group, 'calcNumberValue').and.returnValue(1000000);
      spyOn<any>(group, 'calcTeamValue').and.returnValue(20000000);
      spyOn<any>(group, 'calcTrend').and.returnValue(100000);
      spyOn<any>(group, 'calcLoss').and.returnValue(0);

      group.calcValues(5000000, true, 3, true);

      expect(group.successValue).toBe(0);
      // 5.000.000 + 1.000.000 + 300.000 Trend + 300.000 Login-Bonus = 6.600.000
      expect(group.differenceFridayValue).toBe(6600000);
    });
  });

  describe('calcValues - Summenbildung', () => {
    it('summiert für den Verkaufswert (numberValue) NUR Spieler, die wirklich verkauft werden', () => {
      group.players = [
        makePlayer({ value: 1000000 }), // Wird verkauft -> Zählt
        makePlayer({ value: 2000000, isKept: true }), // Temporär behalten -> Zählt NICHT
        makePlayer({ value: 3000000, isDeleted: true }), // Gelöscht -> Zählt NICHT
        makePlayer({ value: 4000000, isFixedSquad: true }), // Fest im Kader -> Zählt NICHT
      ];

      group.calcValues(0, false, 0);

      expect(group.numberValue).toBe(1000000);
    });

    it('summiert successValue für Verkaufsspieler aber nicht für feste Kaderspieler, aber NICHT für temporär behaltene', () => {
      // Erzeugt einen Offset von 5 Mio -> ergibt 250.000 successValue pro Spieler
      const statsA = new KickbasePlayerStats(null);
      statsA.buyPrice = 0;
      statsA.isBought = true;
      statsA.isBoughtFromMarket = true;

      const sellingPlayer = makePlayer({ value: 5000000, stats: statsA });
      const fixedPlayer = makePlayer({ value: 5000000, isFixedSquad: true, stats: statsA });
      const keptPlayer = makePlayer({ value: 5000000, isKept: true, stats: statsA });

      group.players = [sellingPlayer, fixedPlayer, keptPlayer];

      group.calcValues(0, false, 0);

      // successValue berechnet sich aus dem Verkaufsspieler UND dem festen Spieler
      expect(group.successValue).toBe(sellingPlayer.successValue);
      expect(group.successValue).toBeGreaterThan(0);
    });

    it('summiert für teamValue den Marktwert von behaltenen, festen und gelöschten Spielern', () => {
      group.players = [
        makePlayer({ marketValue: 1000, isKept: true }), // Zählt
        makePlayer({ marketValue: 2000, isDeleted: true }), // Zählt
        makePlayer({ marketValue: 3000, isFixedSquad: true }), // Zählt
        makePlayer({ marketValue: 4000 }), // Verkaufsspieler -> Zählt NICHT
      ];

      group.calcValues(0, false, 0);

      expect(group.teamValue).toBe(6000);
    });

    it('differenceValue entspricht currentAmount + numberValue', () => {
      group.players = [makePlayer({ value: 500 })]; // Regulärer Verkaufsspieler

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

    it('trendValue summiert positive realMarketValueChange für Verkaufs- und feste Spieler', () => {
      group.players = [
        playerWithChange(100), // Verkaufsspieler -> Zählt
        playerWithChange(200, { isFixedSquad: true }), // Fester Spieler -> Zählt NICHT
        playerWithChange(500, { isKept: true }), // Behaltener Spieler -> Zählt NICHT
        playerWithChange(-50), // Negativer Wert -> Zählt NICHT (da includeMinusMarketValues=false)
      ];

      group.calcValues(0, false, 0);

      expect(group.trendValue).toBe(100); // 100
    });

    it('trendValue summiert auch negative Werte, wenn includeMinusMarketValues=true', () => {
      group.players = [
        playerWithChange(100),
        playerWithChange(-50, { isFixedSquad: true }), // Fester Spieler im Minus -> Zählt
        playerWithChange(-200, { isKept: true }), // Behaltener Spieler -> Zählt NICHT
      ];

      group.calcValues(0, true, 0);

      expect(group.trendValue).toBe(100);
    });

    it('lossValue summiert nur negative realMarketValueChange für Verkaufs- und feste Spieler', () => {
      group.players = [
        playerWithChange(100),
        playerWithChange(-50), // Verkaufsspieler -> Zählt
        playerWithChange(-30, { isFixedSquad: true }), // Fester Spieler -> Zählt NICHT
        playerWithChange(-500, { isKept: true }), // Behaltener Spieler -> Zählt NICHT
      ];

      group.calcValues(0, false, 0);

      expect(group.lossValue).toBe(-50); // 100 - 50
    });
  });

  describe('Feature: Fixer Erwartungswert (expectedSaleValue)', () => {
    it('überschreibt den regulären Wert (value) beim Verkaufswert (numberValue)', () => {
      const player = makePlayer({ value: 5000000 });
      player.expectedSaleValue = 8000000; // Fixer Wert ist höher

      group.players = [player];
      group.calcValues(0, false, 0);

      expect(group.numberValue).toBe(8000000);
    });

    it('ignoriert den Marktwert-Trend (trendValue), wenn ein expectedSaleValue gesetzt ist', () => {
      const stats = new KickbasePlayerStats(null);
      stats.realMarketValueChange = 500000;

      const player = makePlayer({ value: 5000000, stats });
      player.expectedSaleValue = 8000000;

      group.players = [player];
      group.calcValues(0, false, 0);

      expect(group.trendValue).toBe(0);
    });

    it('ignoriert den Verlust (lossValue), wenn ein expectedSaleValue gesetzt ist', () => {
      const stats = new KickbasePlayerStats(null);
      stats.realMarketValueChange = -300000;

      const player = makePlayer({ value: 5000000, stats });
      player.expectedSaleValue = 4000000;

      group.players = [player];
      group.calcValues(0, false, 0);

      expect(group.lossValue).toBe(0);
    });

    it('behält den Trend nicht bei, wenn der Spieler isFixedSquad ist (da expectedSaleValue nur beim Verkauf greift)', () => {
      const stats = new KickbasePlayerStats(null);
      stats.realMarketValueChange = 500000;

      const player = makePlayer({ value: 5000000, isFixedSquad: true, stats });
      player.expectedSaleValue = 8000000;

      group.players = [player];
      group.calcValues(0, false, 0);

      expect(group.trendValue).toBe(0);
    });
  });

  describe('Login-Bonus', () => {
    it('sollte loginBonusValue basierend auf dayUntilFriday berechnen (100.000 € pro Tag)', () => {
      // 3 Tage bis Freitag = 300.000 €
      group.calcValues(0, false, 3, false, true);

      expect(group.loginBonusValue).toBe(300000);
    });

    it('sollte loginBonusValue auf 0 setzen, wenn includeLoginBonus false ist', () => {
      group.calcValues(0, false, 3, false, false);

      expect(group.loginBonusValue).toBe(0);
    });

    it('sollte loginBonusValue in differenceFridayValue einrechnen', () => {
      // Kontostand: 1.000.000 €, 4 Tage bis Freitag -> 400.000 € Login-Bonus
      group.calcValues(1000000, false, 4, false, true);

      expect(group.loginBonusValue).toBe(400000);
      expect(group.differenceFridayValue).toBe(1400000);
    });

    it('sollte differenceFridayValue ohne Login-Bonus berechnen, wenn includeLoginBonus=false', () => {
      group.calcValues(1000000, false, 4, false, false);

      expect(group.loginBonusValue).toBe(0);
      expect(group.differenceFridayValue).toBe(1000000);
    });
  });
});
