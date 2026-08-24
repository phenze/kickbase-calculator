import { Pipe, PipeTransform } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

@Pipe({
  name: 'euro', // So heißt die Pipe später im HTML
})
export class EuroPipe implements PipeTransform {
  constructor(private currencyPipe: CurrencyPipe) {}

  transform(value: number | string | null | undefined): string | null {
    if (value == null) return null;

    // Nutzt die originale Pipe mit '1.0-0' (0 Nachkommastellen) als Standard
    return this.currencyPipe.transform(value, 'EUR', 'symbol', '1.0-0', 'de-DE');
  }
}
