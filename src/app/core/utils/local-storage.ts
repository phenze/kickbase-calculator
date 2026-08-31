/**
 * Duenne Huelle um den localStorage fuer die Einstellungen der App.
 *
 * Fehlt ein Schluessel, gilt der uebergebene Standardwert - das ist genau das
 * Muster, das sich vorher in jeder Komponente wiederholt hat.
 */
export function readBooleanSetting(key: string, fallback: boolean): boolean {
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : raw === 'true';
}

export function readNumberSetting(key: string, fallback: number): number {
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : Number.parseInt(raw, 10);
}

export function readStringSetting(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}

export function writeSetting(key: string, value: string | number | boolean): void {
  localStorage.setItem(key, String(value));
}
