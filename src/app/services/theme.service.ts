import { Injectable, computed, signal } from '@angular/core';

/**
 * 'system' folgt der Betriebssystem-Einstellung (prefers-color-scheme),
 * 'light' und 'dark' erzwingen das jeweilige Design.
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Das tatsaechlich angewendete Design - 'system' ist hier bereits aufgeloest. */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

/** Reihenfolge, in der der Umschalter durch die Modi rotiert. */
export const THEME_MODE_ORDER: readonly ThemeMode[] = ['system', 'light', 'dark'];

/** Farbe der Browser-/PWA-Statusleiste je Design. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#1976d2',
  dark: '#212529',
};

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly darkQuery = window.matchMedia(DARK_MEDIA_QUERY);

  private readonly systemPrefersDark = signal(this.darkQuery.matches);
  private readonly currentMode = signal<ThemeMode>(ThemeService.readStoredMode());

  /** Die vom Nutzer gewaehlte Einstellung (inkl. 'system'). */
  readonly mode = this.currentMode.asReadonly();

  /** Das daraus resultierende Design - im 'system'-Modus die OS-Einstellung. */
  readonly resolvedTheme = computed<ResolvedTheme>(() => {
    const mode = this.currentMode();
    if (mode === 'system') {
      return this.systemPrefersDark() ? 'dark' : 'light';
    }
    return mode;
  });

  constructor() {
    this.darkQuery.addEventListener('change', (event) => {
      this.systemPrefersDark.set(event.matches);
      // Nur im 'system'-Modus wirkt sich die OS-Aenderung auf das Design aus.
      if (this.currentMode() === 'system') {
        this.apply();
      }
    });

    this.apply();
  }

  setMode(mode: ThemeMode): void {
    this.currentMode.set(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Privater Modus o. ae. - das Design gilt dann nur fuer diese Sitzung.
    }
    this.apply();
  }

  /** Schaltet auf den naechsten Modus: System -> Hell -> Dunkel -> System. */
  toggle(): void {
    const nextIndex = (THEME_MODE_ORDER.indexOf(this.currentMode()) + 1) % THEME_MODE_ORDER.length;
    this.setMode(THEME_MODE_ORDER[nextIndex]);
  }

  /**
   * Schreibt das Design an das <html>-Element. Bootstrap 5.3 haengt seine
   * kompletten Dark-Mode-Variablen an [data-bs-theme="dark"]; ueber das
   * Root-Element erwischen wir auch Overlays wie Modals, die neben der App
   * direkt im <body> landen.
   */
  private apply(): void {
    const theme = this.resolvedTheme();
    document.documentElement.setAttribute('data-bs-theme', theme);

    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', THEME_COLOR[theme]);
  }

  private static readStoredMode(): ThemeMode {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Kein Zugriff auf den Speicher - wir starten mit 'system'.
    }
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }
}
