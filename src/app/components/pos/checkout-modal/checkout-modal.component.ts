import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ElementRef,
  SimpleChanges,
  OnChanges,
} from "@angular/core";

import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../../pipes/translate.pipe";
import { CurrencyPipe } from "../../../pipes/currency.pipe";
import { CartItem } from "../../../models";

export type PaymentMethod = "cash" | "card" | "transfer" | "mixed";

export interface PaymentDetails {
  cash?: number;
  card?: number;
  transfer?: number;
  change?: number;
}

export interface CheckoutResult {
  paymentMethod: PaymentMethod;
  paymentDetails: PaymentDetails;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
}

@Component({
  selector: "app-checkout-modal",
  standalone: true,
  imports: [FormsModule, TranslatePipe, CurrencyPipe],
  templateUrl: "./checkout-modal.component.html",
  styleUrls: ["./checkout-modal.component.scss"],
})
export class CheckoutModalComponent implements OnChanges {
  @ViewChild("cashInput") cashInput!: ElementRef<HTMLInputElement>;
  @ViewChild("cardInput") cardInput!: ElementRef<HTMLInputElement>;
  @ViewChild("transferInput") transferInput!: ElementRef<HTMLInputElement>;

  @Input() show = false;
  @Input() cartItems: CartItem[] = [];
  @Input() total = 0;

  @Output() close = new EventEmitter<void>();
  @Output() completeSale = new EventEmitter<CheckoutResult>();

  paymentMethod: PaymentMethod = "cash";
  cashAmount = 0;
  cardAmount = 0;
  transferAmount = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["show"] && this.show) {
      this.cashAmount = this.total;
      // Focus cash input when modal opens (cash is default)
      this.focusInput("cash");
    }
  }

  private focusInput(method: PaymentMethod): void {
    setTimeout(() => {
      let input: ElementRef<HTMLInputElement> | undefined;
      switch (method) {
        case "cash":
          input = this.cashInput;
          break;
        case "card":
          input = this.cardInput;
          break;
        case "transfer":
          input = this.transferInput;
          break;
      }
      if (input?.nativeElement) {
        input.nativeElement.focus();
        input.nativeElement.select();
      }
    }, 100);
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  onCompleteSale(): void {
    if (!this.validatePayment()) {
      return;
    }

    this.completeSale.emit({
      paymentMethod: this.paymentMethod,
      paymentDetails: this.getPaymentDetails(),
      cashAmount: this.cashAmount,
      cardAmount: this.cardAmount,
      transferAmount: this.transferAmount,
    });
  }

  validatePayment(): boolean {
    switch (this.paymentMethod) {
      case "cash":
        return this.cashAmount >= this.total;
      case "card":
        return this.cardAmount >= this.total;
      case "transfer":
        return this.transferAmount >= this.total;
      case "mixed":
        return (
          this.cashAmount + this.cardAmount + this.transferAmount >= this.total
        );
      default:
        return false;
    }
  }

  getPaymentDetails(): PaymentDetails {
    const details: PaymentDetails = {};

    if (this.paymentMethod === "cash") {
      details.cash = this.cashAmount;
      details.change = this.cashAmount - this.total;
    } else if (this.paymentMethod === "card") {
      details.card = this.cardAmount;
    } else if (this.paymentMethod === "transfer") {
      details.transfer = this.transferAmount;
    } else if (this.paymentMethod === "mixed") {
      details.cash = this.cashAmount;
      details.card = this.cardAmount;
      details.transfer = this.transferAmount;
      const totalPaid = this.cashAmount + this.cardAmount + this.transferAmount;
      details.change = totalPaid - this.total;
    }

    return details;
  }

  get changeAmount(): number {
    if (this.paymentMethod === "cash") {
      return Math.max(0, this.cashAmount - this.total);
    } else if (this.paymentMethod === "mixed") {
      const totalPaid = this.cashAmount + this.cardAmount + this.transferAmount;
      return Math.max(0, totalPaid - this.total);
    }
    return 0;
  }

  setPaymentMethod(method: PaymentMethod): void {
    this.paymentMethod = method;
    // Reset amounts based on method
    if (method === "cash") {
      this.cashAmount = this.total;
      this.cardAmount = 0;
      this.transferAmount = 0;
    } else if (method === "card") {
      this.cardAmount = this.total;
      this.cashAmount = 0;
      this.transferAmount = 0;
    } else if (method === "transfer") {
      this.transferAmount = this.total;
      this.cashAmount = 0;
      this.cardAmount = 0;
    }
    // Focus the appropriate input
    this.focusInput(method);
  }

  private resetForm(): void {
    this.paymentMethod = "cash";
    this.cashAmount = 0;
    this.cardAmount = 0;
    this.transferAmount = 0;
  }
}
