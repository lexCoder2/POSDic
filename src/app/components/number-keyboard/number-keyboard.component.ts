import {
  Component,
  signal,
  output,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from "@angular/core";

import { TranslatePipe } from "../../pipes/translate.pipe";

export interface NumberKeyboardInputEvent {
  value: string;
}

@Component({
  selector: "app-number-keyboard",
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: "./number-keyboard.component.html",
  styleUrls: ["./number-keyboard.component.scss"],
})
export class NumberKeyboardComponent implements AfterViewInit {
  @ViewChild("keyboardContainer")
  keyboardContainer!: ElementRef<HTMLDivElement>;

  // Outputs
  valueChange = output<NumberKeyboardInputEvent>();

  // State
  display = signal<string>("0");

  ngAfterViewInit(): void {
    setTimeout(() => this.focusKeyboard(), 100);
  }

  focusKeyboard(): void {
    if (this.keyboardContainer?.nativeElement) {
      this.keyboardContainer.nativeElement.focus();
    }
  }

  blurButton(event: Event): void {
    const target = event.target as HTMLElement;
    target?.blur();
  }

  appendNumber(num: string): void {
    const current = this.display();
    if (current === "0") {
      this.display.set(num);
    } else {
      this.display.set(current + num);
    }
    this.emitValue();
  }

  appendDecimal(): void {
    const current = this.display();
    if (!current.includes(".")) {
      this.display.set(current + ".");
      this.emitValue();
    }
  }

  clear(): void {
    this.display.set("0");
    this.emitValue();
  }

  backspace(): void {
    const current = this.display();
    if (current.length > 1) {
      this.display.set(current.slice(0, -1));
    } else {
      this.display.set("0");
    }
    this.emitValue();
  }

  private emitValue(): void {
    this.valueChange.emit({ value: this.display() });
  }

  // Keyboard event handler
  onKeyDown(event: KeyboardEvent): void {
    event.preventDefault();

    const key = event.key;

    // Numbers
    if (key >= "0" && key <= "9") {
      this.appendNumber(key);
    }
    // Decimal point
    else if (key === "." || key === ",") {
      this.appendDecimal();
    }
    // Backspace
    else if (key === "Backspace") {
      this.backspace();
    }
    // Clear (Escape or 'c')
    else if (key === "Escape" || key.toLowerCase() === "c") {
      this.clear();
    }
  }
}
