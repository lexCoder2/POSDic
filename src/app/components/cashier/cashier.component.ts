import {
  Component,
  signal,
  effect,
  HostListener,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnInit,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, NavigationEnd } from "@angular/router";
import { filter, Subscription } from "rxjs";
import { SaleService } from "../../services/sale.service";
import { CartService } from "../../services/cart.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { CurrencyService } from "../../services/currency.service";
import { ScaleService, ScaleReading } from "../../services/scale.service";
import { ReceiptGeneratorService } from "../../services/receipt-generator.service";
import { RegisterService } from "../../services/register.service";
import { Register } from "../../models";
import {
  CalculatorComponent,
  CalculatorAddEvent,
  CalculatorMultiplyConfirmEvent,
} from "../calculator/calculator.component";
import {
  NumberKeyboardComponent,
  NumberKeyboardInputEvent,
} from "../number-keyboard/number-keyboard.component";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";
import { environment } from "@environments/environment";
import { OpenRegisterComponent } from "../open-register/open-register.component";

@Component({
  selector: "app-cashier",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CalculatorComponent,
    NumberKeyboardComponent,
    TranslatePipe,
    CurrencyPipe,
    OpenRegisterComponent,
  ],
  templateUrl: "./cashier.component.html",
  styleUrls: ["./cashier.component.scss"],
})
export class CashierComponent implements OnInit, AfterViewInit {
  private saleService = inject(SaleService);
  private cartService = inject(CartService);
  private authService = inject(AuthService);
  currencyService = inject(CurrencyService);
  private scaleService = inject(ScaleService);
  private receiptGeneratorService = inject(ReceiptGeneratorService);
  private registerService = inject(RegisterService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  @ViewChild(CalculatorComponent)
  calculator!: CalculatorComponent;
  @ViewChild("cashReceivedInput")
  cashReceivedInput!: ElementRef<HTMLInputElement>;
  @ViewChild("pricePerKgInput")
  pricePerKgInput!: ElementRef<HTMLInputElement>;
  @ViewChild("weightInput")
  weightInput!: ElementRef<HTMLInputElement>;

  items = signal<
    {
      price: number;
      id: number;
      description?: string;
      weight?: number;
      pricePerKg?: number;
      quantity: number;
      unitPrice: number;
    }[]
  >([]);
  total = signal<number>(0);
  isProcessing = signal<boolean>(false);
  activeCartId = signal<string | null>(null);
  selectedItemId = signal<number | null>(null);

  showPaymentModal = signal<boolean>(false);
  selectedPaymentMethod = signal<"cash" | "card" | "internal" | null>(null);
  cashReceived = signal<string>("");
  change = signal<number>(0);

  // Loose product / scale functionality
  showLooseProductModal = signal<boolean>(false);
  looseProductWeight = signal<string>("");
  looseProductPricePerKg = signal<string>("");
  looseProductDescription = signal<string>("");
  scaleConnected = signal<boolean>(false);
  currentScaleReading = signal<ScaleReading | null>(null);
  useScaleWeight = signal<boolean>(false);

  // Mobile UI: active tab for small screens ('calculator' | 'sales')
  activeTab = signal<"calculator" | "sales">("calculator");

  // Register status
  currentRegister = signal<Register | null>(null);
  showOpenRegisterModal = signal<boolean>(false);

  private itemIdCounter = 0;
  private deleteKeyPressCount = 0;
  private deleteKeyTimer: any = null;
  private enterKeyPressCount = 0;
  private enterKeyTimer: any = null;
  private backspaceKeyPressCount = 0;
  private backspaceKeyTimer: any = null;
  private saveCartTimer: any = null;
  private debounceDelay = 1000; // 1 second debounce for cart saves

  // Helper methods for template
  parseFloat = parseFloat;

  getLastItemPrice(): number | null {
    const items = this.items();
    return items.length > 0 ? items[items.length - 1].unitPrice : null;
  }

  blurButton(event: Event): void {
    const target = event.target as HTMLElement;
    target?.blur();
  }

  openRegisterModal(): void {
    this.showOpenRegisterModal.set(true);
  }

  closeRegisterModal(): void {
    this.showOpenRegisterModal.set(false);
  }

  onRegisterOpened(): void {
    this.closeRegisterModal();
    // Reload the active register to update the state
    this.registerService.getActiveRegister().subscribe({
      next: () => {
        // Focus calculator after register is opened
        setTimeout(() => this.calculator?.focusCalculator(), 300);
      },
      error: (err) => {
        console.error("Error reloading register:", err);
        // Still focus calculator even if there's an error
        setTimeout(() => this.calculator?.focusCalculator(), 300);
      },
    });
  }

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    // Subscribe to scale readings
    effect(() => {
      this.scaleService.currentWeight$.subscribe((reading) => {
        this.currentScaleReading.set(reading);
        if (this.useScaleWeight() && reading && reading.stable) {
          this.looseProductWeight.set(reading.weight.toFixed(3));
        }
      });
    });

    // Check if scale is already connected
    this.scaleConnected.set(this.scaleService.isConnected());

    // Load active cart from database

    // Handle session cleanup when user leaves or closes window
    this.setupSessionCleanup();
  }

