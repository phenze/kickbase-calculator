import { KickbasePlayer } from '../models/kickbase-player';
import { KickbasePlayerStats } from '../models/kickbase-player-stats';
import { SortMode } from '../models/sort-mode';
import { sortPlayers } from './player-sorting';

describe('sortPlayers', () => {
  function makePlayer(options: {
    id: number;
    marketValue?: number;
    change?: number;
    position?: number;
    expiry?: number;
    username?: string;
  }): KickbasePlayer {
    const player = new KickbasePlayer(null, 'user123');
    player.id = options.id;
    player.name = `Spieler ${options.id}`;
    player.marketValue = options.marketValue ?? 0;
    player.position = options.position ?? 0;
    player.expiry = options.expiry ?? 0;
    player.username = options.username ?? '';

    if (options.change !== undefined) {
      const stats = new KickbasePlayerStats(null);
      stats.realMarketValueChange = options.change;
      player.stats = stats;
    }

    return player;
  }

  const ids = (players: KickbasePlayer[]) => players.map((player) => player.id);

  it('sollte die uebergebene Liste nicht veraendern', () => {
    const players = [
      makePlayer({ id: 1, marketValue: 100 }),
      makePlayer({ id: 2, marketValue: 900 }),
    ];
    const original = [...players];

    sortPlayers(players, SortMode.marketValueAsc);

    expect(players).toEqual(original);
  });

  it('sollte bei unbekanntem Modus die Reihenfolge beibehalten', () => {
    const players = [makePlayer({ id: 3, marketValue: 5 }), makePlayer({ id: 1, marketValue: 9 })];

    expect(ids(sortPlayers(players, 999))).toEqual([3, 1]);
  });

  it('sollte nach Position sortieren und fehlende Positionen ans Ende stellen', () => {
    const players = [
      makePlayer({ id: 1, position: 4 }),
      makePlayer({ id: 2, position: 0 }),
      makePlayer({ id: 3, position: 1 }),
    ];

    expect(ids(sortPlayers(players, SortMode.position))).toEqual([3, 1, 2]);
  });

  it('sollte nach Marktwert aufsteigend und absteigend sortieren', () => {
    const players = [
      makePlayer({ id: 1, marketValue: 500 }),
      makePlayer({ id: 2, marketValue: 100 }),
      makePlayer({ id: 3, marketValue: 900 }),
    ];

    expect(ids(sortPlayers(players, SortMode.marketValueAsc))).toEqual([2, 1, 3]);
    expect(ids(sortPlayers(players, SortMode.marketValueDesc))).toEqual([3, 1, 2]);
  });

  it('sollte bei gleichem Marktwert die Reihenfolge stabil lassen', () => {
    const players = [
      makePlayer({ id: 1, marketValue: 100 }),
      makePlayer({ id: 2, marketValue: 100 }),
    ];

    expect(ids(sortPlayers(players, SortMode.marketValueAsc))).toEqual([1, 2]);
  });

  it('sollte nach Marktwertaenderung sortieren', () => {
    const players = [
      makePlayer({ id: 1, change: 5000 }),
      makePlayer({ id: 2, change: -2000 }),
      makePlayer({ id: 3, change: 100 }),
    ];

    expect(ids(sortPlayers(players, SortMode.marketValueChangeAsc))).toEqual([2, 3, 1]);
    expect(ids(sortPlayers(players, SortMode.marketValueChangeDesc))).toEqual([1, 3, 2]);
  });

  it('sollte Spieler ohne geladene Details ans Ende stellen - in beide Richtungen', () => {
    const players = [
      makePlayer({ id: 1 }),
      makePlayer({ id: 2, change: 500 }),
      makePlayer({ id: 3, change: -500 }),
    ];

    expect(ids(sortPlayers(players, SortMode.marketValueChangeAsc))).toEqual([3, 2, 1]);
    expect(ids(sortPlayers(players, SortMode.marketValueChangeDesc))).toEqual([2, 3, 1]);
  });

  it('sollte zwei Spieler ohne Details als gleichwertig behandeln', () => {
    const players = [makePlayer({ id: 1 }), makePlayer({ id: 2 })];

    expect(ids(sortPlayers(players, SortMode.marketValueChangeAsc))).toEqual([1, 2]);
  });

  it('sollte im Standardmodus Kickbase-Spieler vor fremde Spieler und nach Ablauf sortieren', () => {
    const players = [
      makePlayer({ id: 1, username: 'mitspieler', expiry: 100 }),
      makePlayer({ id: 2, expiry: 900 }),
      makePlayer({ id: 3, expiry: 200 }),
    ];

    expect(ids(sortPlayers(players, SortMode.default))).toEqual([3, 2, 1]);
  });

  it('sollte im Standardmodus bei gleichem Ablauf die Reihenfolge halten', () => {
    const players = [makePlayer({ id: 1, expiry: 500 }), makePlayer({ id: 2, expiry: 500 })];

    expect(ids(sortPlayers(players, SortMode.default))).toEqual([1, 2]);
  });
});
