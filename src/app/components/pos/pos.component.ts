import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { Router } from "@angular/router";
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { CartService } from "../../services/cart.service";
import { ProductService } from "../../services/product.service";
import { CategoryService } from "../../services/category.service";
import { SaleService } from "../../services/sale.service";
import { ScaleService } from "../../services/scale.service";
import { SearchStateService } from "../../services/search-state.service";
import { ReceiptGeneratorService } from "../../services/receipt-generator.service";
import { Product, Category, CartItem, User } from "../../models";
import { environment } from "@environments/environment";
import { CartComponent } from "../cart/cart.component";
import { SearchResultsComponent } from "../search-results/search-results.component";
import { FavoritesComponent } from "../favorites/favorites.component";
import { QuickAccessComponent } from "../quick-access/quick-access.component";

declare const Html5Qrcode: any;

@Component({
  selector: "app-pos",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CartComponent,
    SearchResultsComponent,
    FavoritesComponent,
    QuickAccessComponent,
    TranslatePipe,
  ],
  templateUrl: "./pos.component.html",
  styleUrls: ["./pos.component.scss"],
})
export class PosComponent implements OnInit, OnDestroy {
  @ViewChild("barcodeInput") barcodeInput!: ElementRef;
  @ViewChild("searchInput") searchInput!: ElementRef;

  currentUser: User | null = null;
  products: Product[] = [];
  favoriteProducts: Product[] = [];
  categories: Category[] = [];
  searchResults: Product[] = [];
  quickAccessProducts: Product[] = [];
  cartItems: CartItem[] = [];
  selectedCategory: string = "";
  searchQuery: string = "";
  barcodeValue: string = "";
  isSearching: boolean = false;

  // Multiple sales tabs
  salesTabs: { items: CartItem[] }[] = [{ items: [] }];
  activeSaleTabIndex: number = 0;

  // Camera scanner
  cameraScanner: any = null;
  isCameraActive = false;

  // Scale
  scaleConnected = false;
  currentWeight: number = 0;

  // Checkout
  showCheckout = false;
  paymentMethod: "cash" | "card" | "transfer" | "mixed" = "cash";
  cashAmount: number = 0;
  cardAmount: number = 0;
  transferAmount: number = 0;

  // UI State
  showMenu = false;
  isMobileCartOpen = false;

  private destroy$ = new Subject<void>();
  // timestamp of last Enter key press for double-Enter detection
  private _lastEnterTime = 0;