  ngOnInit(): void {
    // Subscribe to register state
    this.loadActiveCart()?.add(() => {
      this.registerService.currentRegister$.subscribe((register) => {
        this.currentRegister.set(register);
      });
    });
    // Load active register
    this.registerService.getActiveRegister().subscribe();

    // Focus calculator when route changes to cashier
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        if (event.url.includes("/cashier")) {
          setTimeout(() => this.calculator?.focusCalculator(), 100);
        }
      });
  }

  ngAfterViewInit(): void {
    // Focus calculator on initial load
    setTimeout(() => this.calculator?.focusCalculator(), 100);
  }

  private setupSessionCleanup(): void {
    // Mark cart as abandoned when user closes window
    window.addEventListener("beforeunload", () => {
      if (
        this.activeCartId() &&
        this.items().length > 0 &&
        !this.showPaymentModal()
      ) {
        // Send synchronous request to mark cart as abandoned
        this.markCartAsAbandoned();
      }
    });

    // Also handle when user navigates away
    window.addEventListener("unload", () => {
      if (
        this.activeCartId() &&
        this.items().length > 0 &&
        !this.showPaymentModal()
      ) {
        this.markCartAsAbandoned();
      }
    });
  }

  private markCartAsAbandoned(): void {
    if (!this.activeCartId()) return;

    const cartId = this.activeCartId();
    const apiUrl = `${environment.apiUrl}/carts/${cartId}/abandon`;

    // Use FormData for sendBeacon compatibility
    const formData = new FormData();
    formData.append("status", "abandoned");

    navigator.sendBeacon(apiUrl, formData);
  }

  loadActiveCart(): Subscription | null {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) return null;

    return this.cartService.getActiveCart(currentUser.id).subscribe({
      next: (cart) => {
        if (cart && cart.items) {
          // Convert cart items to cashier items format
          const cartItems = cart.items.map((item: any, index: number) => ({
            price: item.subtotal,
            unitPrice: item.price,
            quantity: item.quantity,
            id: index,
            description: item.product?.name,
          }));
          this.items.set(cartItems);
          this.total.set(cart.total);
          this.activeCartId.set(cart._id);
          this.itemIdCounter = cartItems.length;
        }
      },
      error: (err) => {
        // No active cart, that's fine
        console.log("No active cart found");
      },
    });
  }

  saveCart(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) return;

    const cartData = {
      cashier: currentUser.id,
      items: this.items().map((item) => ({
        product: null, // Manual items don't have product IDs
        quantity: item.quantity,
        price: item.unitPrice,
        subtotal: item.price,
        description: item.description,
        weight: item.weight,
        pricePerKg: item.pricePerKg,
      })),
      subtotal: this.total(),
      tax: 0,
      discount: 0,
      total: this.total(),
      status: "active",
    };

    if (this.activeCartId()) {
      // Update existing cart
      this.cartService.updateCart(this.activeCartId()!, cartData).subscribe({
        next: (cart) => {
          this.activeCartId.set(cart._id);
        },
        error: (err) => {
          console.error("Error updating cart:", err);
        },
      });
    } else {
      // Create new cart
      this.cartService.createCart(cartData).subscribe({
        next: (cart) => {
          this.activeCartId.set(cart._id);
        },
        error: (err) => {
          console.error("Error creating cart:", err);
        },
      });
    }
  }

  // Debounced save to avoid excessive API calls
  private debouncedSaveCart(): void {
    if (this.saveCartTimer) {
      clearTimeout(this.saveCartTimer);
    }

    this.saveCartTimer = setTimeout(() => {
      this.saveCart();
    }, this.debounceDelay);
  }

  @HostListener("document:keydown", ["$event"])
  handleKeyboardEvent(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;

    // Ignore if modal is open or typing in input/button
    if (
      this.showPaymentModal() ||
      this.showLooseProductModal() ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "BUTTON"
    ) {
      return;
    }

    const key = event.key;

    // Numbers 0-9 (check key first, then keyCode as fallback)
    if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      this.calculator?.appendNumber(key);
      return;
    }

    // Numpad keys
    if (/^Numpad[0-9]$/.test(event.code)) {
      event.preventDefault();
      const digit = event.code.replace("Numpad", "");
      this.calculator?.appendNumber(digit);
      return;
    }

    // Fallback: Check keyCode for numbers (48-57 for top row, 96-105 for numpad)
    if (
      (event.keyCode >= 48 && event.keyCode <= 57) ||
      (event.keyCode >= 96 && event.keyCode <= 105)
    ) {
      event.preventDefault();
      const digit =
        event.keyCode >= 96
          ? (event.keyCode - 96).toString()
          : (event.keyCode - 48).toString();
      this.calculator?.appendNumber(digit);
      return;
    }

    // Decimal point
    if (
      key === "." ||
      key === "," ||
      event.code === "NumpadDecimal" ||
      event.keyCode === 110 ||
      event.keyCode === 190
    ) {
      event.preventDefault();
      this.calculator?.appendDecimal();
      return;
    }

    // Enter - Handle double press for cash payment or single press for add item
    if (
      key === "Enter" ||
      event.code === "NumpadEnter" ||
      key === "=" ||
      key === "+"
    ) {
      event.preventDefault();
      this.handleEnterKey();
      return;
    }

    // Backspace - Remove last digit or delete last item on double press
    if (key === "Backspace") {
      event.preventDefault();
      this.handleBackspaceKey();
      return;
    }

    // Delete - Modify/Remove last item (double press)
    if (key === "Delete") {
      event.preventDefault();
      this.handleDeleteKey();
      return;
    }

    // Escape - Clear display
    if (key === "Escape") {
      event.preventDefault();
      this.calculator?.clear();
      return;
    }

    // Multiply (x or *) - Set quantity or add multiple items
    if (key === "x" || key === "X" || key === "*") {
      event.preventDefault();
      this.calculator?.handleMultiply();
      return;
    }

    // Open Loose Product modal when pressing 'g' (quick access)
    if (key === "g" || key === "G") {
      event.preventDefault();
      this.openLooseProductModal();
      return;
    }

    // Open Loose Product modal when pressing up arrow
    if (key === "ArrowUp") {
      event.preventDefault();
      this.openLooseProductModal();
      return;
    }

    // Open Loose Product modal when pressing Home
    if (key === "Home") {
      event.preventDefault();
      this.openLooseProductModal();
      return;
    }
  }

  handleDeleteKey(): void {
    const items = this.items();
    if (items.length === 0) return;

    this.deleteKeyPressCount++;

    if (this.deleteKeyTimer) {
      clearTimeout(this.deleteKeyTimer);
    }

    if (this.deleteKeyPressCount === 1) {
      // First press - Modify last item (put price back in display)
      const lastItem = items[items.length - 1];
      this.calculator?.setDisplay(lastItem.price.toFixed(2));
      this.removeItem(lastItem.id);

      // Reset counter after 1 second
      this.deleteKeyTimer = setTimeout(() => {
        this.deleteKeyPressCount = 0;
      }, 1000);
    } else if (this.deleteKeyPressCount === 2) {
      // Second press within 1 second - Just remove without modifying
      const lastItem = items[items.length - 1];
      if (lastItem) {
        this.removeItem(lastItem.id);
      }
      this.calculator?.setDisplay("0");
      this.deleteKeyPressCount = 0;
      clearTimeout(this.deleteKeyTimer);
    }
  }

  handleEnterKey(): void {
    this.enterKeyPressCount++;

    if (this.enterKeyTimer) {
      clearTimeout(this.enterKeyTimer);
    }

    if (this.enterKeyPressCount === 1) {
      // First press - Add item or confirm multiplication
      this.calculator?.handleEnter();

      // Reset counter after 1 second
      this.enterKeyTimer = setTimeout(() => {
        this.enterKeyPressCount = 0;
      }, 1000);
    } else if (this.enterKeyPressCount === 2) {
      // Second press within 1 second - Check if display is 0, then open cash modal
      const displayValue = parseFloat(this.calculator?.display() || "0");
      if (displayValue === 0 && this.items().length > 0) {
        this.completeSale("cash");
      }
      this.enterKeyPressCount = 0;
      clearTimeout(this.enterKeyTimer);
    }
  }

  handleBackspaceKey(): void {
    const displayValue = parseFloat(this.calculator?.display() || "0");
    this.backspaceKeyPressCount++;

    if (this.backspaceKeyTimer) {
      clearTimeout(this.backspaceKeyTimer);
    }

    if (this.backspaceKeyPressCount === 1) {
      // First press - Remove last digit
      this.calculator?.backspace();

      // Reset counter after 1 second
      this.backspaceKeyTimer = setTimeout(() => {
        this.backspaceKeyPressCount = 0;
      }, 1000);
    } else if (this.backspaceKeyPressCount === 2) {
      // Second press within 1 second - Check if display is 0, then delete last item
      const currentDisplayValue = parseFloat(this.calculator?.display() || "0");
      if (currentDisplayValue === 0 && this.items().length > 0) {
        const lastItem = this.items()[this.items().length - 1];
        this.removeItem(lastItem.id);
        this.toastService.show("Last item removed", "info");
      }
      this.backspaceKeyPressCount = 0;
      clearTimeout(this.backspaceKeyTimer);
    }
  }

  onCalculatorAdd(event: CalculatorAddEvent): void {
    const selectedId = this.selectedItemId();

    if (selectedId !== null) {
      // Update the selected item
      const items = this.items();
      const selectedItem = items.find((item) => item.id === selectedId);

      if (selectedItem) {
        // Calculate the difference for the total
        const oldPrice = selectedItem.price;
        const newPrice = event.value;
        const priceDifference = newPrice - oldPrice;

        // Update the item
        this.items.update((currentItems) =>
          currentItems.map((item) =>
            item.id === selectedId
              ? { ...item, price: newPrice, unitPrice: newPrice, quantity: 1 }
              : item
          )
        );
        this.total.update((t) => t + priceDifference);
        this.selectedItemId.set(null); // Clear selection
      }
    } else {
      // Add new item
      const newItem = {
        price: event.value,
        unitPrice: event.value,
        quantity: 1,
        id: this.itemIdCounter++,
      };
      this.items.update((items) => [...items, newItem]);
      this.total.update((t) => t + event.value);
    }

    this.debouncedSaveCart();
  }

  onCalculatorMultiplyConfirm(event: CalculatorMultiplyConfirmEvent): void {
    const selectedId = this.selectedItemId();

    if (event.mode === "add") {
      // Add multiple items with pendingValue
      const itemPrice = event.pendingValue ?? 0;
      const newItem = {
        price: itemPrice * event.quantity,
        unitPrice: itemPrice,
        quantity: event.quantity,
        id: this.itemIdCounter++,
      };
      this.items.update((items) => [...items, newItem]);
      this.total.update((t) => t + newItem.price);
      this.selectedItemId.set(null); // Clear selection
    } else if (event.mode === "update") {
      if (selectedId !== null) {
        // Update selected item with new quantity
        const items = this.items();
        const selectedItem = items.find((item) => item.id === selectedId);

        if (selectedItem) {
          const newQuantity = event.quantity;
          const newPrice = selectedItem.unitPrice * newQuantity;
          const priceDifference = newPrice - selectedItem.price;

          this.items.update((currentItems) =>
            currentItems.map((item) =>
              item.id === selectedId
                ? { ...item, quantity: newQuantity, price: newPrice }
                : item
            )
          );
          this.total.update((t) => t + priceDifference);
          this.selectedItemId.set(null); // Clear selection
        }
      } else {
        // Multiply last item by entered quantity (fallback for backward compatibility)
        const items = this.items();
        if (items.length === 0) return;
        const lastItem = items[items.length - 1];
        const newQuantity = event.quantity;
        const newPrice = lastItem.unitPrice * newQuantity;
        this.items.update((currentItems) =>
          currentItems.map((item, index) =>
            index === currentItems.length - 1
              ? { ...item, quantity: newQuantity, price: newPrice }
              : item
          )
        );
        const priceDifference = newPrice - lastItem.price;
        this.total.update((t) => t + priceDifference);
      }
    }
    this.debouncedSaveCart();
  }

  clearAll(): void {
    this.calculator?.setDisplay("0");
    this.items.set([]);
    this.total.set(0);
  }

  clearAllItems(): void {
    if (this.items().length === 0) return;

    if (confirm("Are you sure you want to clear all items?")) {
      this.items.set([]);
      this.total.set(0);
      this.calculator?.setDisplay("0");

      // Delete cart from database
      if (this.activeCartId()) {
        this.cartService.deleteCart(this.activeCartId()!).subscribe({
          next: () => {
            this.activeCartId.set(null);
          },
          error: (err) => {
            console.error("Error deleting cart:", err);
          },
        });
      }
    }
  }

  increaseQuantity(id: number): void {
    const item = this.items().find((i) => i.id === id);
    if (!item) return;

    const newQuantity = item.quantity + 1;
    const newPrice = item.unitPrice * newQuantity;

    this.items.update((items) =>
      items.map((i) =>
        i.id === id ? { ...i, quantity: newQuantity, price: newPrice } : i
      )
    );
    this.total.update((t) => t + item.unitPrice);
    this.debouncedSaveCart();
  }

  decreaseQuantity(id: number): void {
    const item = this.items().find((i) => i.id === id);
    if (!item) return;

    if (item.quantity <= 1) {
      // Remove item if quantity would be 0
      this.removeItem(id);
      return;
    }

    const newQuantity = item.quantity - 1;
    const newPrice = item.unitPrice * newQuantity;

    this.items.update((items) =>
      items.map((i) =>
        i.id === id ? { ...i, quantity: newQuantity, price: newPrice } : i
      )
    );
    this.total.update((t) => t - item.unitPrice);
    this.debouncedSaveCart();
  }

  openLooseProductModal(): void {
    this.showLooseProductModal.set(true);
    this.looseProductWeight.set("");
    this.looseProductPricePerKg.set("");
    this.looseProductDescription.set("");
    this.useScaleWeight.set(false);
    // Focus on price input after modal renders
    setTimeout(() => {
      if (this.pricePerKgInput?.nativeElement) {
        this.pricePerKgInput.nativeElement.focus();
        this.pricePerKgInput.nativeElement.select();
      }
    }, 100);
  }

  cancelLooseProduct(): void {
    this.showLooseProductModal.set(false);
    this.looseProductWeight.set("");
    this.looseProductPricePerKg.set("");
    this.looseProductDescription.set("");
    this.useScaleWeight.set(false);
  }

  async connectToScale(): Promise<void> {
    const connected = await this.scaleService.connectScale();
    this.scaleConnected.set(connected);
    if (connected) {
      this.useScaleWeight.set(true);
      this.toastService.show("Scale connected successfully!", "success");
    } else {
      this.toastService.show(
        "Failed to connect to scale. Make sure the scale is connected via USB.",
        "error"
      );
    }
  }

  async disconnectScale(): Promise<void> {
    await this.scaleService.disconnectScale();
    this.scaleConnected.set(false);
    this.useScaleWeight.set(false);
    this.currentScaleReading.set(null);
  }

  toggleUseScaleWeight(): void {
    if (!this.scaleConnected()) {
      this.toastService.show("Please connect to a scale first.", "info");
      return;
    }
    this.useScaleWeight.update((v) => !v);
    if (this.useScaleWeight()) {
      const reading = this.currentScaleReading();
      if (reading && reading.stable) {
        this.looseProductWeight.set(reading.weight.toFixed(3));
      }
    }
  }

  confirmLooseProduct(): void {
    const weight = parseFloat(this.looseProductWeight());
    const pricePerKg = parseFloat(this.looseProductPricePerKg());
    const description =
      this.looseProductDescription().trim() || "Loose Product";

    if (isNaN(weight) || weight <= 0) {
      this.toastService.show("Please enter a valid weight.", "info");
      return;
    }

    if (isNaN(pricePerKg) || pricePerKg <= 0) {
      this.toastService.show("Please enter a valid price per kg.", "info");
      return;
    }

    const calculatedPrice = weight * pricePerKg;
    // Round up to increments of 0.5
    const totalPrice = Math.ceil(calculatedPrice * 2) / 2;

    const newItem = {
      price: totalPrice,
      unitPrice: totalPrice,
      quantity: 1,
      id: this.itemIdCounter++,
      description,
      weight,
      pricePerKg,
    };

    this.items.update((items) => [...items, newItem]);
    this.total.update((t) => t + totalPrice);
    this.cancelLooseProduct();
    this.debouncedSaveCart();
    // Return focus to calculator
    setTimeout(() => this.calculator?.focusCalculator(), 100);
  }

  handleLooseProductEnter(event: Event): void {
    event.preventDefault();
    const weight = parseFloat(this.looseProductWeight());
    const pricePerKg = parseFloat(this.looseProductPricePerKg());

    // If weight is 0 or not set, move focus to weight input
    if (isNaN(weight) || weight <= 0) {
      setTimeout(() => {
        if (this.weightInput?.nativeElement) {
          this.weightInput.nativeElement.focus();
          this.weightInput.nativeElement.select();
        }
      }, 0);
      return;
    }

    // If both have value, add the item and return focus to calculator
    if (!isNaN(pricePerKg) && pricePerKg > 0) {
      this.confirmLooseProduct();
      return;
    }

    // If price is not set, keep focus on price input
    if (this.pricePerKgInput?.nativeElement) {
      this.pricePerKgInput.nativeElement.focus();
      this.pricePerKgInput.nativeElement.select();
    }
  }

  removeItem(id: number): void {
    const itemToRemove = this.items().find((item) => item.id === id);
    if (itemToRemove) {
      this.items.update((items) => items.filter((item) => item.id !== id));
      this.total.update((t) => t - itemToRemove.price);
      // Clear selection if the removed item was selected
      if (this.selectedItemId() === id) {
        this.selectedItemId.set(null);
      }
      this.debouncedSaveCart();
    }
  }

  editItem(id: number): void {
    const itemToEdit = this.items().find((item) => item.id === id);
    if (itemToEdit) {
      // Set the selected item
      this.selectedItemId.set(id);
      // If quantity > 1, show the unit price (individual price)
      // Otherwise show the total price
      const priceToEdit =
        itemToEdit.quantity > 1 ? itemToEdit.unitPrice : itemToEdit.price;
      this.calculator?.setDisplay(priceToEdit.toFixed(2));
      // Don't remove the item, just select it for editing
      // User can manually adjust and re-add or delete if needed
    }
  }

  completeSale(paymentMethod: "cash" | "card" | "internal"): void {
    // Check if register is open
    if (!this.currentRegister()) {
      this.toastService.show(
        "Please open a register before making sales.",
        "info"
      );
      return;
    }

    // If there's a number in the display, add it first
    if (this.calculator?.hasPendingValue()) {
      this.calculator.handleEnter();
    }

    if (this.items().length === 0 || this.isProcessing()) {
      return;
    }

    this.selectedPaymentMethod.set(paymentMethod);
    this.showPaymentModal.set(true);

    if (paymentMethod === "cash") {
      this.cashReceived.set("");
      this.change.set(0);
      // Focus cash input after modal renders
      setTimeout(() => {
        if (this.cashReceivedInput?.nativeElement) {
          this.cashReceivedInput.nativeElement.focus();
          this.cashReceivedInput.nativeElement.select();
        }
      }, 100);
    }
  }

  onCashReceivedChange(): void {
    const received = parseFloat(this.cashReceived());
    const total = this.total();
    if (!isNaN(received) && received >= total) {
      this.change.set(received - total);
    } else {
      this.change.set(0);
    }
  }

  onKeyboardInput(event: NumberKeyboardInputEvent): void {
    this.cashReceived.set(event.value);
    this.onCashReceivedChange();
  }

  cancelPayment(): void {
    this.showPaymentModal.set(false);
    this.selectedPaymentMethod.set(null);
    this.cashReceived.set("");
    this.change.set(0);
  }

  confirmPayment(): void {
    const paymentMethod = this.selectedPaymentMethod();
    if (!paymentMethod) return;

    // Validate cash payment
    if (paymentMethod === "cash") {
      const received = parseFloat(this.cashReceived());
      if (isNaN(received) || received < this.total()) {
        this.toastService.show(
          "Please enter a valid cash amount greater than or equal to the total.",
          "info"
        );
        return;
      }
    }

    this.isProcessing.set(true);

    const saleTotal = this.total();
    const changeAmount = this.change();
    const register = this.currentRegister();

    const sale = {
      items: this.items().map((item, index) => ({
        productName: item.description || `Item ${index + 1}`,
        quantity: item.weight || 1,
        unitPrice: item.pricePerKg || item.price,
        subtotal: item.price,
        total: item.price,
        weight: item.weight,
        pricePerKg: item.pricePerKg,
      })),
      subtotal: saleTotal,
      total: saleTotal,
      paymentMethod,
      paymentDetails:
        paymentMethod === "cash"
          ? {
              cashReceived: parseFloat(this.cashReceived()),
              change: changeAmount,
            }
          : {},
      status: "completed" as const,
      register: register?._id,
      isInternal: paymentMethod === "internal",
    };

    this.saleService.createSale(sale).subscribe({
      next: (createdSale) => {
        this.isProcessing.set(false);
        this.showPaymentModal.set(false);

        let message = `Sale completed successfully! Total: $${saleTotal.toFixed(
          2
        )}`;
        if (paymentMethod === "cash" && changeAmount > 0) {
          message += ` | Cash Received: $${parseFloat(
            this.cashReceived()
          ).toFixed(2)} | Change: $${changeAmount.toFixed(2)}`;
        }

        this.toastService.show(message, "success");

        // Generate and print receipt using the saved template
        const mode = localStorage.getItem("printer.mode") || "plain";
        const isPlainText = mode !== "styled";
        this.receiptGeneratorService
          .printSaleReceipt(createdSale, { plainText: isPlainText })
          .catch((err) => {
            console.error("Error printing receipt:", err);
          });

        // Mark cart as completed after successful sale
        if (this.activeCartId()) {
          this.cartService
            .updateCart(this.activeCartId()!, { status: "completed" })
            .subscribe({
              next: () => {
                this.activeCartId.set(null);
              },
              error: (err: any) => {
                console.error("Error updating cart status:", err);
              },
            });
        }

        this.clearAll();
        this.selectedPaymentMethod.set(null);
        this.cashReceived.set("");
        this.change.set(0);
      },
      error: (err) => {
        console.error("Error creating sale:", err);
        this.isProcessing.set(false);
        this.toastService.show(
          "Error processing sale. Please try again.",
          "error"
        );
      },
    });
  }
}
