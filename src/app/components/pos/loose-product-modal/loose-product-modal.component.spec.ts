import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA, SimpleChange } from "@angular/core";
import { EMPTY } from "rxjs";
import { LooseProductModalComponent } from "./loose-product-modal.component";
import { TranslationService } from "../../../services/translation.service";

describe("LooseProductModalComponent", () => {
  let component: LooseProductModalComponent;
  let fixture: ComponentFixture<LooseProductModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LooseProductModalComponent],
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

    fixture = TestBed.createComponent(LooseProductModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  // ──────────────────────────────────────────────
  // ngOnChanges
  // ──────────────────────────────────────────────

  describe("ngOnChanges()", () => {
    it("auto-populates weight from scale when show becomes true and scale connected", () => {
      component.show = true;
      component.scaleConnected = true;
      component.savedWeight = 1.234;
      component.ngOnChanges({
        show: new SimpleChange(false, true, false),
      });
      expect(component.weight).toBe("1.234");
    });

    it("does not set weight when scale not connected", () => {
      component.weight = "";
      component.show = true;
      component.scaleConnected = false;
      component.savedWeight = 2.5;
      component.ngOnChanges({
        show: new SimpleChange(false, true, false),
      });
      expect(component.weight).toBe("");
    });

    it("updates weight when savedWeight changes and modal is open", () => {
      component.show = true;
      component.savedWeight = 3.0;
      component.ngOnChanges({
        savedWeight: new SimpleChange(0, 3.0, false),
      });
      expect(component.weight).toBe("3.000");
    });

    it("does not update weight when modal is closed", () => {
      component.show = false;
      component.weight = "1.000";
      component.savedWeight = 5.0;
      component.ngOnChanges({
        savedWeight: new SimpleChange(0, 5.0, false),
      });
      expect(component.weight).toBe("1.000");
    });

    it("pre-populates the description when an initial description is provided", () => {
      component.show = true;
      component.initialDescription = "Loose Apples";

      component.ngOnChanges({
        show: new SimpleChange(false, true, false),
      });

      expect(component.description).toBe("Loose Apples");
    });
  });

  // ──────────────────────────────────────────────
  // Computed getters
  // ──────────────────────────────────────────────

  describe("calculatedTotal getter", () => {
    it("returns weight * pricePerKg when both valid", () => {
      component.weight = "2.5";
      component.pricePerKg = "4.0";
      expect(component.calculatedTotal).toBeCloseTo(10);
    });

    it("returns 0 when weight is non-numeric", () => {
      component.weight = "abc";
      component.pricePerKg = "4.0";
      expect(component.calculatedTotal).toBe(0);
    });

    it("returns 0 when pricePerKg is zero", () => {
      component.weight = "2.5";
      component.pricePerKg = "0";
      expect(component.calculatedTotal).toBe(0);
    });
  });

  describe("pricePerKgValue getter", () => {
    it("returns parsed numeric value", () => {
      component.pricePerKg = "3.50";
      expect(component.pricePerKgValue).toBe(3.5);
    });

    it("returns 0 for non-numeric input", () => {
      component.pricePerKg = "abc";
      expect(component.pricePerKgValue).toBe(0);
    });
  });

  describe("isValid getter", () => {
    it("returns true when both weight and price are positive", () => {
      component.weight = "1.0";
      component.pricePerKg = "5.0";
      expect(component.isValid).toBe(true);
    });

    it("returns false when weight is 0", () => {
      component.weight = "0";
      component.pricePerKg = "5.0";
      expect(component.isValid).toBe(false);
    });

    it("returns false when pricePerKg is 0", () => {
      component.weight = "1.0";
      component.pricePerKg = "0";
      expect(component.isValid).toBe(false);
    });

    it("returns false for non-numeric", () => {
      component.weight = "x";
      component.pricePerKg = "y";
      expect(component.isValid).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // onClose / onConfirm
  // ──────────────────────────────────────────────

  describe("onClose()", () => {
    it("emits close and resets form", () => {
      const closeSpy = jest.spyOn(component.close, "emit");
      component.weight = "1.5";
      component.pricePerKg = "3.0";
      component.description = "Meat";
      component.onClose();
      expect(closeSpy).toHaveBeenCalled();
      expect(component.weight).toBe("");
      expect(component.pricePerKg).toBe("");
      expect(component.description).toBe("");
    });
  });

  describe("onConfirm()", () => {
    it("emits confirm with calculated total", () => {
      const confirmSpy = jest.spyOn(component.confirm, "emit");
      component.weight = "2.0";
      component.pricePerKg = "5.0";
      component.description = "Cheese";
      component.onConfirm();
      expect(confirmSpy).toHaveBeenCalledWith({
        weight: 2.0,
        pricePerKg: 5.0,
        description: "Cheese",
        totalPrice: 10.0,
      });
      // Form reset after confirm
      expect(component.weight).toBe("");
    });

    it('uses "Loose Product" fallback when description is empty', () => {
      const confirmSpy = jest.spyOn(component.confirm, "emit");
      component.weight = "1.0";
      component.pricePerKg = "3.0";
      component.description = "";
      component.onConfirm();
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({ description: "Loose Product" })
      );
    });

    it("does nothing when form is invalid", () => {
      const confirmSpy = jest.spyOn(component.confirm, "emit");
      component.weight = "0";
      component.pricePerKg = "5.0";
      component.onConfirm();
      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });
});
