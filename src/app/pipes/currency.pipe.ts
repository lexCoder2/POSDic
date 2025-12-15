import { Pipe, PipeTransform, inject } from "@angular/core";
import { CurrencyService } from "../services/currency.service";

@Pipe({
  name: "appCurrency",
  standalone: true,
  pure: false, // Make it impure to react to currency changes
})
export class CurrencyPipe implements PipeTransform {
  private currencyService = inject(CurrencyService);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  transform(value: number | null | undefined, decimals = 2): string {
    if (value === null || value === undefined || isNaN(value)) {
      return `${this.currencyService.getSymbol()}0.00`;
    }
    return this.currencyService.format(value, decimals);
  }
}
