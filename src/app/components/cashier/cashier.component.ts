import { Component, signal, effect, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SaleService } from "../../services/sale.service";
import { CartService } from "../../services/cart.service";
import { AuthService } from "../../services/auth.service";
import { ScaleService, ScaleReading } from "../../services/scale.service";
import { ReceiptGeneratorService } from "../../services/receipt-generator.service";
import { PageTitleComponent } from "../page-title/page-title.component";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { environment } from "@environments/environment";

@Component({
  selector: "app-cashier",
  standalone: true,
  imports: [CommonModule, FormsModule, PageTitleComponent, TranslatePipe],
  templateUrl: "./cashier.component.html",
  styleUrls: ["./cashier.component.scss"],
})
export class CashierComponent {
  display = signal<string>("0");
  isMultiplying = signal<boolean>(false); // Track if we're in multiplication mode
  multiplyMode = signal<"add" | "update" | null>(null); // 'add' for new items, 'update' for last item
  pendingMultiplyValue = signal<number | null>(null); // Store value to multiply
  currentValue = signal<number>(0);
  items = signal<
    Array<{
      price: number;
      id: number;
      description?: string;
      weight?: number;
      pricePerKg?: number;
      quantity: number;
      unitPrice: number;
    }>
  >([]);
  total = signal<number>(0);
  isProcessing = signal<boolean>(false);
  activeCartId = signal<string | null>(null);

  showPaymentModal = signal<boolean>(false);
  selectedPaymentMethod = signal<"cash" | "card" | "transfer" | null>(null);
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

  private itemIdCounter = 0;
  private deleteKeyPressCount = 0;
  private deleteKeyTimer: any = null;
  private saveCartTimer: any = null;
  private debounceDelay = 1000; // 1 second debounce for cart saves

  // Helper methods for template
  parseFloat = parseFloat;

  blurButton(event: Event): void {
    const target = event.target as HTMLElement;
    target?.blur();
  }

