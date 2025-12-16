import { Component, EventEmitter, Input, Output } from "@angular/core";

import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../../pipes/translate.pipe";
import { CurrencyPipe } from "../../../pipes/currency.pipe";
import { ModalComponent } from "../../modal/modal.component";
import { CartItem, User } from "../../../models";

export interface InternalSaleResult {
  notes: string;
}

@Component({
  selector: "app-internal-sale-modal",
  standalone: true,
  imports: [FormsModule, TranslatePipe, CurrencyPipe, ModalComponent],
  templateUrl: "./internal-sale-modal.component.html",
  styleUrls: ["./internal-sale-modal.component.scss"],
})
export class InternalSaleModalComponent {
  @Input() show = false;
  @Input() cartItems: CartItem[] = [];
  @Input() total = 0;
  @Input() currentUser: User | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<InternalSaleResult>();

  notes = "";

  onClose(): void {
    this.notes = "";
    this.close.emit();
  }

  onConfirm(): void {
    this.confirm.emit({
      notes: this.notes || "Internal consumption",
    });
    this.notes = "";
  }
}
