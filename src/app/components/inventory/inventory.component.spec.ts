import {
  TestBed,
  ComponentFixture,
  fakeAsync,
  tick,
} from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { of, throwError, BehaviorSubject, EMPTY, Subject } from "rxjs";
import { InventoryComponent } from "./inventory.component";
import { ProductService } from "../../services/product.service";
import { CategoryService } from "../../services/category.service";
import { AuthService } from "../../services/auth.service";
import { SearchStateService } from "../../services/search-state.service";
import { TranslationService } from "../../services/translation.service";
import { ToastService } from "../../services/toast.service";
import { User, Product, Category, PaginatedResponse } from "../../models";

const adminUser: User = {
  id: "u1",
  username: "admin",
  email: "admin@test.com",
  firstName: "Admin",
  lastName: "User",
  role: "admin",
};

const makeProduct = (id: string): Product => ({
  _id: id,
  product_id: id,
  name: `Product ${id}`,
  price: 10,
  ean: id,
  stock: 5,
  active: true,
});

const makeCategory = (id: string): Category => ({
  _id: id,
  name: `Category ${id}`,
  active: true,
});

const paginated = <T>(data: T[]): PaginatedResponse<T> => ({
  data,
  pagination: { total: data.length, page: 1, pageSize: 100, totalPages: 1 },
});

