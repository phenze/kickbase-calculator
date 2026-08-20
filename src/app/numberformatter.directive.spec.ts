import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NumberformatterDirective } from './numberformatter.directive';
import { MyCurrencyPipe } from './my-currency.pipe';

@Component({
  standalone: true,
  imports: [NumberformatterDirective],
  template: `<input type="text" appNumberformatter value="1000" />`
})
class TestHostComponent {}

describe('NumberformatterDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let inputEl: HTMLInputElement;
  let mockCurrencyPipe: jasmine.SpyObj<MyCurrencyPipe>;

  beforeEach(async () => {
    mockCurrencyPipe = jasmine.createSpyObj('MyCurrencyPipe', ['transform', 'parse']);
    mockCurrencyPipe.transform.and.callFake((val: string | number) => `formatted_${val}`);

    await TestBed.configureTestingModule({
      imports: [TestHostComponent, NumberformatterDirective],
      providers: [
        { provide: MyCurrencyPipe, useValue: mockCurrencyPipe }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    const debugEl = fixture.debugElement.query(By.css('input'));
    inputEl = debugEl.nativeElement;
  });

  it('sollte den Initialwert in ngOnInit über die Pipe transformieren', () => {
    fixture.detectChanges(); // Stößt ngOnInit an

    expect(mockCurrencyPipe.transform).toHaveBeenCalledWith('1000');
    expect(inputEl.value).toBe('formatted_1000');
  });

  it('sollte den Wert beim Blur-Event erneut transformieren', () => {
    fixture.detectChanges(); // Initialisierung

    inputEl.value = '2500';
    inputEl.dispatchEvent(new Event('blur'));

    expect(mockCurrencyPipe.transform).toHaveBeenCalledWith('2500');
    expect(inputEl.value).toBe('formatted_2500');
  });

  it('sollte beim Focus-Event ohne Fehler ausführen', () => {
    fixture.detectChanges();

    expect(() => {
      inputEl.dispatchEvent(new Event('focus'));
    }).not.toThrow();
  });
});