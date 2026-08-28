import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeMode, ThemeService } from './theme.service';

describe('ThemeService', () => {
  /** Minimaler Ersatz fuer MediaQueryList, damit wir die OS-Einstellung steuern koennen. */
  class FakeMediaQueryList {
    public listeners: ((event: MediaQueryListEvent) => void)[] = [];

    constructor(public matches: boolean) {}

    addEventListener(_type: string, listener: (event: MediaQueryListEvent) => void): void {
      this.listeners.push(listener);
    }

    emit(matches: boolean): void {
      this.matches = matches;
      this.listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent));
    }
  }

  let mediaQuery: FakeMediaQueryList;

  function createService(options: { stored?: ThemeMode; systemDark?: boolean } = {}): ThemeService {
    if (options.stored !== undefined) {
      localStorage.setItem(THEME_STORAGE_KEY, options.stored);
    }

    mediaQuery = new FakeMediaQueryList(options.systemDark ?? false);
    spyOn(window, 'matchMedia').and.returnValue(mediaQuery as unknown as MediaQueryList);

    TestBed.configureTestingModule({});
    return TestBed.inject(ThemeService);
  }

  function currentAttribute(): string | null {
    return document.documentElement.getAttribute('data-bs-theme');
  }

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');
    document.querySelector('meta[name="theme-color"]')?.remove();
  });

  it('startet ohne gespeicherte Einstellung im System-Modus', () => {
    const service = createService();

    expect(service.mode()).toBe('system');
  });

  it('loest den System-Modus anhand der OS-Einstellung auf', () => {
    const service = createService({ systemDark: true });

    expect(service.mode()).toBe('system');
    expect(service.resolvedTheme()).toBe('dark');
    expect(currentAttribute()).toBe('dark');
  });

  it('stellt eine gespeicherte Einstellung wieder her und ignoriert dabei die OS-Einstellung', () => {
    const service = createService({ stored: 'light', systemDark: true });

    expect(service.mode()).toBe('light');
    expect(service.resolvedTheme()).toBe('light');
    expect(currentAttribute()).toBe('light');
  });

  it('faellt bei unbekanntem gespeicherten Wert auf den System-Modus zurueck', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    const service = createService();

    expect(service.mode()).toBe('system');
  });

  it('schreibt die Auswahl an das html-Element und in den localStorage', () => {
    const service = createService();

    service.setMode('dark');

    expect(currentAttribute()).toBe('dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('rotiert beim Umschalten von System ueber Hell nach Dunkel', () => {
    const service = createService();

    expect(service.mode()).toBe('system');

    service.toggle();
    expect(service.mode()).toBe('light');

    service.toggle();
    expect(service.mode()).toBe('dark');

    service.toggle();
    expect(service.mode()).toBe('system');
  });

  it('reagiert im System-Modus auf einen Wechsel der OS-Einstellung', () => {
    const service = createService({ systemDark: false });
    expect(service.resolvedTheme()).toBe('light');

    mediaQuery.emit(true);

    expect(service.resolvedTheme()).toBe('dark');
    expect(currentAttribute()).toBe('dark');
  });

  it('ignoriert die OS-Einstellung, wenn ein Design fest gewaehlt wurde', () => {
    const service = createService({ stored: 'light' });

    mediaQuery.emit(true);

    expect(service.resolvedTheme()).toBe('light');
    expect(currentAttribute()).toBe('light');
  });

  it('aktualisiert die theme-color fuer die Browser-Statusleiste', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#1976d2');
    document.head.appendChild(meta);

    const service = createService();
    service.setMode('dark');
    expect(meta.getAttribute('content')).toBe('#212529');

    service.setMode('light');
    expect(meta.getAttribute('content')).toBe('#1976d2');
  });
});
