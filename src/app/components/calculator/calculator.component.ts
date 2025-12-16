import {
  Component,
  signal,
  output,
  ViewChild,
  ElementRef,
  AfterViewInit,
  input,
} from "@angular/core";

import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../pipes/translate.pipe";

export interface CalculatorAddEvent {
  value: number;
  customName?: string;
}

export interface CalculatorMultiplyConfirmEvent {
  quantity: number;
  mode: "add" | "update";
  pendingValue: number | null;
}

@Component({
  selector: "app-calculator",
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: "./calculator.component.html",
  styleUrls: ["./calculator.component.scss"],
})
export class CalculatorComponent implements AfterViewInit {
  @ViewChild("calculatorContainer")
  calculatorContainer!: ElementRef<HTMLDivElement>;

  // Inputs
  lastItemPrice = input<number | null>(null);
  itemsCount = input<number>(0);
  selectedItemId = input<number | null>(null);

  // Outputs
  addItem = output<CalculatorAddEvent>();
  multiplyConfirm = output<CalculatorMultiplyConfirmEvent>();
  looseProductRequest = output<void>();

  // State
  display = signal<string>("0");
  customName = signal<string>("");
  isMultiplying = signal<boolean>(false);
  multiplyMode = signal<"add" | "update" | null>(null);
  pendingMultiplyValue = signal<number | null>(null);
  isSelected = signal<boolean>(false);

  ngAfterViewInit(): void {
    setTimeout(() => this.focusCalculator(), 100);
  }

  focusCalculator(): void {
    if (this.calculatorContainer?.nativeElement) {
      this.calculatorContainer.nativeElement.focus();
    }
  }

  blurButton(event: Event): void {
    const target = event.target as HTMLElement;
    target?.blur();
  }

  appendNumber(num: string): void {
    const current = this.display();
    if (current === "0" || this.isSelected()) {
      this.display.set(num);
      this.isSelected.set(false);
    } else {
      this.display.set(current + num);
    }
  }

  appendDecimal(): void {
    const current = this.display();
    if (this.isSelected()) {
      this.display.set("0.");
      this.isSelected.set(false);
    } else if (!current.includes(".")) {
      this.display.set(current + ".");
    }
  }

  clear(): void {
    this.display.set("0");
  }

  clearAll(): void {
    this.display.set("0");
  }

  backspace(): void {
    const current = this.display();
    if (current.length > 1) {
      this.display.set(current.slice(0, -1));
    } else {
      this.display.set("0");
    }
  }

  onAddItem(): void {
    const value = parseFloat(this.display());
    if (!isNaN(value) && value > 0) {
      if (this.isMultiplying()) {
        this.confirmMultiply();
        return;
      }
      this.addItem.emit({
        value,
        customName: this.customName().trim() || undefined,
      });
      this.display.set("0");
      this.customName.set("");
    }
  }

  multiplyItem(): void {
    const displayValue = parseFloat(this.display());

    if (displayValue === 0 || isNaN(displayValue)) {
      // Multiply last item: show quantity input on display
      if (this.itemsCount() === 0) return;
      this.isMultiplying.set(true);
      this.multiplyMode.set("update");
      this.pendingMultiplyValue.set(null);
      this.display.set("");
    } else {
      // Add multiple items: show quantity input on display
      this.isMultiplying.set(true);
      this.multiplyMode.set("add");
      this.pendingMultiplyValue.set(displayValue);
      this.display.set("");
    }
  }

  confirmMultiply(): void {
    const quantity = parseFloat(this.display());
    if (isNaN(quantity) || quantity <= 0) {
      this.display.set("0");
      this.isMultiplying.set(false);
      this.multiplyMode.set(null);
      this.pendingMultiplyValue.set(null);
      return;
    }

    this.multiplyConfirm.emit({
      quantity,
      mode: this.multiplyMode()!,
      pendingValue: this.pendingMultiplyValue(),
    });

    this.display.set("0");
    this.isMultiplying.set(false);
    this.multiplyMode.set(null);
    this.pendingMultiplyValue.set(null);
  }

  openLooseProductModal(): void {
    this.looseProductRequest.emit();
  }

  // Public method to set display value (used for editing items)
  setDisplay(value: string): void {
    this.display.set(value);
  }

  // Public method to get current display value
  getDisplayValue(): number {
    return parseFloat(this.display());
  }

  // Public method to check if there's a pending value
  hasPendingValue(): boolean {
    const value = parseFloat(this.display());
    return !isNaN(value) && value > 0;
  }

  // Public method to handle Enter key (add or confirm multiply)
  handleEnter(): void {
    if (this.isMultiplying()) {
      this.confirmMultiply();
    } else {
      this.onAddItem();
    }
  }

  // Public method to handle multiply key
  handleMultiply(): void {
    this.multiplyItem();
  }

  // Public method to select all display text
  selectAll(): void {
    // Mark text as selected - next input will replace
    this.isSelected.set(true);
  }
}
