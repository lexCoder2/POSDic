import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { By } from "@angular/platform-browser";
import { of, throwError } from "rxjs";
import { EMPTY } from "rxjs";
import { ProductFormComponent } from "./product-form.component";
import { ProductService } from "../../services/product.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";
import { CurrencyService } from "../../services/currency.service";
import { AuthService } from "../../services/auth.service";
import { ToggleSwitchComponent } from "../toggle-switch/toggle-switch.component";

const makeProductServiceMock = () => ({
  generateUniqueEAN: jest.fn().mockReturnValue(of({ ean: "1234567890123" })),
  createProduct: jest.fn().mockReturnValue(of({ _id: "new-1", name: "Test" })),
  updateProduct: jest
    .fn()
    .mockReturnValue(of({ _id: "edit-1", name: "Updated" })),
});

const makeToastMock = () => ({ show: jest.fn() });
const makeTranslationMock = () => ({
  translate: jest.fn().mockReturnValue("translated"),
  current: "en",
  translationsChanged$: EMPTY,
});
const makeCurrencyMock = () => ({
  getCurrencySymbol: jest.fn().mockReturnValue(() => "$"),
});
const makeAuthMock = () => ({
  getToken: jest.fn().mockReturnValue("fake-token"),
});

const mockProduct = {
  _id: "prod-1",
  name: "Existing Product",
  price: 9.99,
  image_url: "/assets/product.jpg",
  ean: "111",
} as any;

const mockCategories = [
  { _id: "cat-1", name: "Beverages" },
  { _id: "cat-2", name: "Snacks" },
] as any[];

