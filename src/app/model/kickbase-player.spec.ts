import { KickbasePlayer } from './kickbase-player';
import { KickbasePlayerStats } from './kickbase-player-stats';
import { KickbaseGroup } from './kickbase-group';
import { ApiService } from '../services/api.service';
import numeral from 'numeral';

describe('KickbasePlayer', () => {
  let player: KickbasePlayer;

  beforeAll(() => {
    numeral.locale('de');
  });
  
  beforeEach(() => {
    localStorage.clear();
    player = new KickbasePlayer(null, 'user123');
  });

  describe('Constructor & Initialisierung', () => {
    it('sollte Standardwerte setzen, wenn json null ist', () => {
      expect(player.offervalue).toBe(0);
      expect(player.hasOfferFromAny).toBeFalse();
      expect(player.isDeactivated).toBeFalse();
      expect(player.isDeleted).toBeFalse();
      expect(player.isPersitantDeleted).toBeFalse();
      expect(player.leagueId).toBe(-1);
    });

    it('sollte Eigenschaften und Bild-URL aus dem JSON auslesen', () => {
      const rawJson = {
        i: 10,
        mv: 5000000,
        st: 1,
        prc: 5500000,
        n: 'Müller',
        uoid: '0',
        exs: 3600
      };

      player = new KickbasePlayer(rawJson, 'user123');

      expect(player.id).toBe(10);
      expect(player.value).toBe(5000000);
      expect(player.marketValue).toBe(5000000);
      expect(player.status).toBe(1);
      expect(player.name).toBe('Müller');
      expect(player.imageUrl).toBe('https://kickbase.b-cdn.net/pool/playersbig/10.png');
    });

    it('sollte price auf uop setzen, wenn uoid != 0 ist', () => {
      const rawJson = { i: 1, mv: 1000, uoid: 'user99', uop: 1500 };

      player = new KickbasePlayer(rawJson, 'user123');

      expect(player.price).toBe(1500);
    });

    it('sollte Angebote aus ofs verarbeiten und offervalue für die UserID zuweisen', () => {
      const rawJson = {
        i: 1,
        mv: 1000,
        uoid: '0',
        ofs: [
          { u: 'otherUser', uop: '1500' },
          { u: 'user123', uop: '2000' }
        ]
      };

      player = new KickbasePlayer(rawJson, 'user123');

      expect(player.offervalue).toBe(2000);
      expect(player.value).toBe(2000);
    });
  });

  describe('calcValues', () => {
    it('sollte Strings und Differenzwerte formatieren', () => {
      player.value = 5000000;
      player.marketValue = 4000000;

      const mockStats = jasmine.createSpyObj('KickbasePlayerStats', ['calcValues']);
      mockStats.buyPrice = 2000000;
      player.stats = mockStats;

      player.calcValues();

      expect(player.valueString).toContain('5 000 000 €');
      expect(player.marketValueString).toContain('4 000 000 €');
      expect(player.offsetNumber).toBe(3000000);
      expect(player.successValue).toBe(250000);
      expect(mockStats.calcValues).toHaveBeenCalled();
    });

    it('berechnet gestaffelte successValues basierend auf offsetNumber', () => {
      const mockStats = new KickbasePlayerStats(null);
      mockStats.buyPrice = 1000000;
      player.stats = mockStats;

      player.value = 27000000;
      player.calcValues();

      expect(player.successValue).toBe(3750000);
    });
  });

  describe('calcColors', () => {
    beforeEach(() => {
      player.value = 1000000;
      player.marketValue = 1000000;
      player.expiry = 7200;
    });

    it('setzt die Gruen-Farbe bei positivem Differenzwert', () => {
      player.calcColors(1000000);

      expect(player.color).toBe('#007D341F');
    });

    it('setzt die Rot-Farbe bei negativem Differenzwert', () => {
      player.calcColors(500000);

      expect(player.color).toBe('#C100201F');
    });

    it('ueberschreibt Farbe bei deaktivierten oder geloeschten Spielern', () => {
      player.isDeactivated = true;

      player.calcColors(1000000);

      expect(player.color).toBe('#260C0C1F');
    });

    it('beruecksichtigt offerOffset aus dem localStorage', () => {
      localStorage.setItem('offerOffset', '10');
      player.marketValue = 1000000;

      player.value = 1050000;
      player.calcColors(0);
      expect(player.colorOfferValue).toBe(KickbaseGroup.color_red);

      player.value = 1100000;
      player.calcColors(0);
      expect(player.colorOfferValue).toBe(KickbaseGroup.color_green);
    });

    it('setzt expiryColor rot bei <= 1 Stunde und gruen bei <= 2 Stunden', () => {
      player.expiry = 1800;
      player.calcColors(0);
      expect(player.expiryColor).toBe(KickbaseGroup.color_red);

      player.expiry = 5400;
      player.calcColors(0);
      expect(player.expiryColor).toBe(KickbaseGroup.color_green);
    });
  });

  describe('createArrayInstance', () => {
    it('erzeugt ein Array aus Instanzen von KickbasePlayer', () => {
      const rawData = [{ i: 1, mv: 100 }, { i: 2, mv: 200 }];

      const result = KickbasePlayer.createArrayInstance(rawData, 'user123');

      expect(result.length).toBe(2);
      expect(result[0]).toBeInstanceOf(KickbasePlayer);
      expect(result[0].id).toBe(1);
    });

    it('gibt ein leeres Array zurück, wenn input null ist', () => {
      const result = KickbasePlayer.createArrayInstance(null, 'user123');

      expect(result).toEqual([]);
    });
  });

  describe('loadStats', () => {
    it('laedt PlayerStats und MarketValueStats vom ApiService', async () => {
      player.id = 99;
      player.marketValue = 1000000;

      const mockApiService = jasmine.createSpyObj('ApiService', ['getPlayerStats', 'getMarketValuePlayerStats']);
      const mockStats = new KickbasePlayerStats(null);
      mockStats.mv = 1000000;

      mockApiService.getPlayerStats.and.resolveTo(mockStats);
      mockApiService.getMarketValuePlayerStats.and.resolveTo({ it: [100, 200], trp: '500000' });

      await player.loadStats(1, mockApiService);

      expect(mockApiService.getPlayerStats).toHaveBeenCalledWith(1, 99);
      expect(mockApiService.getMarketValuePlayerStats).toHaveBeenCalledWith(1, 99);
      expect(player.stats).toBe(mockStats);
      expect(player.stats!.buyPrice).toBe(500000);
      expect(player.stats!.marketValues).toEqual([100, 200]);
    });
  });

  describe('copy & toJSON', () => {
    it('erzeugt eine Kopie des Objekts', () => {
      player.id = 5;
      player.name = 'Muster';
      player.marketValue = 2000;

      const copy = player.copy('user123');

      expect(copy.id).toBe(player.id);
      expect(copy.name).toBe(player.name);
      expect(copy).not.toBe(player);
    });

    it('liefert die korrekte JSON-Struktur', () => {
      player.name = 'Test';
      player.value = 1000;
      player.marketValue = 1000;

      expect(player.toJSON()).toEqual({
        name: 'Test',
        nameHash: '',
        value: 1000,
        marketValue: 1000,
        realMarketValueChange: 0
      });
    });
  });
});