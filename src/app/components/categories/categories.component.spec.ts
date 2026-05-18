import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Subject, of, throwError } from "rxjs";
import { CategoriesComponent } from "./categories.component";
import { CategoryService } from "../../services/category.service";
import { AuthService } from "../../services/auth.service";
import { TranslationService } from "../../services/translation.service";
import { ToastService } from "../../services/toast.service";
import { Category } from "../../models";

describe("CategoriesComponent", () => {
  let component: CategoriesComponent;
  let fixture: ComponentFixture<CategoriesComponent>;
  let categoryServiceSpy: any;
  let authServiceSpy: any;
  let translationServiceSpy: any;
  let toastServiceSpy: any;
  let translationsChanged$: Subject<void>;

  const mockCategories: Category[] = [
    {
      _id: "c1",
      name: "Fruits",
      icon: "fas fa-apple-alt",
      color: "#22c55e",
      active: true,
    },
    {
      _id: "c2",
      name: "Dairy",
      icon: "fas fa-cheese",
      color: "#eab308",
      active: false,
    },
  ];

  beforeEach(async () => {
    translationsChanged$ = new Subject<void>();

    categoryServiceSpy = {
      getCategories: jest.fn().mockReturnValue(of(mockCategories)),
      createCategory: jest.fn().mockReturnValue(
        of({
          _id: "c3",
          name: "New Cat",
          icon: "fas fa-tag",
          color: "#3b82f6",
          active: true,
        })
      ),
      updateCategory: jest.fn().mockReturnValue(
        of({
          _id: "c1",
          name: "Fruits Updated",
          icon: "fas fa-apple-alt",
          color: "#22c55e",
          active: true,
        })
      ),
      deleteCategory: jest.fn().mockReturnValue(of({})),
    };
    authServiceSpy = {
      getCurrentUser: jest.fn().mockReturnValue({
        id: "u1",
        username: "admin",
        role: "admin",
      }),
    };
    translationServiceSpy = {
      translate: jest.fn().mockImplementation((key: string) => key),
      translationsChanged$: translationsChanged$.asObservable(),
    };
    toastServiceSpy = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [CategoriesComponent],
      providers: [
        { provide: CategoryService, useValue: categoryServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
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

  it("should load categories on init", () => {
    expect(categoryServiceSpy.getCategories).toHaveBeenCalled();
    expect(component.categories()).toEqual(mockCategories);
    expect(component.isLoading()).toBe(false);
    expect(component.hasError()).toBe(false);
  });

  it("should set error state when loading fails", () => {
    categoryServiceSpy.getCategories!.mockReturnValue(
      throwError(() => new Error("Network error"))
    );
    component.loadCategories();
    expect(component.hasError()).toBe(true);
    expect(component.isLoading()).toBe(false);
  });

  it("should filter categories by search query", () => {
    component.searchQuery.set("fruit");
    expect(component.filteredCategories().length).toBe(1);
    expect(component.filteredCategories()[0].name).toBe("Fruits");
  });

  it("should return all categories when search is empty", () => {
    component.searchQuery.set("");
    expect(component.filteredCategories().length).toBe(2);
  });

  it("should open modal in create mode", () => {
    component.openModal();
    expect(component.showModal()).toBe(true);
    expect(component.isEditing()).toBe(false);
    expect(component.categoryForm.name).toBe("");
    expect(component.categoryForm.active).toBe(true);
  });

  it("should open modal in edit mode with category data", () => {
    component.openModal(mockCategories[0]);
    expect(component.showModal()).toBe(true);
    expect(component.isEditing()).toBe(true);
    expect(component.categoryForm.name).toBe("Fruits");
    expect(component.categoryForm.color).toBe("#22c55e");
  });

  it("should close modal and reset state", () => {
    component.openModal(mockCategories[0]);
    component.closeModal();
    expect(component.showModal()).toBe(false);
    expect(component.selectedCategory).toBeNull();
    expect(component.isSaving()).toBe(false);
  });

  it("should show info toast when saving without a name", () => {
    component.openModal();
    component.categoryForm.name = "";
    component.saveCategory();
    expect(toastServiceSpy.show).toHaveBeenCalledWith(
      "CATEGORIES_PAGE.ALERTS.REQUIRED_NAME",
      "info"
    );
    expect(categoryServiceSpy.createCategory).not.toHaveBeenCalled();
  });

  it("should create a new category and prepend to list", () => {
    component.openModal();
    component.categoryForm.name = "Beverages";
    component.saveCategory();
    expect(categoryServiceSpy.createCategory).toHaveBeenCalled();
    expect(component.categories().length).toBe(3);
    expect(component.categories()[0].name).toBe("New Cat");
    expect(toastServiceSpy.show).toHaveBeenCalledWith(
      "CATEGORIES_PAGE.ALERTS.CREATED",
      "success"
    );
  });

  it("should update an existing category in the list", () => {
    component.openModal(mockCategories[0]);
    component.categoryForm.name = "Fruits Updated";
    component.saveCategory();
    expect(categoryServiceSpy.updateCategory).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ name: "Fruits Updated" })
    );
    const updated = component.categories().find((c) => c._id === "c1");
    expect(updated?.name).toBe("Fruits Updated");
    expect(toastServiceSpy.show).toHaveBeenCalledWith(
      "CATEGORIES_PAGE.ALERTS.UPDATED",
      "success"
    );
  });

  it("should delete a category and remove from list", () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    component.deleteCategory(mockCategories[0]);
    expect(categoryServiceSpy.deleteCategory).toHaveBeenCalledWith("c1");
    expect(component.categories().find((c) => c._id === "c1")).toBeUndefined();
    expect(toastServiceSpy.show).toHaveBeenCalledWith(
      "CATEGORIES_PAGE.ALERTS.DELETED",
      "success"
    );
  });

  it("should block non-admin from deleting a category", () => {
    authServiceSpy.getCurrentUser.mockReturnValue({ role: "cashier" });
    component.ngOnInit();
    component.deleteCategory(mockCategories[0]);
    expect(categoryServiceSpy.deleteCategory).not.toHaveBeenCalled();
    expect(toastServiceSpy.show).toHaveBeenCalledWith(
      "CATEGORIES_PAGE.ALERTS.ADMIN_DELETE",
      "error"
    );
  });

  it("should update icon in form when selectIcon is called", () => {
    component.openModal();
    component.selectIcon("fas fa-coffee");
    expect(component.categoryForm.icon).toBe("fas fa-coffee");
  });

  it("should update color in form when selectColor is called", () => {
    component.openModal();
    component.selectColor("#ef4444");
    expect(component.categoryForm.color).toBe("#ef4444");
  });
});
