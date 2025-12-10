import { Injectable, signal } from "@angular/core";

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
}

@Injectable({
  providedIn: "root",
})
export class CurrencyService {
  // Available currency options
  readonly currencies: CurrencyOption[] = [
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
    { code: "MXN", symbol: "$", name: "Mexican Peso" },
    { code: "CAD", symbol: "$", name: "Canadian Dollar" },
    { code: "AUD", symbol: "$", name: "Australian Dollar" },
    { code: "CHF", symbol: "Fr", name: "Swiss Franc" },
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real" },
    { code: "ARS", symbol: "$", name: "Argentine Peso" },
    { code: "COP", symbol: "$", name: "Colombian Peso" },
    { code: "CLP", symbol: "$", name: "Chilean Peso" },
    { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
  ];

  private currencySymbol = signal<string>("$");
  private currencyCode = signal<string>("USD");

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Get the current currency symbol as a signal
   */
  getCurrencySymbol() {
    return this.currencySymbol.asReadonly();
  }

  /**
   * Get the current currency code as a signal
   */
  getCurrencyCode() {
    return this.currencyCode.asReadonly();
  }

  /**
   * Set the currency by code
   */
  setCurrency(code: string): void {
    const currency = this.currencies.find((c) => c.code === code);
    if (currency) {
      this.currencyCode.set(code);
      this.currencySymbol.set(currency.symbol);
      this.saveToStorage();
    }
  }

  /**
   * Get the current currency symbol value (non-reactive)
   */
  getSymbol(): string {
    return this.currencySymbol();
  }

  /**
   * Get the current currency code value (non-reactive)
   */
  getCode(): string {
    return this.currencyCode();
  }

  /**
   * Format a number with the current currency symbol
   */
  format(amount: number, decimals = 2): string {
    const symbol = this.currencySymbol();
    const formatted = amount.toFixed(decimals);
    return `${symbol}${formatted}`;
  }

  private loadFromStorage(): void {
    try {
      const storedCode = localStorage.getItem("currency.code");
      if (storedCode) {
        const currency = this.currencies.find((c) => c.code === storedCode);
        if (currency) {
          this.currencyCode.set(currency.code);
          this.currencySymbol.set(currency.symbol);
        }
      }
    } catch (e) {
      console.error("Failed to load currency from storage", e);
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem("currency.code", this.currencyCode());
    } catch (e) {
      console.error("Failed to save currency to storage", e);
    }
  }
}
