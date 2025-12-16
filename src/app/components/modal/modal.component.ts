import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
  selector: "app-modal",
  standalone: true,
  imports: [],
  templateUrl: "./modal.component.html",
  styleUrls: ["./modal.component.scss"],
})
export class ModalComponent {
  @Input() show = false;
  @Input() title = "";
  @Input() icon = "";
  @Input() size: "sm" | "md" | "lg" | "xl" = "md";
  @Input() customClass = "";
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
