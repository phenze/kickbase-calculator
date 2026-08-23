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
      mdsum: [{ id: 1 }, { id: 2 }],
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
      stats.marketValues = [{ mv: 1000000 }, { mv: 1500000 }, { mv: 2000000 }];

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

  describe('KickbasePlayerStats', () => {
    it('should parse upcoming matches without results (future games with dates)', () => {
      const rawPayload = {
        tid: '8', // Schalke
        tp: 0,
        ap: 0,
        st: 0,
        tfhmvt: -144600,
        mdsum: [
          {
            t1: '13',
            t2: '8',
            t1g: 0,
            t2g: 0,
            day: 1,
            md: '2026-08-30T15:30:00Z',
            mdst: 0,
            mdln: 'Spieltag 1',
          },
          {
            t1: '8',
            t2: '2',
            t1g: 0,
            t2g: 0,
            day: 2,
            md: '2026-09-05T16:30:00Z',
            mdst: 0,
            mdln: 'Spieltag 2',
          },
        ],
      };

      const stats = new KickbasePlayerStats(rawPayload);

      expect(stats.nextThreeOpponents).toBeDefined();
      expect(stats.nextThreeOpponents.length).toBe(2);

      // Spiel 1: Auswärtsspiel für Team '8' gegen Team '13'
      const game1 = stats.nextThreeOpponents[0];
      expect(game1.isHomeGame).toBeFalse();
      expect(game1.imageUrl).toBe('https://kickbase.b-cdn.net/pool/teams/13.png');
      expect(game1.isFinished).toBeFalse();
      expect(game1.dayLabel).toBe('Spieltag 1');
      expect(game1.dateString).toBe('30.08.');

      // Spiel 2: Heimspiel für Team '8' gegen Team '2'
      const game2 = stats.nextThreeOpponents[1];
      expect(game2.isHomeGame).toBeTrue();
      expect(game2.imageUrl).toBe('https://kickbase.b-cdn.net/pool/teams/2.png');
      expect(game2.isFinished).toBeFalse();
      expect(game2.dayLabel).toBe('Spieltag 2');
      expect(game2.dateString).toBe('05.09.');
    });

    it('should parse finished matches with results (mdst === 2)', () => {
      const rawPayload = {
        tid: '2', // Bayern
        tp: 628,
        ap: 70,
        st: 0,
        tfhmvt: 335229,
        mdsum: [
          {
            t1: '2',
            t2: '50',
            t1g: 3,
            t2g: 3,
            day: 32,
            md: '2026-05-02T13:30:00Z',
            mdst: 2,
            mdln: 'Spieltag 32',
          },
          {
            t1: '11',
            t2: '2',
            t1g: 0,
            t2g: 1,
            day: 33,
            md: '2026-05-09T16:30:00Z',
            mdst: 2,
            mdln: 'Spieltag 33',
          },
        ],
      };

      const stats = new KickbasePlayerStats(rawPayload);

      expect(stats.nextThreeOpponents).toBeDefined();
      expect(stats.nextThreeOpponents.length).toBe(2);

      // Spiel 1: Heimspiel, 3:3
      const game1 = stats.nextThreeOpponents[0];
      expect(game1.isHomeGame).toBeTrue();
      expect(game1.imageUrl).toBe('https://kickbase.b-cdn.net/pool/teams/50.png');
      expect(game1.isFinished).toBeTrue();
      expect(game1.resultString).toBe('3:3');
      expect(game1.dayLabel).toBe('Spieltag 32');

      // Spiel 2: Auswärtsspiel, 0:1
      const game2 = stats.nextThreeOpponents[1];
      expect(game2.isHomeGame).toBeFalse();
      expect(game2.imageUrl).toBe('https://kickbase.b-cdn.net/pool/teams/11.png');
      expect(game2.isFinished).toBeTrue();
      expect(game2.resultString).toBe('0:1');
      expect(game2.dayLabel).toBe('Spieltag 33');
    });

    it('should handle empty or null mdsum gracefully', () => {
      const statsNullMdsum = new KickbasePlayerStats({ tid: '2', tp: 10 });
      expect(statsNullMdsum.nextThreeOpponents).toBeDefined();
      expect(statsNullMdsum.nextThreeOpponents.length).toBe(0);
    });
  });
});
