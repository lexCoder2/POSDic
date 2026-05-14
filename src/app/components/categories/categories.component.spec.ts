import { ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { BehaviorSubject, Subject, of } from "rxjs";
import { CategoriesComponent } from "./categories.component";
import { ProductService } from "../../services/product.service";
import { CategoryService } from "../../services/category.service";
import { AuthService } from "../../services/auth.service";
import { SearchStateService } from "../../services/search-state.service";
import { TranslationService } from "../../services/translation.service";
import { ToastService } from "../../services/toast.service";

describe("CategoriesComponent", () => {
  let component: CategoriesComponent;
  let fixture: ComponentFixture<CategoriesComponent>;
  let productServiceSpy: any;
  let categoryServiceSpy: any;
  let authServiceSpy: any;
  let searchStateServiceSpy: any;
  let translationServiceSpy: any;
  let toastServiceSpy: any;
  let searchQuery$: BehaviorSubject<string>;
  let productForEdit$: Subject<any>;
  let translationsChanged$: Subject<void>;

  beforeEach(async () => {
    searchQuery$ = new BehaviorSubject<string>("");
    productForEdit$ = new Subject<any>();
    translationsChanged$ = new Subject<void>();

    productServiceSpy = {
      getProducts: jest.fn().mockReturnValue(
        of({
          data: [],
          pagination: { total: 0, page: 1, pageSize: 100, totalPages: 0 },
        })
      ),
      deleteProduct: jest.fn().mockReturnValue(of({})),
      addToQuickAccess: jest.fn().mockReturnValue(of({})),
    };
    categoryServiceSpy = {
      getCategories: jest.fn().mockReturnValue(of([])),
      createCategory: jest
        .fn()
        .mockReturnValue(of({ _id: "c1", name: "Category 1" })),
      updateCategory: jest
        .fn()
        .mockReturnValue(of({ _id: "c1", name: "Category 1" })),
      deleteCategory: jest.fn().mockReturnValue(of({})),
    };
    authServiceSpy = {
      getCurrentUser: jest.fn().mockReturnValue({
        id: "u1",
        username: "manager",
        email: "manager@test.com",
        firstName: "Manager",
        lastName: "User",
        role: "manager",
      }),
    };
    searchStateServiceSpy = {
      clearSearch: jest.fn(),
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
      imports: [CategoriesComponent, RouterTestingModule],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: CategoryService, useValue: categoryServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: SearchStateService, useValue: searchStateServiceSpy },
        { provide: TranslationService, useValue: translationServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should force category page mode and skip product loading", () => {
    expect(component.categoryPageMode).toBe(true);
    expect(component.activeTab).toBe("categories");
    expect(productServiceSpy.getProducts).not.toHaveBeenCalled();
    expect(categoryServiceSpy.getCategories).toHaveBeenCalled();
  });

  it("should render the categories view without the inventory header controls", () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector(".inventory-header")).toBeNull();
    expect(host.querySelector(".content-header h2")?.textContent).toContain(
      "INVENTORY.CATEGORIES.TITLE"
    );
  });
});
