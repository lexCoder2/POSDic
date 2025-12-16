import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
} from "@angular/core";
import { DecimalPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../../pipes/translate.pipe";
import { Product } from "../../../models";

export interface WeightConfirmEvent {
  product: Product;
  weight: number;
}

@Component({
  selector: "app-weight-modal",
  standalone: true,
  imports: [FormsModule, TranslatePipe, DecimalPipe],
  templateUrl: "./weight-modal.component.html",
  styleUrls: ["./weight-modal.component.scss"],
})
export class WeightModalComponent implements OnChanges {
  @Input() show = false;
  @Input() product: Product | null = null;
  @Input() scaleConnected = false;
  @Input() savedWeight = 0;
  @Input() savedWeightUnit = "kg";

  @Output() close = new EventEmitter<void>();
  @Output() confirmWeight = new EventEmitter<WeightConfirmEvent>();

  manualWeight = 0;

  ngOnChanges(): void {
    if (this.show) {
      // Auto-populate weight from saved scale reading if available
      if (this.scaleConnected && this.savedWeight > 0) {
        this.manualWeight = this.savedWeight;
      } else {
        this.manualWeight = 0;
      }
    }
  }

  onClose(): void {
    this.manualWeight = 0;
    this.close.emit();
  }

  onConfirm(): void {
    if (this.product && this.manualWeight > 0) {
      this.confirmWeight.emit({
        product: this.product,
        weight: this.manualWeight,
      });
      this.manualWeight = 0;
    }
  }
}
