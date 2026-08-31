import { KickbasePlayer } from './kickbase-player';
import { KickbasePlayerStats } from './kickbase-player-stats';
import { KickbaseGroup } from './kickbase-group';
import { of } from 'rxjs';

describe('KickbasePlayer', () => {
  let player: KickbasePlayer;

  beforeAll(() => {});

  beforeEach(() => {
    localStorage.clear();
    player = new KickbasePlayer(null, 'user123');
  });

  describe('Constructor & Initialisierung', () => {
    it('sollte Standardwerte setzen, wenn json null ist', () => {
      expect(player.offervalue).toBe(0);
      expect(player.hasOfferFromAny).toBeFalse();
      expect(player.isKept).toBeFalse();
      expect(player.isDeleted).toBeFalse();
      expect(player.isFixedSquad).toBeFalse();
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
        exs: 3600,
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
          { u: 'user123', uop: '2000' },
        ],
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

      expect(player.value).toBe(5000000);
      expect(player.marketValue).toBe(4000000);
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

      expect(player.color).toBe('var(--kb-card-bg-positive)');
    });

    it('setzt die Rot-Farbe bei negativem Differenzwert', () => {
      player.calcColors(500000);

      expect(player.color).toBe('var(--kb-card-bg-negative)');
    });

    it('ueberschreibt Farbe bei deaktivierten oder geloeschten Spielern', () => {
      player.isKept = true;

      player.calcColors(1000000);

      expect(player.color).toBe('var(--kb-card-bg-disabled)');
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
      // isUntilMarketValueUpdate vergleicht gegen 22:00 Uhr des laufenden Tages. Ohne feste
      // Uhrzeit faellt der zweite Fall ab 20:30 Uhr durch - der Test war also zeitabhaengig.
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(2026, 0, 15, 12, 0, 0));

      try {
        player.expiry = 1800;
        player.calcColors(0);
        expect(player.expiryColor).toBe(KickbaseGroup.color_red);

        player.expiry = 5400;
        player.calcColors(0);
        expect(player.expiryColor).toBe(KickbaseGroup.color_yellow);
      } finally {
        jasmine.clock().uninstall();
      }
    });
  });

  describe('createArrayInstance', () => {
    it('erzeugt ein Array aus Instanzen von KickbasePlayer', () => {
      const rawData = [
        { i: 1, mv: 100 },
        { i: 2, mv: 200 },
      ];

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

      const mockApiService = jasmine.createSpyObj('ApiService', [
        'getPlayerStats',
        'getMarketValuePlayerStats',
      ]);
      const mockStats = new KickbasePlayerStats(null);
      mockStats.mv = 1000000;

      // Statt resolveTo(...) jetzt RxJS Observables mittels of(...) zurückgeben
      mockApiService.getPlayerStats.and.returnValue(of(mockStats));
      mockApiService.getMarketValuePlayerStats.and.returnValue(
        of({ it: [100, 200], trp: '500000' } as any),
      );

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
        realMarketValueChange: 0,
      });
    });
  });

  describe('Username Handling', () => {
    const currentUserId = '12345';
    it('should set username correctly when player is offered by a user', () => {
      const rawPayload = {
        i: '118',
        n: 'Grifo',
        mv: 12316047,
        prc: 16500000,
        u: {
          i: '1919688',
          n: 'harti',
        },
      };

      const player = new KickbasePlayer(rawPayload, currentUserId);

      expect(player.username).toBe('harti');
    });

    it('should set empty username when player is offered by Kickbase system', () => {
      const rawPayload = {
        i: '43',
        n: 'Weiser',
        mv: 4673252,
        exs: 23317,
      };

      const player = new KickbasePlayer(rawPayload, currentUserId);

      expect(player.username).toBe('');
    });

    it('should copy username correctly in copy() method', () => {
      const rawPayload = {
        i: '118',
        n: 'Grifo',
        u: { n: 'harti' },
      };

      const player = new KickbasePlayer(rawPayload, currentUserId);
      const copiedPlayer = player.copy(currentUserId);

      expect(copiedPlayer.username).toBe('harti');
    });
  });
});
