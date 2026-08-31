import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ErrorService {
  public errorMessage = signal<string | null>(null);
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  showError(message: string, durationMs = 10000): void {
    // Alten Timer zurücksetzen, falls bereits ein Fehler angezeigt wird
    this.clearTimer();

    this.errorMessage.set(message);

    // Nach 10 Sekunden (oder übergebenem Wert) den Fehler automatisch ausblenden
    this.timeoutId = setTimeout(() => {
      this.clearError();
    }, durationMs);
  }

  clearError(): void {
    this.clearTimer();
    this.errorMessage.set(null);
  }

  private clearTimer(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}
