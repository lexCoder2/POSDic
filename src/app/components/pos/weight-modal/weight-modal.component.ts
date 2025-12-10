import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
} from "@angular/core";
import { CommonModule, DecimalPipe } from "@angular/common";
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
  imports: [CommonModule, FormsModule, TranslatePipe, DecimalPipe],
  templateUrl: "./weight-modal.component.html",
  styleUrls: ["./weight-modal.component.scss"],
})
export class WeightModalComponent implements OnChanges {
  @Input() show = false;
  @Input() product: Product | null = null;
  @Input() scaleConnected = false;
  @Input() currentWeight = 0;
  @Input() currentWeightUnit = "kg";
  @Input() currentWeightStable = false;

  @Output() close = new EventEmitter<void>();
  @Output() confirmWeight = new EventEmitter<WeightConfirmEvent>();

  manualWeight = 0;

  ngOnChanges(): void {
    if (this.show && this.scaleConnected) {
      this.manualWeight = this.currentWeight;
    } else if (this.show) {
      this.manualWeight = 0;
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