describe("InventoryComponent", () => {
  let component: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;
  let productServiceSpy: any;
  let categoryServiceSpy: any;
  let authServiceSpy: any;
  let searchStateServiceSpy: any;
  let translationServiceSpy: any;
  let toastServiceSpy: any;
  let searchQuery$: BehaviorSubject<string>;
  let productForEdit$: Subject<Product | null>;
  let translationsChanged$: Subject<void>;

  beforeEach(async () => {
    searchQuery$ = new BehaviorSubject<string>("");
    productForEdit$ = new Subject<Product | null>();
    translationsChanged$ = new Subject<void>();

    productServiceSpy = {
      getProducts: jest.fn().mockReturnValue(of(paginated([]))),
      getBrands: jest.fn().mockReturnValue(of([])),
      deleteProduct: jest.fn().mockReturnValue(of({ message: "Deleted" })),
      addToQuickAccess: jest.fn().mockReturnValue(of({})),
    };
    categoryServiceSpy = {
      getCategories: jest.fn().mockReturnValue(of([])),
      createCategory: jest.fn().mockReturnValue(of(makeCategory("new"))),
      updateCategory: jest.fn().mockReturnValue(of(makeCategory("upd"))),
      deleteCategory: jest.fn().mockReturnValue(of({ message: "Deleted" })),
    };
    authServiceSpy = { getCurrentUser: jest.fn().mockReturnValue(adminUser) };
    searchStateServiceSpy = {
      clearSearch: jest.fn(),
      getSearchQuery: jest.fn().mockReturnValue(""),
      setSearchQuery: jest.fn(),
      searchQuery$: searchQuery$.asObservable(),
      productForEdit$: productForEdit$.asObservable(),
    };
    translationServiceSpy = {
      translate: jest.fn().mockImplementation((key: string) => key),
      translationsChanged$: translationsChanged$.asObservable(),
    };
    toastServiceSpy = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [InventoryComponent, RouterTestingModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: CategoryService, useValue: categoryServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SearchStateService, useValue: searchStateServiceSpy },
        { provide: TranslationService, useValue: translationServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventoryComponent);
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

  it("should call loadProducts and loadCategories on init", () => {
    expect(productServiceSpy.getProducts).toHaveBeenCalled();
    expect(categoryServiceSpy.getCategories).toHaveBeenCalled();
  });

  describe("isAdmin", () => {
    it("should return true for admin user", () => {
      expect(component.isAdmin()).toBe(true);
    });

    it("should return false for non-admin user", () => {
      component.currentUser = { ...adminUser, role: "cashier" };
      expect(component.isAdmin()).toBe(false);
    });
  });

  describe("loadProducts", () => {
    it("should populate products signal on success", () => {
      const prods = [makeProduct("1"), makeProduct("2")];
      productServiceSpy.getProducts.mockReturnValue(of(paginated(prods)));
      component.loadProducts();
      expect(component.products()).toEqual(prods);
      expect(component.totalRecords()).toBe(2);
    });

    it("should handle load error gracefully", () => {
      productServiceSpy.getProducts.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      expect(() => component.loadProducts()).not.toThrow();
    });
  });

  describe("product modal", () => {
    it("should open product modal for new product", () => {
      component.openProductModal();
      expect(component.showProductModal).toBe(true);
      expect(component.isEditingProduct).toBe(false);
      expect(component.selectedProduct).toBeNull();
    });

    it("should open product modal for editing", () => {
      const prod = makeProduct("x");
      component.openProductModal(prod);
      expect(component.showProductModal).toBe(true);
      expect(component.isEditingProduct).toBe(true);
      expect(component.selectedProduct).toEqual(prod);
    });

    it("should close product modal", () => {
      component.openProductModal();
      component.closeProductModal();
      expect(component.showProductModal).toBe(false);
    });

    it("should add new product to list on onProductSaved", () => {
      component.products.set([]);
      component.isEditingProduct = false;
      const newProd = makeProduct("new");
      component.onProductSaved(newProd);
      expect(component.products()).toContainEqual(newProd);
    });

    it("should increment totalRecords when adding a new product on the current page", () => {
      component.products.set([makeProduct("existing")]);
      component.totalRecords.set(1);
      component.totalPages.set(1);
      component.pageSize.set(100);
      component.currentPage.set(1);
      component.isEditingProduct = false;

      component.onProductSaved(makeProduct("new"));

      expect(component.totalRecords()).toBe(2);
      expect(component.totalPages()).toBe(1);
    });

    it("should keep the product modal open after saving a new product", () => {
      component.products.set([]);
      component.showProductModal = true;
      component.isEditingProduct = false;

      component.onProductSaved(makeProduct("new"));

      expect(component.showProductModal).toBe(true);
    });

    it("should update existing product in list on onProductSaved", () => {
      const existing = makeProduct("x");
      component.products.set([existing]);
      component.isEditingProduct = true;
      component.selectedProduct = existing;
      const updated = { ...existing, name: "Updated" };
      component.onProductSaved(updated);
      expect(component.products()[0].name).toBe("Updated");
    });
  });

  describe("deleteProduct", () => {
    beforeEach(() => {
      // Populate products so the component can find the product and passes the early return
      component.products.set([makeProduct("p1")]);
      jest.spyOn(window, "confirm").mockReturnValue(true);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should call deleteProduct service and remove from list", () => {
      productServiceSpy.deleteProduct.mockReturnValue(
        of({ message: "Deleted" })
      );
      component.totalRecords.set(1);
      component.totalPages.set(1);
      component.deleteProduct("p1");
      expect(productServiceSpy.deleteProduct).toHaveBeenCalledWith("p1");
      expect(component.products().find((p) => p._id === "p1")).toBeUndefined();
      expect(component.totalRecords()).toBe(0);
    });

    it("should reload the previous page when deleting the last product on the last page", () => {
      const loadSpy = jest
        .spyOn(component, "loadProducts")
        .mockImplementation();

      component.products.set([makeProduct("p1")]);
      component.totalRecords.set(101);
      component.totalPages.set(2);
      component.pageSize.set(100);
      component.currentPage.set(2);

      productServiceSpy.deleteProduct.mockReturnValue(
        of({ message: "Deleted" })
      );

      component.deleteProduct("p1");

      expect(component.currentPage()).toBe(1);
      expect(loadSpy).toHaveBeenCalled();
    });

    it("should reload the current page when deleting a product leaves more results off-page", () => {
      const loadSpy = jest
        .spyOn(component, "loadProducts")
        .mockImplementation();

      component.products.set(
        Array.from({ length: 100 }, (_, index) => makeProduct(`p${index}`))
      );
      component.totalRecords.set(101);
      component.totalPages.set(2);
      component.pageSize.set(100);
      component.currentPage.set(1);

      productServiceSpy.deleteProduct.mockReturnValue(
        of({ message: "Deleted" })
      );

      component.deleteProduct("p0");

      expect(loadSpy).toHaveBeenCalled();
    });

    it("should show error toast on delete failure", () => {
      productServiceSpy.deleteProduct.mockReturnValue(
        throwError(() => ({ error: { message: "fail" } }))
      );
      component.deleteProduct("p1");
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });
  });

  describe("switchTab", () => {
    it("should set activeTab to categories", () => {
      component.switchTab("categories");
      expect(component.activeTab).toBe("categories");
    });

    it("should set activeTab to products", () => {
      component.activeTab = "categories";
      component.switchTab("products");
      expect(component.activeTab).toBe("products");
    });
  });

  describe("pagination", () => {
    beforeEach(() => {
      component.totalPages.set(3);
      component.currentPage.set(1);
    });

    it("should update page size from the selector without overwriting the signal", () => {
      const select = fixture.nativeElement.querySelector(
        ".page-size-select"
      ) as HTMLSelectElement;

      select.value = "25";

      expect(() => {
        select.dispatchEvent(new Event("change"));
        fixture.detectChanges();
      }).not.toThrow();

      expect(component.pageSize()).toBe(25);
    });

    it("should go to next page", () => {
      component.nextPage();
      expect(component.currentPage()).toBe(2);
    });

    it("should not exceed total pages", () => {
      component.currentPage.set(3);
      component.nextPage();
      expect(component.currentPage()).toBe(3);
    });

    it("should go to previous page", () => {
      component.currentPage.set(2);
      component.prevPage();
      expect(component.currentPage()).toBe(1);
    });

    it("should not go below page 1", () => {
      component.prevPage();
      expect(component.currentPage()).toBe(1);
    });

    it("goToPage should set currentPage and reload", () => {
      component.goToPage(2);
      expect(component.currentPage()).toBe(2);
      expect(productServiceSpy.getProducts).toHaveBeenCalled();
    });
  });

  describe("search state subscription", () => {
    it("should handle debounced search queries", fakeAsync(() => {
      searchQuery$.next("test query for search");
      tick(500);
      expect(component.searchQuery()).toBe("test query for search");
    }));

    it("should load products with the current shared search query on init", () => {
      searchStateServiceSpy.getSearchQuery.mockReturnValue("coffee");
      productServiceSpy.getProducts.mockClear();
      categoryServiceSpy.getCategories.mockClear();

      const localFixture = TestBed.createComponent(InventoryComponent);
      const localComponent = localFixture.componentInstance;

      localFixture.detectChanges();

      expect(localComponent.searchQuery()).toBe("coffee");
      expect(productServiceSpy.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ search: "coffee" })
      );
    });
  });

  describe("category management", () => {
    it("should open category modal for new category", () => {
      component.openCategoryModal();
      expect(component.showCategoryModal).toBe(true);
      expect(component.isEditingCategory).toBe(false);
    });

    it("should open category modal for editing", () => {
      const cat = makeCategory("c1");
      component.openCategoryModal(cat);
      expect(component.showCategoryModal).toBe(true);
      expect(component.isEditingCategory).toBe(true);
    });

    it("should close category modal", () => {
      component.openCategoryModal();
      component.closeCategoryModal();
      expect(component.showCategoryModal).toBe(false);
    });

    it("should delete category and remove from list", () => {
      component.categories = [makeCategory("cat1")];
      jest.spyOn(window, "confirm").mockReturnValue(true);
      categoryServiceSpy.deleteCategory.mockReturnValue(
        of({ message: "Deleted" })
      );
      component.deleteCategory("cat1");
      expect(categoryServiceSpy.deleteCategory).toHaveBeenCalledWith("cat1");
      expect(
        component.categories.find((c) => c._id === "cat1")
      ).toBeUndefined();
      jest.restoreAllMocks();
    });

    it("should show error toast on category delete failure", () => {
      component.categories = [makeCategory("bad")];
      jest.spyOn(window, "confirm").mockReturnValue(true);
      categoryServiceSpy.deleteCategory.mockReturnValue(
        throwError(() => ({ error: { message: "fail" } }))
      );
      component.deleteCategory("bad");
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
      jest.restoreAllMocks();
    });

    it("should render accessible labels on category action buttons", () => {
      component.activeTab = "categories";
      component.categories = [makeCategory("cat1")];

      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll(
        ".category-actions button"
      );

      expect(buttons).toHaveLength(2);
      expect(buttons[0].getAttribute("title")).toBe("INVENTORY.ACTIONS.EDIT");
      expect(buttons[0].getAttribute("aria-label")).toBe(
        "INVENTORY.ACTIONS.EDIT"
      );
      expect(buttons[1].getAttribute("title")).toBe("INVENTORY.ACTIONS.DELETE");
      expect(buttons[1].getAttribute("aria-label")).toBe(
        "INVENTORY.ACTIONS.DELETE"
      );
    });
  });

  describe("category page mode", () => {
    it("should initialize directly in categories mode without loading products", () => {
      productServiceSpy.getProducts.mockClear();
      categoryServiceSpy.getCategories.mockClear();

      const localFixture = TestBed.createComponent(InventoryComponent);
      const localComponent = localFixture.componentInstance;
      localComponent.categoryPageMode = true;

      localFixture.detectChanges();

      expect(localComponent.activeTab).toBe("categories");
      expect(productServiceSpy.getProducts).not.toHaveBeenCalled();
      expect(categoryServiceSpy.getCategories).toHaveBeenCalledTimes(1);
      expect(
        localFixture.nativeElement.querySelector(".inventory-header")
      ).toBeNull();
    });

    it("should show a retryable error state when categories fail to load", () => {
      productServiceSpy.getProducts.mockClear();
      categoryServiceSpy.getCategories.mockClear();
      categoryServiceSpy.getCategories.mockReturnValue(
        throwError(() => new Error("fail"))
      );

      const localFixture = TestBed.createComponent(InventoryComponent);
      const localComponent = localFixture.componentInstance;
      localComponent.categoryPageMode = true;

      localFixture.detectChanges();

      const errorState = localFixture.nativeElement.querySelector(
        ".categories-feedback--error"
      );
      const retryButton = errorState?.querySelector("button");

      expect(errorState).not.toBeNull();
      expect(retryButton?.textContent).toContain("GLOBAL.RETRY");
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        "INVENTORY.CATEGORIES.LOAD_ERROR",
        "error"
      );
    });
  });

  describe("import modal", () => {
    it("should open import modal", () => {
      component.openImportModal();
      expect(component.showImportModal).toBe(true);
    });

    it("should close import modal", () => {
      component.openImportModal();
      component.closeImportModal();
      expect(component.showImportModal).toBe(false);
    });
  });

  describe("ngOnDestroy", () => {
    it("should complete without error", () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe("productForEdit$ subscription", () => {
    it("should open product modal when productForEdit$ emits", () => {
      const prod = makeProduct("edit1");
      productForEdit$.next(prod);
      expect(component.showProductModal).toBe(true);
      expect(component.selectedProduct).toEqual(prod);
    });
  });

  describe("startInventorySession", () => {
    it("should navigate to /inventory-session", () => {
      const navSpy = jest.spyOn((component as any).router, "navigate");
      component.startInventorySession();
      expect(navSpy).toHaveBeenCalledWith(["/inventory-session"]);
    });
  });

  describe("loadProducts with search query", () => {
    it("should include search in filters when searchQuery is set", () => {
      component.searchQuery.set("mango");
      component.loadProducts();
      expect(productServiceSpy.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ search: "mango" })
      );
    });
  });

  describe("deleteProduct - guard cases", () => {
    it("should show error and return when not admin", () => {
      component.currentUser = { ...adminUser, role: "cashier" };
      component.deleteProduct("p1");
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
      expect(productServiceSpy.deleteProduct).not.toHaveBeenCalled();
    });

    it("should return early when product not found", () => {
      component.products.set([]);
      jest.spyOn(window, "confirm").mockReturnValue(true);
      component.deleteProduct("nonexistent");
      expect(productServiceSpy.deleteProduct).not.toHaveBeenCalled();
      jest.restoreAllMocks();
    });

    it("should return early when confirm is cancelled", () => {
      component.products.set([makeProduct("p1")]);
      jest.spyOn(window, "confirm").mockReturnValue(false);
      component.deleteProduct("p1");
      expect(productServiceSpy.deleteProduct).not.toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  describe("addToQuickAccess", () => {
    it("should return early if product has no _id", () => {
      const prod = { ...makeProduct("q1"), _id: undefined } as any;
      component.addToQuickAccess(prod);
      expect(productServiceSpy.addToQuickAccess).not.toHaveBeenCalled();
    });

    it("should call addToQuickAccess service on success", () => {
      productServiceSpy.addToQuickAccess.mockReturnValue(of({}));
      component.addToQuickAccess(makeProduct("q1"));
      expect(productServiceSpy.addToQuickAccess).toHaveBeenCalledWith("q1");
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "success"
      );
    });

    it("should show error toast on failure", () => {
      productServiceSpy.addToQuickAccess.mockReturnValue(
        throwError(() => ({ error: { message: "oops" } }))
      );
      component.addToQuickAccess(makeProduct("q1"));
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.stringContaining("oops"),
        "error"
      );
    });

    it("should call stopPropagation when event provided", () => {
      productServiceSpy.addToQuickAccess.mockReturnValue(of({}));
      const event = { stopPropagation: jest.fn() } as any;
      component.addToQuickAccess(makeProduct("q1"), event);
      expect(event.stopPropagation).toHaveBeenCalled();
    });
  });

  describe("saveCategory", () => {
    it("should show info toast and return early when name is empty", () => {
      component.categoryForm = { name: "", active: true };
      component.saveCategory();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "info"
      );
      expect(categoryServiceSpy.createCategory).not.toHaveBeenCalled();
    });

    it("should create new category on success", () => {
      component.isEditingCategory = false;
      component.categoryForm = { name: "New Cat", active: true };
      component.saveCategory();
      expect(categoryServiceSpy.createCategory).toHaveBeenCalled();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "success"
      );
    });

    it("should show error on create failure", () => {
      component.isEditingCategory = false;
      component.categoryForm = { name: "Bad Cat", active: true };
      categoryServiceSpy.createCategory.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.saveCategory();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should update existing category on success", () => {
      const cat = makeCategory("c1");
      component.isEditingCategory = true;
      component.selectedCategory = cat;
      component.categoryForm = { ...cat, name: "Updated" };
      component.saveCategory();
      expect(categoryServiceSpy.updateCategory).toHaveBeenCalledWith(
        "c1",
        expect.any(Object)
      );
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "success"
      );
    });

    it("should show error on update failure", () => {
      const cat = makeCategory("c1");
      component.isEditingCategory = true;
      component.selectedCategory = cat;
      component.categoryForm = { ...cat, name: "Updated" };
      categoryServiceSpy.updateCategory.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.saveCategory();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });
  });

  describe("deleteCategory - guard cases", () => {
    it("should show error when not admin", () => {
      component.currentUser = { ...adminUser, role: "cashier" };
      component.deleteCategory("cat1");
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
      expect(categoryServiceSpy.deleteCategory).not.toHaveBeenCalled();
    });

    it("should return early when confirm cancelled", () => {
      component.categories = [makeCategory("cat1")];
      jest.spyOn(window, "confirm").mockReturnValue(false);
      component.deleteCategory("cat1");
      expect(categoryServiceSpy.deleteCategory).not.toHaveBeenCalled();
      jest.restoreAllMocks();
    });
  });

  describe("importProducts", () => {
    it("should call bulkImport and show success toast", () => {
      productServiceSpy.bulkImport = jest
        .fn()
        .mockReturnValue(of({ successful: 5, failed: 0 }));
      productServiceSpy.getProducts.mockReturnValue(of(paginated([])));
      const event = {
        target: { files: [new File([""], "products.csv")] },
      } as unknown as Event;
      component.importProducts(event);
      expect(productServiceSpy.bulkImport).toHaveBeenCalled();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "success"
      );
    });

    it("should return early if no file selected", () => {
      productServiceSpy.bulkImport = jest.fn();
      const event = { target: { files: [] } } as unknown as Event;
      component.importProducts(event);
      expect(productServiceSpy.bulkImport).not.toHaveBeenCalled();
    });

    it("should show error toast on bulkImport failure", () => {
      productServiceSpy.bulkImport = jest
        .fn()
        .mockReturnValue(throwError(() => new Error("fail")));
      const event = {
        target: { files: [new File([""], "products.csv")] },
      } as unknown as Event;
      component.importProducts(event);
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });
  });

  describe("changePageSize", () => {
    it("should set pageSize, reset to page 1, and reload", () => {
      component.currentPage.set(3);
      component.changePageSize(50);
      expect(component.pageSize()).toBe(50);
      expect(component.currentPage()).toBe(1);
      expect(productServiceSpy.getProducts).toHaveBeenCalled();
    });
  });

  describe("getVisiblePages", () => {
    it("should return all pages when total <= 7", () => {
      component.totalPages.set(5);
      component.currentPage.set(3);
      expect(component.getVisiblePages()).toEqual([1, 2, 3, 4, 5]);
    });

    it("should include ellipsis for large page counts", () => {
      component.totalPages.set(20);
      component.currentPage.set(10);
      const pages = component.getVisiblePages();
      expect(pages).toContain(-1);
      expect(pages[0]).toBe(1);
      expect(pages[pages.length - 1]).toBe(20);
    });
  });

  describe("downloadTemplate", () => {
    it("should create and click download link", () => {
      const createObjectURLSpy = jest.fn().mockReturnValue("blob:url");
      const revokeObjectURLSpy = jest.fn();
      window.URL.createObjectURL = createObjectURLSpy;
      window.URL.revokeObjectURL = revokeObjectURLSpy;
      const clickSpy = jest.fn();
      jest
        .spyOn(document, "createElement")
        .mockReturnValue({ href: "", download: "", click: clickSpy } as any);
      component.downloadTemplate();
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