  constructor(
    private saleService: SaleService,
    private cartService: CartService,
    private authService: AuthService,
    private scaleService: ScaleService,
    private receiptGeneratorService: ReceiptGeneratorService
  ) {
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
    this.loadActiveCart();

    // Handle session cleanup when user leaves or closes window
    this.setupSessionCleanup();
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

  loadActiveCart(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) return;

    this.cartService.getActiveCart(currentUser.id).subscribe({
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
      this.appendNumber(key);
      return;
    }

    // Numpad keys
    if (/^Numpad[0-9]$/.test(event.code)) {
      event.preventDefault();
      const digit = event.code.replace("Numpad", "");
      this.appendNumber(digit);
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
      this.appendNumber(digit);
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
      this.appendDecimal();
      return;
    }

    // Enter - Add item or confirm multiplication
    if (key === "Enter") {
      event.preventDefault();
      if (this.isMultiplying()) {
        this.confirmMultiply();
      } else {
        this.addItem();
      }
      return;
    }

    // Backspace - Remove last digit
    if (key === "Backspace") {
      event.preventDefault();
      this.backspace();
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
      this.clear();
      return;
    }

    // Multiply (x or *) - Set quantity or add multiple items
    if (key === "x" || key === "X" || key === "*") {
      event.preventDefault();
      this.multiplyItem();
      return;
    }

    // Open Loose Product modal when pressing 'g' (quick access)
    if (key === "g" || key === "G") {
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
      this.display.set(lastItem.price.toFixed(2));
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
      this.display.set("0");
      this.deleteKeyPressCount = 0;
      clearTimeout(this.deleteKeyTimer);
    }
  }

  appendNumber(num: string): void {
    const current = this.display();
    if (current === "0") {
      this.display.set(num);
    } else {
      this.display.set(current + num);
    }
  }

  appendDecimal(): void {
    const current = this.display();
    if (!current.includes(".")) {
      this.display.set(current + ".");
    }
  }

  clear(): void {
    this.display.set("0");
  }

  clearAll(): void {
    this.display.set("0");
    this.items.set([]);
    this.total.set(0);
    this.currentValue.set(0);
  }

  clearAllItems(): void {
    if (this.items().length === 0) return;

    if (confirm("Are you sure you want to clear all items?")) {
      this.items.set([]);
      this.total.set(0);
      this.display.set("0");

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

  backspace(): void {
    const current = this.display();
    if (current.length > 1) {
      this.display.set(current.slice(0, -1));
    } else {
      this.display.set("0");
    }
  }

  addItem(): void {
    const value = parseFloat(this.display());
    if (!isNaN(value) && value > 0) {
      const newItem = {
        price: value,
        unitPrice: value,
        quantity: 1,
        id: this.itemIdCounter++,
      };
      this.items.update((items) => [...items, newItem]);
      this.total.update((t) => t + value);
      this.display.set("0");
      this.debouncedSaveCart();
    }
  }

  multiplyItem(): void {
    const displayValue = parseFloat(this.display());
    const items = this.items();

    if (displayValue === 0 || isNaN(displayValue)) {
      // Multiply last item: show quantity input on display
      if (items.length === 0) return;
      this.isMultiplying.set(true);
      this.multiplyMode.set("update");
      this.pendingMultiplyValue.set(null); // We'll use display for quantity
      this.display.set("");
    } else {
      // Add multiple items: show quantity input on display
      this.isMultiplying.set(true);
      this.multiplyMode.set("add");
      this.pendingMultiplyValue.set(displayValue); // Store value to add
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

    if (this.multiplyMode() === "add") {
      // Add multiple items with pendingMultiplyValue
      const itemPrice = this.pendingMultiplyValue() ?? 0;
      const newItem = {
        price: itemPrice * quantity,
        unitPrice: itemPrice,
        quantity: quantity,
        id: this.itemIdCounter++,
      };
      this.items.update((items) => [...items, newItem]);
      this.total.update((t) => t + newItem.price);
      this.display.set("0");
    } else if (this.multiplyMode() === "update") {
      // Multiply last item by entered quantity
      const items = this.items();
      if (items.length === 0) return;
      const lastItem = items[items.length - 1];
      const newQuantity = quantity;
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
      this.display.set("0");
    }
    this.isMultiplying.set(false);
    this.multiplyMode.set(null);
    this.pendingMultiplyValue.set(null);
    this.debouncedSaveCart();
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
      alert("Scale connected successfully!");
    } else {
      alert(
        "Failed to connect to scale. Make sure the scale is connected via USB."
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
      alert("Please connect to a scale first.");
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
      alert("Please enter a valid weight.");
      return;
    }

    if (isNaN(pricePerKg) || pricePerKg <= 0) {
      alert("Please enter a valid price per kg.");
      return;
    }

    const totalPrice = weight * pricePerKg;
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
  }

  removeItem(id: number): void {
    const itemToRemove = this.items().find((item) => item.id === id);
    if (itemToRemove) {
      this.items.update((items) => items.filter((item) => item.id !== id));
      this.total.update((t) => t - itemToRemove.price);
      this.debouncedSaveCart();
    }
  }

  editItem(id: number): void {
    const itemToEdit = this.items().find((item) => item.id === id);
    if (itemToEdit) {
      // Put the price back in the display for editing
      this.display.set(itemToEdit.price.toFixed(2));
      // Remove the item from the list
      this.removeItem(id);
    }
  }

  completeSale(paymentMethod: "cash" | "card" | "transfer"): void {
    // If there's a number in the display, add it first
    const displayValue = parseFloat(this.display());
    if (!isNaN(displayValue) && displayValue > 0) {
      this.addItem();
    }

    if (this.items().length === 0 || this.isProcessing()) {
      return;
    }

    this.selectedPaymentMethod.set(paymentMethod);
    this.showPaymentModal.set(true);

    if (paymentMethod === "cash") {
      this.cashReceived.set("");
      this.change.set(0);
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
        alert(
          "Please enter a valid cash amount greater than or equal to the total."
        );
        return;
      }
    }

    this.isProcessing.set(true);

    const saleTotal = this.total();
    const changeAmount = this.change();

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
    };

    this.saleService.createSale(sale).subscribe({
      next: (createdSale) => {
        this.isProcessing.set(false);
        this.showPaymentModal.set(false);

        let message = `Sale completed successfully!\nTotal: $${saleTotal.toFixed(
          2
        )}`;
        if (paymentMethod === "cash" && changeAmount > 0) {
          message += `\n\nCash Received: $${parseFloat(
            this.cashReceived()
          ).toFixed(2)}`;
          message += `\nChange: $${changeAmount.toFixed(2)}`;
        }

        alert(message);

        // Generate and print receipt using the saved template
        const currentUser = this.authService.getCurrentUser();
        this.receiptGeneratorService
          .generateReceipt(
            createdSale,
            paymentMethod,
            changeAmount,
            currentUser
          )
          .subscribe({
            next: (receiptContent) => {
              this.receiptGeneratorService.printReceipt(receiptContent);
            },
            error: (err) => {
              console.error("Error generating receipt:", err);
            },
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
        alert("Error processing sale. Please try again.");
      },
    });
  }
}
