import { TestBed, ComponentFixture } from "@angular/core/testing";
import { CartComponent } from "./cart.component";
import { CartService } from "../../services/cart.service";
import { CartItem, Product } from "../../models";
import { of } from "rxjs";

const mockProduct = (id: string, price = 10): Product =>
  ({
    _id: id,
    product_id: id,
    name: `Product ${id}`,
    price,
    ean: id,
  }) as Product;

const mockCartItem = (qty = 1, price = 10): CartItem => ({
  product: mockProduct("p1", price),
  quantity: qty,
  discount: 0,
  subtotal: price * qty,
});

describe("CartComponent", () => {
  let component: CartComponent;
  let fixture: ComponentFixture<CartComponent>;
  let cartServiceSpy: jest.Mocked<Partial<CartService>>;

  beforeEach(async () => {
    cartServiceSpy = {} as any;

    await TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [{ provide: CartService, useValue: cartServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("getTotalItems", () => {
    it("should return 0 when cart is empty", () => {
      component.cartItems = [];
      expect(component.getTotalItems()).toBe(0);
    });

    it("should sum all item quantities", () => {
      component.cartItems = [mockCartItem(3), mockCartItem(2)];
      expect(component.getTotalItems()).toBe(5);
    });
  });

  describe("calculateTotal", () => {
    it("should return 0 for empty cart", () => {
      component.cartItems = [];
      expect(component.calculateTotal()).toBe(0);
    });

    it("should correctly sum price * quantity for all items", () => {
      component.cartItems = [mockCartItem(2, 5), mockCartItem(1, 20)];
      expect(component.calculateTotal()).toBe(30);
    });
  });

  describe("getItemSubtotal", () => {
    it("should return price * quantity", () => {
      const item = mockCartItem(3, 7);
      expect(component.getItemSubtotal(item)).toBe(21);
    });
  });

  describe("getItemsBySupplier", () => {
    it("should group items by supplier", () => {
      component.cartItems = [
        {
          ...mockCartItem(),
          product: { ...mockProduct("a"), supplier: "SupA" } as any,
        },
        {
          ...mockCartItem(),
          product: { ...mockProduct("b"), supplier: "SupA" } as any,
        },
        {
          ...mockCartItem(),
          product: { ...mockProduct("c"), supplier: "SupB" } as any,
        },
      ];
      const groups = component.getItemsBySupplier();
      expect(groups.length).toBe(2);
      const supA = groups.find((g) => g.supplier === "SupA");
      expect(supA?.items.length).toBe(2);
    });

    it('should group items with no supplier under "Unknown Supplier"', () => {
      component.cartItems = [mockCartItem()];
      const groups = component.getItemsBySupplier();
      expect(groups[0].supplier).toBe("Unknown Supplier");
    });
  });

  describe("event emitters", () => {
    it("should emit switchTab on onSwitchTab()", () => {
      const emitSpy = jest.spyOn(component.switchTab, "emit");
      component.onSwitchTab(2);
      expect(emitSpy).toHaveBeenCalledWith(2);
    });

    it("should emit addTab on onAddTab()", () => {
      const emitSpy = jest.spyOn(component.addTab, "emit");
      component.onAddTab();
      expect(emitSpy).toHaveBeenCalled();
    });

    it("should emit removeItem on onRemoveItem()", () => {
      const emitSpy = jest.spyOn(component.removeItem, "emit");
      component.onRemoveItem("item-id-1");
      expect(emitSpy).toHaveBeenCalledWith("item-id-1");
    });

    it("should emit clearCart on onClearCart()", () => {
      const emitSpy = jest.spyOn(component.clearCart, "emit");
      component.onClearCart();
      expect(emitSpy).toHaveBeenCalled();
    });

    it("should emit placeOrder on onPlaceOrder()", () => {
      const emitSpy = jest.spyOn(component.placeOrder, "emit");
      component.onPlaceOrder();
      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe("onImageError", () => {
    it("should set src to placeholder on error", () => {
      const div = document.createElement("img");
      const event = { target: div } as unknown as Event;
      component.onImageError(event);
      expect(div.src).toContain("placeholder.png");
    });
  });

  describe("tab close logic", () => {
    it("should emit closeTab directly when tab has no items", () => {
      const emitSpy = jest.spyOn(component.closeTab, "emit");
      component.salesTabs = [{ items: [] }];
      const event = new MouseEvent("click");
      component.onCloseTab(0, event);
      expect(emitSpy).toHaveBeenCalledWith(0);
    });

    it("should show confirmation when tab has items", () => {
      component.salesTabs = [{ items: [mockCartItem()] }];
      const event = new MouseEvent("click");
      component.onCloseTab(0, event);
      expect(component.showCloseConfirmation()).toBe(true);
      expect(component.tabToClose()).toBe(0);
    });

    it("confirmCloseTab emits closeTab and resets state", () => {
      const emitSpy = jest.spyOn(component.closeTab, "emit");
      component.tabToClose.set(2);
      component.showCloseConfirmation.set(true);
      component.confirmCloseTab();
      expect(emitSpy).toHaveBeenCalledWith(2);
      expect(component.showCloseConfirmation()).toBe(false);
      expect(component.tabToClose()).toBeNull();
    });

    it("confirmCloseTab does nothing when tabToClose is null", () => {
      const emitSpy = jest.spyOn(component.closeTab, "emit");
      component.tabToClose.set(null);
      component.confirmCloseTab();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it("cancelCloseTab resets confirmation state", () => {
      component.showCloseConfirmation.set(true);
      component.tabToClose.set(1);
      component.cancelCloseTab();
      expect(component.showCloseConfirmation()).toBe(false);
      expect(component.tabToClose()).toBeNull();
    });
  });

  describe("increaseQuantity / decreaseQuantity", () => {
    beforeEach(() => {
      cartServiceSpy.updateQuantity = jest.fn();
    });

    it("increaseQuantity calls cartService.updateQuantity with qty+1", () => {
      const item = mockCartItem(2);
      component.increaseQuantity(item);
      expect(cartServiceSpy.updateQuantity).toHaveBeenCalledWith("p1", 3);
    });

    it("increaseQuantity does nothing when product has no _id", () => {
      const item = {
        ...mockCartItem(),
        product: { ...mockProduct(""), _id: undefined },
      } as any;
      component.increaseQuantity(item);
      expect(cartServiceSpy.updateQuantity).not.toHaveBeenCalled();
    });

    it("decreaseQuantity calls updateQuantity with qty-1 when qty > 1", () => {
      const item = mockCartItem(3);
      component.decreaseQuantity(item);
      expect(cartServiceSpy.updateQuantity).toHaveBeenCalledWith("p1", 2);
    });

    it("decreaseQuantity emits removeItem when qty becomes 0", () => {
      const removeSpy = jest.spyOn(component.removeItem, "emit");
      const item = mockCartItem(1);
      component.decreaseQuantity(item);
      expect(removeSpy).toHaveBeenCalledWith("p1");
    });

    it("decreaseQuantity does nothing when product has no _id", () => {
      const item = {
        ...mockCartItem(),
        product: { ...mockProduct(""), _id: undefined },
      } as any;
      component.decreaseQuantity(item);
      expect(cartServiceSpy.updateQuantity).not.toHaveBeenCalled();
    });
  });

  describe("price editor", () => {
    it("openPriceEditor sets editingItem and shows editor", () => {
      const item = mockCartItem();
      component.openPriceEditor(item);
      expect(component.editingItem()).toEqual(item);
      expect(component.showPriceEditor()).toBe(true);
    });

    it("closePriceEditor hides editor and clears item", () => {
      component.showPriceEditor.set(true);
      component.editingItem.set(mockCartItem());
      component.closePriceEditor();
      expect(component.showPriceEditor()).toBe(false);
      expect(component.editingItem()).toBeNull();
    });

    it("onPriceChanged updates item price and emits priceChanged", () => {
      const item = mockCartItem(1, 10);
      component.openPriceEditor(item);
      const spy = jest.spyOn(component.priceChanged, "emit");
      component.onPriceChanged({ value: 25 });
      expect(spy).toHaveBeenCalledWith({ itemId: "p1", newPrice: 25 });
      expect(item.product.price).toBe(25);
    });

    it("onPriceChanged does nothing when editingItem is null", () => {
      component.editingItem.set(null);
      const spy = jest.spyOn(component.priceChanged, "emit");
      component.onPriceChanged({ value: 25 });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("misc emitters and helpers", () => {
    it("onPlaceOrderWithMethod emits method", () => {
      const spy = jest.spyOn(component.placeOrderWithMethod, "emit");
      component.onPlaceOrderWithMethod("cash");
      expect(spy).toHaveBeenCalledWith("cash");
    });

    it("onCloseMobileCart emits closeMobileCart", () => {
      const spy = jest.spyOn(component.closeMobileCart, "emit");
      component.onCloseMobileCart();
      expect(spy).toHaveBeenCalled();
    });

    it("calculateSubtotal returns total minus discountAmount", () => {
      component.cartItems = [mockCartItem(2, 10)];
      component.discountAmount.set(5);
      expect(component.calculateSubtotal()).toBe(15);
    });

    it("addToQuickAccess calls cartService.addProductToQuickAccess", () => {
      const { of } = require("rxjs");
      cartServiceSpy.addProductToQuickAccess = jest
        .fn()
        .mockReturnValue(of({}));
      const item = mockCartItem();
      component.addToQuickAccess(item);
      expect(cartServiceSpy.addProductToQuickAccess).toHaveBeenCalledWith("p1");
    });

    it("addToQuickAccess does nothing when product has no _id", () => {
      cartServiceSpy.addProductToQuickAccess = jest.fn();
      const item = {
        ...mockCartItem(),
        product: { ...mockProduct(""), _id: undefined },
      } as any;
      component.addToQuickAccess(item);
      expect(cartServiceSpy.addProductToQuickAccess).not.toHaveBeenCalled();
    });
  });
});
