import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-modal",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./modal.component.html",
  styleUrls: ["./modal.component.scss"],
})
export class ModalComponent {
  @Input() show = false;
  @Input() title = "";
  @Input() icon = "";
  @Input() size: "sm" | "md" | "lg" | "xl" = "md";
  @Input() showCloseButton = true;
  @Input() closeOnBackdropClick = true;
  @Output() close = new EventEmitter<void>();

  onBackdropClick(): void {
    if (this.closeOnBackdropClick) {
      this.close.emit();
    }
  }

  onClose(): void {
    this.close.emit();
  }
}
