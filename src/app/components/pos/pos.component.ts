import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
  ChangeDetectorRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { CartService } from "../../services/cart.service";
import { ProductService } from "../../services/product.service";
import { CategoryService } from "../../services/category.service";
import { SaleService } from "../../services/sale.service";
import { ScaleService } from "../../services/scale.service";
import { SearchStateService } from "../../services/search-state.service";
import { ReceiptGeneratorService } from "../../services/receipt-generator.service";
import { ToastService } from "../../services/toast.service";
import { RegisterService } from "../../services/register.service";
import { Product, Category, CartItem, User, Register } from "../../models";
import { environment } from "@environments/environment";
import { CartComponent } from "../cart/cart.component";
import { SearchResultsComponent } from "../search-results/search-results.component";
import { FavoritesComponent } from "../favorites/favorites.component";
import { QuickAccessComponent } from "../quick-access/quick-access.component";
import {
  CalculatorComponent,
  CalculatorAddEvent,
} from "../calculator/calculator.component";
import { CurrencyPipe } from "../../pipes/currency.pipe";

// Modal Components
import {
  CheckoutModalComponent,
  CheckoutResult,
} from "./checkout-modal/checkout-modal.component";
import {
  WeightModalComponent,
  WeightConfirmEvent,
} from "./weight-modal/weight-modal.component";
import {
  QuickProductModalComponent,
  QuickProductData,
} from "./quick-product-modal/quick-product-modal.component";
import {
  InternalSaleModalComponent,
  InternalSaleResult,
} from "./internal-sale-modal/internal-sale-modal.component";
import { CameraScannerComponent } from "./camera-scanner/camera-scanner.component";
import {
  LooseProductModalComponent,
  LooseProductData,
} from "./loose-product-modal/loose-product-modal.component";
import {
  ReturnsModalComponent,
  RefundResult,
} from "./returns-modal/returns-modal.component";

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
    CalculatorComponent,
    TranslatePipe,
    CurrencyPipe,
    // Modal Components
    CheckoutModalComponent,
    WeightModalComponent,
    QuickProductModalComponent,
    InternalSaleModalComponent,
    CameraScannerComponent,
    LooseProductModalComponent,
    ReturnsModalComponent,
  ],
  templateUrl: "./pos.component.html",
  styleUrls: ["./pos.component.scss"],
})
export class PosComponent implements OnInit, OnDestroy {
  @ViewChild("barcodeInput") barcodeInput!: ElementRef;
  @ViewChild("searchInput") searchInput!: ElementRef;

  currentUser: User | null = null;
  currentRegister: Register | null = null;
  products: Product[] = [];
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
  isCameraActive = false;

  // Scale
  scaleConnected = false;
  currentWeight: number = 0;
  currentWeightUnit: string = "kg";
  currentWeightStable: boolean = false;

  // Weight Modal
  showWeightModal = false;
  weightModalProduct: Product | null = null;

  // Checkout Modal
  showCheckout = false;

  // Internal Sale Modal
  showInternalSaleConfirm = false;

  // Quick Product Creation Modal
  showQuickProductModal = false;
  quickProductBarcode = "";

  // Calculator Modal for Generic Products
  showCalculatorModal = false;

  // Loose Product Modal
  showLooseProductModal = false;

  // Returns Modal
  showReturnsModal = false;

  // Withdraw Modal
  showWithdrawModal = false;
  withdrawAmount: number | null = null;
  withdrawReason = "";

  // Register Modals
  showOpenRegisterModal = false;
  showCloseRegisterModal = false;
  registerNumber = "";
  openingCash: number | null = null;
  closingCash: number | null = null;
  closeRegisterNotes = "";
  expectedCash = 0;

  // UI State
  showMenu = false;
  isMobileCartOpen = false;
  isMobileView = false;
  bottomTab: "favorites" | "quick-access" = "favorites";

