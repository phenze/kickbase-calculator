import { CurrencyPipe, registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EuroPipe } from './euro.pipe';

// Deutsche Sprachdaten für den Test registrieren
registerLocaleData(localeDe, 'de-DE');

describe('EuroPipe', () => {
  let pipe: EuroPipe;

  beforeEach(() => {
    // Die Pipe holt sich die Angular-CurrencyPipe per inject(), also muss sie
    // aus dem Injector kommen - mit de-DE als Locale.
    TestBed.configureTestingModule({
      providers: [EuroPipe, CurrencyPipe, { provide: LOCALE_ID, useValue: 'de-DE' }],
    });

    pipe = TestBed.inject(EuroPipe);
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
