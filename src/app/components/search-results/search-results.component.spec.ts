import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { BehaviorSubject, EMPTY, of, throwError } from "rxjs";
import { SearchResultsComponent } from "./search-results.component";
import { SearchStateService } from "../../services/search-state.service";
import { AuthService } from "../../services/auth.service";
import { ProductService } from "../../services/product.service";
import { ToastService } from "../../services/toast.service";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";

describe("SearchResultsComponent", () => {
  let component: SearchResultsComponent;
  let fixture: ComponentFixture<SearchResultsComponent>;
  let searchQuery$: BehaviorSubject<string>;
  let mockProductService: jest.Mocked<Partial<ProductService>>;
  let mockToastService: { show: jest.Mock };
  let mockAuthService: { getCurrentUser: jest.Mock };

  const sampleProduct: any = {
    _id: "p1",
    name: "Apple",
    ean: "1234567890123",
    price: 1.5,
    local_image: "apple.jpg",
  };

  beforeEach(async () => {
    searchQuery$ = new BehaviorSubject<string>("");
    mockProductService = {
      deleteProduct: jest.fn().mockReturnValue(of({})),
      addToQuickAccess: jest.fn().mockReturnValue(of({})),
    };
    mockToastService = { show: jest.fn() };
    mockAuthService = {
      getCurrentUser: jest.fn().mockReturnValue({ role: "cashier" }),
    };

    await TestBed.configureTestingModule({
      imports: [SearchResultsComponent],
      providers: [
        { provide: SearchStateService, useValue: { searchQuery$ } },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ProductService, useValue: mockProductService },
        { provide: ToastService, useValue: mockToastService },
        { provide: TranslatePipe, useValue: { transform: (k: string) => k } },
        {
          provide: CurrencyPipe,
          useValue: { transform: (v: number) => String(v) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchResultsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  // ──────────────────────────────────────────────
  // ngOnInit
  // ──────────────────────────────────────────────

  describe("ngOnInit()", () => {
    it("subscribes to search query", () => {
      component.ngOnInit();
      searchQuery$.next("milk");
      expect(component.searchQuery()).toBe("milk");
    });
  });

  // ──────────────────────────────────────────────
  // getProductImageUrl
  // ──────────────────────────────────────────────

  describe("getProductImageUrl()", () => {
    it("returns URL with local_image when present", () => {
      const url = component.getProductImageUrl(sampleProduct);
      expect(url).toContain("apple.jpg");
    });

    it("returns empty string when no local_image", () => {
      const url = component.getProductImageUrl({
        _id: "x",
        name: "Bare",
      } as any);
      expect(url).toBe("");
    });
  });

  // ──────────────────────────────────────────────
  // onProductClick
  // ──────────────────────────────────────────────

  describe("onProductClick()", () => {
    it("emits productSelected event", () => {
      const spy = jest.spyOn(component.productSelected, "emit");
      component.onProductClick(sampleProduct);
      expect(spy).toHaveBeenCalledWith(sampleProduct);
    });
  });

  // ──────────────────────────────────────────────
  // getProductCode
  // ──────────────────────────────────────────────

  describe("getProductCode()", () => {
    it("returns ean when present", () => {
      expect(component.getProductCode(sampleProduct)).toBe("1234567890123");
    });

    it("falls back to ean13", () => {
      expect(component.getProductCode({ ean13: "ean13val" } as any)).toBe(
        "ean13val"
      );
    });

    it("falls back to upc", () => {
      expect(component.getProductCode({ upc: "upcval" } as any)).toBe("upcval");
    });

    it("returns - when no code", () => {
      expect(component.getProductCode({} as any)).toBe("-");
    });
  });

  // ──────────────────────────────────────────────
  // isAdmin
  // ──────────────────────────────────────────────

  describe("isAdmin()", () => {
    it("returns true for admin role", () => {
      mockAuthService.getCurrentUser.mockReturnValue({ role: "admin" });
      expect(component.isAdmin()).toBe(true);
    });

    it("returns false for cashier role", () => {
      mockAuthService.getCurrentUser.mockReturnValue({ role: "cashier" });
      expect(component.isAdmin()).toBe(false);
    });

    it("returns false when no user", () => {
      mockAuthService.getCurrentUser.mockReturnValue(null);
      expect(component.isAdmin()).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // Delete modal
  // ──────────────────────────────────────────────

  describe("openDeleteModal()", () => {
    it("sets productToDelete and shows modal", () => {
      const event = { stopPropagation: jest.fn() } as any;
      component.openDeleteModal(event, sampleProduct);
      expect(component.productToDelete).toBe(sampleProduct);
      expect(component.showDeleteModal).toBe(true);
    });
  });

  describe("closeDeleteModal()", () => {
    it("resets state", () => {
      component.productToDelete = sampleProduct;
      component.showDeleteModal = true;
      component.closeDeleteModal();
      expect(component.showDeleteModal).toBe(false);
      expect(component.productToDelete).toBeNull();
    });
  });

  describe("confirmDelete()", () => {
    it("does nothing when productToDelete is null", () => {
      component.productToDelete = null;
      component.confirmDelete();
      expect(mockProductService.deleteProduct).not.toHaveBeenCalled();
    });

    it("does nothing when product has no _id", () => {
      component.productToDelete = { name: "Anon" } as any;
      component.confirmDelete();
      expect(mockProductService.deleteProduct).not.toHaveBeenCalled();
    });

    it("calls deleteProduct and emits on success", () => {
      const deletedSpy = jest.spyOn(component.productDeleted, "emit");
      component.productToDelete = sampleProduct;
      component.showDeleteModal = true;
      component.confirmDelete();
      expect(mockProductService.deleteProduct).toHaveBeenCalledWith("p1");
      expect(deletedSpy).toHaveBeenCalledWith(sampleProduct);
      expect(component.showDeleteModal).toBe(false);
      expect(mockToastService.show).toHaveBeenCalledWith(
        expect.stringContaining("Apple"),
        "success"
      );
    });

    it("shows error toast and closes modal on failure", () => {
      (mockProductService.deleteProduct as jest.Mock).mockReturnValue(
        throwError(() => new Error("network"))
      );
      component.productToDelete = sampleProduct;
      component.showDeleteModal = true;
      component.confirmDelete();
      expect(mockToastService.show).toHaveBeenCalledWith(
        "Failed to delete product",
        "error"
      );
      expect(component.showDeleteModal).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // onDeleteKeyDown
  // ──────────────────────────────────────────────

  describe("onDeleteKeyDown()", () => {
    it("calls confirmDelete on Enter", () => {
      const spy = jest.spyOn(component, "confirmDelete").mockImplementation();
      const event = { key: "Enter", preventDefault: jest.fn() } as any;
      component.onDeleteKeyDown(event);
      expect(spy).toHaveBeenCalled();
    });

    it("calls closeDeleteModal on Escape", () => {
      const spy = jest.spyOn(component, "closeDeleteModal");
      const event = { key: "Escape", preventDefault: jest.fn() } as any;
      component.onDeleteKeyDown(event);
      expect(spy).toHaveBeenCalled();
    });

    it("does nothing for other keys", () => {
      const deleteSpy = jest
        .spyOn(component, "confirmDelete")
        .mockImplementation();
      const closeSpy = jest.spyOn(component, "closeDeleteModal");
      const event = { key: "Tab", preventDefault: jest.fn() } as any;
      component.onDeleteKeyDown(event);
      expect(deleteSpy).not.toHaveBeenCalled();
      expect(closeSpy).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // addToQuickAccess
  // ──────────────────────────────────────────────

  describe("addToQuickAccess()", () => {
    it("does nothing when product has no _id", () => {
      const event = { stopPropagation: jest.fn() } as any;
      component.addToQuickAccess(event, { name: "NoId" } as any);
      expect(mockProductService.addToQuickAccess).not.toHaveBeenCalled();
    });

    it("calls addToQuickAccess and shows success toast", () => {
      const event = { stopPropagation: jest.fn() } as any;
      component.addToQuickAccess(event, sampleProduct);
      expect(mockProductService.addToQuickAccess).toHaveBeenCalledWith("p1");
      expect(mockToastService.show).toHaveBeenCalledWith(
        expect.stringContaining("Apple"),
        "success"
      );
    });

    it("shows error toast on failure", () => {
      (mockProductService.addToQuickAccess as jest.Mock).mockReturnValue(
        throwError(() => ({ error: { message: "Already exists" } }))
      );
      const event = { stopPropagation: jest.fn() } as any;
      component.addToQuickAccess(event, sampleProduct);
      expect(mockToastService.show).toHaveBeenCalledWith(
        "Already exists",
        "error"
      );
    });
  });

  // ──────────────────────────────────────────────
  // ngOnDestroy
  // ──────────────────────────────────────────────

  describe("ngOnDestroy()", () => {
    it("completes destroy$ subject", () => {
      const spy = jest.spyOn((component as any).destroy$, "complete");
      component.ngOnDestroy();
      expect(spy).toHaveBeenCalled();
    });
  });
});
