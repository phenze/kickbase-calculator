import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ErrorService } from './error.service';

describe('ErrorService', () => {
  let service: ErrorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ErrorService);
  });

  it('sollte den Fehlertext im Signal setzen', () => {
    service.showError('Test Fehler');
    expect(service.errorMessage()).toBe('Test Fehler');
  });

  it('sollte den Fehler automatisch nach 10 Sekunden ausblenden', fakeAsync(() => {
    service.showError('Auto-Clear Fehler');
    expect(service.errorMessage()).toBe('Auto-Clear Fehler');

    // 10 Sekunden simulieren
    tick(10000);
    expect(service.errorMessage()).toBeNull();
  }));

  it('sollte den Timer zurücksetzen, wenn ein neuer Fehler geworfen wird', fakeAsync(() => {
    service.showError('Erster Fehler', 5000);
    tick(3000); // Nach 3 Sekunden

    // Neuer Fehler verlängert die Anzeigezeit erneut
    service.showError('Zweiter Fehler', 5000);
    expect(service.errorMessage()).toBe('Zweiter Fehler');

    tick(3000); // Insgesamt 6 Sekunden vergangen (erster Timer wäre hier abgelaufen)
    expect(service.errorMessage()).toBe('Zweiter Fehler');

    tick(2000); // Zweiter Timer läuft ab
    expect(service.errorMessage()).toBeNull();
  }));

  it('sollte den Fehler manuell per clearError() löschen', fakeAsync(() => {
    service.showError('Manueller Fehler');
    service.clearError();
    expect(service.errorMessage()).toBeNull();
  }));
});