  constructor(
    private authService: AuthService,
    public cartService: CartService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private saleService: SaleService,
    private scaleService: ScaleService,
    private receiptGeneratorService: ReceiptGeneratorService,
    private searchStateService: SearchStateService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.loadCategories();
    this.loadProducts();
    this.loadFavoriteProducts();

    // Subscribe to global search state from header
    this.searchStateService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery = query;
        if (query && query.trim().length > 0) {
          this.isSearching = true;
          // Call API with fuzzy search - search ALL products (no category filter, higher limit)
          this.productService.searchProducts(query, undefined, 500).subscribe({
            next: (products) => {
              this.searchResults = products;
              this.isSearching = false;
            },
            error: (err) => {
              console.error("Error searching products:", err);
              this.isSearching = false;
              // Fallback to local filtering
              this.filterProducts();
            },
          });
        } else {
          // No search query, clear search results
          this.searchResults = [];
          this.isSearching = false;
          this.filterProducts();
        }
      });

    this.cartService.cartItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.cartItems = items;
        // Sync current tab with cart items
        this.salesTabs[this.activeSaleTabIndex].items = [...items];
      });

    this.scaleService.currentWeight$
      .pipe(takeUntil(this.destroy$))
      .subscribe((reading) => {
        if (reading && reading.stable) {
          this.currentWeight = reading.weight;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopCameraScanner();
  }

  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories.filter((c) => c.active);
      },
      error: (err) => console.error("Error loading categories:", err),
    });
  }

  loadProducts(): void {
    this.productService.getProducts({ active: true }).subscribe({
      next: (response) => {
        this.products = response.data;
        this.filterProducts();
      },
      error: (err) => console.error("Error loading products:", err),
    });
  }

  loadFavoriteProducts(): void {
    this.productService.getFavoriteProducts(20).subscribe({
      next: (products) => {
        this.favoriteProducts = products;
        // Quick access is the top 10 favorites
        this.quickAccessProducts = products.slice(0, 10);
      },
      error: (err) => {
        console.error("Error loading favorite products:", err);
      },
    });
  }

  filterProducts(): void {
    let filtered: Product[] = this.products;

    if (this.selectedCategory) {
      filtered = filtered.filter((p) => {
        return (
          p.category &&
          p.category.toLowerCase().includes(this.selectedCategory.toLowerCase())
        );
      });
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.product_id && p.product_id.toLowerCase().includes(query)) ||
          (p.sku && p.sku.toLowerCase().includes(query)) ||
          (p.ean && p.ean.toLowerCase().includes(query)) ||
          (p.ean13 && p.ean13.toLowerCase().includes(query)) ||
          (p.upc && p.upc.toLowerCase().includes(query)) ||
          (p.brand && p.brand.toLowerCase().includes(query))
      );
    }

    this.searchResults = filtered;
  }

  // Sales tab management
  addSaleTab(): void {
    this.salesTabs.push({ items: [] });
    this.switchSaleTab(this.salesTabs.length - 1);
  }

  switchSaleTab(index: number): void {
    if (index === this.activeSaleTabIndex) return;

    // Save current tab state
    this.salesTabs[this.activeSaleTabIndex].items = [...this.cartItems];

    // Switch to new tab
    this.activeSaleTabIndex = index;

    // Load new tab's items into cart
    const newTabItems = this.salesTabs[index].items;
    this.cartService.clearCart();
    newTabItems.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        this.cartService.addItem(item.product);
      }
    });

    // Focus search input after switching tab
    setTimeout(() => this.focusSearchInput(), 50);
  }

  closeSaleTab(index: number): void {
    if (this.salesTabs.length === 1) return;

    this.salesTabs.splice(index, 1);

    if (this.activeSaleTabIndex >= this.salesTabs.length) {
      this.activeSaleTabIndex = this.salesTabs.length - 1;
    } else if (this.activeSaleTabIndex > index) {
      this.activeSaleTabIndex--;
    }

    // Load active tab's items
    const activeTabItems = this.salesTabs[this.activeSaleTabIndex].items;
    this.cartService.clearCart();
    activeTabItems.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        this.cartService.addItem(item.product);
      }
    });
  }

  onCategorySelect(categoryId: string): void {
    this.selectedCategory =
      this.selectedCategory === categoryId ? "" : categoryId;
    // Trigger search with new category filter
    if (this.searchQuery) {
      this.searchStateService.setSearchQuery(this.searchQuery);
    } else {
      this.filterProducts();
    }
  }

  onSearchChange(query: string): void {
    // Update global search state
    this.searchStateService.setSearchQuery(query);
  }

  onBarcodeKeyPress(event: KeyboardEvent): void {
    if (event.key === "Enter" && this.barcodeValue) {
      this.searchByBarcode(this.barcodeValue);
      this.barcodeValue = "";
    }
  }

  searchByBarcode(barcode: string): void {
    this.productService.getProductByBarcode(barcode).subscribe({
      next: (product) => {
        if (product.requiresScale && this.scaleConnected) {
          this.addToCart(product, this.currentWeight);
        } else {
          this.addToCart(product);
        }

        // Visual feedback for successful scan
        console.log(`✓ Added to cart: ${product.name}`);

        // If camera scanner is active, provide haptic feedback on mobile
        if (this.isCameraActive && navigator.vibrate) {
          navigator.vibrate(100);
        }
      },
      error: (err) => {
        console.error("Product not found for barcode:", barcode);
        alert("Product not found for barcode: " + barcode);

        // Error vibration on mobile
        if (this.isCameraActive && navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      },
    });
  }

  async toggleCameraScanner(): Promise<void> {
    if (this.isCameraActive) {
      this.stopCameraScanner();
    } else {
      await this.startCameraScanner();
    }
  }

  async startCameraScanner(): Promise<void> {
    try {
      // Check if Html5Qrcode library is loaded
      if (typeof Html5Qrcode === "undefined") {
        alert(
          "Camera scanner library not loaded. Please add html5-qrcode to your project."
        );
        return;
      }

      this.cameraScanner = new Html5Qrcode("camera-scanner");

      await this.cameraScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText: string) => {
          this.searchByBarcode(decodedText);
        },
        (error: any) => {
          // Ignore decode errors
        }
      );

      this.isCameraActive = true;
    } catch (err) {
      console.error("Error starting camera scanner:", err);
      alert("Failed to start camera scanner");
    }
  }

  stopCameraScanner(): void {
    if (this.cameraScanner) {
      this.cameraScanner.stop().then(() => {
        this.cameraScanner = null;
        this.isCameraActive = false;
      });
    }
  }

  async connectScale(): Promise<void> {
    const connected = await this.scaleService.connectScale();
    this.scaleConnected = connected;

    if (!connected) {
      alert(
        "Failed to connect to scale. Make sure it is connected and try again."
      );
    }
  }

  addToCart(product: Product, weight?: number): void {
    if (product.requiresScale && !weight && this.scaleConnected) {
      weight = this.currentWeight;
    }

    this.cartService.addItem(product, 1, weight);

    // Focus search input after adding product
    setTimeout(() => this.focusSearchInput(), 50);
  }

  updateQuantity(productId: string, quantity: number): void {
    this.cartService.updateQuantity(productId, quantity);
  }

  updateDiscount(productId: string, discount: number): void {
    this.cartService.updateDiscount(productId, discount);
  }

  removeFromCart(productId: string): void {
    this.cartService.removeItem(productId);
  }

  getItemTotal(item: CartItem): number {
    const subtotal = item.product.price * item.quantity;
    const discount = (subtotal * item.discount) / 100;
    const taxable = subtotal - discount;
    const tax = (taxable * (item.product.taxRate || 0)) / 100;
    return taxable + tax;
  }

  get subtotal(): number {
    return this.cartService.getSubtotal();
  }

  get totalDiscount(): number {
    return this.cartService.getTotalDiscount();
  }

  get totalTax(): number {
    return this.cartService.getTotalTax();
  }

  get total(): number {
    return this.cartService.getTotal();
  }

  openCheckout(): void {
    if (this.cartItems.length === 0) {
      alert("Cart is empty");
      return;
    }
    this.showCheckout = true;
    this.cashAmount = this.total;
  }

  /**
   * Handle quick-pay from cart (cash or card).
   * Both open the checkout modal.
   * - cash: open checkout with `cash` selected and prefill `cashAmount` so cashier can adjust/confirm
   * - card: open checkout with `card` selected and prefill `cardAmount` for quick confirmation
   */
  handleQuickPay(method: string): void {
    if (this.cartItems.length === 0) {
      alert("Cart is empty");
      return;
    }

    if (method === "cash") {
      this.paymentMethod = "cash";
      this.cashAmount = this.total;
    } else if (method === "card") {
      this.paymentMethod = "card";
      this.cardAmount = this.total;
    } else if (method === "transfer") {
      this.paymentMethod = "transfer";
      this.transferAmount = this.total;
    }

    // Open checkout modal for cashier confirmation
    this.showCheckout = true;
  }

  closeCheckout(): void {
    this.showCheckout = false;
    this.paymentMethod = "cash";
    this.cashAmount = 0;
    this.cardAmount = 0;
    this.transferAmount = 0;
  }

  completeSale(): void {
    if (!this.validatePayment()) {
      alert("Invalid payment amount");
      return;
    }

    const sale = {
      items: this.cartItems.map((item) => ({
        product: item.product._id!,
        productName: item.product.name,
        productCode:
          item.product.product_id || item.product.sku || item.product.ean || "",
        quantity: item.quantity,
        unitPrice: item.product.price,
        discount: item.discount,
        discountAmount:
          (item.product.price * item.quantity * item.discount) / 100,
        taxRate: item.product.taxRate || 0,
        taxAmount:
          ((item.product.price * item.quantity -
            (item.product.price * item.quantity * item.discount) / 100) *
            (item.product.taxRate || 0)) /
          100,
        subtotal: item.product.price * item.quantity,
        total: this.getItemTotal(item),
      })),
      subtotal: this.subtotal,
      discountTotal: this.totalDiscount,
      taxTotal: this.totalTax,
      total: this.total,
      paymentMethod: this.paymentMethod,
      paymentDetails: this.getPaymentDetails(),
      status: "completed" as const,
    };

    this.saleService.createSale(sale).subscribe({
      next: (completedSale) => {
        alert("Sale completed successfully! Sale #" + completedSale.saleNumber);
        // Generate and print receipt using the saved/default template
        try {
          const currentUser = this.authService.getCurrentUser();
          const change = this.changeAmount;
          this.receiptGeneratorService
            .generateReceipt(
              completedSale,
              this.paymentMethod,
              change,
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
        } catch (e) {
          console.error("Receipt generation failed:", e);
        }

        this.cartService.clearCart();
        this.closeCheckout();
      },
      error: (err) => {
        alert(
          "Error completing sale: " + (err.error?.message || "Unknown error")
        );
      },
    });
  }

  validatePayment(): boolean {
    const total = this.total;

    switch (this.paymentMethod) {
      case "cash":
        return this.cashAmount >= total;
      case "card":
        return this.cardAmount >= total;
      case "transfer":
        return this.transferAmount >= total;
      case "mixed":
        return this.cashAmount + this.cardAmount + this.transferAmount >= total;
      default:
        return false;
    }
  }

  getPaymentDetails(): any {
    const details: any = {};

    if (this.paymentMethod === "cash") {
      details.cash = this.cashAmount;
      details.change = this.cashAmount - this.total;
    } else if (this.paymentMethod === "card") {
      details.card = this.cardAmount;
    } else if (this.paymentMethod === "transfer") {
      details.transfer = this.transferAmount;
    } else if (this.paymentMethod === "mixed") {
      details.cash = this.cashAmount;
      details.card = this.cardAmount;
      details.transfer = this.transferAmount;
      const totalPaid = this.cashAmount + this.cardAmount + this.transferAmount;
      details.change = totalPaid - this.total;
    }

    return details;
  }

  get changeAmount(): number {
    if (this.paymentMethod === "cash") {
      return Math.max(0, this.cashAmount - this.total);
    } else if (this.paymentMethod === "mixed") {
      const totalPaid = this.cashAmount + this.cardAmount + this.transferAmount;
      return Math.max(0, totalPaid - this.total);
    }
    return 0;
  }

  logout(): void {
    this.authService.logout();
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  openDiscountModal(item: CartItem): void {
    const discount = prompt(
      "Enter discount percentage:",
      item.discount.toString()
    );
    if (discount !== null) {
      const discountValue = parseFloat(discount);
      if (!isNaN(discountValue)) {
        this.updateDiscount(item.product._id!, discountValue);
      }
    }
  }

  calculateItemSubtotal(item: CartItem): number {
    const subtotal = item.product.price * item.quantity;
    const discountAmount = (subtotal * item.discount) / 100;
    return subtotal - discountAmount;
  }

  calculateSubtotal(): number {
    return this.cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
  }

  calculateTotalDiscount(): number {
    return this.cartItems.reduce((sum, item) => {
      const subtotal = item.product.price * item.quantity;
      return sum + (subtotal * item.discount) / 100;
    }, 0);
  }

  calculateTotal(): number {
    return this.calculateSubtotal() - this.calculateTotalDiscount();
  }

  getProductQuantity(productId: string): number {
    const item = this.cartItems.find((i) => i.product._id === productId);
    return item ? item.quantity : 0;
  }

  incrementQuantity(product: Product): void {
    const currentQty = this.getProductQuantity(product._id!);
    if (currentQty > 0) {
      this.updateQuantity(product._id!, currentQty + 1);
    } else {
      this.addToCart(product);
    }
  }

  decrementQuantity(product: Product): void {
    const currentQty = this.getProductQuantity(product._id!);
    if (currentQty > 1) {
      this.updateQuantity(product._id!, currentQty - 1);
    } else if (currentQty === 1) {
      this.removeFromCart(product._id!);
    }
  }

  updateProductQuantity(productId: string, value: string): void {
    const qty = parseFloat(value);
    if (!isNaN(qty) && qty >= 0) {
      if (qty === 0) {
        this.removeFromCart(productId);
      } else {
        this.updateQuantity(productId, qty);
      }
    }
  }

  getItemsBySupplier(): Array<{ supplier: string; items: CartItem[] }> {
    const grouped = this.cartItems.reduce((acc, item) => {
      const supplier =
        item.product.brand || item.product.store || "GOOD FOODS INC.";
      if (!acc[supplier]) {
        acc[supplier] = [];
      }
      acc[supplier].push(item);
      return acc;
    }, {} as Record<string, CartItem[]>);

    return Object.entries(grouped).map(([supplier, items]) => ({
      supplier: supplier.toUpperCase(),
      items,
    }));
  }

  getTotalItems(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  getProductImageUrl(product: Product): string {
    if (!product.local_image) {
      return "";
    }
    // If it's already a full URL, return it
    if (
      product.local_image.startsWith("http://") ||
      product.local_image.startsWith("https://")
    ) {
      return product.local_image;
    }
    // Otherwise, construct the URL from the server
    return `${environment.imageUrl}/${product.local_image}`;
  }

  focusSearchInput(): void {
    // Prefer barcode input if present (barcode input is also used as the search bar)
    try {
      if (this.barcodeInput && this.barcodeInput.nativeElement) {
        this.barcodeInput.nativeElement.focus();
        return;
      }
    } catch (e) {
      // ignore and fallback to searchInput
    }

    if (this.searchInput && this.searchInput.nativeElement) {
      try {
        this.searchInput.nativeElement.focus();
      } catch (e) {
        // ignore
      }
    }
  }

  @HostListener("document:keydown", ["$event"])
  onDocumentKeydown(event: KeyboardEvent): void {
    // Only react to Enter presses
    if (event.key !== "Enter") return;

    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase() || "";

    // If the focused element is an input/textarea/contenteditable, ignore
    // except when it's the barcode input (id="barcodeInput") — barcode Enter should work normally
    if (target) {
      const isEditable =
        tag === "input" || tag === "textarea" || target.isContentEditable;
      if (isEditable && target.id !== "barcodeInput") {
        return;
      }
    }

    const now = Date.now();
    const DELAY = 400; // ms window to detect double Enter

    if (now - this._lastEnterTime <= DELAY) {
      // Double Enter detected — focus the search input
      try {
        this.focusSearchInput();
      } catch (e) {
        console.error("Failed to focus search input on double Enter", e);
      }
      this._lastEnterTime = 0;
    } else {
      this._lastEnterTime = now;
    }
  }

  toggleMobileCart(): void {
    this.isMobileCartOpen = !this.isMobileCartOpen;
  }
}
