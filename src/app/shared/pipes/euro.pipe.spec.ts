import { EuroPipe } from './euro.pipe'; // Pfad anpassen!
import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';

// Deutsche Sprachdaten für den Test registrieren
registerLocaleData(localeDe, 'de-DE');

describe('EuroPipe', () => {
  let pipe: EuroPipe;

  beforeEach(() => {
    // 1. Die originale Angular-Pipe mit de-DE Locale erstellen
    const currencyPipe = new CurrencyPipe('de-DE');

    // 2. Deine eigene Pipe erstellen und die Angular-Pipe übergeben
    pipe = new EuroPipe(currencyPipe);
  });

  it('sollte erfolgreich erstellt werden', () => {
    expect(pipe).toBeTruthy();
  });

  it('sollte eine Zahl korrekt formatieren (mit Punkten und ohne Kommastellen)', () => {
    const result = pipe.transform(5000000);

    // Angular generiert bei Währungen oft ein geschütztes Leerzeichen (\xa0) zwischen Zahl und Symbol.
    // Daher nutzen wir hier toContain oder prüfen auf den bereinigten String.
    expect(result).toContain('5.000.000');
    expect(result).toContain('€');
  });

  it('sollte auch String-Eingaben formatieren können', () => {
    const result = pipe.transform('1234');

    expect(result).toContain('1.234');
    expect(result).toContain('€');
  });

  it('sollte null zurückgeben, wenn null oder undefined übergeben wird', () => {
    expect(pipe.transform(null)).toBeNull();
    expect(pipe.transform(undefined)).toBeNull();
  });

  it('sollte 0 korrekt als 0 € darstellen', () => {
    const result = pipe.transform(0);

    expect(result).toContain('0');
    expect(result).toContain('€');
  });
});
