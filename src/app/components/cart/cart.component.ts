import { Component, Input, Output, EventEmitter, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";
import { CartService } from "../../services/cart.service";
import { CartItem, Product } from "../../models";
import { environment } from "@environments/environment";

@Component({
  selector: "app-cart",
  standalone: true,
  imports: [CommonModule, TranslatePipe, CurrencyPipe],
  templateUrl: "./cart.component.html",
  styleUrls: ["./cart.component.scss"],
})
export class CartComponent {
  @Input() cartItems: CartItem[] = [];
  @Input() salesTabs: { items: CartItem[] }[] = [];
  @Input() activeSaleTabIndex: number = 0;
  @Input() isMobileCartOpen: boolean = false;
  @Input() registerOpen: boolean = false;
  @Input() canMakeInternalSale: boolean = false;

  showCloseConfirmation = signal<boolean>(false);
  tabToClose = signal<number | null>(null);

  @Output() switchTab = new EventEmitter<number>();
  @Output() addTab = new EventEmitter<void>();
  @Output() closeTab = new EventEmitter<number>();
  @Output() removeItem = new EventEmitter<string>();
  @Output() clearCart = new EventEmitter<void>();
  @Output() placeOrder = new EventEmitter<void>();
  @Output() placeOrderWithMethod = new EventEmitter<string>();
  @Output() internalSale = new EventEmitter<void>();
  @Output() closeMobileCart = new EventEmitter<void>();

  constructor(public cartService: CartService) {}

  getItemsBySupplier(): { supplier: string; items: CartItem[] }[] {
    const groups: { [key: string]: CartItem[] } = {};

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
    if (product.local_image) {
      return `${environment.imageUrl}/${product.local_image}`;
    }
    return "";
  }

  getTotalItems(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
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
}
