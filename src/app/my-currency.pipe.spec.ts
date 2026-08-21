import numeral from 'numeral';
import { MyCurrencyPipe } from './my-currency.pipe';

describe('MyCurrencyPipe', () => {
  let pipe: MyCurrencyPipe;

  beforeEach(() => {
    pipe = new MyCurrencyPipe();
    numeral.locale('de');
  });

  it('sollte eine Instanz der Pipe erstellen', () => {
    expect(pipe).toBeTruthy();
  });

  describe('transform()', () => {
    it('sollte eine Ganzzahl korrekt mit Tausendertrennzeichen und 2 Nachkommastellen formatieren', () => {
      expect(pipe.transform(1000)).toBe('1.000,00');
      expect(pipe.transform(1000000)).toBe('1.000.000,00');
    });

    it('sollte Strings mit Komma-Dezimaltrenner korrekt formatieren', () => {
      expect(pipe.transform('1234,567')).toBe('1.234,56');
      expect(pipe.transform('5000,5')).toBe('5.000,50');
    });

    it('sollte eine abweichende fractionSize berücksichtigen', () => {
      expect(pipe.transform(1000, 0)).toBe('1.000');
      expect(pipe.transform('1234,5678', 3)).toBe('1.234,567');
    });

    it('sollte mit leeren Werten, null oder undefined umgehen', () => {
      expect(pipe.transform('', 2)).toBe(',00');
      expect(pipe.transform(null as any, 2)).toBe(',00');
      expect(pipe.transform(undefined as any, 0)).toBe('');
    });
  });

  describe('parse()', () => {
    it('sollte formatierte Tausendertrennzeichen entfernen', () => {
      expect(pipe.parse('1.000,50')).toBe('1000,50');
      expect(pipe.parse('1.000.000,25')).toBe('1000000,25');
    });

    it('sollte die Nachkommastellen entfernen, wenn die Fraktion 0 ist', () => {
      expect(pipe.parse('1.000,00')).toBe('1000');
    });

    it('sollte eine abweichende fractionSize beim Parsen berücksichtigen', () => {
      expect(pipe.parse('1.234,5678', 2)).toBe('1234,56');
      expect(pipe.parse('1.000,50', 0)).toBe('1000');
    });

    it('sollte mit leeren oder undefinierten Eingaben umgehen', () => {
      expect(pipe.parse('')).toBe('');
      expect(pipe.parse(null as any)).toBe('');
    });
  });
});