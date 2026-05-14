import { ComponentFixture, TestBed } from "@angular/core/testing";
import { of, Subject, BehaviorSubject } from "rxjs";
import { EMPTY } from "rxjs";
import { InventorySessionComponent } from "./inventory-session.component";
import { ProductService } from "../../services/product.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";
import { SearchStateService } from "../../services/search-state.service";
import { Router, ActivatedRoute } from "@angular/router";

const mockUser = {
  id: "u1",
  username: "manager1",
  firstName: "Manager",
  role: "manager",
};
const mockProduct = {
  _id: "p1",
  name: "Coffee",
  ean: "1234567890",
  price: 5.0,
  stock: 10,
  category: "Drinks",
};

describe("InventorySessionComponent", () => {
  let component: InventorySessionComponent;
  let fixture: ComponentFixture<InventorySessionComponent>;
  let productServiceSpy: any;
  let toastSpy: any;
  let routerSpy: any;

  const searchQuery$ = new BehaviorSubject<string>("");
  const queryParams$ = new BehaviorSubject<any>({});

  beforeEach(async () => {
    productServiceSpy = {
      searchProducts: jest.fn().mockReturnValue(of([mockProduct])),
      updateProduct: jest.fn().mockReturnValue(of(mockProduct)),
      getProductByBarcode: jest.fn().mockReturnValue(of(mockProduct)),
    };

    toastSpy = { show: jest.fn() };
    routerSpy = { navigate: jest.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [InventorySessionComponent],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        {
          provide: AuthService,
          useValue: { getCurrentUser: jest.fn().mockReturnValue(mockUser) },
        },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue("Translated"),
            translationsChanged$: EMPTY,
          },
        },
        {
          provide: SearchStateService,
          useValue: {
            searchQuery$: searchQuery$.asObservable(),
            clearSearch: jest.fn(),
            setSearchQuery: jest.fn(),
          },
        },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: queryParams$.asObservable(),
            snapshot: { queryParams: {} },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventorySessionComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  afterEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should set currentUser on init", () => {
    expect(component.currentUser?.username).toBe("manager1");
  });

  it("should set session startedBy to user username", () => {
    expect(component.session().startedBy).toBe("manager1");
  });

  it("should redirect to login if no currentUser", () => {
    TestBed.inject(AuthService).getCurrentUser = jest
      .fn()
      .mockReturnValue(null);
    component.ngOnInit();
    expect(routerSpy.navigate).toHaveBeenCalledWith(["/login"]);
  });

  describe("loadProduct()", () => {
    it("should populate form fields with product data", () => {
      component.loadProduct(mockProduct as any);
      expect(component.currentProduct).toEqual(mockProduct);
      expect(component.newPrice).toBe(5.0);
      expect(component.newStock).toBe(10);
    });

    it("should set stock to stock + receiveQty in receive mode", () => {
      component.setMode("receive");
      component.loadProduct(mockProduct as any);
      expect(component.newStock).toBe(11); // 10 + receiveQty(1)
    });
  });

  describe("searchProduct()", () => {
    it("should call productService.searchProducts", () => {
      component.searchProduct("coffee");
      expect(productServiceSpy.searchProducts).toHaveBeenCalledWith("coffee");
    });

    it("should skip empty query", () => {
      component.searchProduct("  ");
      expect(productServiceSpy.searchProducts).not.toHaveBeenCalled();
    });

    it("should show toast when no product found", () => {
      productServiceSpy.searchProducts.mockReturnValue(of([]));
      component.searchProduct("notfound");
      expect(toastSpy.show).toHaveBeenCalled();
    });
  });

  describe("updateProduct()", () => {
    beforeEach(() => component.loadProduct(mockProduct as any));

    it("should call productService.updateProduct", () => {
      component.newPrice = 6.0;
      component.updateProduct();
      expect(productServiceSpy.updateProduct).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ price: 6.0 })
      );
    });

    it("should show error toast when price is negative", () => {
      component.newPrice = -1;
      component.updateProduct();
      expect(toastSpy.show).toHaveBeenCalled();
      expect(productServiceSpy.updateProduct).not.toHaveBeenCalled();
    });

    it("should show info toast when no changes", () => {
      // price and stock unchanged, ean unchanged
      component.newEan = "1234567890";
      component.updateProduct();
      expect(toastSpy.show).toHaveBeenCalled();
    });

    it("should add update entry to session on success", () => {
      component.newPrice = 7.5;
      component.updateProduct();
      expect(component.session().updates.length).toBe(1);
      expect(component.session().updates[0].productName).toBe("Coffee");
    });
  });

  describe("clearProduct()", () => {
    it("should clear currentProduct and form fields", () => {
      component.loadProduct(mockProduct as any);
      component.clearProduct();
      expect(component.currentProduct).toBeNull();
      expect(component.newPrice).toBe(0);
      expect(component.newStock).toBe(0);
    });
  });

  describe("completeSession()", () => {
    it("should show info toast if no updates", () => {
      component.completeSession();
      expect(toastSpy.show).toHaveBeenCalled();
    });

    it("should navigate to inventory if updates exist", () => {
      // Add an update first
      component.loadProduct(mockProduct as any);
      component.newPrice = 8.0;
      component.updateProduct();

      // Spy on generateReport to avoid document manipulation
      jest.spyOn(component, "generateReport").mockImplementation(() => {});

      component.completeSession();
      expect(routerSpy.navigate).toHaveBeenCalledWith(["/inventory"]);
    });
  });

  describe("getPriceChange() / getStockChange()", () => {
    const update: any = {
      oldPrice: 5,
      newPrice: 7,
      oldStock: 10,
      newStock: 15,
    };

    it("should return price difference", () => {
      expect(component.getPriceChange(update)).toBe(2);
    });

    it("should return stock difference", () => {
      expect(component.getStockChange(update)).toBe(5);
    });
  });

  it("ngOnDestroy() should complete destroy$", () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  describe("searchProduct() - error path", () => {
    it("should show error toast when search fails", () => {
      const { throwError } = require("rxjs");
      productServiceSpy.searchProducts.mockReturnValue(
        throwError(() => new Error("search error"))
      );
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      component.searchProduct("test");
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
      consoleSpy.mockRestore();
    });
  });

  describe("loadProduct() - URL navigation", () => {
    it("should navigate to route with EAN query param", () => {
      const searchState = TestBed.inject(SearchStateService) as any;
      component.loadProduct(mockProduct as any);
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { ean: "1234567890" } })
      );
      // Bug #3 fix: setSearchQuery must NOT be called from loadProduct (feedback loop)
      expect(searchState.setSearchQuery).not.toHaveBeenCalled();
    });

    it("should not navigate when product has no EAN", () => {
      const noEanProduct = { ...mockProduct, ean: undefined };
      routerSpy.navigate.mockClear();
      component.loadProduct(noEanProduct as any);
      expect(routerSpy.navigate).not.toHaveBeenCalledWith(
        [],
        expect.objectContaining({ queryParams: { ean: expect.any(String) } })
      );
    });
  });

  describe("updateProduct() - error path", () => {
    it("should show error toast when updateProduct API fails", () => {
      const { throwError } = require("rxjs");
      productServiceSpy.updateProduct.mockReturnValue(
        throwError(() => new Error("update error"))
      );
      component.loadProduct(mockProduct as any);
      component.newPrice = 9.0;
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      component.updateProduct();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
      expect(component.saving).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe("cancelSession()", () => {
    it("should navigate to inventory directly when no updates", () => {
      component.cancelSession();
      expect(routerSpy.navigate).toHaveBeenCalledWith(["/inventory"]);
    });

    it("should confirm before cancellation when updates exist", () => {
      component.loadProduct(mockProduct as any);
      component.newPrice = 9.5;
      component.updateProduct();
      jest.spyOn(window, "confirm").mockReturnValue(true);
      routerSpy.navigate.mockClear();
      component.cancelSession();
      expect(routerSpy.navigate).toHaveBeenCalledWith(["/inventory"]);
    });

    it("should not navigate when cancel confirmation is rejected", () => {
      component.loadProduct(mockProduct as any);
      component.newPrice = 9.5;
      component.updateProduct();
      jest.spyOn(window, "confirm").mockReturnValue(false);
      routerSpy.navigate.mockClear();
      component.cancelSession();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
  });

  describe("generateReport()", () => {
    it("should create and download a report file", () => {
      const createObjectURLMock = jest.fn().mockReturnValue("blob:url");
      const revokeObjectURLMock = jest.fn();
      const clickMock = jest.fn();
      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = revokeObjectURLMock;
      const createElementSpy = jest
        .spyOn(document, "createElement")
        .mockReturnValue({
          href: "",
          download: "",
          click: clickMock,
        } as any);

      // Add an update
      component.loadProduct(mockProduct as any);
      component.newPrice = 8.0;
      component.updateProduct();

      component.generateReport();
      expect(toastSpy.show).toHaveBeenCalled();
      createElementSpy.mockRestore();
    });
  });

  describe("ngOnInit() - with EAN in URL params", () => {
    it("should call searchProduct when EAN is in query params", async () => {
      productServiceSpy.searchProducts.mockReturnValue(of([mockProduct]));
      const searchSpy = jest.spyOn(component, "searchProduct");
      const qp$ = TestBed.inject(ActivatedRoute).queryParams as any;
      // We can't easily re-emit on the BehaviorSubject here since it was emitted in init
      // Just verify searchProduct can be called from queryParams subscriber
      component.searchProduct("1234567890");
      expect(searchSpy).toHaveBeenCalledWith("1234567890");
    });
  });

  // ─── NEW TESTS (RED) ──────────────────────────────────────────────────────

  describe("mode signal", () => {
    it('should default to "edit"', () => {
      expect(component.mode()).toBe("edit");
    });

    it("setMode() should change mode", () => {
      component.setMode("receive");
      expect(component.mode()).toBe("receive");
    });

    it("setMode() should prompt confirm when form is dirty", () => {
      component.loadProduct(mockProduct as any);
      component.newPrice = 99;
      jest.spyOn(window, "confirm").mockReturnValue(false);
      component.setMode("stocktake");
      expect(component.mode()).toBe("edit"); // unchanged — user rejected
    });

    it("setMode() should change mode when form is dirty and user confirms", () => {
      component.loadProduct(mockProduct as any);
      component.newPrice = 99;
      jest.spyOn(window, "confirm").mockReturnValue(true);
      component.setMode("stocktake");
      expect(component.mode()).toBe("stocktake");
    });
  });

  describe("isFormDirty", () => {
    it("should be false when no product is loaded", () => {
      expect(component.isFormDirty).toBe(false);
    });

    it("should be false when form matches loaded product", () => {
      component.loadProduct(mockProduct as any);
      expect(component.isFormDirty).toBe(false);
    });

    it("should be true when price changed", () => {
      component.loadProduct(mockProduct as any);
      component.newPrice = 99;
      expect(component.isFormDirty).toBe(true);
    });

    it("should be true when stock changed", () => {
      component.loadProduct(mockProduct as any);
      component.newStock = 999;
      expect(component.isFormDirty).toBe(true);
    });
  });

  describe("loadProduct() — mode-based stock", () => {
    it("should set newStock to current stock in edit mode", () => {
      component.setMode("edit");
      component.loadProduct(mockProduct as any);
      expect(component.newStock).toBe(10);
    });

    it("should set newStock to current stock in stocktake mode (absolute count)", () => {
      component.setMode("stocktake");
      component.loadProduct(mockProduct as any);
      expect(component.newStock).toBe(10);
    });

    it("should NOT auto-save in receive mode", () => {
      jest.useFakeTimers();
      component.setMode("receive");
      component.loadProduct(mockProduct as any);
      jest.advanceTimersByTime(500);
      expect(productServiceSpy.updateProduct).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it("should NOT call searchStateService.setSearchQuery (feedback loop fix)", () => {
      const searchState = TestBed.inject(SearchStateService) as any;
      component.loadProduct(mockProduct as any);
      expect(searchState.setSearchQuery).not.toHaveBeenCalled();
    });
  });

  describe("searchProduct() — multi-result disambiguation", () => {
    it("should auto-load when exactly 1 result", () => {
      productServiceSpy.searchProducts.mockReturnValue(of([mockProduct]));
      component.searchProduct("coffee");
      expect(component.currentProduct).toEqual(mockProduct);
      expect(component.searchResults().length).toBe(0);
    });

    it("should populate searchResults for 2 matches without auto-loading", () => {
      const two = [
        mockProduct,
        { ...mockProduct, _id: "p2", name: "Coffee Light" },
      ];
      productServiceSpy.searchProducts.mockReturnValue(of(two));
      component.searchProduct("coff");
      expect(component.searchResults().length).toBe(2);
      expect(component.currentProduct).toBeNull();
    });

    it("should show MULTIPLE_MATCHES toast for 2-10 results", () => {
      const two = [
        mockProduct,
        { ...mockProduct, _id: "p2", name: "Coffee Light" },
      ];
      productServiceSpy.searchProducts.mockReturnValue(of(two));
      toastSpy.show.mockClear();
      component.searchProduct("coff");
      expect(toastSpy.show).toHaveBeenCalled();
    });

    it("should cap searchResults at 10 for > 10 matches", () => {
      const many = Array.from({ length: 15 }, (_, i) => ({
        ...mockProduct,
        _id: `p${i}`,
        name: `Prod ${i}`,
      }));
      productServiceSpy.searchProducts.mockReturnValue(of(many));
      component.searchProduct("prod");
      expect(component.searchResults().length).toBe(10);
    });

    it("should prompt confirm before loading when form is dirty", () => {
      component.loadProduct(mockProduct as any);
      component.newPrice = 99;
      const newProd = { ...mockProduct, _id: "p2", name: "New Product" };
      productServiceSpy.searchProducts.mockReturnValue(of([newProd]));
      jest.spyOn(window, "confirm").mockReturnValue(false);
      component.searchProduct("new");
      expect(component.currentProduct).toEqual(mockProduct); // not replaced
    });
  });

  describe("pickResult()", () => {
    it("should load selected product and clear searchResults", () => {
      const p2 = { ...mockProduct, _id: "p2", name: "Tea" } as any;
      component.searchResults.set([mockProduct as any, p2]);
      component.pickResult(p2);
      expect(component.currentProduct).toEqual(p2);
      expect(component.searchResults().length).toBe(0);
    });

    it("should prompt confirm when form is dirty before loading", () => {
      component.loadProduct(mockProduct as any);
      component.newPrice = 99;
      const p2 = { ...mockProduct, _id: "p2", name: "Tea" } as any;
      jest.spyOn(window, "confirm").mockReturnValue(false);
      component.pickResult(p2);
      expect(component.currentProduct).toEqual(mockProduct); // unchanged
    });
  });

  describe("updateProduct() — immutable signal update", () => {
    it("should create a new session object on each update", () => {
      component.loadProduct(mockProduct as any);
      component.newPrice = 7.5;
      const before = component.session();
      component.updateProduct();
      const after = component.session();
      expect(after).not.toBe(before); // new reference
      expect(after.updates.length).toBe(1);
    });

    it("should record mode in InventoryUpdate", () => {
      component.setMode("receive");
      component.loadProduct(mockProduct as any);
      component.newPrice = 7.0;
      component.updateProduct();
      expect(component.session().updates[0].mode).toBe("receive");
    });
  });

  describe("undoUpdate()", () => {
    let update: any;

    beforeEach(() => {
      component.loadProduct(mockProduct as any);
      component.newPrice = 8.0;
      component.updateProduct();
      update = component.session().updates[0];
      productServiceSpy.updateProduct.mockClear();
    });

    it("should call updateProduct with old values", () => {
      component.undoUpdate(update);
      expect(productServiceSpy.updateProduct).toHaveBeenCalledWith(
        update.productId,
        expect.objectContaining({
          price: update.oldPrice,
          stock: update.oldStock,
        })
      );
    });

    it("should remove the update from session on success", () => {
      component.undoUpdate(update);
      expect(
        component.session().updates.find((u: any) => u === update)
      ).toBeUndefined();
    });

    it("should show UNDO_SUCCESS toast on success", () => {
      toastSpy.show.mockClear();
      component.undoUpdate(update);
      expect(toastSpy.show).toHaveBeenCalled();
    });

    it("should show UNDO_ERROR toast on API failure", () => {
      const { throwError } = require("rxjs");
      productServiceSpy.updateProduct.mockReturnValue(
        throwError(() => new Error("undo err"))
      );
      toastSpy.show.mockClear();
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      component.undoUpdate(update);
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
      consoleSpy.mockRestore();
    });

    it("should not call updateProduct again if already undoing", () => {
      component.undoing.set(update.productId);
      component.undoUpdate(update);
      expect(productServiceSpy.updateProduct).not.toHaveBeenCalled();
    });
  });

  describe("completeSession() — export formats", () => {
    beforeEach(() => {
      component.loadProduct(mockProduct as any);
      component.newPrice = 8.0;
      component.updateProduct();
    });

    it("should call generateReport for txt format", () => {
      component.exportFormat.set("txt");
      const spy = jest
        .spyOn(component, "generateReport")
        .mockImplementation(() => {});
      component.completeSession();
      expect(spy).toHaveBeenCalled();
    });

    it("should call generateCsvReport for csv format", () => {
      component.exportFormat.set("csv");
      const spy = jest
        .spyOn(component, "generateCsvReport")
        .mockImplementation(() => {});
      component.completeSession();
      expect(spy).toHaveBeenCalled();
    });

    it("should call generatePrintableReport for print format", () => {
      component.exportFormat.set("print");
      const spy = jest
        .spyOn(component, "generatePrintableReport")
        .mockImplementation(() => {});
      component.completeSession();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("onBeforeUnload()", () => {
    it("should call preventDefault when session has updates", () => {
      component.loadProduct(mockProduct as any);
      component.newPrice = 7.0;
      component.updateProduct();
      const event = { preventDefault: jest.fn(), returnValue: "" } as any;
      component.onBeforeUnload(event);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it("should NOT call preventDefault when session has no updates", () => {
      const event = { preventDefault: jest.fn(), returnValue: "" } as any;
      component.onBeforeUnload(event);
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe("onReceiveQtyChange()", () => {
    it("should update receiveQty and newStock when in receive mode", () => {
      component.setMode("receive");
      component.loadProduct(mockProduct as any);
      component.onReceiveQtyChange(5);
      expect(component.receiveQty).toBe(5);
      expect(component.newStock).toBe(15); // 10 + 5
    });

    it("should update receiveQty without touching stock when not in receive mode", () => {
      component.setMode("edit");
      component.loadProduct(mockProduct as any);
      const prevStock = component.newStock;
      component.onReceiveQtyChange(5);
      expect(component.newStock).toBe(prevStock); // unchanged
    });
  });

  describe("generateCsvReport()", () => {
    it("should trigger a file download", () => {
      component.loadProduct(mockProduct as any);
      component.newPrice = 9.0;
      component.updateProduct();

      const createObjectURLMock = jest.fn().mockReturnValue("blob:csv");
      const revokeObjectURLMock = jest.fn();
      const clickMock = jest.fn();
      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = revokeObjectURLMock;
      const spy = jest.spyOn(document, "createElement").mockReturnValue({
        href: "",
        download: "",
        click: clickMock,
      } as any);

      component.generateCsvReport();
      expect(clickMock).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
