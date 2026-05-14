import { TestBed, ComponentFixture } from "@angular/core/testing";
import { WeightModalComponent } from "./weight-modal.component";
import { Product } from "../../../models";

const mockProduct: Product = {
  _id: "p1",
  product_id: "p1",
  name: "Apples",
  price: 2.5,
  ean: "123",
  requiresScale: true,
};

describe("WeightModalComponent", () => {
  let component: WeightModalComponent;
  let fixture: ComponentFixture<WeightModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeightModalComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(WeightModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("ngOnChanges", () => {
    it("should auto-populate weight from scale when show=true, scaleConnected=true, savedWeight>0", () => {
      component.show = true;
      component.scaleConnected = true;
      component.savedWeight = 1.5;
      component.ngOnChanges();
      expect(component.manualWeight).toBe(1.5);
    });

    it("should reset manualWeight to 0 when scale not connected", () => {
      component.manualWeight = 2;
      component.show = true;
      component.scaleConnected = false;
      component.savedWeight = 1.5;
      component.ngOnChanges();
      expect(component.manualWeight).toBe(0);
    });

    it("should reset manualWeight to 0 when savedWeight is 0", () => {
      component.manualWeight = 2;
      component.show = true;
      component.scaleConnected = true;
      component.savedWeight = 0;
      component.ngOnChanges();
      expect(component.manualWeight).toBe(0);
    });

    it("should do nothing when show is false", () => {
      component.manualWeight = 5;
      component.show = false;
      component.ngOnChanges();
      expect(component.manualWeight).toBe(5);
    });
  });

  describe("onClose", () => {
    it("should reset manualWeight and emit close", () => {
      const closeSpy = jest.spyOn(component.close, "emit");
      component.manualWeight = 3;
      component.onClose();
      expect(component.manualWeight).toBe(0);
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe("onConfirm", () => {
    it("should emit confirmWeight when product and weight > 0", () => {
      const confirmSpy = jest.spyOn(component.confirmWeight, "emit");
      component.product = mockProduct;
      component.manualWeight = 2.5;
      component.onConfirm();
      expect(confirmSpy).toHaveBeenCalledWith({
        product: mockProduct,
        weight: 2.5,
      });
      expect(component.manualWeight).toBe(0);
    });

    it("should not emit if product is null", () => {
      const confirmSpy = jest.spyOn(component.confirmWeight, "emit");
      component.product = null;
      component.manualWeight = 2;
      component.onConfirm();
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it("should not emit if manualWeight is 0", () => {
      const confirmSpy = jest.spyOn(component.confirmWeight, "emit");
      component.product = mockProduct;
      component.manualWeight = 0;
      component.onConfirm();
      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });
});
