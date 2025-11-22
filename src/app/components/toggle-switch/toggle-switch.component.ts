import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-toggle-switch",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./toggle-switch.component.html",
  styleUrls: ["./toggle-switch.component.scss"],
})
export class ToggleSwitchComponent {
  @Input() checked: boolean = false;
  @Input() disabled: boolean = false;
  @Input() size: "small" | "medium" | "large" = "medium";
  @Output() change = new EventEmitter<boolean>();

  toggle(): void {
    if (!this.disabled) {
      const newValue = !this.checked;
      this.checked = newValue;
      this.change.emit(newValue);
    }
  }
}
