import { Component, Input, Output, EventEmitter } from "@angular/core";

@Component({
  selector: "app-toggle-switch",
  standalone: true,
  imports: [],
  templateUrl: "./toggle-switch.component.html",
  styleUrls: ["./toggle-switch.component.scss"],
})
export class ToggleSwitchComponent {
  @Input() checked = false;
  @Input() disabled = false;
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
