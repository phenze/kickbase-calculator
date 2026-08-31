import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { THEME_MODE_ORDER, ThemeMode, ThemeService } from '../../../core/services/theme.service';

const THEME_ICONS: Record<ThemeMode, string> = {
  system: 'bi bi-circle-half',
  light: 'bi bi-brightness-high-fill',
  dark: 'bi bi-moon-stars-fill',
};

const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'System (folgt dem Gerät)',
  light: 'Hell',
  dark: 'Dunkel',
};

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [AngularSvgIconModule],
})
export class ThemeToggleComponent {
  private readonly themeService = inject(ThemeService);

  readonly mode = this.themeService.mode;

  readonly iconSrc = computed(() => THEME_ICONS[this.mode()]);

  /**
   * Der Button rotiert durch drei Modi - deshalb nennt das Label sowohl den
   * aktuellen Stand als auch das, was der naechste Klick bewirkt.
   */
  readonly label = computed(() => {
    const current = this.mode();
    const nextIndex = (THEME_MODE_ORDER.indexOf(current) + 1) % THEME_MODE_ORDER.length;
    return `Design: ${THEME_LABELS[current]} – umschalten auf ${THEME_LABELS[THEME_MODE_ORDER[nextIndex]]}`;
  });

  toggle(): void {
    this.themeService.toggle();
  }
}
