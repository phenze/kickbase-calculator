import { KickbasePlayerStats } from './kickbase-player-stats';
import numeral from 'numeral';

describe('KickbasePlayerStats', () => {
  let stats: KickbasePlayerStats;

  beforeAll(() => {
    numeral.locale('de');
  });

  beforeEach(() => {
    stats = new KickbasePlayerStats(null);
  });

  it('sollte mit Standardwerten erzeugt werden, wenn JSON null ist', () => {
    expect(stats.threeDaysValues).toEqual([]);
    expect(stats.threeDaysValuesPercent).toEqual([]);
    expect(stats.nextThreeOpponents).toBeUndefined();
  });

  it('sollte Daten aus dem JSON-Objekt korrekt zuweisen', () => {
    const rawJson = {
      tp: '1200',
      ap: '80',
      st: '1',
      tfhmvt: 50000,
      mdsum: [{ id: 1 }, { id: 2 }]
    };

    stats = new KickbasePlayerStats(rawJson);

    expect(stats.points).toBe('1200');
    expect(stats.averagePoints).toBe('80');
    expect(stats.status).toBe('1');
    expect(stats.realMarketValueChange).toBe(50000);
    expect(stats.nextThreeOpponents.length).toBe(2);
  });

  describe('calcrealMarketValueChangeValue', () => {
    it('formatiert Marktwerte und Prozentwerte korrekt, wenn Wert != -1', () => {
      stats.realMarketValueChange = 100000;
      stats.mv = 1000000;

      stats.calcrealMarketValueChangeValue();

      expect(stats.realMarketValueChangeValue).toContain('100 000 €');
      expect(stats.realMarketValueChangeValuePrecent).toContain('10,000%');
    });

    it('setzt Hinweistext, wenn realMarketValueChange den Wert -1 hat', () => {
      stats.realMarketValueChange = -1;

      stats.calcrealMarketValueChangeValue();

      expect(stats.realMarketValueChangeValue).toBe('Kann noch nicht berechnet werden');
    });
  });

  describe('calcThreeDays', () => {
    it('berechnet die 3-Tages-Aenderungen basierend auf den marketValues', () => {
      stats.mv = 2000000;
      stats.marketValues = [
        { mv: 1000000 },
        { mv: 1500000 },
        { mv: 2000000 }
      ];

      stats.calcThreeDays();

      expect(stats.threeDaysValues.length).toBeGreaterThan(0);
      expect(stats.realMarketValueChange).toBe(500000);
    });

    it('bricht ab, wenn marketValues nicht ausreichend Daten enthaelt', () => {
      stats.marketValues = [{ mv: 1000000 }];

      stats.calcThreeDays();

      expect(stats.threeDaysValues).toEqual([]);
    });
  });

  describe('calcbuyPriceValue', () => {
    it('formatiert den Einkaufspreis korrekt', () => {
      stats.buyPrice = 1234567;

      stats.calcbuyPriceValue();

      expect(stats.buyPriceValue).toContain('1 234 567 €');
    });
  });
});