  // Print receipts toggle
  printReceiptsEnabled = true;

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
    private router: Router,
    private toastService: ToastService,
    private registerService: RegisterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    // determine initial mobile view state
    try {
      this.isMobileView = window.innerWidth <= 768;
    } catch (e) {
      this.isMobileView = false;
    }

    this.loadCategories();
    this.loadProducts();
    this.loadQuickAccessProducts();

    // Subscribe to global search state from header
    this.searchStateService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery = query;
        if (query && query.trim().length > 0) {
          this.isSearching = true;
          this.cdr.markForCheck();
          // Call API with fuzzy search - search ALL products (no category filter, higher limit)
          this.productService.searchProducts(query, undefined, 500).subscribe({
            next: (products) => {
              this.searchResults = products;
              this.isSearching = false;
              this.cdr.markForCheck();
            },
            error: (err) => {
              console.error("Error searching products:", err);
              this.isSearching = false;
              this.cdr.markForCheck();
              // Fallback to local filtering
              this.filterProducts();
            },
          });
        } else {
          // No search query, clear search results
          this.searchResults = [];
          this.isSearching = false;
          this.filterProducts();
          this.cdr.markForCheck();
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
        if (reading) {
          this.currentWeight = reading.weight;
          this.currentWeightUnit = reading.unit;
          this.currentWeightStable = reading.stable;
        }
      });

    // Subscribe to register state
    this.registerService.currentRegister$
      .pipe(takeUntil(this.destroy$))
      .subscribe((register) => {
        this.currentRegister = register;
        // Sync print receipts toggle with register setting
        if (register) {
          this.printReceiptsEnabled = register.printReceiptsEnabled !== false;
        }
        this.cdr.markForCheck();
      });

    // Load active register
    this.registerService.getActiveRegister().subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener("window:resize", [])
  onWindowResize(): void {
    try {
      this.isMobileView = window.innerWidth <= 768;
    } catch (e) {
      // ignore
    }
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

  loadQuickAccessProducts(): void {
    this.productService.getFavoriteProducts(10).subscribe({
      next: (products) => {
        this.quickAccessProducts = products;
      },
      error: (err) => {
        console.error("Error loading quick access products:", err);
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

  searchByBarcode(barcode: string, fromCamera = false): void {
    this.productService.getProductByBarcode(barcode).subscribe({
      next: (product) => {
        // addToCart will handle opening weight modal if needed
        this.addToCart(product, undefined, fromCamera);

        // Visual feedback for successful scan
        console.log(`✓ Added to cart: ${product.name}`);
      },
      error: (err) => {
        console.error("Product not found for barcode:", barcode);

        // Open quick product creation modal
        this.openQuickProductModal(barcode);

        // Play an error beep to indicate the code was not recognized
        try {
          this.playErrorBeep();
        } catch (e) {
          // ignore audio errors
        }
      },
    });
  }

  /**
   * Handle barcode detected by camera scanner component
   */
  onCameraBarcodeDetected(barcode: string): void {
    this.searchByBarcode(barcode, true);
  }

  /**
   * Toggle camera scanner visibility
   */
  toggleCameraScanner(): void {
    this.isCameraActive = !this.isCameraActive;
  }

  /** Play a short low-frequency error beep using WebAudio API. */
  playErrorBeep(): void {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 360;
      g.gain.value = 0.12;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      const now = ctx.currentTime;
      o.frequency.setValueAtTime(360, now);
      o.frequency.exponentialRampToValueAtTime(220, now + 0.06);
      setTimeout(() => {
        try {
          o.stop();
          ctx.close();
        } catch (e) {
          // ignore
        }
      }, 80);
    } catch (e) {
      // ignore audio errors
    }
  }

  async connectScale(): Promise<void> {
    const connected = await this.scaleService.connectScale();
    this.scaleConnected = connected;

    if (!connected) {
      this.toastService.show(
        "Failed to connect to scale. Make sure it is connected and try again.",
        "error"
      );
    }
  }

  addToCart(product: Product, weight?: number, skipFocus = false): void {
    // If product requires scale and no weight is provided, open weight modal
    if (product.requiresScale && !weight) {
      this.openWeightModal(product);
      return;
    }

    this.cartService.addItem(product, 1, weight);

    // Focus search input after adding product unless suppressed (camera scanner)
    if (!skipFocus) {
      setTimeout(() => this.focusSearchInput(), 50);
    }
  }

  openWeightModal(product: Product): void {
    this.weightModalProduct = product;
    this.showWeightModal = true;
  }

  /**
   * Handle weight confirmation from weight modal component
   */
  onWeightConfirm(event: WeightConfirmEvent): void {
    if (event.product && event.weight > 0) {
      this.cartService.addItem(event.product, 1, event.weight);
      this.closeWeightModal();
      setTimeout(() => this.focusSearchInput(), 50);
    }
  }

  closeWeightModal(): void {
    this.showWeightModal = false;
    this.weightModalProduct = null;
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
      this.toastService.show("Cart is empty", "error");
      return;
    }

    // Check if register is open
    if (!this.currentRegister) {
      this.toastService.show(
        "Please open the register before making sales",
        "error"
      );
      return;
    }

    this.showCheckout = true;
  }

  /**
   * Handle quick-pay from cart (cash or card).
   * Opens the checkout modal.
   */
  handleQuickPay(method: string): void {
    if (this.cartItems.length === 0) {
      this.toastService.show("Cart is empty", "error");
      return;
    }

    // Check if register is open
    if (!this.currentRegister) {
      this.toastService.show(
        "Please open the register before making sales",
        "error"
      );
      return;
    }

    // Open checkout modal for cashier confirmation
    this.showCheckout = true;
  }

  closeCheckout(): void {
    this.showCheckout = false;
  }

  /**
   * Handle checkout completion from checkout modal component
   */
  onCheckoutComplete(result: CheckoutResult): void {
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
      paymentMethod: result.paymentMethod,
      paymentDetails: result.paymentDetails,
      status: "completed" as const,
    };

    this.saleService.createSale(sale).subscribe({
      next: (completedSale) => {
        this.toastService.show(
          "Sale completed successfully! Sale #" + completedSale.saleNumber,
          "success"
        );
        // Generate and print receipt using the saved/default template
        if (this.printReceiptsEnabled) {
          const mode = localStorage.getItem("printer.mode") || "plain";
          const isPlainText = mode !== "styled";
          this.receiptGeneratorService
            .printSaleReceipt(completedSale, { plainText: isPlainText })
            .catch((err) => {
              console.error("Error printing receipt:", err);
            });
        }

        this.cartService.clearCart();
        this.closeCheckout();
      },
      error: (err) => {
        this.toastService.show(
          "Error completing sale: " + (err.error?.message || "Unknown error"),
          "error"
        );
      },
    });
  }

  get canMakeInternalSale(): boolean {
    return (
      this.currentUser?.role === "admin" || this.currentUser?.role === "manager"
    );
  }

  openInternalSale(): void {
    if (this.cartItems.length === 0) {
      this.toastService.show("Cart is empty", "error");
      return;
    }

    if (!this.canMakeInternalSale) {
      this.toastService.show(
        "Only admins and managers can create internal sales",
        "error"
      );
      return;
    }

    // Check manager limit
    if (
      this.currentUser?.role === "manager" &&
      this.currentUser.internalSalesLimit
    ) {
      if (this.total > this.currentUser.internalSalesLimit) {
        this.toastService.show(
          `Internal sale amount ($${this.total.toFixed(
            2
          )}) exceeds your limit of $${this.currentUser.internalSalesLimit.toFixed(
            2
          )}`,
          "error"
        );
        return;
      }
    }

    this.showInternalSaleConfirm = true;
  }

  /**
   * Handle internal sale confirmation from modal component
   */
  onInternalSaleConfirm(result: InternalSaleResult): void {
    const internalSale = {
      items: this.cartItems.map((item) => ({
        product: item.product._id!,
        quantity: item.quantity,
        weight: item.weight,
      })),
      notes: result.notes || "Internal consumption",
    };

    this.saleService.createInternalSale(internalSale).subscribe({
      next: (completedSale) => {
        this.toastService.show(
          `Internal sale completed. Amount: $${completedSale.total.toFixed(2)}`,
          "success"
        );
        this.cartService.clearCart();
        this.closeInternalSale();
      },
      error: (err) => {
        this.toastService.show(
          "Error completing internal sale: " +
            (err.error?.message || "Unknown error"),
          "error"
        );
      },
    });
  }

  closeInternalSale(): void {
    this.showInternalSaleConfirm = false;
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

  openQuickProductModal(barcode: string): void {
    this.quickProductBarcode = barcode;
    this.showQuickProductModal = true;
  }

  closeQuickProductModal(): void {
    this.showQuickProductModal = false;
    this.quickProductBarcode = "";
  }

  /**
   * Handle quick product creation from modal component
   */
  onQuickProductCreate(data: QuickProductData): void {
    if (!data.price || data.price <= 0) {
      this.toastService.show("Please enter a valid price", "error");
      return;
    }

    const newProduct = {
      product_id: `QUICK-${data.barcode}-${Date.now()}`,
      sku: data.barcode,
      ean: data.barcode,
      name: data.name,
      price: data.price,
      stock: 1000,
      active: true,
      requiresScale: data.requiresScale,
      incompleteInfo: true,
      category: "Quick Entry",
      description: "Created during sale - requires completion",
    };

    this.productService.createProduct(newProduct).subscribe({
      next: (createdProduct) => {
        this.toastService.show(
          `Product created: ${createdProduct.name}`,
          "success"
        );

        // Add product to cart immediately
        this.addToCart(createdProduct);

        this.closeQuickProductModal();

        // Refresh products list
        this.loadProducts();
      },
      error: (err) => {
        console.error("Error creating quick product:", err);
        this.toastService.show(
          "Error creating product: " + (err.error?.message || "Unknown error"),
          "error"
        );
      },
    });
  }

  openCalculatorModal(): void {
    this.showCalculatorModal = true;
  }

  closeCalculatorModal(): void {
    this.showCalculatorModal = false;
  }

  onCalculatorAddGeneric(event: CalculatorAddEvent): void {
    // Create a generic product for the cart
    const genericProduct: Product = {
      _id: `temp-${Date.now()}`,
      product_id: `GENERIC-${Date.now()}`,
      name: `Generic Item - ${event.value.toFixed(2)}`,
      price: event.value,
      stock: 1,
      active: true,
      category: "Generic",
    };

    this.cartService.addItem(genericProduct, 1);
    this.toastService.show(
      `Added generic item: ${event.value.toFixed(2)}`,
      "success",
      1000
    );
  }

  // Loose Product Modal handlers
  openLooseProductModal(): void {
    this.showCalculatorModal = false; // Close calculator when opening loose product
    this.showLooseProductModal = true;
  }

  closeLooseProductModal(): void {
    this.showLooseProductModal = false;
  }

  onLooseProductConfirm(data: LooseProductData): void {
    // Create a loose product for the cart
    const looseProduct: Product = {
      _id: `loose-${Date.now()}`,
      product_id: `LOOSE-${Date.now()}`,
      name: data.description,
      price: data.totalPrice,
      stock: 1,
      active: true,
      category: "Loose",
      requiresScale: true,
    };

    this.cartService.addItem(looseProduct, 1);
    this.toastService.show(
      `Added: ${data.description} (${data.weight}kg × $${data.pricePerKg}/kg)`,
      "success",
      2000
    );
    this.closeLooseProductModal();
  }

  // Register Actions
  toggleRegister(): void {
    if (this.currentRegister) {
      this.openCloseRegisterModal();
    } else {
      this.openOpenRegisterModal();
    }
  }

  openOpenRegisterModal(): void {
    this.registerNumber = "";
    this.openingCash = null;
    this.showOpenRegisterModal = true;
  }

  closeOpenRegisterModal(): void {
    this.showOpenRegisterModal = false;
  }

  confirmOpenRegister(): void {
    if (!this.registerNumber) return;

    this.registerService
      .openRegister(this.openingCash || 0, this.registerNumber)
      .subscribe({
        next: (register) => {
          this.toastService.show(
            `Register ${register.registerNumber} opened successfully`,
            "success"
          );
          this.closeOpenRegisterModal();
        },
        error: (err) => {
          console.error("Error opening register:", err);
          this.toastService.show(
            err.error?.message || "Failed to open register",
            "error"
          );
        },
      });
  }

  openCloseRegisterModal(): void {
    this.closingCash = null;
    this.closeRegisterNotes = "";
    this.expectedCash = 0;

    // Load expected cash
    this.registerService.getExpectedCash().subscribe({
      next: (data) => {
        this.expectedCash = data.expectedCash;
      },
      error: (err) => {
        console.error("Error loading expected cash:", err);
      },
    });

    this.showCloseRegisterModal = true;
  }

  closeCloseRegisterModal(): void {
    this.showCloseRegisterModal = false;
  }

  confirmCloseRegister(): void {
    if (!this.currentRegister || this.closingCash === null) return;

    this.registerService
      .closeRegister(
        this.currentRegister._id!,
        this.closingCash,
        this.closeRegisterNotes
      )
      .subscribe({
        next: () => {
          this.toastService.show("Register closed successfully", "success");
          this.closeCloseRegisterModal();
        },
        error: (err) => {
          console.error("Error closing register:", err);
          this.toastService.show(
            err.error?.message || "Failed to close register",
            "error"
          );
        },
      });
  }

  // Withdraw Modal
  openWithdrawModal(): void {
    if (!this.currentRegister) {
      this.toastService.show("No register open", "error");
      return;
    }
    this.withdrawAmount = null;
    this.withdrawReason = "";
    this.showWithdrawModal = true;
  }

  closeWithdrawModal(): void {
    this.showWithdrawModal = false;
  }

  confirmWithdraw(): void {
    if (
      !this.currentRegister ||
      !this.withdrawAmount ||
      this.withdrawAmount <= 0
    )
      return;

    this.registerService
      .recordWithdrawal(
        this.currentRegister._id!,
        this.withdrawAmount,
        this.withdrawReason
      )
      .subscribe({
        next: () => {
          this.toastService.show(
            `Withdrawal of $${this.withdrawAmount?.toFixed(2)} recorded`,
            "success"
          );
          this.closeWithdrawModal();
        },
        error: (err) => {
          console.error("Error recording withdrawal:", err);
          this.toastService.show(
            err.error?.message || "Failed to record withdrawal",
            "error"
          );
        },
      });
  }

  // Open Returns Modal
  openReturnsModal(): void {
    this.showReturnsModal = true;
  }

  closeReturnsModal(): void {
    this.showReturnsModal = false;
  }

  onRefundComplete(result: RefundResult): void {
    this.toastService.show(
      `Refund of ${result.refundAmount.toFixed(2)} processed successfully`,
      "success"
    );
    // Optionally reload cart or other data if needed
  }

  onPrintToggleChange(): void {
    if (this.currentRegister?._id) {
      this.registerService
        .updatePrintSetting(this.currentRegister._id, this.printReceiptsEnabled)
        .subscribe({
          error: (err) => {
            console.error("Error updating print setting:", err);
            // Revert the toggle on error
            this.printReceiptsEnabled = !this.printReceiptsEnabled;
          },
        });
    }
  }
}
