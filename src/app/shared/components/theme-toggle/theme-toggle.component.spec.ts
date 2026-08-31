import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ThemeToggleComponent } from './theme-toggle.component';
import { THEME_STORAGE_KEY, ThemeService } from '../../../core/services/theme.service';

describe('ThemeToggleComponent', () => {
  let component: ThemeToggleComponent;
  let fixture: ComponentFixture<ThemeToggleComponent>;

  function button(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button');
  }

  beforeEach(async () => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');

    await TestBed.configureTestingModule({
      imports: [ThemeToggleComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-bs-theme');
  });

  it('sollte erstellt werden', () => {
    expect(component).toBeTruthy();
  });

  it('zeigt im Standardfall das Icon fuer den System-Modus', () => {
    expect(component.mode()).toBe('system');
    expect(component.iconSrc()).toBe('bi bi-circle-half');
  });

  it('schaltet per Klick auf das naechste Design um', () => {
    button().click();
    fixture.detectChanges();

    expect(component.mode()).toBe('light');
    expect(component.iconSrc()).toBe('bi bi-brightness-high-fill');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    button().click();
    fixture.detectChanges();

    expect(component.mode()).toBe('dark');
    expect(component.iconSrc()).toBe('bi bi-moon-stars-fill');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('beschreibt im Label den aktuellen Stand und den naechsten Klick', () => {
    expect(component.label()).toBe('Design: System (folgt dem Gerät) – umschalten auf Hell');

    TestBed.inject(ThemeService).setMode('dark');
    fixture.detectChanges();

    expect(component.label()).toBe('Design: Dunkel – umschalten auf System (folgt dem Gerät)');
    expect(button().getAttribute('aria-label')).toBe(
      'Design: Dunkel – umschalten auf System (folgt dem Gerät)',
    );
  });
});
