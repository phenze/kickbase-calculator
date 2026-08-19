import { NumberformatterDirective } from './numberformatter.directive';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MyCurrencyPipe } from './my-currency.pipe';

@Component({
  standalone: true,
  imports: [NumberformatterDirective],
  template: `<input appNumberformatter value="1000">`
})
class HostComponent {}

describe('NumberformatterDirective', () => {
	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HostComponent],
			providers: [MyCurrencyPipe]
		}).compileComponents();
	});

	it('should format input value on init', () => {
		const fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();

		const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
		expect(input.value).toBe('1.000,00');
	});
});
