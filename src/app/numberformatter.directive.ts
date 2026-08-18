
import { Directive, HostListener, ElementRef, OnInit } from "@angular/core";
import { MyCurrencyPipe } from "./my-currency.pipe";

@Directive({
    selector: '[appNumberformatter]',
    standalone: true
})
export class NumberformatterDirective {

	private el: HTMLInputElement;

	constructor(
		private elementRef: ElementRef,
		private currencyPipe: MyCurrencyPipe
	) {
		this.el = this.elementRef.nativeElement;
	}

	ngOnInit() {
		this.el.value = this.currencyPipe.transform(this.el.value);
	}

	@HostListener("focus", ["$event"])
	onFocus(_event: FocusEvent) {
		//this.el.value = this.currencyPipe.parse(value); // opossite of transform
	}

	@HostListener("blur", ["$event"])
	onBlur(event: FocusEvent) {
		const target = event.target as HTMLInputElement | null;
		if (target !== null) {
			this.el.value = this.currencyPipe.transform(target.value);
		}
	}

}
