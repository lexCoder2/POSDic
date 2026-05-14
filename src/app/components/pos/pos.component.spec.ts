import { TestBed, ComponentFixture } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { of, BehaviorSubject, EMPTY, throwError } from "rxjs";
import { ChangeDetectorRef } from "@angular/core";
import { PosComponent } from "./pos.component";
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
import { SettingsService } from "../../services/settings.service";
import { TicketService } from "../../services/ticket.service";
import { TranslationService } from "../../services/translation.service";
import { User, Product, CartItem } from "../../models";

const adminUser: User = {
  id: "u1",
  username: "admin",
  email: "admin@test.com",
  firstName: "Admin",
  lastName: "User",
  role: "admin",
};

const makeProduct = (id: string, price = 10): Product => ({
  _id: id,
  product_id: id,
  name: `Product ${id}`,
  price,
  ean: id,
});

describe("PosComponent", () => {
  let component: PosComponent;
  let fixture: ComponentFixture<PosComponent>;
  let cartServiceSpy: any;
  let productServiceSpy: any;
  let authServiceSpy: any;
  let searchStateServiceSpy: any;
  let registerServiceSpy: any;
  let scaleServiceSpy: any;
  let saleServiceSpy: any;
  let toastServiceSpy: any;
  let receiptGenSpy: any;
  let settingsServiceSpy: any;
  let ticketServiceSpy: any;

  const cartItems$ = new BehaviorSubject<CartItem[]>([]);
  const searchQuery$ = new BehaviorSubject<string>("");
  const currentRegister$ = new BehaviorSubject<any>(null);
  const settings$ = new BehaviorSubject<any>({
    estimatedCostEnabled: false,
    estimatedCostMarginPercent: 30,
    sellMode: "combined",
  });

  beforeEach(async () => {
    cartItems$.next([]);
    searchQuery$.next("");
    currentRegister$.next(null);
    settings$.next({
      estimatedCostEnabled: false,
      estimatedCostMarginPercent: 30,
      sellMode: "combined",
    });

    authServiceSpy = { getCurrentUser: jest.fn().mockReturnValue(adminUser) };
    cartServiceSpy = {
      cartItems$: cartItems$.asObservable(),
      addItem: jest.fn(),
      removeItem: jest.fn(),
      clearCart: jest.fn(),
      updateQuantity: jest.fn(),
      updateDiscount: jest.fn(),
      updateCart: jest.fn().mockReturnValue(of({})),
      getSubtotal: jest.fn().mockReturnValue(0),
      getTotal: jest.fn().mockReturnValue(0),
      getTotalDiscount: jest.fn().mockReturnValue(0),
      getTotalTax: jest.fn().mockReturnValue(0),
      getDiscount: jest.fn().mockReturnValue(0),
    };
    productServiceSpy = {
      getProducts: jest.fn().mockReturnValue(
        of({
          data: [],
          pagination: { total: 0, page: 1, pageSize: 100, totalPages: 1 },
        })
      ),
      searchProducts: jest.fn().mockReturnValue(of([])),
      getProductByBarcode: jest.fn().mockReturnValue(of(makeProduct("p1"))),
      getFavoriteProducts: jest.fn().mockReturnValue(of([])),
    };
    const categoryServiceSpy = {
      getCategories: jest.fn().mockReturnValue(of([])),
    };
    saleServiceSpy = {
      createSale: jest
        .fn()
        .mockReturnValue(of({ saleNumber: "SALE-001", total: 10 })),
      createInternalSale: jest.fn().mockReturnValue(of({ total: 25 })),
    };
    scaleServiceSpy = {
      currentWeight$: EMPTY,
      isConnected: jest.fn().mockReturnValue(false),
      autoConnectScale: jest.fn().mockResolvedValue(false),
    };
    searchStateServiceSpy = {
      searchQuery$: searchQuery$.asObservable(),
      setSearchQuery: jest.fn(),
    };
    registerServiceSpy = {
      currentRegister$: currentRegister$.asObservable(),
      getActiveRegister: jest.fn().mockReturnValue(of(null)),
      getDeviceId: jest.fn().mockReturnValue("device-123"),
      getDeviceName: jest.fn().mockReturnValue("Test Device"),
      getCurrentRegister: jest.fn().mockReturnValue(null),
      getDeviceRegister: jest.fn().mockReturnValue(
        of({
          register: null,
          isDeviceBound: false,
          canManageOthers: true,
          suggestedRegister: null,
        })
      ),
      getAvailableRegisters: jest
        .fn()
        .mockReturnValue(of({ registers: [], canManageOthers: true })),
      openRegister: jest.fn().mockReturnValue(of({})),
      getExpectedCash: jest.fn().mockReturnValue(of({ expectedCash: 0 })),
    };
    receiptGenSpy = {
      printSaleReceipt: jest.fn().mockResolvedValue(undefined),
      printDispatchTicket: jest.fn().mockResolvedValue(undefined),
    };
    settingsServiceSpy = {
      settings$: settings$.asObservable(),
    };
    ticketServiceSpy = {
      createTicket: jest.fn().mockReturnValue(
        of({
          _id: "ticket-1",
          ticketNumber: 42,
          items: [],
          subtotal: 10,
          total: 10,
          status: "pending",
        })
      ),
    };
    toastServiceSpy = { show: jest.fn() };
    const translationServiceSpy = {
      translate: jest.fn().mockReturnValue(""),
      translationsChanged$: EMPTY,
    };

    await TestBed.configureTestingModule({
      imports: [PosComponent, RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
        { provide: ProductService, useValue: productServiceSpy },
        { provide: CategoryService, useValue: categoryServiceSpy },
        { provide: SaleService, useValue: saleServiceSpy },
        { provide: ScaleService, useValue: scaleServiceSpy },
        { provide: SearchStateService, useValue: searchStateServiceSpy },
        { provide: ReceiptGeneratorService, useValue: receiptGenSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: RegisterService, useValue: registerServiceSpy },
        { provide: SettingsService, useValue: settingsServiceSpy },
        { provide: TicketService, useValue: ticketServiceSpy },
        { provide: TranslationService, useValue: translationServiceSpy },
        {
          provide: ChangeDetectorRef,
          useValue: { markForCheck: jest.fn(), detectChanges: jest.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should set currentUser on init", () => {
    expect(component.currentUser).toEqual(adminUser);
  });

  it("should call loadProducts, loadCategories, loadQuickAccessProducts on init", () => {
    expect(productServiceSpy.getProducts).toHaveBeenCalled();
    expect(productServiceSpy.getFavoriteProducts).toHaveBeenCalled();
  });

  it("should subscribe to registerService.currentRegister$ on init", () => {
    const reg = { _id: "r1", registerNumber: "R-01", status: "open" } as any;
    currentRegister$.next(reg);
    expect(component.currentRegister).toEqual(reg);
  });

  it("should subscribe to cartService.cartItems$ and sync salesTabs", () => {
    const prod = makeProduct("x");
    const items: CartItem[] = [
      { product: prod, quantity: 1, discount: 0, subtotal: 10 },
    ];
    cartItems$.next(items);
    expect(component.cartItems).toEqual(items);
    expect(component.salesTabs[component.activeSaleTabIndex].items).toEqual(
      items
    );
  });

  describe("getItemTotal", () => {
    it("should calculate total with discount and tax", () => {
      const prod = { ...makeProduct("p", 100), taxRate: 10 };
      const item: CartItem = {
        product: prod,
        quantity: 2,
        discount: 10,
        subtotal: 200,
      };
      // subtotal = 200, discount = 20, taxable = 180, tax = 18, total = 198
      const result = component.getItemTotal(item);
      expect(result).toBeCloseTo(198);
    });

    it("should return subtotal when no discount or tax", () => {
      const item: CartItem = {
        product: makeProduct("p", 50),
        quantity: 2,
        discount: 0,
        subtotal: 100,
      };
      expect(component.getItemTotal(item)).toBe(100);
    });
  });

  describe("modal toggles", () => {
    it("should show checkout modal when register is open and items exist", () => {
      component.currentRegister = {
        _id: "r1",
        registerNumber: "R-01",
        status: "open",
      } as any;
      component.cartItems = [
        { product: makeProduct("p1"), quantity: 1, discount: 0, subtotal: 10 },
      ];
      component.showCheckout = false;
      component.openCheckout();
      expect(component.showCheckout).toBe(true);
    });

    it("should open quick product modal", () => {
      component.openQuickProductModal("1234567890");
      expect(component.showQuickProductModal).toBe(true);
      expect(component.quickProductBarcode).toBe("1234567890");
    });

    it("should close weight modal", () => {
      component.showWeightModal = true;
      component.closeWeightModal();
      expect(component.showWeightModal).toBe(false);
    });

    it("toggleCameraScanner should toggle isCameraActive", () => {
      component.isCameraActive = false;
      component.toggleCameraScanner();
      expect(component.isCameraActive).toBe(true);
      component.toggleCameraScanner();
      expect(component.isCameraActive).toBe(false);
    });

    it("should open loose product modal with a prefilled description", () => {
      component.openLooseProductModal("Loose Apples");
      expect(component.showLooseProductModal).toBe(true);
      expect(component.pendingLooseProductDescription).toBe("Loose Apples");
    });

    it("should clear the loose product prefill when closing the loose product modal", () => {
      component.pendingLooseProductDescription = "Loose Apples";
      component.showLooseProductModal = true;
      component.closeLooseProductModal();
      expect(component.showLooseProductModal).toBe(false);
      expect(component.pendingLooseProductDescription).toBe("");
    });
  });

  describe("split sell mode dispatch", () => {
    beforeEach(() => {
      settings$.next({
        estimatedCostEnabled: false,
        estimatedCostMarginPercent: 30,
        sellMode: "split",
      });
      cartServiceSpy.getSubtotal.mockReturnValue(10);
      cartServiceSpy.getTotal.mockReturnValue(10);
      component.cartItems = [
        {
          product: makeProduct("p-split", 10),
          quantity: 1,
          discount: 0,
          subtotal: 10,
        },
      ];
      component.currentRegister = null;
    });

    it("dispatches a ticket instead of opening checkout", () => {
      component.openCheckout();

      expect(component.showCheckout).toBe(false);
      expect(ticketServiceSpy.createTicket).toHaveBeenCalled();
    });

    it("allows dispatch without an open register", () => {
      component.openCheckout();

      expect(toastServiceSpy.show).not.toHaveBeenCalledWith(
        expect.stringContaining("register"),
        "error"
      );
      expect(ticketServiceSpy.createTicket).toHaveBeenCalled();
    });

    it("clears the cart and prints the dispatch ticket on success", async () => {
      component.openCheckout();

      await Promise.resolve();

      expect(cartServiceSpy.clearCart).toHaveBeenCalled();
      expect(receiptGenSpy.printDispatchTicket).toHaveBeenCalled();
    });

    it("shows an error and keeps the cart when dispatch fails", () => {
      ticketServiceSpy.createTicket.mockReturnValue(
        throwError(() => ({ error: { message: "Dispatch failed" } }))
      );

      component.openCheckout();

      expect(cartServiceSpy.clearCart).not.toHaveBeenCalled();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("Dispatch failed"),
        "error"
      );
    });
  });

  describe("sales tab management", () => {
    it("should add a new sales tab", () => {
      const initialCount = component.salesTabs.length;
      component.addSaleTab();
      expect(component.salesTabs.length).toBe(initialCount + 1);
    });

    it("closeSaleTab should not close last tab", () => {
      component.salesTabs = [{ items: [] }];
      component.closeSaleTab(0);
      expect(component.salesTabs.length).toBe(1);
    });

    it("closeSaleTab should remove a tab when more than one", () => {
      component.salesTabs = [{ items: [] }, { items: [] }];
      component.activeSaleTabIndex = 0;
      component.closeSaleTab(1);
      expect(component.salesTabs.length).toBe(1);
    });
  });

  describe("onCategorySelect", () => {
    it("should toggle category selection", () => {
      component.selectedCategory = "";
      component.onCategorySelect("cat1");
      expect(component.selectedCategory).toBe("cat1");
      component.onCategorySelect("cat1");
      expect(component.selectedCategory).toBe("");
    });
  });

  describe("subtotal getter", () => {
    it("should delegate to cartService.getSubtotal", () => {
      cartServiceSpy.getSubtotal.mockReturnValue(99.5);
      expect(component.subtotal).toBe(99.5);
    });
  });

  describe("register modal", () => {
    it("should open register modal", () => {
      component.showOpenRegisterModal = false;
      component.openOpenRegisterModal();
      expect(component.showOpenRegisterModal).toBe(true);
    });

    it("onRegisterOpened should close modal", () => {
      component.showOpenRegisterModal = true;
      component.onRegisterOpened();
      expect(component.showOpenRegisterModal).toBe(false);
    });
  });

  describe("responsive quick access surfaces", () => {
    it("shows the mobile quick-access strip and hides desktop tabs in mobile view", () => {
      component.isMobileView = true;
      component.quickAccessProducts = [makeProduct("mobile-1")];

      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector(".bottom-tabs-container")
      ).toBeNull();
      expect(
        fixture.nativeElement.querySelector(".mobile-favorites-bar")
      ).toBeTruthy();
      expect(
        fixture.nativeElement.querySelectorAll(
          ".mobile-favorites-bar .favorite-item"
        ).length
      ).toBe(1);
    });
  });

  describe("ngOnDestroy", () => {
    it("should complete without error", () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  // ──────────────────────────────────────────────
  // filterProducts
  // ──────────────────────────────────────────────

  describe("filterProducts()", () => {
    beforeEach(() => {
      component.products = [
        {
          ...makeProduct("p1", 10),
          name: "Apple Juice",
          category: "Beverages",
          ean: "EAN1",
        },
        {
          ...makeProduct("p2", 5),
          name: "Banana",
          category: "Fruits",
          ean: "EAN2",
        },
        {
          ...makeProduct("p3", 8),
          name: "Cola",
          category: "Beverages",
          ean: "EAN3",
        },
      ] as any[];
    });

    it("returns all products when no filters applied", () => {
      component.selectedCategory = "";
      component.searchQuery = "";
      component.filterProducts();
      expect(component.searchResults.length).toBe(3);
    });

    it("filters by category", () => {
      component.selectedCategory = "Beverages";
      component.searchQuery = "";
      component.filterProducts();
      expect(component.searchResults.length).toBe(2);
    });

    it("filters by search query on name", () => {
      component.selectedCategory = "";
      component.searchQuery = "banana";
      component.filterProducts();
      expect(component.searchResults.length).toBe(1);
      expect(component.searchResults[0].name).toBe("Banana");
    });

    it("filters by both category and query", () => {
      component.selectedCategory = "Beverages";
      component.searchQuery = "cola";
      component.filterProducts();
      expect(component.searchResults.length).toBe(1);
    });
  });

  // ──────────────────────────────────────────────
  // onSearchChange
  // ──────────────────────────────────────────────

  describe("onSearchChange()", () => {
    it("delegates to searchStateService.setSearchQuery", () => {
      component.onSearchChange("coffee");
      expect(searchStateServiceSpy.setSearchQuery).toHaveBeenCalledWith(
        "coffee"
      );
    });
  });

  // ──────────────────────────────────────────────
  // searchByBarcode
  // ──────────────────────────────────────────────

  describe("searchByBarcode()", () => {
    it("calls addToCart on successful product lookup", () => {
      const product = makeProduct("p-barcode");
      productServiceSpy.getProductByBarcode.mockReturnValue(of(product));
      const addItemSpy = jest.spyOn(cartServiceSpy, "addItem");
      component.searchByBarcode("123456");
      expect(productServiceSpy.getProductByBarcode).toHaveBeenCalledWith(
        "123456"
      );
      expect(addItemSpy).toHaveBeenCalledWith(product, 1, undefined);
    });

    it("opens quick product modal when product not found", () => {
      productServiceSpy.getProductByBarcode.mockReturnValue(
        throwError(() => new Error("404"))
      );
      component.showQuickProductModal = false;
      component.searchByBarcode("NOTFOUND");
      expect(component.showQuickProductModal).toBe(true);
      expect(component.quickProductBarcode).toBe("NOTFOUND");
    });
  });

  describe("onQuickProductSellLoose()", () => {
    it("should hand off the missing barcode flow to the loose product modal", () => {
      component.showQuickProductModal = true;
      component.quickProductBarcode = "NOTFOUND";

      component.onQuickProductSellLoose("Loose Apples");

      expect(component.showQuickProductModal).toBe(false);
      expect(component.quickProductBarcode).toBe("");
      expect(component.showLooseProductModal).toBe(true);
      expect(component.pendingLooseProductDescription).toBe("Loose Apples");
    });
  });

  // ──────────────────────────────────────────────
  // addToCart
  // ──────────────────────────────────────────────

  describe("addToCart()", () => {
    it("adds product to cart", () => {
      const product = makeProduct("p-add");
      const addItemSpy = jest.spyOn(cartServiceSpy, "addItem");
      component.addToCart(product);
      expect(addItemSpy).toHaveBeenCalledWith(product, 1, undefined);
    });

    it("opens weight modal when product requiresScale and no weight", () => {
      const product = { ...makeProduct("p-scale"), requiresScale: true } as any;
      component.addToCart(product);
      expect(component.showWeightModal).toBe(true);
      expect(component.weightModalProduct).toBe(product);
    });
  });

  // ──────────────────────────────────────────────
  // onWeightConfirm / closeWeightModal
  // ──────────────────────────────────────────────

  describe("onWeightConfirm()", () => {
    it("adds item with weight and closes modal", () => {
      const product = makeProduct("p-weight");
      const addItemSpy = jest.spyOn(cartServiceSpy, "addItem");
      component.showWeightModal = true;
      component.onWeightConfirm({ product, weight: 1.5 });
      expect(addItemSpy).toHaveBeenCalledWith(product, 1, 1.5);
      expect(component.showWeightModal).toBe(false);
    });

    it("does nothing if weight is 0", () => {
      const product = makeProduct("p-zero");
      const addItemSpy = jest.spyOn(cartServiceSpy, "addItem");
      component.onWeightConfirm({ product, weight: 0 });
      expect(addItemSpy).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // updateQuantity / updateDiscount / removeFromCart
  // ──────────────────────────────────────────────

  describe("updateQuantity()", () => {
    it("delegates to cartService", () => {
      const spy = jest.spyOn(cartServiceSpy, "updateQuantity");
      component.updateQuantity("prod-1", 3);
      expect(spy).toHaveBeenCalledWith("prod-1", 3);
    });
  });

  describe("updateDiscount()", () => {
    it("delegates to cartService", () => {
      const spy = jest.spyOn(cartServiceSpy, "updateDiscount");
      component.updateDiscount("prod-1", 10);
      expect(spy).toHaveBeenCalledWith("prod-1", 10);
    });
  });

  describe("removeFromCart()", () => {
    it("delegates to cartService.removeItem", () => {
      const spy = jest.spyOn(cartServiceSpy, "removeItem");
      component.removeFromCart("prod-1");
      expect(spy).toHaveBeenCalledWith("prod-1");
    });
  });

  // ──────────────────────────────────────────────
  // switchSaleTab
  // ──────────────────────────────────────────────

  describe("switchSaleTab()", () => {
    it("does nothing when switching to current tab", () => {
      component.activeSaleTabIndex = 0;
      component.salesTabs = [{ items: [] }, { items: [] }];
      const spy = jest.spyOn(cartServiceSpy, "clearCart");
      component.switchSaleTab(0);
      expect(spy).not.toHaveBeenCalled();
    });

    it("switches to a different tab and loads its items", () => {
      const prod = makeProduct("p1");
      component.salesTabs = [
        { items: [{ product: prod, quantity: 1, discount: 0, subtotal: 10 }] },
        { items: [] },
      ];
      component.activeSaleTabIndex = 0;
      component.cartItems = component.salesTabs[0].items;
      component.switchSaleTab(1);
      expect(component.activeSaleTabIndex).toBe(1);
      expect(cartServiceSpy.clearCart).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // onCategorySelect - when searchQuery exists
  // ──────────────────────────────────────────────

  describe("onCategorySelect() with searchQuery", () => {
    it("calls setSearchQuery when searchQuery is non-empty", () => {
      component.searchQuery = "coffee";
      component.selectedCategory = "";
      component.onCategorySelect("cat1");
      expect(searchStateServiceSpy.setSearchQuery).toHaveBeenCalledWith(
        "coffee"
      );
    });
  });

  // ──────────────────────────────────────────────
  // onCheckoutComplete — success, error, and print scenarios
  // ──────────────────────────────────────────────

  describe("onCheckoutComplete()", () => {
    const checkoutResult = {
      paymentMethod: "cash" as const,
      cashAmount: 10,
      cardAmount: 0,
      transferAmount: 0,
      paymentDetails: { cash: 10, change: 0 },
    };

    beforeEach(() => {
      component.cartItems = [
        {
          product: makeProduct("p-checkout", 10),
          quantity: 1,
          discount: 0,
          subtotal: 10,
        },
      ];
      component.currentRegister = {
        _id: "r1",
        registerNumber: "R-01",
        status: "open",
      } as any;
    });

    it("calls SaleService.createSale and shows success toast on completion", () => {
      saleServiceSpy.createSale.mockReturnValue(
        of({ saleNumber: "SALE-999", total: 10 })
      );

      component.onCheckoutComplete(checkoutResult);

      expect(saleServiceSpy.createSale).toHaveBeenCalled();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("SALE-999"),
        "success"
      );
    });

    it("clears cart after successful sale", () => {
      saleServiceSpy.createSale.mockReturnValue(
        of({ saleNumber: "SALE-001", total: 10 })
      );
      const clearSpy = jest.spyOn(cartServiceSpy, "clearCart");

      component.onCheckoutComplete(checkoutResult);

      expect(clearSpy).toHaveBeenCalled();
    });

    it("does NOT clear cart when SaleService returns an error (ticket not generated)", () => {
      saleServiceSpy.createSale.mockReturnValue(
        throwError(() => ({
          error: { message: "Payment gateway unreachable" },
        }))
      );
      const clearSpy = jest.spyOn(cartServiceSpy, "clearCart");

      component.onCheckoutComplete(checkoutResult);

      expect(clearSpy).not.toHaveBeenCalled();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("Payment gateway unreachable"),
        "error"
      );
    });

    it("prints receipt when printReceiptsEnabled is true", async () => {
      saleServiceSpy.createSale.mockReturnValue(
        of({ saleNumber: "SALE-001", total: 10 })
      );
      component.printReceiptsEnabled = true;

      component.onCheckoutComplete(checkoutResult);

      // Allow microtask queue to flush (receipt is printed via .catch promise)
      await Promise.resolve();
      expect(receiptGenSpy.printSaleReceipt).toHaveBeenCalled();
    });

    it("does NOT print receipt when printReceiptsEnabled is false", async () => {
      saleServiceSpy.createSale.mockReturnValue(
        of({ saleNumber: "SALE-001", total: 10 })
      );
      component.printReceiptsEnabled = false;

      component.onCheckoutComplete(checkoutResult);

      await Promise.resolve();
      expect(receiptGenSpy.printSaleReceipt).not.toHaveBeenCalled();
    });

    it("sale still completes successfully when receipt printing fails", async () => {
      saleServiceSpy.createSale.mockReturnValue(
        of({ saleNumber: "SALE-001", total: 10 })
      );
      receiptGenSpy.printSaleReceipt.mockRejectedValue(
        new Error("Printer offline")
      );
      component.printReceiptsEnabled = true;
      const clearSpy = jest.spyOn(cartServiceSpy, "clearCart");
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      component.onCheckoutComplete(checkoutResult);

      // Cart clears immediately (before print promise resolves)
      expect(clearSpy).toHaveBeenCalled();

      // Wait for the rejected promise to be handled without throwing
      await new Promise((r) => setTimeout(r, 10));
      consoleSpy.mockRestore();
    });
  });

  // ──────────────────────────────────────────────
  // openCheckout — blocked when empty or no register
  // ──────────────────────────────────────────────

  describe("openCheckout() — validation", () => {
    it("shows toast and does NOT open checkout when cart is empty", () => {
      component.cartItems = [];
      component.currentRegister = { _id: "r1", status: "open" } as any;
      component.showCheckout = false;

      component.openCheckout();

      expect(component.showCheckout).toBe(false);
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("shows toast and does NOT open checkout when no register is open", () => {
      component.cartItems = [
        { product: makeProduct("p1"), quantity: 1, discount: 0, subtotal: 10 },
      ];
      component.currentRegister = null;
      component.showCheckout = false;

      component.openCheckout();

      expect(component.showCheckout).toBe(false);
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });
  });

  // ──────────────────────────────────────────────
  // Internal sale flow
  // ──────────────────────────────────────────────

  describe("openInternalSale() — role check", () => {
    it("shows error toast and does NOT open modal when cashier tries internal sale", () => {
      authServiceSpy.getCurrentUser.mockReturnValue({
        ...adminUser,
        role: "cashier",
      });
      // Recreate component with cashier user
      component.currentUser = { ...adminUser, role: "cashier" } as any;
      component.cartItems = [
        { product: makeProduct("p1"), quantity: 1, discount: 0, subtotal: 10 },
      ];
      component.showInternalSaleConfirm = false;

      component.openInternalSale();

      expect(component.showInternalSaleConfirm).toBe(false);
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });
  });

  describe("onInternalSaleConfirm()", () => {
    it("calls SaleService.createInternalSale and clears cart on success", () => {
      saleServiceSpy.createInternalSale.mockReturnValue(of({ total: 25.0 }));
      const clearSpy = jest.spyOn(cartServiceSpy, "clearCart");
      component.cartItems = [
        {
          product: makeProduct("p1", 25),
          quantity: 1,
          discount: 0,
          subtotal: 25,
        },
      ];

      component.onInternalSaleConfirm({ notes: "Office use" });

      expect(saleServiceSpy.createInternalSale).toHaveBeenCalled();
      expect(clearSpy).toHaveBeenCalled();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("25.00"),
        "success"
      );
    });

    it("shows error toast and does NOT clear cart when internal sale fails", () => {
      saleServiceSpy.createInternalSale.mockReturnValue(
        throwError(() => ({
          error: { message: "Internal sale limit exceeded" },
        }))
      );
      const clearSpy = jest.spyOn(cartServiceSpy, "clearCart");
      component.cartItems = [
        {
          product: makeProduct("p1", 25),
          quantity: 1,
          discount: 0,
          subtotal: 25,
        },
      ];

      component.onInternalSaleConfirm({ notes: "" });

      expect(clearSpy).not.toHaveBeenCalled();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("Internal sale limit exceeded"),
        "error"
      );
    });
  });

  // ──────────────────────────────────────────────
  // onRefundComplete
  // ──────────────────────────────────────────────

  describe("onRefundComplete()", () => {
    it("shows a success toast with the refund amount", () => {
      component.onRefundComplete({
        refundAmount: 42.5,
        refundType: "full",
      } as any);

      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("42.50"),
        "success"
      );
    });
  });

  // ──────────────────────────────────────────────
  // onPrintToggleChange
  // ──────────────────────────────────────────────

  describe("onPrintToggleChange()", () => {
    it("calls RegisterService.updatePrintSetting when register is open", () => {
      registerServiceSpy.updatePrintSetting = jest.fn().mockReturnValue(of({}));
      component.currentRegister = { _id: "r1", status: "open" } as any;
      component.printReceiptsEnabled = false;

      component.onPrintToggleChange();

      expect(registerServiceSpy.updatePrintSetting).toHaveBeenCalledWith(
        "r1",
        false
      );
    });

    it("does nothing when no register is open", () => {
      registerServiceSpy.updatePrintSetting = jest.fn().mockReturnValue(of({}));
      component.currentRegister = null;

      component.onPrintToggleChange();

      expect(registerServiceSpy.updatePrintSetting).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // Out-of-stock warning — addToCart still works
  // ──────────────────────────────────────────────

  describe("addToCart() — out-of-stock product", () => {
    it("adds a product with stock=0 to the cart (no hard block)", () => {
      const outOfStockProduct = { ...makeProduct("p-oos"), stock: 0 } as any;
      const addItemSpy = jest.spyOn(cartServiceSpy, "addItem");

      component.addToCart(outOfStockProduct);

      expect(addItemSpy).toHaveBeenCalledWith(outOfStockProduct, 1, undefined);
    });

    it("adds a product with negative stock to the cart", () => {
      const lowStockProduct = { ...makeProduct("p-neg"), stock: -2 } as any;
      const addItemSpy = jest.spyOn(cartServiceSpy, "addItem");

      component.addToCart(lowStockProduct);

      expect(addItemSpy).toHaveBeenCalledWith(lowStockProduct, 1, undefined);
    });
  });
});