describe("ProductFormComponent", () => {
  let component: ProductFormComponent;
  let fixture: ComponentFixture<ProductFormComponent>;
  let productServiceMock: ReturnType<typeof makeProductServiceMock>;
  let toastMock: ReturnType<typeof makeToastMock>;
  let translationMock: ReturnType<typeof makeTranslationMock>;

  beforeEach(async () => {
    productServiceMock = makeProductServiceMock();
    toastMock = makeToastMock();
    translationMock = makeTranslationMock();

    await TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        { provide: ProductService, useValue: productServiceMock },
        { provide: ToastService, useValue: toastMock },
        { provide: TranslationService, useValue: translationMock },
        { provide: CurrencyService, useValue: makeCurrencyMock() },
        { provide: AuthService, useValue: makeAuthMock() },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
    component.categories = mockCategories;
    component.allBrands = ["BrandA", "BrandB", "BrandC"];
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  // ──────────────────────────────────────────────
  // ngOnInit
  // ──────────────────────────────────────────────

  describe("ngOnInit()", () => {
    it("loads localStorage toggles and initializes filtered lists", () => {
      localStorage.setItem("productForm_showRequiredFieldsOnly", "true");
      localStorage.setItem("productForm_createAnotherProduct", "false");
      component.ngOnInit();
      expect(component.showRequiredFieldsOnly()).toBe(true);
      expect(component.createAnotherProduct()).toBe(false);
      expect(component.filteredBrands).toEqual(["BrandA", "BrandB", "BrandC"]);
      expect(component.filteredCategories).toEqual(mockCategories);
      localStorage.removeItem("productForm_showRequiredFieldsOnly");
      localStorage.removeItem("productForm_createAnotherProduct");
    });

    it("uses defaults when localStorage is empty", () => {
      localStorage.removeItem("productForm_showRequiredFieldsOnly");
      localStorage.removeItem("productForm_createAnotherProduct");
      component.ngOnInit();
      expect(component.showRequiredFieldsOnly()).toBe(false);
      expect(component.createAnotherProduct()).toBe(true);
    });
  });

  // ──────────────────────────────────────────────
  // ngOnChanges
  // ──────────────────────────────────────────────

  describe("ngOnChanges()", () => {
    it("populates form from product when product is provided", () => {
      component.product = mockProduct;
      component.ngOnChanges();
      expect(component.isEditingProduct).toBe(true);
      expect(component.productForm.name).toBe("Existing Product");
      expect(component.imagePreview()).toBe("/assets/product.jpg");
    });

    it("resets form when no product", () => {
      component.product = null;
      component.ngOnChanges();
      expect(component.isEditingProduct).toBe(false);
      expect(component.productForm.name).toBe("");
    });
  });

  // ──────────────────────────────────────────────
  // Toggle persistence
  // ──────────────────────────────────────────────

  describe("onShowRequiredFieldsToggle()", () => {
    it("sets signal and saves to localStorage", () => {
      component.onShowRequiredFieldsToggle(true);
      expect(component.showRequiredFieldsOnly()).toBe(true);
      expect(localStorage.getItem("productForm_showRequiredFieldsOnly")).toBe(
        "true"
      );
    });
  });

  describe("onCreateAnotherToggle()", () => {
    it("sets signal and saves to localStorage", () => {
      component.onCreateAnotherToggle(false);
      expect(component.createAnotherProduct()).toBe(false);
      expect(localStorage.getItem("productForm_createAnotherProduct")).toBe(
        "false"
      );
    });
  });

  // ──────────────────────────────────────────────
  // filterBrands / filterCategories
  // ──────────────────────────────────────────────

  describe("filterBrands()", () => {
    it("filters brands by partial match", () => {
      component.allBrands = ["Apple", "Samsung", "Appleton"];
      component.filterBrands("app");
      expect(component.filteredBrands).toEqual(["Apple", "Appleton"]);
    });

    it("returns empty array when no match", () => {
      component.filterBrands("zzz");
      expect(component.filteredBrands).toEqual([]);
    });
  });

  describe("filterCategories()", () => {
    it("filters categories by partial match", () => {
      component.categories = mockCategories;
      component.filterCategories("bev");
      expect(component.filteredCategories.length).toBe(1);
      expect(component.filteredCategories[0].name).toBe("Beverages");
    });
  });

  // ──────────────────────────────────────────────
  // removeImage()
  // ──────────────────────────────────────────────

  describe("removeImage()", () => {
    it("clears image selection and preview", () => {
      component.selectedImageFile = new File([""], "img.jpg");
      component.imagePreview.set("/path/img.jpg");
      component.productForm.image_url = "/path/img.jpg";
      component.removeImage();
      expect(component.selectedImageFile).toBeNull();
      expect(component.imagePreview()).toBeNull();
      expect(component.productForm.image_url).toBe("");
    });
  });

  // ──────────────────────────────────────────────
  // generateAndSetEAN()
  // ──────────────────────────────────────────────

  describe("generateAndSetEAN()", () => {
    it("sets ean from response and shows toast", () => {
      productServiceMock.generateUniqueEAN.mockReturnValue(
        of({ ean: "9876543210123" })
      );
      component.generateAndSetEAN();
      expect(component.productForm.ean).toBe("9876543210123");
      expect(toastMock.show).toHaveBeenCalledWith(
        expect.stringContaining("9876543210123"),
        "success"
      );
    });

    it("shows error toast on failure", () => {
      productServiceMock.generateUniqueEAN.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.generateAndSetEAN();
      expect(toastMock.show).toHaveBeenCalledWith(expect.any(String), "error");
    });
  });

  // ──────────────────────────────────────────────
  // saveProduct()
  // ──────────────────────────────────────────────

  describe("saveProduct()", () => {
    it("shows info toast when name is missing", async () => {
      component.productForm.name = "";
      component.productForm.price = 10;
      await component.saveProduct();
      expect(toastMock.show).toHaveBeenCalledWith("translated", "info");
      expect(productServiceMock.createProduct).not.toHaveBeenCalled();
    });

    it("shows info toast when price is missing", async () => {
      component.productForm.name = "Product";
      component.productForm.price = undefined;
      await component.saveProduct();
      expect(toastMock.show).toHaveBeenCalledWith("translated", "info");
    });

    it("allows creating a product with a zero price", async () => {
      component.product = null;
      component.isEditingProduct = false;
      component.productForm.name = "Free Sample";
      component.productForm.category = "Snacks";
      component.productForm.price = 0;
      component.productForm.image_url = "/assets/img.jpg";
      component.selectedImageFile = null;
      component.createAnotherProduct.set(false);

      await component.saveProduct();

      expect(productServiceMock.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Free Sample",
          price: 0,
        })
      );
      expect(toastMock.show).not.toHaveBeenCalledWith("translated", "info");
    });

    it("creates new product and emits productSaved", async () => {
      const savedSpy = jest.spyOn(component.productSaved, "emit");
      component.product = null;
      component.isEditingProduct = false;
      component.productForm.name = "New Widget";
      component.productForm.price = 5.99;
      component.productForm.image_url = "/assets/img.jpg";
      component.selectedImageFile = null;
      component.createAnotherProduct.set(false);

      await component.saveProduct();

      expect(productServiceMock.createProduct).toHaveBeenCalled();
      expect(savedSpy).toHaveBeenCalledWith({ _id: "new-1", name: "Test" });
      expect(toastMock.show).toHaveBeenCalledWith("translated", "success");
    });

    it("updates existing product and emits productSaved", async () => {
      const savedSpy = jest.spyOn(component.productSaved, "emit");
      component.product = mockProduct;
      component.isEditingProduct = true;
      component.productForm = {
        ...mockProduct,
        name: "Updated Widget",
        price: 12,
      };
      component.productForm.image_url = "/assets/img.jpg";
      component.selectedImageFile = null;

      await component.saveProduct();

      expect(productServiceMock.updateProduct).toHaveBeenCalledWith(
        "prod-1",
        expect.any(Object)
      );
      expect(savedSpy).toHaveBeenCalledWith({ _id: "edit-1", name: "Updated" });
    });

    it("shows error toast on create failure", async () => {
      productServiceMock.createProduct.mockReturnValue(
        throwError(() => new Error("error"))
      );
      component.product = null;
      component.isEditingProduct = false;
      component.productForm.name = "Bad Product";
      component.productForm.price = 1;
      component.productForm.image_url = "/assets/img.jpg";
      component.selectedImageFile = null;

      await component.saveProduct();

      expect(toastMock.show).toHaveBeenCalledWith("translated", "error");
    });

    it("shows error toast on update failure", async () => {
      productServiceMock.updateProduct.mockReturnValue(
        throwError(() => new Error("error"))
      );
      component.product = mockProduct;
      component.isEditingProduct = true;
      component.productForm = {
        ...mockProduct,
        price: 10,
        image_url: "/assets/img.jpg",
      };
      component.selectedImageFile = null;

      await component.saveProduct();

      expect(toastMock.show).toHaveBeenCalledWith("translated", "error");
    });

    it("sets cost to price when cost is 0", async () => {
      component.product = null;
      component.isEditingProduct = false;
      component.productForm.name = "Widget";
      component.productForm.price = 20;
      component.productForm.cost = 0;
      component.productForm.image_url = "/assets/img.jpg";
      component.selectedImageFile = null;
      component.createAnotherProduct.set(false);

      await component.saveProduct();

      const callArg = productServiceMock.createProduct.mock.calls[0][0];
      expect(callArg.cost).toBe(20);
    });
  });

  describe("availability toggle", () => {
    it("binds the Available for sale toggle to productForm.available", () => {
      localStorage.removeItem("productForm_showRequiredFieldsOnly");
      localStorage.removeItem("productForm_createAnotherProduct");
      component.show = true;
      component.product = null;
      component.showRequiredFieldsOnly.set(false);
      component.createAnotherProduct.set(false);
      component.ngOnChanges();
      component.productForm = {
        ...component.productForm,
        active: false,
        available: true,
        requiresScale: false,
      };

      fixture.detectChanges();

      const toggles = fixture.debugElement
        .queryAll(By.directive(ToggleSwitchComponent))
        .map(
          (debugElement) =>
            debugElement.componentInstance as ToggleSwitchComponent
        );
      const availableToggle = toggles.slice(1).find((toggle) => toggle.checked);

      expect(availableToggle).toBeTruthy();

      expect(availableToggle!.checked).toBe(true);

      availableToggle!.change.emit(false);
      fixture.detectChanges();

      expect(component.productForm.available).toBe(false);
      expect(component.productForm.active).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // onCloseModal()
  // ──────────────────────────────────────────────

  describe("onCloseModal()", () => {
    it("emits closeModal and resets form", () => {
      const closeSpy = jest.spyOn(component.closeModal, "emit");
      component.productForm.name = "some product";
      component.onCloseModal();
      expect(closeSpy).toHaveBeenCalled();
      expect(component.productForm.name).toBe("");
    });
  });

  // ──────────────────────────────────────────────
  // stopWebcam()
  // ──────────────────────────────────────────────

  describe("stopWebcam()", () => {
    it("stops tracks and clears webcam state", () => {
      const stopMock = jest.fn();
      component.webcamStream = {
        getTracks: jest.fn().mockReturnValue([{ stop: stopMock }]),
      } as any;
      component.showWebcam = true;
      component.stopWebcam();
      expect(stopMock).toHaveBeenCalled();
      expect(component.webcamStream).toBeNull();
      expect(component.showWebcam).toBe(false);
    });

    it("handles null stream gracefully", () => {
      component.webcamStream = null;
      component.showWebcam = true;
      component.stopWebcam();
      expect(component.showWebcam).toBe(false);
    });
  });
});
