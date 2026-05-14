import { TestBed } from "@angular/core/testing";
import { CartService } from "./cart.service";
import { HttpClientTestingModule } from "@angular/common/http/testing";
import { Product, CartItem } from "../models";

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  _id: "prod-1",
  product_id: "P001",
  name: "Test Product",
  price: 10,
  taxRate: 0,
  requiresScale: false,
  ...overrides,
});

describe("CartService", () => {
  let service: CartService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CartService],
    });

    localStorage.clear();
    service = TestBed.inject(CartService);
    service.clearCart();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("addItem()", () => {
    it("should add a new product to the cart", () => {
      const product = makeProduct();
      service.addItem(product);

      const items = (service as any).cartItems.value;
      expect(items.length).toBe(1);
      expect(items[0].product._id).toBe("prod-1");
      expect(items[0].quantity).toBe(1);
    });

    it("should increase quantity when adding an existing product", () => {
      const product = makeProduct();
      service.addItem(product, 1);
      service.addItem(product, 2);

      expect((service as any).cartItems.value[0].quantity).toBe(3);
    });

    it("should set subtotal correctly on add", () => {
      service.addItem(makeProduct({ price: 25 }), 3);
      expect((service as any).cartItems.value[0].subtotal).toBe(75);
    });

    it("should use weight as quantity for scale products", () => {
      const product = makeProduct({ requiresScale: true });
      service.addItem(product, 1, 0.5);

      expect((service as any).cartItems.value[0].quantity).toBe(0.5);
    });

    it("should save cart to localStorage", () => {
      service.addItem(makeProduct());
      expect(localStorage.getItem("pos_cart")).not.toBeNull();
    });
  });

  describe("removeItem()", () => {
    it("should remove an item from the cart", () => {
      service.addItem(makeProduct({ _id: "prod-1" }));
      service.addItem(
        makeProduct({ _id: "prod-2", product_id: "P002", name: "B" })
      );
      service.removeItem("prod-1");

      const items = (service as any).cartItems.value;
      expect(items.length).toBe(1);
      expect(items[0].product._id).toBe("prod-2");
    });

    it("should not throw when removing a non-existent product", () => {
      expect(() => service.removeItem("nonexistent")).not.toThrow();
    });
  });

  describe("updateQuantity()", () => {
    it("should update the quantity of an existing item", () => {
      service.addItem(makeProduct());
      service.updateQuantity("prod-1", 5);

      expect((service as any).cartItems.value[0].quantity).toBe(5);
    });

    it("should remove item when quantity is set to 0", () => {
      service.addItem(makeProduct());
      service.updateQuantity("prod-1", 0);

      expect((service as any).cartItems.value.length).toBe(0);
    });

    it("should remove item when quantity is set to negative", () => {
      service.addItem(makeProduct());
      service.updateQuantity("prod-1", -1);

      expect((service as any).cartItems.value.length).toBe(0);
    });
  });

  describe("updateDiscount()", () => {
    it("should apply a discount and update subtotal", () => {
      service.addItem(makeProduct({ price: 100 }), 1);
      service.updateDiscount("prod-1", 10);

      const item = (service as any).cartItems.value[0];
      expect(item.discount).toBe(10);
      expect(item.subtotal).toBe(90);
    });

    it("should clamp discount to 100", () => {
      service.addItem(makeProduct());
      service.updateDiscount("prod-1", 150);

      expect((service as any).cartItems.value[0].discount).toBe(100);
    });

    it("should clamp discount to 0 (no negative discounts)", () => {
      service.addItem(makeProduct());
      service.updateDiscount("prod-1", -10);

      expect((service as any).cartItems.value[0].discount).toBe(0);
    });
  });

  describe("clearCart()", () => {
    it("should empty the cart", () => {
      service.addItem(makeProduct());
      service.clearCart();

      expect((service as any).cartItems.value.length).toBe(0);
    });

    it("should remove cart from localStorage", () => {
      service.addItem(makeProduct());
      service.clearCart();

      expect(localStorage.getItem("pos_cart")).toBeNull();
    });
  });

  describe("getSubtotal()", () => {
    it("should return sum of (price * quantity) across all items", () => {
      service.addItem(makeProduct({ _id: "a", product_id: "A", price: 10 }), 2);
      service.addItem(
        makeProduct({ _id: "b", product_id: "B", name: "B", price: 5 }),
        3
      );

      expect(service.getSubtotal()).toBe(35);
    });

    it("should return 0 for empty cart", () => {
      expect(service.getSubtotal()).toBe(0);
    });
  });

  describe("getTotal()", () => {
    it("should return subtotal for items with no discount and no tax", () => {
      service.addItem(makeProduct({ price: 100, taxRate: 0 }), 2);
      expect(service.getTotal()).toBe(200);
    });

    it("should subtract discounts from total", () => {
      service.addItem(makeProduct({ price: 100, taxRate: 0 }), 1);
      service.updateDiscount("prod-1", 20);

      expect(service.getTotal()).toBe(80);
    });

    it("should add tax to total after discount", () => {
      service.addItem(makeProduct({ price: 100, taxRate: 10 }), 1);

      // total = 100 - 0_discount + 10_tax = 110
      expect(service.getTotal()).toBeCloseTo(110, 2);
    });
  });

  describe("getTotalDiscount()", () => {
    it("should sum all discounts", () => {
      service.addItem(
        makeProduct({ _id: "a", product_id: "A", price: 100 }),
        1
      );
      service.addItem(
        makeProduct({ _id: "b", product_id: "B", name: "B", price: 200 }),
        1
      );
      service.updateDiscount("a", 10);
      service.updateDiscount("b", 20);

      expect(service.getTotalDiscount()).toBe(50);
    });
  });

  describe("getItemCount()", () => {
    it("should return sum of all item quantities", () => {
      service.addItem(makeProduct({ _id: "a", product_id: "A" }), 3);
      service.addItem(makeProduct({ _id: "b", product_id: "B", name: "B" }), 2);

      expect(service.getItemCount()).toBe(5);
    });

    it("should return 0 for empty cart", () => {
      expect(service.getItemCount()).toBe(0);
    });
  });

  describe("loadCart() - via constructor", () => {
    it("should load cart from localStorage on construction", () => {
      const items = [
        { product: makeProduct(), quantity: 2, discount: 0, subtotal: 20 },
      ];
      localStorage.setItem("pos_cart", JSON.stringify(items));
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [CartService],
      });
      const freshService = TestBed.inject(CartService);
      expect(freshService.getItemCount()).toBe(2);
    });

    it("should handle invalid JSON in localStorage gracefully", () => {
      localStorage.setItem("pos_cart", "NOT_JSON");
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [CartService],
      });
      const freshService = TestBed.inject(CartService);
      expect(freshService.getItemCount()).toBe(0);
      consoleSpy.mockRestore();
    });
  });

  describe("addItem() - update existing with scale and customName", () => {
    it("should update weight and customName for existing scale product", () => {
      const scaleProduct = makeProduct({ _id: "sp1", requiresScale: true });
      service.addItem(scaleProduct, 1, 1.5);
      service.addItem(scaleProduct, 1, 2.0, "Custom Name");
      const items = (service as any).cartItems.value;
      expect(items[0].weight).toBe(2.0);
      expect(items[0].customName).toBe("Custom Name");
    });
  });

  describe("API methods", () => {
    let httpMock: any;

    beforeEach(() => {
      const { HttpTestingController } = require("@angular/common/http/testing");
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it("getActiveCart should GET /active/:cashierId", () => {
      service.getActiveCart("cashier-1").subscribe();
      const req = httpMock.expectOne((r: any) =>
        r.url.includes("/active/cashier-1")
      );
      expect(req.request.method).toBe("GET");
      req.flush({});
    });

    it("createCart should POST to carts endpoint", () => {
      service.createCart({ user: "u1" }).subscribe();
      const req = httpMock.expectOne(
        (r: any) => r.url.includes("/carts") && r.method === "POST"
      );
      req.flush({});
    });

    it("updateCart should PUT to carts/:cartId", () => {
      service.updateCart("cart-1", { items: [] }).subscribe();
      const req = httpMock.expectOne((r: any) =>
        r.url.includes("/carts/cart-1")
      );
      expect(req.request.method).toBe("PUT");
      req.flush({});
    });

    it("deleteCart should DELETE /carts/:cartId", () => {
      service.deleteCart("cart-2").subscribe();
      const req = httpMock.expectOne((r: any) =>
        r.url.includes("/carts/cart-2")
      );
      expect(req.request.method).toBe("DELETE");
      req.flush({});
    });

    it("getAllCarts should GET /carts with filters", () => {
      service.getAllCarts({ status: "active" }).subscribe();
      const req = httpMock.expectOne(
        (r: any) => r.url.includes("/carts") && r.method === "GET"
      );
      req.flush([]);
    });

    it("markCartAsAbandoned should PUT with abandoned status", () => {
      service.markCartAsAbandoned("cart-3").subscribe();
      const req = httpMock.expectOne((r: any) =>
        r.url.includes("/carts/cart-3")
      );
      expect(req.request.body).toEqual({ status: "abandoned" });
      req.flush({});
    });

    it("getIncompleteCartForCashier should GET /carts with params", () => {
      service.getIncompleteCartForCashier("c1").subscribe();
      const req = httpMock.expectOne(
        (r: any) => r.url.includes("/carts") && r.method === "GET"
      );
      req.flush([]);
    });

    it("addProductToQuickAccess should POST to quick-access endpoint", () => {
      service.addProductToQuickAccess("prod-1").subscribe();
      const req = httpMock.expectOne((r: any) =>
        r.url.includes("quick-access/prod-1")
      );
      expect(req.request.method).toBe("POST");
      req.flush({});
    });
  });
});
