import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { FormattedNumberDirective } from './formatted-number.directive';

// 1. Dummy-Komponente als Test-Host erstellen
@Component({
  standalone: true,
  imports: [FormsModule, FormattedNumberDirective],
  template: ` <input type="text" appFormattedNumber [(ngModel)]="val" /> `,
})
class TestHostComponent {
  val: number | null = null;
}

describe('FormattedNumberDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;
  let inputEl: HTMLInputElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    inputEl = fixture.nativeElement.querySelector('input');
    fixture.detectChanges();
  });

  it('sollte die Direktive erfolgreich instanziieren', () => {
    expect(inputEl).toBeTruthy();
  });

  it('sollte eine Zahl im Model als formatierten String im Input anzeigen', fakeAsync(() => {
    component.val = 5000000;
    fixture.detectChanges();
    tick(); // Warten auf ngModel-Update

    expect(inputEl.value).toBe('5.000.000');
  }));

  it('sollte leeres Feld anzeigen, wenn das Model null ist', fakeAsync(() => {
    component.val = null;
    fixture.detectChanges();
    tick();

    expect(inputEl.value).toBe('');
  }));

  it('sollte Benutzereingaben säubern und als reine Zahl im Model speichern', fakeAsync(() => {
    // Simuliere Manuelle Eingabe (z. B. "1.234.567" oder mit Text)
    inputEl.value = '1.234.567 €';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    tick();

    expect(component.val).toBe(1234567);
  }));

  it('sollte das Model auf null setzen, wenn die Eingabe geleert wird', fakeAsync(() => {
    inputEl.value = '';
    inputEl.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    tick();

    expect(component.val).toBeNull();
  }));

  it('sollte bei Blur den Wert im Input-Feld neu formatieren', fakeAsync(() => {
    inputEl.value = '5000';
    inputEl.dispatchEvent(new Event('input'));
    inputEl.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    tick();

    expect(inputEl.value).toBe('5.000');
  }));
});
