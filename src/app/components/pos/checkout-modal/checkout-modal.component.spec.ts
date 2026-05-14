import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA, SimpleChange } from "@angular/core";
import {
  CheckoutModalComponent,
  PaymentMethod,
} from "./checkout-modal.component";
import { TranslationService } from "../../../services/translation.service";
import { EMPTY } from "rxjs";

const translationServiceMock = {
  translate: jest.fn().mockReturnValue(""),
  current: "en",
  translationsChanged$: EMPTY,
};

describe("CheckoutModalComponent", () => {
  let component: CheckoutModalComponent;
  let fixture: ComponentFixture<CheckoutModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutModalComponent],
      providers: [
        { provide: TranslationService, useValue: translationServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutModalComponent);
    component = fixture.componentInstance;
    component.total = 100;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  // ──────────────────────────────────────────────
  // ngOnChanges
  // ──────────────────────────────────────────────

  describe("ngOnChanges()", () => {
    it("should set cashAmount to total when show becomes true", () => {
      component.total = 50;
      component.show = true;
      component.ngOnChanges({
        show: new SimpleChange(false, true, false),
      });
      expect(component.cashAmount).toBe(50);
    });

    it("should not reset when show stays false", () => {
      component.cashAmount = 999;
      component.ngOnChanges({
        show: new SimpleChange(false, false, false),
      });
      expect(component.cashAmount).toBe(999);
    });
  });

  // ──────────────────────────────────────────────
  // validatePayment()
  // ──────────────────────────────────────────────

  describe("validatePayment()", () => {
    it("returns true when cash >= total", () => {
      component.paymentMethod = "cash";
      component.cashAmount = 100;
      expect(component.validatePayment()).toBe(true);
    });

    it("returns false when cash < total", () => {
      component.paymentMethod = "cash";
      component.cashAmount = 50;
      expect(component.validatePayment()).toBe(false);
    });

    it("returns true when card >= total", () => {
      component.paymentMethod = "card";
      component.cardAmount = 100;
      expect(component.validatePayment()).toBe(true);
    });

    it("returns false when card < total", () => {
      component.paymentMethod = "card";
      component.cardAmount = 0;
      expect(component.validatePayment()).toBe(false);
    });

    it("returns true when transfer >= total", () => {
      component.paymentMethod = "transfer";
      component.transferAmount = 100;
      expect(component.validatePayment()).toBe(true);
    });

    it("returns true when mixed amounts sum >= total", () => {
      component.paymentMethod = "mixed";
      component.cashAmount = 50;
      component.cardAmount = 30;
      component.transferAmount = 20;
      expect(component.validatePayment()).toBe(true);
    });

    it("returns false when mixed amounts sum < total", () => {
      component.paymentMethod = "mixed";
      component.cashAmount = 10;
      component.cardAmount = 10;
      component.transferAmount = 10;
      expect(component.validatePayment()).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // getPaymentDetails()
  // ──────────────────────────────────────────────

  describe("getPaymentDetails()", () => {
    it("returns cash details with change", () => {
      component.paymentMethod = "cash";
      component.cashAmount = 120;
      const details = component.getPaymentDetails();
      expect(details.cash).toBe(120);
      expect(details.change).toBe(20);
    });

    it("returns card details", () => {
      component.paymentMethod = "card";
      component.cardAmount = 100;
      const details = component.getPaymentDetails();
      expect(details.card).toBe(100);
    });

    it("returns transfer details", () => {
      component.paymentMethod = "transfer";
      component.transferAmount = 100;
      const details = component.getPaymentDetails();
      expect(details.transfer).toBe(100);
    });

    it("returns mixed details with change", () => {
      component.paymentMethod = "mixed";
      component.cashAmount = 60;
      component.cardAmount = 50;
      component.transferAmount = 10;
      const details = component.getPaymentDetails();
      expect(details.cash).toBe(60);
      expect(details.card).toBe(50);
      expect(details.transfer).toBe(10);
      expect(details.change).toBe(20); // 120 - 100
    });
  });

  // ──────────────────────────────────────────────
  // changeAmount getter
  // ──────────────────────────────────────────────

  describe("changeAmount getter", () => {
    it("returns change for cash payment", () => {
      component.paymentMethod = "cash";
      component.cashAmount = 150;
      expect(component.changeAmount).toBe(50);
    });

    it("returns 0 when cash is less than total (no negative change)", () => {
      component.paymentMethod = "cash";
      component.cashAmount = 80;
      expect(component.changeAmount).toBe(0);
    });

    it("returns change for mixed payment", () => {
      component.paymentMethod = "mixed";
      component.cashAmount = 60;
      component.cardAmount = 60;
      component.transferAmount = 0;
      expect(component.changeAmount).toBe(20);
    });

    it("returns 0 for card payment", () => {
      component.paymentMethod = "card";
      component.cardAmount = 100;
      expect(component.changeAmount).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // setPaymentMethod()
  // ──────────────────────────────────────────────

  describe("setPaymentMethod()", () => {
    it("sets cash method and fills cashAmount = total", () => {
      component.total = 75;
      component.setPaymentMethod("cash");
      expect(component.paymentMethod).toBe("cash");
      expect(component.cashAmount).toBe(75);
      expect(component.cardAmount).toBe(0);
      expect(component.transferAmount).toBe(0);
    });

    it("sets card method and fills cardAmount = total", () => {
      component.total = 75;
      component.setPaymentMethod("card");
      expect(component.paymentMethod).toBe("card");
      expect(component.cardAmount).toBe(75);
      expect(component.cashAmount).toBe(0);
      expect(component.transferAmount).toBe(0);
    });

    it("sets transfer method and fills transferAmount = total", () => {
      component.total = 75;
      component.setPaymentMethod("transfer");
      expect(component.paymentMethod).toBe("transfer");
      expect(component.transferAmount).toBe(75);
      expect(component.cashAmount).toBe(0);
      expect(component.cardAmount).toBe(0);
    });

    it("sets mixed method without resetting all amounts", () => {
      component.setPaymentMethod("mixed");
      expect(component.paymentMethod).toBe("mixed");
    });
  });

  // ──────────────────────────────────────────────
  // onClose()
  // ──────────────────────────────────────────────

  describe("onClose()", () => {
    it("emits close event and resets form", () => {
      const closeSpy = jest.spyOn(component.close, "emit");
      component.cashAmount = 200;
      component.paymentMethod = "card";
      component.onClose();
      expect(closeSpy).toHaveBeenCalled();
      expect(component.paymentMethod).toBe("cash");
      expect(component.cashAmount).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // onCompleteSale()
  // ──────────────────────────────────────────────

  describe("onCompleteSale()", () => {
    it("emits completeSale with payment details when valid", () => {
      const completeSpy = jest.spyOn(component.completeSale, "emit");
      component.paymentMethod = "cash";
      component.cashAmount = 100;
      component.onCompleteSale();
      expect(completeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethod: "cash",
          cashAmount: 100,
        })
      );
    });

    it("does not emit when payment is invalid", () => {
      const completeSpy = jest.spyOn(component.completeSale, "emit");
      component.paymentMethod = "cash";
      component.cashAmount = 0;
      component.onCompleteSale();
      expect(completeSpy).not.toHaveBeenCalled();
    });
  });
});
