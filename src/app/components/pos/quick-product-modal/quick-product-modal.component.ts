import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../../pipes/translate.pipe";

export interface QuickProductData {
  barcode: string;
  name: string;
  price: number;
  requiresScale: boolean;
}

@Component({
  selector: "app-quick-product-modal",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: "./quick-product-modal.component.html",
  styleUrls: ["./quick-product-modal.component.scss"],
})
export class QuickProductModalComponent implements OnChanges {
  @Input() show = false;
  @Input() barcode = "";

  @Output() close = new EventEmitter<void>();
  @Output() createProduct = new EventEmitter<QuickProductData>();

  productName = "";
  productPrice = 0;
  requiresScale = false;

  ngOnChanges(): void {
    if (this.show && this.barcode) {
      this.productName = `Product ${this.barcode}`;
      this.productPrice = 0;
      this.requiresScale = false;
    }
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  onCreateProduct(): void {
    if (!this.productPrice || this.productPrice <= 0) {
      return;
    }

    this.createProduct.emit({
      barcode: this.barcode,
      name: this.productName,
      price: this.productPrice,
      requiresScale: this.requiresScale,
    });

    this.resetForm();
  }

  private resetForm(): void {
    this.productName = "";
    this.productPrice = 0;
    this.requiresScale = false;
  }
}
