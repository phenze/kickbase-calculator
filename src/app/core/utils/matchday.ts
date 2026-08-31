/** Liefert ein neues Datum, das um `days` Tage verschoben ist. */
export function addDays(baseDate: Date, days: number): Date {
  const updatedDate = new Date(baseDate);
  updatedDate.setDate(updatedDate.getDate() + days);
  return updatedDate;
}

export interface MatchdayCountdown {
  /** Anzahl Tage, die fuer die Einnahmen-Schaetzung angesetzt werden. */
  days: number;
  /** Der Freitag, auf den sich die Schaetzung bezieht. */
  fridayDate: Date;
}

/**
 * Berechnet, wie viele Tage bis zum naechsten Freitag angesetzt werden.
 *
 * Ab 22 Uhr zaehlt der laufende Tag nicht mehr mit, weil die Marktwerte dann
 * bereits aktualisiert wurden; freitags nach 22 Uhr zielt die Schaetzung auf
 * den Freitag der Folgewoche.
 */
export function calculateMatchdayCountdown(now: Date): MatchdayCountdown {
  const dayOfWeek = now.getDay();
  let days = dayOfWeek === 6 ? 6 : Math.abs(5 - dayOfWeek);
  let fridayDate = addDays(now, days);

  const hourOfDay = now.getHours();
  if (hourOfDay >= 22 && dayOfWeek !== 5) {
    // Nur der Zaehler wird korrigiert; das angezeigte Datum bleibt der zuvor
    // ermittelte Freitag - so verhaelt sich der Rechner seit jeher.
    days--;
  } else if (hourOfDay >= 22 && dayOfWeek === 5) {
    days = 7;
    fridayDate = addDays(now, days);
  }

  return { days, fridayDate };
}
