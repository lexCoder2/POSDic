import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { of, throwError } from "rxjs";
import { FavoritesComponent } from "./favorites.component";
import { ProductService } from "../../services/product.service";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";

describe("FavoritesComponent", () => {
  let component: FavoritesComponent;
  let fixture: ComponentFixture<FavoritesComponent>;
  let mockProductService: { getFavoriteProducts: jest.Mock };

  const sampleProducts: any[] = [
    { _id: "1", name: "Apple", price: 1.0, local_image: "apple.png" },
    { _id: "2", name: "Banana", price: 0.5 },
  ];

  beforeEach(async () => {
    mockProductService = {
      getFavoriteProducts: jest.fn().mockReturnValue(of(sampleProducts)),
    };

    await TestBed.configureTestingModule({
      imports: [FavoritesComponent],
      providers: [
        { provide: ProductService, useValue: mockProductService },
        { provide: TranslatePipe, useValue: { transform: (k: string) => k } },
        {
          provide: CurrencyPipe,
          useValue: { transform: (v: number) => String(v) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(FavoritesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("ngOnInit()", () => {
    it("calls loadTopProducts", () => {
      const spy = jest.spyOn(component, "loadTopProducts");
      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("loadTopProducts()", () => {
    it("populates products on success", () => {
      component.ngOnInit();
      expect(component.products).toEqual(sampleProducts);
      expect(component.isLoading()).toBe(false);
      expect(component.loadError()).toBe(false);
    });

    it("sets loadError on failure", () => {
      mockProductService.getFavoriteProducts.mockReturnValue(
        throwError(() => new Error("timeout"))
      );
      jest.spyOn(console, "error").mockImplementation();
      component.ngOnInit();
      expect(component.loadError()).toBe(true);
      expect(component.isLoading()).toBe(false);
    });
  });

  describe("selectProduct()", () => {
    it("emits productSelected event", () => {
      const spy = jest.spyOn(component.productSelected, "emit");
      component.selectProduct(sampleProducts[0]);
      expect(spy).toHaveBeenCalledWith(sampleProducts[0]);
    });
  });

  describe("getProductImageUrl()", () => {
    it("returns URL when local_image is present", () => {
      const url = component.getProductImageUrl(sampleProducts[0]);
      expect(url).toContain("apple.png");
    });

    it("returns empty string when no local_image", () => {
      const url = component.getProductImageUrl(sampleProducts[1]);
      expect(url).toBe("");
    });
  });

  describe("onImageError()", () => {
    it("hides the image and appends fallback element", () => {
      const mockParent = document.createElement("div");
      const mockTarget = document.createElement("img");
      mockParent.appendChild(mockTarget);
      const event = { target: mockTarget } as any;
      component.onImageError(event);
      expect(mockTarget.style.display).toBe("none");
      expect(mockParent.querySelector(".no-image")).toBeTruthy();
    });

    it("handles null parent gracefully", () => {
      const mockTarget = document.createElement("img");
      // detached from DOM — parentElement is null
      const event = { target: mockTarget } as any;
      expect(() => component.onImageError(event)).not.toThrow();
    });
  });

  describe("ngOnDestroy()", () => {
    it("completes destroy$", () => {
      const spy = jest.spyOn((component as any).destroy$, "complete");
      component.ngOnDestroy();
      expect(spy).toHaveBeenCalled();
    });
  });
});
