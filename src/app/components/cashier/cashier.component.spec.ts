import { ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { EMPTY, BehaviorSubject, of } from "rxjs";

import { CashierComponent } from "./cashier.component";
import { SaleService } from "../../services/sale.service";
import { CartService } from "../../services/cart.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { CurrencyService } from "../../services/currency.service";
import { ScaleService } from "../../services/scale.service";
import { ReceiptGeneratorService } from "../../services/receipt-generator.service";
import { RegisterService } from "../../services/register.service";
import { TranslationService } from "../../services/translation.service";

describe("CashierComponent", () => {
  let component: CashierComponent;
  let fixture: ComponentFixture<CashierComponent>;

  let saleServiceSpy: any;
  let cartServiceSpy: any;
  let authServiceSpy: any;
  let scaleServiceSpy: any;
  let registerServiceSpy: any;
  const currentRegister$ = new BehaviorSubject<any>(null);

  const mockUser = {
    id: "u1",
    username: "cashier",
    role: "cashier",
    permissions: ["sales"],
  };

  beforeEach(async () => {
    saleServiceSpy = {
      createSale: jest.fn().mockReturnValue(of({})),
    };

    cartServiceSpy = {
      getActiveCart: jest.fn().mockReturnValue(of(null)),
      createCart: jest.fn().mockReturnValue(of({ _id: "cart1", items: [] })),
      updateCart: jest.fn().mockReturnValue(of({})),
      deleteCart: jest.fn().mockReturnValue(of({})),
    };

    authServiceSpy = {
      getCurrentUser: jest.fn().mockReturnValue(mockUser),
    };

    scaleServiceSpy = {
      currentWeight$: EMPTY,
      isConnected: jest.fn().mockReturnValue(false),
      autoConnectScale: jest.fn().mockResolvedValue(false),
    };

    registerServiceSpy = {
      currentRegister$: currentRegister$.asObservable(),
      getActiveRegister: jest.fn().mockReturnValue(of(null)),
      getDeviceId: jest.fn().mockReturnValue("device-123"),
      getDeviceName: jest.fn().mockReturnValue("Test Device"),
      getCurrentRegister: jest.fn().mockReturnValue(null),
      getDeviceRegister: jest.fn().mockReturnValue(
        of({
          register: null,
          isDeviceBound: false,
          canManageOthers: true,
          suggestedRegister: null,
        })
      ),
      getAvailableRegisters: jest
        .fn()
        .mockReturnValue(of({ registers: [], canManageOthers: true })),
      openRegister: jest.fn().mockReturnValue(of({})),
    };

    const currencyServiceSpy = {
      getSymbol: jest.fn().mockReturnValue("$"),
      format: jest
        .fn()
        .mockImplementation((v: number) => `$${v?.toFixed(2) ?? "0.00"}`),
      getCurrencyCode: jest.fn().mockReturnValue("USD"),
    };

    const receiptGenSpy = {
      printSaleReceipt: jest.fn().mockResolvedValue(undefined),
    };

    const toastServiceSpy = {
      show: jest.fn(),
    };

    const translationServiceSpy = {
      translate: jest.fn().mockReturnValue(""),
      translationsChanged$: EMPTY,
    };

    await TestBed.configureTestingModule({
      imports: [CashierComponent, RouterTestingModule],
      providers: [
        { provide: SaleService, useValue: saleServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: CurrencyService, useValue: currencyServiceSpy },
        { provide: ScaleService, useValue: scaleServiceSpy },
        { provide: ReceiptGeneratorService, useValue: receiptGenSpy },
        { provide: RegisterService, useValue: registerServiceSpy },
        { provide: TranslationService, useValue: translationServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CashierComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should initialize with empty items signal", () => {
    expect(component.items()).toEqual([]);
  });

  it("should initialize total as 0", () => {
    expect(component.total()).toBe(0);
  });

  describe("openRegisterModal", () => {
    it("should set showOpenRegisterModal to true", () => {
      component.openRegisterModal();
      expect(component.showOpenRegisterModal()).toBe(true);
    });
  });

  describe("closeRegisterModal", () => {
    it("should set showOpenRegisterModal to false", () => {
      component.showOpenRegisterModal.set(true);
      component.closeRegisterModal();
      expect(component.showOpenRegisterModal()).toBe(false);
    });
  });

  describe("onRegisterOpened", () => {
    it("should close register modal and reload active register", () => {
      component.showOpenRegisterModal.set(true);
      component.onRegisterOpened();
      expect(component.showOpenRegisterModal()).toBe(false);
      expect(registerServiceSpy.getActiveRegister).toHaveBeenCalled();
    });
  });

  describe("getLastItemPrice", () => {
    it("should return null when there are no items", () => {
      component.items.set([]);
      expect(component.getLastItemPrice()).toBeNull();
    });

    it("should return the unitPrice of the last item", () => {
      component.items.set([
        { id: 1, price: 10, unitPrice: 5, quantity: 2 },
        { id: 2, price: 20, unitPrice: 20, quantity: 1 },
      ]);
      expect(component.getLastItemPrice()).toBe(20);
    });
  });

  describe("blurButton", () => {
    it("should call blur on the event target", () => {
      const mockElement = { blur: jest.fn() };
      const mockEvent = { target: mockElement } as unknown as Event;
      component.blurButton(mockEvent);
      expect(mockElement.blur).toHaveBeenCalled();
    });
  });

  describe("signal initialization", () => {
    it("should initialize showPaymentModal as false", () => {
      expect(component.showPaymentModal()).toBe(false);
    });

    it("should initialize showLooseProductModal as false", () => {
      expect(component.showLooseProductModal()).toBe(false);
    });

    it("should initialize scaleConnected as false", () => {
      expect(component.scaleConnected()).toBe(false);
    });

    it("should initialize activeTab as calculator", () => {
      expect(component.activeTab()).toBe("calculator");
    });

    it("should initialize currentRegister as null", () => {
      expect(component.currentRegister()).toBeNull();
    });

    it("should initialize isProcessing as false", () => {
      expect(component.isProcessing()).toBe(false);
    });
  });

  describe("ngOnInit", () => {
    it("should call getActiveRegister on init", () => {
      expect(registerServiceSpy.getActiveRegister).toHaveBeenCalled();
    });

    it("should call getActiveCart with current user id", () => {
      expect(cartServiceSpy.getActiveCart).toHaveBeenCalledWith(mockUser.id);
    });
  });

  // ──────────────────────────────────────────────
  // onCalculatorAdd
  // ──────────────────────────────────────────────

  describe("onCalculatorAdd()", () => {
    it("adds new item to items signal", () => {
      component.items.set([]);
      component.total.set(0);
      component.selectedItemId.set(null);
      component.onCalculatorAdd({ value: 5.99 });
      expect(component.items().length).toBe(1);
      expect(component.items()[0].price).toBe(5.99);
      expect(component.total()).toBeCloseTo(5.99);
    });

    it("updates selected item price when selectedItemId is set", () => {
      component.items.set([{ id: 10, price: 3, unitPrice: 3, quantity: 1 }]);
      component.total.set(3);
      component.selectedItemId.set(10);
      component.onCalculatorAdd({ value: 7 });
      expect(component.items()[0].price).toBe(7);
      expect(component.total()).toBeCloseTo(7);
      expect(component.selectedItemId()).toBeNull();
    });

    it("does nothing when selectedItemId does not match any item", () => {
      component.items.set([]);
      component.total.set(0);
      component.selectedItemId.set(999);
      component.onCalculatorAdd({ value: 5 });
      // No item updated, selectedId set to non-existent item
      expect(component.items().length).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // onCalculatorMultiplyConfirm
  // ──────────────────────────────────────────────

  describe("onCalculatorMultiplyConfirm()", () => {
    it('adds multiple items in "add" mode', () => {
      component.items.set([]);
      component.total.set(0);
      component.selectedItemId.set(null);
      component.onCalculatorMultiplyConfirm({
        mode: "add",
        quantity: 3,
        pendingValue: 2,
      });
      expect(component.items().length).toBe(1);
      expect(component.items()[0].quantity).toBe(3);
      expect(component.items()[0].price).toBe(6);
      expect(component.total()).toBeCloseTo(6);
    });

    it('updates selected item quantity in "update" mode', () => {
      component.items.set([{ id: 5, price: 10, unitPrice: 5, quantity: 2 }]);
      component.total.set(10);
      component.selectedItemId.set(5);
      component.onCalculatorMultiplyConfirm({
        mode: "update",
        quantity: 4,
        pendingValue: null,
      });
      expect(component.items()[0].quantity).toBe(4);
      expect(component.items()[0].price).toBe(20); // 5 * 4
      expect(component.total()).toBeCloseTo(20);
      expect(component.selectedItemId()).toBeNull();
    });

    it('multiplies last item in "update" mode when nothing selected', () => {
      component.items.set([{ id: 5, price: 10, unitPrice: 5, quantity: 2 }]);
      component.total.set(10);
      component.selectedItemId.set(null);
      component.onCalculatorMultiplyConfirm({
        mode: "update",
        quantity: 3,
        pendingValue: null,
      });
      expect(component.items()[0].quantity).toBe(3);
      expect(component.items()[0].price).toBe(15);
    });

    it('does nothing in "update" mode when items is empty', () => {
      component.items.set([]);
      component.total.set(0);
      component.selectedItemId.set(null);
      component.onCalculatorMultiplyConfirm({
        mode: "update",
        quantity: 3,
        pendingValue: null,
      });
      expect(component.items().length).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // clearAll
  // ──────────────────────────────────────────────

  describe("clearAll()", () => {
    it("clears items and resets total", () => {
      component.items.set([{ id: 1, price: 10, unitPrice: 10, quantity: 1 }]);
      component.total.set(10);
      component.clearAll();
      expect(component.items()).toEqual([]);
      expect(component.total()).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // removeItem
  // ──────────────────────────────────────────────

  describe("removeItem()", () => {
    it("removes item and updates total", () => {
      component.items.set([
        { id: 1, price: 10, unitPrice: 10, quantity: 1 },
        { id: 2, price: 5, unitPrice: 5, quantity: 1 },
      ]);
      component.total.set(15);
      component.removeItem(1);
      expect(component.items().length).toBe(1);
      expect(component.items()[0].id).toBe(2);
      expect(component.total()).toBeCloseTo(5);
    });

    it("clears selectedItemId if removed item was selected", () => {
      component.items.set([{ id: 3, price: 7, unitPrice: 7, quantity: 1 }]);
      component.total.set(7);
      component.selectedItemId.set(3);
      component.removeItem(3);
      expect(component.selectedItemId()).toBeNull();
    });

    it("does nothing when item id not found", () => {
      component.items.set([{ id: 1, price: 10, unitPrice: 10, quantity: 1 }]);
      component.total.set(10);
      component.removeItem(999);
      expect(component.items().length).toBe(1);
    });
  });

  // ──────────────────────────────────────────────
  // increaseQuantity / decreaseQuantity
  // ──────────────────────────────────────────────

  describe("increaseQuantity()", () => {
    it("increases quantity and adjusts price", () => {
      component.items.set([{ id: 1, price: 5, unitPrice: 5, quantity: 1 }]);
      component.total.set(5);
      component.increaseQuantity(1);
      expect(component.items()[0].quantity).toBe(2);
      expect(component.items()[0].price).toBe(10);
      expect(component.total()).toBeCloseTo(10);
    });

    it("does nothing for missing item id", () => {
      component.items.set([]);
      component.increaseQuantity(99);
      expect(component.items().length).toBe(0);
    });
  });

  describe("decreaseQuantity()", () => {
    it("decreases quantity and adjusts price", () => {
      component.items.set([{ id: 1, price: 10, unitPrice: 5, quantity: 2 }]);
      component.total.set(10);
      component.decreaseQuantity(1);
      expect(component.items()[0].quantity).toBe(1);
      expect(component.items()[0].price).toBe(5);
      expect(component.total()).toBeCloseTo(5);
    });

    it("removes item when quantity would reach 0", () => {
      component.items.set([{ id: 1, price: 5, unitPrice: 5, quantity: 1 }]);
      component.total.set(5);
      component.decreaseQuantity(1);
      expect(component.items().length).toBe(0);
    });

    it("does nothing for missing item id", () => {
      component.items.set([]);
      component.decreaseQuantity(99);
      expect(component.items().length).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // editItem
  // ──────────────────────────────────────────────

  describe("editItem()", () => {
    it("sets selectedItemId to the item id", () => {
      component.items.set([{ id: 7, price: 14, unitPrice: 7, quantity: 2 }]);
      component.editItem(7);
      expect(component.selectedItemId()).toBe(7);
    });

    it("does nothing for missing item", () => {
      component.items.set([]);
      component.selectedItemId.set(null);
      component.editItem(999);
      expect(component.selectedItemId()).toBeNull();
    });
  });

  // ──────────────────────────────────────────────
  // cancelPayment / completeSale
  // ──────────────────────────────────────────────

  describe("cancelPayment()", () => {
    it("closes payment modal and resets payment state", () => {
      component.showPaymentModal.set(true);
      component.selectedPaymentMethod.set("cash");
      component.cashReceived.set("20");
      component.change.set(5);
      component.cancelPayment();
      expect(component.showPaymentModal()).toBe(false);
      expect(component.selectedPaymentMethod()).toBeNull();
      expect(component.cashReceived()).toBe("");
      expect(component.change()).toBe(0);
    });
  });

  describe("completeSale()", () => {
    it("shows info toast when no register is open", () => {
      const toastSpy = TestBed.inject(ToastService as any) as any;
      component.currentRegister.set(null);
      component.completeSale("cash");
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "info");
      expect(component.showPaymentModal()).toBe(false);
    });

    it("does nothing when items list is empty", () => {
      component.currentRegister.set({ _id: "reg-1", name: "Reg 1" } as any);
      component.items.set([]);
      component.completeSale("cash");
      expect(component.showPaymentModal()).toBe(false);
    });

    it("opens payment modal when register is open and items exist", () => {
      component.currentRegister.set({ _id: "reg-1", name: "Reg 1" } as any);
      component.items.set([{ id: 1, price: 10, unitPrice: 10, quantity: 1 }]);
      component.isProcessing.set(false);
      component.completeSale("card");
      expect(component.showPaymentModal()).toBe(true);
      expect(component.selectedPaymentMethod()).toBe("card");
    });
  });

  // ──────────────────────────────────────────────
  // onCashReceivedChange
  // ──────────────────────────────────────────────

  describe("onCashReceivedChange()", () => {
    it("calculates change when cash >= total", () => {
      component.total.set(20);
      component.cashReceived.set("25");
      component.onCashReceivedChange();
      expect(component.change()).toBeCloseTo(5);
    });

    it("sets change to 0 when cash < total", () => {
      component.total.set(20);
      component.cashReceived.set("10");
      component.onCashReceivedChange();
      expect(component.change()).toBe(0);
    });

    it("sets change to 0 when cash is not a number", () => {
      component.total.set(20);
      component.cashReceived.set("abc");
      component.onCashReceivedChange();
      expect(component.change()).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // openLooseProductModal / closeLooseProductModal
  // ──────────────────────────────────────────────

  describe("openLooseProductModal()", () => {
    it("opens modal and resets loose product signals", () => {
      component.looseProductWeight.set("1.5");
      component.looseProductPricePerKg.set("3.0");
      component.openLooseProductModal();
      expect(component.showLooseProductModal()).toBe(true);
      expect(component.looseProductWeight()).toBe("");
      expect(component.looseProductPricePerKg()).toBe("");
    });
  });

  describe("cancelLooseProduct()", () => {
    it("should close loose product modal and clear fields", () => {
      component.showLooseProductModal.set(true);
      component.looseProductWeight.set("1.5");
      component.looseProductPricePerKg.set("10");
      component.looseProductDescription.set("cheese");
      component.cancelLooseProduct();
      expect(component.showLooseProductModal()).toBe(false);
      expect(component.looseProductWeight()).toBe("");
      expect(component.looseProductPricePerKg()).toBe("");
      expect(component.looseProductDescription()).toBe("");
    });
  });

  describe("toggleUseScaleWeight()", () => {
    it("should show toast when scale is not connected", () => {
      const toast = TestBed.inject(ToastService) as any;
      component.scaleConnected.set(false);
      component.toggleUseScaleWeight();
      expect(toast.show).toHaveBeenCalled();
    });

    it("should toggle useScaleWeight when scale is connected", () => {
      component.scaleConnected.set(true);
      component.useScaleWeight.set(false);
      component.toggleUseScaleWeight();
      expect(component.useScaleWeight()).toBe(true);
    });

    it("should apply current scale reading weight when enabled", () => {
      component.scaleConnected.set(true);
      component.currentScaleReading.set({
        weight: 2.5,
        unit: "kg",
        isStable: true,
      } as any);
      component.useScaleWeight.set(false);
      component.toggleUseScaleWeight();
      expect(component.looseProductWeight()).toBe("2.500");
    });
  });

  describe("confirmLooseProduct()", () => {
    it("should show toast for invalid weight", () => {
      const toast = TestBed.inject(ToastService) as any;
      component.looseProductWeight.set("abc");
      component.confirmLooseProduct();
      expect(toast.show).toHaveBeenCalledWith(expect.any(String), "info");
    });

    it("should show toast for invalid price per kg", () => {
      const toast = TestBed.inject(ToastService) as any;
      component.looseProductWeight.set("1.5");
      component.looseProductPricePerKg.set("0");
      component.confirmLooseProduct();
      expect(toast.show).toHaveBeenCalledWith(expect.any(String), "info");
    });

    it("should add item and close modal on valid input", () => {
      component.looseProductWeight.set("1.5");
      component.looseProductPricePerKg.set("10.0");
      component.looseProductDescription.set("Ham");
      component.confirmLooseProduct();
      expect(component.showLooseProductModal()).toBe(false);
      expect(component.items().length).toBe(1);
      expect(component.items()[0].description).toBe("Ham");
    });
  });

  describe("confirmAndWeighAnother()", () => {
    it("should show toast for invalid weight", () => {
      const toast = TestBed.inject(ToastService) as any;
      component.looseProductWeight.set("x");
      component.confirmAndWeighAnother();
      expect(toast.show).toHaveBeenCalledWith(expect.any(String), "info");
    });

    it("should show toast for invalid price per kg", () => {
      const toast = TestBed.inject(ToastService) as any;
      component.looseProductWeight.set("1.5");
      component.looseProductPricePerKg.set("-1");
      component.confirmAndWeighAnother();
      expect(toast.show).toHaveBeenCalled();
    });

    it("should add item and keep modal open on valid input", () => {
      const toast = TestBed.inject(ToastService) as any;
      component.looseProductWeight.set("2.0");
      component.looseProductPricePerKg.set("5.0");
      component.looseProductDescription.set("Turkey");
      component.showLooseProductModal.set(true);
      component.confirmAndWeighAnother();
      expect(component.items().length).toBe(1);
      expect(component.showLooseProductModal()).toBe(true);
      expect(component.looseProductWeight()).toBe("");
      expect(toast.show).toHaveBeenCalledWith(
        expect.stringContaining("Turkey"),
        "success"
      );
    });
  });

  describe("handleLooseProductEnter()", () => {
    it("should not confirm if weight is 0", () => {
      const confirmSpy = jest.spyOn(component, "confirmLooseProduct");
      component.looseProductWeight.set("0");
      component.looseProductPricePerKg.set("10");
      component.handleLooseProductEnter(new Event("keydown"));
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it("should call confirmLooseProduct when both weight and price are set", () => {
      const confirmSpy = jest
        .spyOn(component, "confirmLooseProduct")
        .mockImplementation(() => {});
      component.looseProductWeight.set("1.5");
      component.looseProductPricePerKg.set("10");
      component.handleLooseProductEnter(new Event("keydown"));
      expect(confirmSpy).toHaveBeenCalled();
    });
  });

  describe("cancelPayment()", () => {
    it("should close payment modal and reset payment state", () => {
      component.showPaymentModal.set(true);
      component.selectedPaymentMethod.set("cash");
      component.cashReceived.set("50");
      component.change.set(10);
      component.cancelPayment();
      expect(component.showPaymentModal()).toBe(false);
      expect(component.selectedPaymentMethod()).toBeNull();
      expect(component.cashReceived()).toBe("");
      expect(component.change()).toBe(0);
    });
  });

  describe("confirmPayment()", () => {
    it("should do nothing when no payment method selected", () => {
      component.selectedPaymentMethod.set(null);
      component.confirmPayment();
      expect(saleServiceSpy.createSale).not.toHaveBeenCalled();
    });

    it("should show toast when cash payment amount is insufficient", () => {
      const toast = TestBed.inject(ToastService) as any;
      component.selectedPaymentMethod.set("cash");
      component.total.set(50);
      component.cashReceived.set("30");
      component.confirmPayment();
      expect(toast.show).toHaveBeenCalledWith(expect.any(String), "info");
    });

    it("should create sale and clear items on card payment success", () => {
      saleServiceSpy.createSale.mockReturnValue(
        of({ _id: "sale1", total: 30 })
      );
      component.currentRegister.set({ _id: "reg1" } as any);
      component.items.set([{ price: 30, unitPrice: 30, quantity: 1, id: 1 }]);
      component.total.set(30);
      component.selectedPaymentMethod.set("card");
      component.confirmPayment();
      expect(saleServiceSpy.createSale).toHaveBeenCalled();
      expect(component.items().length).toBe(0);
    });

    it("should show error toast when createSale fails", () => {
      const { throwError } = require("rxjs");
      const toast = TestBed.inject(ToastService) as any;
      saleServiceSpy.createSale.mockReturnValue(
        throwError(() => new Error("sale error"))
      );
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      component.currentRegister.set({ _id: "reg1" } as any);
      component.items.set([{ price: 30, unitPrice: 30, quantity: 1, id: 1 }]);
      component.total.set(30);
      component.selectedPaymentMethod.set("card");
      component.confirmPayment();
      expect(toast.show).toHaveBeenCalledWith(expect.any(String), "error");
      expect(component.isProcessing()).toBe(false);
      consoleSpy.mockRestore();
    });

    it("should process cash payment with sufficient amount", () => {
      saleServiceSpy.createSale.mockReturnValue(
        of({ _id: "sale2", total: 20 })
      );
      component.currentRegister.set({ _id: "reg1" } as any);
      component.items.set([{ price: 20, unitPrice: 20, quantity: 1, id: 1 }]);
      component.total.set(20);
      component.selectedPaymentMethod.set("cash");
      component.cashReceived.set("30");
      component.change.set(10);
      component.confirmPayment();
      expect(saleServiceSpy.createSale).toHaveBeenCalled();
    });
  });

  describe("completeSale()", () => {
    it("should show toast when no register is open", () => {
      const toast = TestBed.inject(ToastService) as any;
      component.currentRegister.set(null);
      component.completeSale("cash");
      expect(toast.show).toHaveBeenCalledWith(expect.any(String), "info");
    });

    it("should open payment modal when register is open and items exist", () => {
      component.currentRegister.set({ _id: "reg1" } as any);
      component.items.set([{ price: 10, unitPrice: 10, quantity: 1, id: 1 }]);
      component.completeSale("card");
      expect(component.showPaymentModal()).toBe(true);
      expect(component.selectedPaymentMethod()).toBe("card");
    });

    it("should not open modal when items is empty", () => {
      component.currentRegister.set({ _id: "reg1" } as any);
      component.items.set([]);
      component.completeSale("cash");
      expect(component.showPaymentModal()).toBe(false);
    });
  });

  describe("clearAllItems()", () => {
    it("should do nothing when items list is empty", () => {
      component.items.set([]);
      component.clearAllItems();
      expect(saleServiceSpy.createSale).not.toHaveBeenCalled();
    });

    it("should confirm before clearing when items exist", () => {
      jest.spyOn(window, "confirm").mockReturnValue(true);
      component.items.set([{ price: 10, unitPrice: 10, quantity: 1, id: 1 }]);
      component.total.set(10);
      component.clearAllItems();
      expect(component.items().length).toBe(0);
    });

    it("should not clear when confirm returns false", () => {
      jest.spyOn(window, "confirm").mockReturnValue(false);
      component.items.set([{ price: 10, unitPrice: 10, quantity: 1, id: 1 }]);
      component.clearAllItems();
      expect(component.items().length).toBe(1);
    });
  });

  describe("onKeyboardInput()", () => {
    it("should update cashReceived and recalculate change", () => {
      component.total.set(30);
      component.onKeyboardInput({ value: "50" } as any);
      expect(component.cashReceived()).toBe("50");
      expect(component.change()).toBe(20);
    });
  });

  describe("handleKeyboardEvent()", () => {
    const makeKeyEvent = (key: string, code = "", keyCode = 0): KeyboardEvent =>
      ({
        key,
        code,
        keyCode,
        preventDefault: jest.fn(),
        target: { tagName: "DIV" },
      }) as any;

    it("should call calculator appendNumber for digit 5", () => {
      const calcSpy = {
        appendNumber: jest.fn(),
        appendDecimal: jest.fn(),
        handleEnter: jest.fn(),
        backspace: jest.fn(),
        clear: jest.fn(),
        handleMultiply: jest.fn(),
        display: jest.fn().mockReturnValue("0"),
        hasPendingValue: jest.fn().mockReturnValue(false),
      };
      (component as any).calculator = calcSpy;
      component.handleKeyboardEvent(makeKeyEvent("5", "", 53));
      expect(calcSpy.appendNumber).toHaveBeenCalledWith("5");
    });

    it('should call appendDecimal for "."', () => {
      const calcSpy = { appendDecimal: jest.fn() };
      (component as any).calculator = calcSpy;
      component.handleKeyboardEvent(makeKeyEvent(".", "", 190));
      expect(calcSpy.appendDecimal).toHaveBeenCalled();
    });

    it("should call handleEnter for Enter key", () => {
      const calcSpy = {
        handleEnter: jest.fn(),
        display: jest.fn().mockReturnValue("0"),
        hasPendingValue: jest.fn().mockReturnValue(false),
      };
      (component as any).calculator = calcSpy;
      component.handleKeyboardEvent(makeKeyEvent("Enter"));
      expect(calcSpy.handleEnter).toHaveBeenCalled();
    });

    it("should call clear for Escape key", () => {
      const calcSpy = { clear: jest.fn() };
      (component as any).calculator = calcSpy;
      component.handleKeyboardEvent(makeKeyEvent("Escape"));
      expect(calcSpy.clear).toHaveBeenCalled();
    });

    it("should call handleMultiply for * key", () => {
      const calcSpy = { handleMultiply: jest.fn() };
      (component as any).calculator = calcSpy;
      component.handleKeyboardEvent(makeKeyEvent("*"));
      expect(calcSpy.handleMultiply).toHaveBeenCalled();
    });

    it("should open loose product modal for g key", () => {
      component.handleKeyboardEvent(makeKeyEvent("g"));
      expect(component.showLooseProductModal()).toBe(true);
    });

    it("should open loose product modal for ArrowUp", () => {
      component.handleKeyboardEvent(makeKeyEvent("ArrowUp"));
      expect(component.showLooseProductModal()).toBe(true);
    });
  });
});
