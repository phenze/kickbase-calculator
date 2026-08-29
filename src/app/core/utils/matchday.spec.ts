import { addDays, calculateMatchdayCountdown } from './matchday';

describe('addDays', () => {
  it('sollte ein neues Datum liefern und das Original nicht veraendern', () => {
    const base = new Date(2026, 0, 1, 12, 0, 0);

    const result = addDays(base, 5);

    expect(result.getDate()).toBe(6);
    expect(base.getDate()).toBe(1);
  });

  it('sollte ueber Monatsgrenzen hinweg rechnen', () => {
    const result = addDays(new Date(2026, 0, 30, 12, 0, 0), 3);

    expect(result.getMonth()).toBe(1);
    expect(result.getDate()).toBe(2);
  });
});

describe('calculateMatchdayCountdown', () => {
  // 2026-08-24 ist ein Montag, damit sind die Wochentage im Test eindeutig.
  const monday = (hour: number) => new Date(2026, 7, 24, hour, 0, 0);
  const day = (offsetFromMonday: number, hour: number) =>
    new Date(2026, 7, 24 + offsetFromMonday, hour, 0, 0);

  it('sollte montags vier Tage bis Freitag zaehlen', () => {
    const { days, fridayDate } = calculateMatchdayCountdown(monday(12));

    expect(days).toBe(4);
    expect(fridayDate.getDate()).toBe(28);
  });

  it('sollte freitags null Tage zaehlen', () => {
    expect(calculateMatchdayCountdown(day(4, 12)).days).toBe(0);
  });

  it('sollte samstags sechs Tage bis zum naechsten Freitag zaehlen', () => {
    const { days, fridayDate } = calculateMatchdayCountdown(day(5, 12));

    expect(days).toBe(6);
    expect(fridayDate.getDate()).toBe(4);
  });

  it('sollte sonntags fuenf Tage zaehlen', () => {
    expect(calculateMatchdayCountdown(day(6, 12)).days).toBe(5);
  });

  it('sollte ab 22 Uhr den laufenden Tag nicht mehr mitzaehlen', () => {
    const { days, fridayDate } = calculateMatchdayCountdown(monday(22));

    expect(days).toBe(3);
    // Das angezeigte Datum bleibt bewusst der zuvor ermittelte Freitag.
    expect(fridayDate.getDate()).toBe(28);
  });

  it('sollte freitags nach 22 Uhr auf den Freitag der Folgewoche zielen', () => {
    const { days, fridayDate } = calculateMatchdayCountdown(day(4, 23));

    expect(days).toBe(7);
    expect(fridayDate.getDate()).toBe(4);
  });
});
