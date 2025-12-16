import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";
import { CartService } from "../../services/cart.service";
import { CartItem, Product } from "../../models";
import { environment } from "@environments/environment";
import { CalculatorComponent } from "../calculator/calculator.component";

@Component({
  selector: "app-cart",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    CurrencyPipe,
    CalculatorComponent,
  ],
  templateUrl: "./cart.component.html",
  styleUrls: ["./cart.component.scss"],
})
export class CartComponent {
  cartService = inject(CartService);

  @Input() cartItems: CartItem[] = [];
  @Input() salesTabs: { items: CartItem[] }[] = [];
  @Input() activeSaleTabIndex = 0;
  @Input() isMobileCartOpen = false;
  @Input() registerOpen = false;
  @Input() canMakeInternalSale = false;
  @Input() cartId: string | null = null;

  showCloseConfirmation = signal<boolean>(false);
  tabToClose = signal<number | null>(null);
  showPriceEditor = signal<boolean>(false);
  editingItem = signal<CartItem | null>(null);
  discountAmount = signal<number>(0);

  @Output() switchTab = new EventEmitter<number>();
  @Output() addTab = new EventEmitter<void>();
  @Output() closeTab = new EventEmitter<number>();
  @Output() removeItem = new EventEmitter<string>();
  @Output() clearCart = new EventEmitter<void>();
  @Output() placeOrder = new EventEmitter<void>();
  @Output() placeOrderWithMethod = new EventEmitter<string>();
  @Output() internalSale = new EventEmitter<void>();
  @Output() closeMobileCart = new EventEmitter<void>();
  @Output() priceChanged = new EventEmitter<{
    itemId: string;
    newPrice: number;
  }>();

  getItemsBySupplier(): { supplier: string; items: CartItem[] }[] {
    const groups: Record<string, CartItem[]> = {};

    this.cartItems.forEach((item) => {
      const supplier = (item.product as any).supplier || "Unknown Supplier";
      if (!groups[supplier]) {
        groups[supplier] = [];
      }
      groups[supplier].push(item);
    });

    return Object.keys(groups).map((supplier) => ({
      supplier,
      items: groups[supplier],
    }));
  }
  getProductImageUrl(product: Product): string {
    return `${environment.imageUrl}/${product.local_image}`;
  }
  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = "assets/placeholder.png";
  }

  getTotalItems(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  getItemSubtotal(item: CartItem): number {
    return item.product.price * item.quantity;
  }

  calculateTotal(): number {
    return this.cartItems.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  }

  onSwitchTab(index: number): void {
    this.switchTab.emit(index);
  }

  onAddTab(): void {
    this.addTab.emit();
  }

  onCloseTab(index: number, event: Event): void {
    event.stopPropagation();

    console.log("Close tab clicked:", index);
    console.log("Tab data:", this.salesTabs[index]);
    console.log("Items in tab:", this.salesTabs[index]?.items?.length);

    // Check if the tab has items
    if (
      this.salesTabs[index]?.items &&
      this.salesTabs[index]?.items.length > 0
    ) {
      console.log("Showing confirmation modal");
      this.tabToClose.set(index);
      this.showCloseConfirmation.set(true);
    } else {
      console.log("Closing tab directly (no items)");
      this.closeTab.emit(index);
    }
  }

  confirmCloseTab(): void {
    const tabIndex = this.tabToClose();
    if (tabIndex !== null) {
      this.closeTab.emit(tabIndex);
      this.showCloseConfirmation.set(false);
      this.tabToClose.set(null);
    }
  }

  cancelCloseTab(): void {
    this.showCloseConfirmation.set(false);
    this.tabToClose.set(null);
  }

  onRemoveItem(productId: string): void {
    this.removeItem.emit(productId);
  }

  increaseQuantity(item: CartItem): void {
    if (!item?.product?._id) return;
    this.cartService.updateQuantity(item.product._id!, item.quantity + 1);
  }

  decreaseQuantity(item: CartItem): void {
    if (!item?.product?._id) return;
    const newQty = item.quantity - 1;
    if (newQty <= 0) {
      this.onRemoveItem(item.product._id!);
    } else {
      this.cartService.updateQuantity(item.product._id!, newQty);
    }
  }

  onClearCart(): void {
    this.clearCart.emit();
  }

  onPlaceOrder(): void {
    this.placeOrder.emit();
  }

  onPlaceOrderWithMethod(method: string): void {
    this.placeOrderWithMethod.emit(method);
  }

  onCloseMobileCart(): void {
    this.closeMobileCart.emit();
  }

  openPriceEditor(item: CartItem): void {
    this.editingItem.set(item);
    this.showPriceEditor.set(true);
  }

  onPriceChanged(event: { value: number }): void {
    const item = this.editingItem();
    if (item && item.product._id) {
      const oldPrice = item.product.price;
      item.product.price = event.value;

      // Emit event to parent component to handle database update
      this.priceChanged.emit({
        itemId: item.product._id,
        newPrice: event.value,
      });

      this.closePriceEditor();
    }
  }

  closePriceEditor(): void {
    this.showPriceEditor.set(false);
    this.editingItem.set(null);
  }

  applyDiscount(): void {
    // Emit discount event or handle discount logic
    const currentTotal = this.calculateTotal();
    if (this.discountAmount() > 0 && this.discountAmount() <= currentTotal) {
      // Discount applied
      console.log("Discount applied:", this.discountAmount());
    }
  }

  calculateSubtotal(): number {
    return this.calculateTotal() - this.discountAmount();
  }

  addToQuickAccess(item: CartItem, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (!item.product._id) return;

    this.cartService.addProductToQuickAccess(item.product._id).subscribe({
      next: () => {
        // Success notification will be handled by the service or parent
      },
      error: (err) => {
        console.error("Error adding to quick access:", err);
      },
    });
  }
}
