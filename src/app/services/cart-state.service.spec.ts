import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { CartStateService } from "./cart-state.service";
import { Cart } from "../models";
import { environment } from "@environments/environment";

const mockCart: Cart = {
  _id: "cart-123",
  cashier: "user-1",
  items: [],
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,
  status: "active",
};

describe("CartStateService", () => {
  let service: CartStateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CartStateService],
    });
    service = TestBed.inject(CartStateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("cart$ observable", () => {
    it("should emit null initially", (done) => {
      service.cart$.subscribe((cart) => {
        expect(cart).toBeNull();
        done();
      });
    });

    it("should emit cart after setCart", (done) => {
      service.setCart(mockCart);
      service.cart$.subscribe((cart) => {
        expect(cart).toEqual(mockCart);
        done();
      });
    });
  });

  describe("getCurrentCart", () => {
    it("should return null initially", () => {
      expect(service.getCurrentCart()).toBeNull();
    });

    it("should return current cart after setCart", () => {
      service.setCart(mockCart);
      expect(service.getCurrentCart()).toEqual(mockCart);
    });
  });

  describe("setCart", () => {
    it("should update cartSubject", () => {
      service.setCart(mockCart);
      expect(service.getCurrentCart()?._id).toBe("cart-123");
    });

    it("should accept null to clear the cart", () => {
      service.setCart(mockCart);
      service.setCart(null);
      expect(service.getCurrentCart()).toBeNull();
    });
  });

  describe("createCart", () => {
    it("should POST to create a cart and update observable", (done) => {
      service
        .createCart({
          cashier: "user-1",
          items: [],
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          status: "active",
        })
        .subscribe((cart) => {
          expect(cart._id).toBe("cart-123");
          expect(service.getCurrentCart()).toEqual(mockCart);
          done();
        });

      const req = httpMock.expectOne(`${environment.apiUrl}/carts`);
      expect(req.request.method).toBe("POST");
      req.flush(mockCart);
    });
  });

  describe("updateCart", () => {
    it("should PUT to update the cart", (done) => {
      const updated = { ...mockCart, total: 50 };
      service.updateCart("cart-123", { total: 50 }).subscribe((cart) => {
        expect(cart.total).toBe(50);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/carts/cart-123`);
      expect(req.request.method).toBe("PUT");
      req.flush(updated);
    });
  });

  describe("deleteCart", () => {
    it("should DELETE cart and clear observable if matching", (done) => {
      service.setCart(mockCart);
      service.deleteCart("cart-123").subscribe(() => {
        expect(service.getCurrentCart()).toBeNull();
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/carts/cart-123`);
      expect(req.request.method).toBe("DELETE");
      req.flush({});
    });

    it("should not clear observable if id does not match", (done) => {
      service.setCart(mockCart);
      service.deleteCart("other-cart").subscribe(() => {
        expect(service.getCurrentCart()?._id).toBe("cart-123");
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/carts/other-cart`);
      req.flush({});
    });
  });

  describe("completeCart", () => {
    it("should PUT to complete cart and set observable to null", (done) => {
      service.setCart(mockCart);
      service.completeCart("cart-123").subscribe(() => {
        expect(service.getCurrentCart()).toBeNull();
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/carts/cart-123/complete`
      );
      expect(req.request.method).toBe("PUT");
      req.flush(mockCart);
    });
  });

  describe("saveCartState", () => {
    it("should call updateCart if cart has _id", (done) => {
      service.saveCartState(mockCart).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/carts/cart-123`);
      expect(req.request.method).toBe("PUT");
      req.flush(mockCart);
      done();
    });

    it("should call createCart if cart has no _id", (done) => {
      const newCart = { ...mockCart, _id: undefined } as any;
      service.saveCartState(newCart).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/carts`);
      expect(req.request.method).toBe("POST");
      req.flush(mockCart);
      done();
    });
  });

  describe("getActiveCart", () => {
    it("should GET /carts/active/:cashierId and update cart$", (done) => {
      service.getActiveCart("user-1").subscribe((cart) => {
        expect(cart?._id).toBe("cart-123");
        expect(service.getCurrentCart()?._id).toBe("cart-123");
        done();
      });

      const req = httpMock.expectOne(
        `${environment.apiUrl}/carts/active/user-1`
      );
      expect(req.request.method).toBe("GET");
      req.flush(mockCart);
    });
  });

  describe("getCarts", () => {
    it("should GET /carts without params when no filters", (done) => {
      service.getCarts().subscribe((carts) => {
        expect(carts).toEqual([mockCart]);
        done();
      });

      const req = httpMock.expectOne(
        (r) => r.url === `${environment.apiUrl}/carts`
      );
      req.flush([mockCart]);
    });

    it("should pass cashier filter as query param", (done) => {
      service.getCarts({ cashier: "user-5" }).subscribe();

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${environment.apiUrl}/carts` &&
          r.params.get("cashier") === "user-5"
      );
      req.flush([]);
      done();
    });

    it("should pass status and date filters", (done) => {
      service
        .getCarts({
          status: "active",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        })
        .subscribe();

      const req = httpMock.expectOne(
        (r) =>
          r.url === `${environment.apiUrl}/carts` &&
          r.params.get("status") === "active" &&
          r.params.get("startDate") === "2024-01-01"
      );
      req.flush([]);
      done();
    });
  });

  describe("calculateTotals", () => {
    const items: any[] = [{ subtotal: 20 }, { subtotal: 30 }];

    it("calculates subtotal, tax, discount, total correctly", () => {
      const result = service.calculateTotals(items, 5, 10);
      expect(result.subtotal).toBe(50);
      expect(result.discount).toBe(5);
      // taxableAmount = 50 - 5 = 45; tax = 45 * 0.1 = 4.5
      expect(result.tax).toBeCloseTo(4.5);
      expect(result.total).toBeCloseTo(49.5);
    });

    it("returns zero tax when taxRate is 0", () => {
      const result = service.calculateTotals(items, 0, 0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(50);
    });
  });

  describe("clearCart", () => {
    it("should set cartSubject to null", () => {
      service.setCart(mockCart);
      service.clearCart();
      expect(service.getCurrentCart()).toBeNull();
    });
  });
});
