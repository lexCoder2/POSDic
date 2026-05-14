import {
  TestBed,
  ComponentFixture,
  fakeAsync,
  tick,
} from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { of, Subject } from "rxjs";
import { GlobalSearchComponent } from "./global-search.component";
import { ProductService } from "../../services/product.service";
import { CartService } from "../../services/cart.service";
import { SearchStateService } from "../../services/search-state.service";
import { ToastService } from "../../services/toast.service";
import { Product } from "@app/models";

const mockProduct: Product = {
  _id: "p1",
  product_id: "p1",
  name: "Test Product",
  price: 5,
  ean: "12345678",
};

describe("GlobalSearchComponent", () => {
  let component: GlobalSearchComponent;
  let fixture: ComponentFixture<GlobalSearchComponent>;
  let productServiceSpy: jest.Mocked<Partial<ProductService>>;
  let cartServiceSpy: jest.Mocked<Partial<CartService>>;
  let searchStateServiceSpy: jest.Mocked<Partial<SearchStateService>>;
  let toastServiceSpy: jest.Mocked<Partial<ToastService>>;
  let searchQuery$: Subject<string>;

  beforeEach(async () => {
    searchQuery$ = new Subject<string>();

    productServiceSpy = {
      getProductByBarcode: jest.fn().mockReturnValue(of(mockProduct)),
      searchProducts: jest.fn().mockReturnValue(of({ data: [] })),
    };
    cartServiceSpy = {
      addItem: jest.fn(),
    };
    searchStateServiceSpy = {
      clearSearch: jest.fn(),
      setSearchQuery: jest.fn(),
      searchQuery$: searchQuery$.asObservable(),
    } as any;
    toastServiceSpy = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [GlobalSearchComponent, RouterTestingModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
        { provide: SearchStateService, useValue: searchStateServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("onSearchChange", () => {
    it("should update searchQuery", () => {
      component.onSearchChange("test");
      expect(component.searchQuery).toBe("test");
    });
  });

  describe("performSearch", () => {
    it("should call setSearchQuery with the query", () => {
      component.performSearch("apple");
      expect(searchStateServiceSpy.setSearchQuery).toHaveBeenCalledWith(
        "apple"
      );
    });

    it("should not search if same query was entered recently via Enter", () => {
      (component as any).lastEnterSearchQuery = "apple";
      (component as any).lastEnterSearchTime = Date.now();
      component.performSearch("apple");
      expect(searchStateServiceSpy.setSearchQuery).not.toHaveBeenCalled();
    });
  });

  describe("handleEnterSearch", () => {
    it("should do nothing for empty query", () => {
      component.handleEnterSearch("");
      expect(searchStateServiceSpy.setSearchQuery).not.toHaveBeenCalled();
    });

    it("should do nothing for whitespace-only query", () => {
      component.handleEnterSearch("   ");
      expect(searchStateServiceSpy.setSearchQuery).not.toHaveBeenCalled();
    });

    it("should lookup by barcode for numeric input", () => {
      component.handleEnterSearch("12345678");
      expect(productServiceSpy.getProductByBarcode).toHaveBeenCalledWith(
        "12345678"
      );
    });

    it("should perform regular search for non-barcode text", () => {
      // Use a string > 14 chars so it is not treated as a barcode
      const longQuery = "fresh orange juice from the store";
      component.handleEnterSearch(longQuery);
      expect(searchStateServiceSpy.setSearchQuery).toHaveBeenCalledWith(
        longQuery
      );
    });
  });

  describe("onSearchKeyPress", () => {
    it("should call handleEnterSearch when Enter is pressed", () => {
      const handleSpy = jest.spyOn(component, "handleEnterSearch");
      component.searchQuery = "test";
      const event = new KeyboardEvent("keypress", { key: "Enter" });
      jest.spyOn(event, "preventDefault");
      component.onSearchKeyPress(event);
      expect(handleSpy).toHaveBeenCalledWith("test");
    });

    it("should not call handleEnterSearch for non-Enter keys", () => {
      const handleSpy = jest.spyOn(component, "handleEnterSearch");
      const event = new KeyboardEvent("keypress", { key: "a" });
      component.onSearchKeyPress(event);
      expect(handleSpy).not.toHaveBeenCalled();
    });

    it("should trigger shared text search immediately when Enter is pressed", () => {
      const query = "fresh orange juice from the store";
      component.searchQuery = query;

      const event = new KeyboardEvent("keypress", { key: "Enter" });
      jest.spyOn(event, "preventDefault");

      component.onSearchKeyPress(event);

      expect(searchStateServiceSpy.setSearchQuery).toHaveBeenCalledWith(query);
    });
  });

  describe("search state subscription", () => {
    it("should update searchQuery when searchState emits a different value", () => {
      component.searchQuery = "old";
      searchQuery$.next("new-query");
      expect(component.searchQuery).toBe("new-query");
    });

    it("should not update if same query", () => {
      component.searchQuery = "same";
      searchQuery$.next("same");
      expect(component.searchQuery).toBe("same");
    });
  });

  describe("ngOnDestroy", () => {
    it("should complete destroy stream without error", () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe("onProductSelected", () => {
    it("should navigate to /pos and clear searchQuery", () => {
      const navSpy = jest
        .spyOn((component as any).router, "navigate")
        .mockResolvedValue(true);
      component.searchQuery = "test";
      component.onProductSelected(mockProduct);
      expect(navSpy).toHaveBeenCalledWith(["/pos"], {
        state: { selectedProduct: mockProduct },
      });
      expect(component.searchQuery).toBe("");
    });
  });

  describe("onSearchKeyPress - duplicate Enter prevention", () => {
    it("should prevent duplicate Enter search within 500ms", () => {
      const handleSpy = jest.spyOn(component, "handleEnterSearch");
      component.searchQuery = "apple";
      (component as any).lastEnterSearchQuery = "apple";
      (component as any).lastEnterSearchTime = Date.now();
      const event = new KeyboardEvent("keypress", { key: "Enter" });
      jest.spyOn(event, "preventDefault");
      component.onSearchKeyPress(event);
      expect(handleSpy).not.toHaveBeenCalled();
    });
  });

  describe("handleEnterSearch - sale number routing", () => {
    it("should navigate to /sales when query looks like a sale number", () => {
      const navSpy = jest
        .spyOn((component as any).router, "navigate")
        .mockResolvedValue(true);
      component.handleEnterSearch("SALE-A0B1C2D3");
      expect(navSpy).toHaveBeenCalledWith(["/sales"]);
      expect(component.searchQuery).toBe("");
    });
  });

  describe("handleEnterSearch - provider code routing", () => {
    it("should navigate to /providers when query looks like a provider code", () => {
      const navSpy = jest
        .spyOn((component as any).router, "navigate")
        .mockResolvedValue(true);
      component.handleEnterSearch("PROV-AB12");
      expect(navSpy).toHaveBeenCalledWith(["/providers"]);
      expect(component.searchQuery).toBe("");
    });
  });

  describe("handleEnterSearch - barcode found on POS page", () => {
    it("should add to cart and show toast when on /pos", () => {
      Object.defineProperty((component as any).router, "url", {
        get: () => "/pos",
        configurable: true,
      });
      (productServiceSpy.getProductByBarcode as jest.Mock).mockReturnValue(
        of(mockProduct)
      );
      component.handleEnterSearch("12345678");
      expect(cartServiceSpy.addItem).toHaveBeenCalledWith(mockProduct);
      expect(toastServiceSpy.show).toHaveBeenCalled();
      expect(component.searchQuery).toBe("");
    });
  });

  describe("handleEnterSearch - barcode found on inventory page", () => {
    it("should call setSearchQuery when on /inventory", () => {
      Object.defineProperty((component as any).router, "url", {
        get: () => "/inventory",
        configurable: true,
      });
      (productServiceSpy.getProductByBarcode as jest.Mock).mockReturnValue(
        of(mockProduct)
      );
      component.handleEnterSearch("12345678");
      expect(searchStateServiceSpy.setSearchQuery).toHaveBeenCalledWith(
        "12345678"
      );
      expect(component.searchQuery).toBe("");
    });
  });

  describe("handleEnterSearch - barcode found on other page", () => {
    it("should navigate to /pos with selectedProduct when not on pos/inventory", () => {
      Object.defineProperty((component as any).router, "url", {
        get: () => "/dashboard",
        configurable: true,
      });
      const navSpy = jest
        .spyOn((component as any).router, "navigate")
        .mockResolvedValue(true);
      (productServiceSpy.getProductByBarcode as jest.Mock).mockReturnValue(
        of(mockProduct)
      );
      component.handleEnterSearch("12345678");
      expect(navSpy).toHaveBeenCalledWith(["/pos"], {
        state: { selectedProduct: mockProduct },
      });
      expect(component.searchQuery).toBe("");
    });
  });

  describe("handleEnterSearch - barcode not found (error fallback)", () => {
    it("should perform regular search when barcode lookup fails", () => {
      const { throwError } = require("rxjs");
      (productServiceSpy.getProductByBarcode as jest.Mock).mockReturnValue(
        throwError(() => new Error("not found"))
      );
      component.handleEnterSearch("12345678");
      expect(searchStateServiceSpy.setSearchQuery).toHaveBeenCalledWith(
        "12345678"
      );
    });
  });
});
