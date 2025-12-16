import {
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ElementRef,
  OnChanges,
  SimpleChanges,
} from "@angular/core";

import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../../pipes/translate.pipe";
import { CurrencyPipe } from "../../../pipes/currency.pipe";
import { ModalComponent } from "../../modal/modal.component";

export interface LooseProductData {
  weight: number;
  pricePerKg: number;
  description: string;
  totalPrice: number;
}

@Component({
  selector: "app-loose-product-modal",
  standalone: true,
  imports: [FormsModule, TranslatePipe, CurrencyPipe, ModalComponent],
  templateUrl: "./loose-product-modal.component.html",
  styleUrls: ["./loose-product-modal.component.scss"],
})
export class LooseProductModalComponent implements OnChanges {
  @ViewChild("weightInput") weightInput!: ElementRef<HTMLInputElement>;

  @Input() show = false;
  @Input() scaleConnected = false;
  @Input() savedWeight = 0;

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<LooseProductData>();

  weight = "";
  pricePerKg = "";
  description = "";

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["show"] && this.show) {
      // Auto-populate weight from scale if available
      if (this.scaleConnected && this.savedWeight > 0) {
        this.weight = this.savedWeight.toFixed(3);
      }
      this.focusWeightInput();
    }

    // Update weight from saved scale reading when it changes
    if (changes["savedWeight"] && this.savedWeight > 0 && this.show) {
      this.weight = this.savedWeight.toFixed(3);
    }
  }

  private focusWeightInput(): void {
    setTimeout(() => {
      if (this.weightInput?.nativeElement) {
        this.weightInput.nativeElement.focus();
        this.weightInput.nativeElement.select();
      }
    }, 100);
  }

  private resetForm(): void {
    this.weight = "";
    this.pricePerKg = "";
    this.description = "";
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  get calculatedTotal(): number {
    const w = parseFloat(this.weight);
    const p = parseFloat(this.pricePerKg);
    if (!isNaN(w) && !isNaN(p) && w > 0 && p > 0) {
      return w * p;
    }
    return 0;
  }

  get pricePerKgValue(): number {
    const p = parseFloat(this.pricePerKg);
    return isNaN(p) ? 0 : p;
  }

  get isValid(): boolean {
    const w = parseFloat(this.weight);
    const p = parseFloat(this.pricePerKg);
    return !isNaN(w) && !isNaN(p) && w > 0 && p > 0;
  }

  onConfirm(): void {
    if (!this.isValid) return;

    const w = parseFloat(this.weight);
    const p = parseFloat(this.pricePerKg);

    this.confirm.emit({
      weight: w,
      pricePerKg: p,
      description: this.description.trim() || "Loose Product",
      totalPrice: w * p,
    });

    this.resetForm();
  }
}
