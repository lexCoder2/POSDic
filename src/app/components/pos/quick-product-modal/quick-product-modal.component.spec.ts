import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { EMPTY } from "rxjs";
import { QuickProductModalComponent } from "./quick-product-modal.component";
import { TranslationService } from "../../../services/translation.service";

describe("QuickProductModalComponent", () => {
  let component: QuickProductModalComponent;
  let fixture: ComponentFixture<QuickProductModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuickProductModalComponent],
      providers: [
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            current: "en",
            translationsChanged$: EMPTY,
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(QuickProductModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("ngOnChanges()", () => {
    it("populates productName from barcode when show becomes true", () => {
      component.show = true;
      component.barcode = "9876543";
      component.ngOnChanges();
      expect(component.productName).toBe("Product 9876543");
      expect(component.productPrice).toBe(0);
      expect(component.requiresScale).toBe(false);
    });

    it("does not populate when show is false", () => {
      component.show = false;
      component.barcode = "9876543";
      component.productName = "Old Name";
      component.ngOnChanges();
      expect(component.productName).toBe("Old Name");
    });

    it("does not populate when barcode is empty", () => {
      component.show = true;
      component.barcode = "";
      component.productName = "Old Name";
      component.ngOnChanges();
      expect(component.productName).toBe("Old Name");
    });
  });

  describe("onClose()", () => {
    it("emits close event and resets form", () => {
      const closeSpy = jest.spyOn(component.close, "emit");
      component.productName = "Widget";
      component.productPrice = 5;
      component.onClose();
      expect(closeSpy).toHaveBeenCalled();
      expect(component.productName).toBe("");
      expect(component.productPrice).toBe(0);
    });
  });

  describe("onCreateProduct()", () => {
    it("emits createProduct event with form data", () => {
      const createSpy = jest.spyOn(component.createProduct, "emit");
      component.barcode = "EAN123";
      component.productName = "New Widget";
      component.productPrice = 9.99;
      component.requiresScale = false;
      component.onCreateProduct();
      expect(createSpy).toHaveBeenCalledWith({
        barcode: "EAN123",
        name: "New Widget",
        price: 9.99,
        requiresScale: false,
      });
      // Form should be reset after emitting
      expect(component.productName).toBe("");
      expect(component.productPrice).toBe(0);
    });

    it("does nothing when price is 0", () => {
      const createSpy = jest.spyOn(component.createProduct, "emit");
      component.productPrice = 0;
      component.onCreateProduct();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it("does nothing when price is negative", () => {
      const createSpy = jest.spyOn(component.createProduct, "emit");
      component.productPrice = -1;
      component.onCreateProduct();
      expect(createSpy).not.toHaveBeenCalled();
    });

    it("emits with requiresScale = true", () => {
      const createSpy = jest.spyOn(component.createProduct, "emit");
      component.barcode = "W123";
      component.productName = "Cheese";
      component.productPrice = 5;
      component.requiresScale = true;
      component.onCreateProduct();
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({ requiresScale: true })
      );
    });
  });

  describe("onSellLoose()", () => {
    it("emits sellLoose with the current product name and resets the form", () => {
      const sellLooseSpy = jest.spyOn(component.sellLoose, "emit");
      component.barcode = "EAN123";
      component.productName = "Bulk Apples";
      component.productPrice = 4.5;
      component.requiresScale = true;

      component.onSellLoose();

      expect(sellLooseSpy).toHaveBeenCalledWith("Bulk Apples");
      expect(component.productName).toBe("");
      expect(component.productPrice).toBe(0);
      expect(component.requiresScale).toBe(false);
    });

    it("falls back to the barcode-based product name when no name was entered", () => {
      const sellLooseSpy = jest.spyOn(component.sellLoose, "emit");
      component.barcode = "EAN123";
      component.productName = "   ";

      component.onSellLoose();

      expect(sellLooseSpy).toHaveBeenCalledWith("Product EAN123");
    });
  });
});
