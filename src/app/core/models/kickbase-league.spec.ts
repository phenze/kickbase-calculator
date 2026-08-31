import { KickbaseLeague } from './kickbase-league';

describe('KickbaseLeague', () => {
  it('sollte amd = true aus dem lm-Objekt korrekt auslesen', () => {
    const payload = {
      i: 123,
      n: 'Test Liga',
      amd: true,
      tv: 50000000,
      b: 10000000,
    };

    const league = new KickbaseLeague(payload);

    expect(league.id).toBe(123);
    expect(league.amd).toBeTrue();
  });

  it('sollte amd = false setzen, wenn lm.amd false ist', () => {
    const payload = {
      id: 123,
      name: 'Test Liga',
      lm: {
        teamValue: 50000000,
        budget: 10000000,
        amd: false,
      },
    };

    const league = new KickbaseLeague(payload);

    expect(league.amd).toBeFalse();
  });

  it('sollte amd = false als Standard setzen, wenn amd fehlt', () => {
    const payload = {
      i: 123,
      n: 'Test Liga',
      tv: 50000000,
      b: 10000000,
    };

    const league = new KickbaseLeague(payload);

    expect(league.amd).toBeFalse();
  });
});
