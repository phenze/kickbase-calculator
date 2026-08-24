import { Directive, ElementRef, HostListener, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Directive({
  selector: 'input[appFormattedNumber]',
  standalone: true, // Bei Bedarf standalone: false, falls auf AppModule-Basis
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormattedNumberDirective),
      multi: true,
    },
  ],
})
export class FormattedNumberDirective implements ControlValueAccessor {
  private rawValue: number | null = null;
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef<HTMLInputElement>) {}

  // ControlValueAccessor: Wird von Angular aufgerufen, wenn sich das Model (TS) ändert
  writeValue(value: number | null): void {
    this.rawValue = value;
    this.formatInput();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  // Bei jeder Texteingabe im Field: Reines Zahlenformat extrahieren & Model updaten
  @HostListener('input')
  onInput(): void {
    const value = this.el.nativeElement.value;

    const cleanString = value.replace(/[^0-9]/g, '');
    const numericValue = cleanString ? parseInt(cleanString, 10) : null;

    this.rawValue = numericValue;
    this.onChange(this.rawValue);
    this.formatInput();
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
    this.formatInput();
  }

  // Hilfsmethode zur Formatierung des Input-Textes (de-DE ohne Kommastellen)
  private formatInput(): void {
    if (this.rawValue !== null && this.rawValue !== undefined && this.rawValue > 0) {
      const formatted = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 }).format(
        this.rawValue,
      );
      this.el.nativeElement.value = formatted;
    } else {
      this.el.nativeElement.value = '';
    }
  }
}
