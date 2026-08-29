import {
  readBooleanSetting,
  readNumberSetting,
  readStringSetting,
  writeSetting,
} from './local-storage';

describe('local-storage Helfer', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  describe('readBooleanSetting', () => {
    it('sollte den Standardwert liefern, wenn der Schluessel fehlt', () => {
      expect(readBooleanSetting('fehlt', true)).toBeTrue();
      expect(readBooleanSetting('fehlt', false)).toBeFalse();
    });

    it('sollte nur den String "true" als true lesen', () => {
      localStorage.setItem('flag', 'true');
      expect(readBooleanSetting('flag', false)).toBeTrue();

      localStorage.setItem('flag', 'false');
      expect(readBooleanSetting('flag', true)).toBeFalse();

      localStorage.setItem('flag', 'unsinn');
      expect(readBooleanSetting('flag', true)).toBeFalse();
    });
  });

  describe('readNumberSetting', () => {
    it('sollte den Standardwert liefern, wenn der Schluessel fehlt', () => {
      expect(readNumberSetting('fehlt', 42)).toBe(42);
    });

    it('sollte gespeicherte Zahlen als Integer lesen', () => {
      localStorage.setItem('zahl', '7');
      expect(readNumberSetting('zahl', 0)).toBe(7);
    });

    it('sollte fuer nicht-numerische Werte NaN liefern', () => {
      localStorage.setItem('zahl', 'abc');
      expect(readNumberSetting('zahl', 0)).toBeNaN();
    });
  });

  describe('readStringSetting', () => {
    it('sollte den Standardwert liefern, wenn der Schluessel fehlt', () => {
      expect(readStringSetting('fehlt', 'standard')).toBe('standard');
    });

    it('sollte einen leeren String als gesetzten Wert behandeln', () => {
      localStorage.setItem('text', '');
      expect(readStringSetting('text', 'standard')).toBe('');
    });
  });

  describe('writeSetting', () => {
    it('sollte Werte als String ablegen', () => {
      writeSetting('a', true);
      writeSetting('b', 5);
      writeSetting('c', 'text');

      expect(localStorage.getItem('a')).toBe('true');
      expect(localStorage.getItem('b')).toBe('5');
      expect(localStorage.getItem('c')).toBe('text');
    });
  });
});
