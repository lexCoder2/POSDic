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
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../../pipes/translate.pipe";
import { CurrencyPipe } from "../../../pipes/currency.pipe";

export interface LooseProductData {
  weight: number;
  pricePerKg: number;
  description: string;
  totalPrice: number;
}

@Component({
  selector: "app-loose-product-modal",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, CurrencyPipe],
  templateUrl: "./loose-product-modal.component.html",
  styleUrls: ["./loose-product-modal.component.scss"],
})
export class LooseProductModalComponent implements OnChanges {
  @ViewChild("weightInput") weightInput!: ElementRef<HTMLInputElement>;

  @Input() show = false;
  @Input() scaleConnected = false;
  @Input() currentWeight = 0;
  @Input() currentWeightStable = false;

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<LooseProductData>();

  weight = "";
  pricePerKg = "";
  description = "";
  useScaleWeight = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["show"] && this.show) {
      this.resetForm();
      this.focusWeightInput();
    }

    // Update weight from scale if using scale
    if (
      this.useScaleWeight &&
      this.scaleConnected &&
      changes["currentWeight"]
    ) {
      if (this.currentWeightStable && this.currentWeight > 0) {
        this.weight = this.currentWeight.toFixed(3);
      }
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
    this.useScaleWeight = false;
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  toggleUseScaleWeight(): void {
    this.useScaleWeight = !this.useScaleWeight;
    if (
      this.useScaleWeight &&
      this.scaleConnected &&
      this.currentWeightStable
    ) {
      this.weight = this.currentWeight.toFixed(3);
    }
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
