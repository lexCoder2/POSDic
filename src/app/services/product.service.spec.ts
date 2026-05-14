import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { ProductService } from "./product.service";
import { environment } from "@environments/environment";

describe("ProductService", () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductService],
    });

    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe("getProducts()", () => {
    it("should GET /products without filters", () => {
      service.getProducts().subscribe();

      const req = httpMock.expectOne(
        (r) => r.url.includes("/products") && !r.url.includes("/barcode")
      );
      expect(req.request.method).toBe("GET");
      req.flush({
        data: [],
        pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      });
    });

    it("should include search param when provided", () => {
      service.getProducts({ search: "apple" }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes("/products"));
      expect(req.request.params.get("search")).toBe("apple");
      req.flush({ data: [], pagination: {} });
    });

    it("should include page and pageSize params", () => {
      service.getProducts({ page: 2, pageSize: 10 }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes("/products"));
      expect(req.request.params.get("page")).toBe("2");
      expect(req.request.params.get("pageSize")).toBe("10");
      req.flush({ data: [], pagination: {} });
    });

    it("should include category filter when provided", () => {
      service.getProducts({ category: "beverages" }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes("/products"));
      expect(req.request.params.get("category")).toBe("beverages");
      req.flush({ data: [], pagination: {} });
    });
  });

  describe("getProductByBarcode()", () => {
    it("should GET /products/barcode/:barcode", () => {
      service.getProductByBarcode("7501234567890").subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}/products/barcode/7501234567890`
      );
      expect(req.request.method).toBe("GET");
      req.flush({ _id: "1", name: "Product", price: 10 });
    });
  });

  describe("searchProducts()", () => {
    it("should GET /products/search with query param", () => {
      service.searchProducts("milk").subscribe();

      const req = httpMock.expectOne((r) => r.url.includes("/products/search"));
      expect(req.request.params.get("q")).toBe("milk");
      req.flush([]);
    });

    it("should include limit param when provided", () => {
      service.searchProducts("milk", undefined, 5).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes("/products/search"));
      expect(req.request.params.get("limit")).toBe("5");
      req.flush([]);
    });
  });

  describe("createProduct()", () => {
    it("should POST to /products with product data", () => {
      const product = { name: "New Item", price: 99, product_id: "NI01" };
      service.createProduct(product as any).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/products`);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toEqual(product);
      req.flush({ ...product, _id: "new-id" });
    });
  });

  describe("updateProduct()", () => {
    it("should PUT to /products/:id", () => {
      service.updateProduct("prod-1", { name: "Updated" } as any).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/products/prod-1`);
      expect(req.request.method).toBe("PUT");
      req.flush({ _id: "prod-1", name: "Updated" });
    });
  });

  describe("deleteProduct()", () => {
    it("should DELETE /products/:id", () => {
      service.deleteProduct("prod-1").subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/products/prod-1`);
      expect(req.request.method).toBe("DELETE");
      req.flush({ message: "deleted" });
    });
  });

  describe("getProduct()", () => {
    it("should GET /products/:id", () => {
      service.getProduct("prod-1").subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/products/prod-1`);
      expect(req.request.method).toBe("GET");
      req.flush({ _id: "prod-1", name: "Item" });
    });
  });

  describe("getFavoriteProducts()", () => {
    it("should GET /products/favorites without limit", () => {
      service.getFavoriteProducts().subscribe();
      const req = httpMock.expectOne((r) =>
        r.url.includes("/products/favorites")
      );
      expect(req.request.method).toBe("GET");
      req.flush([]);
    });

    it("should include limit param when provided", () => {
      service.getFavoriteProducts(10).subscribe();
      const req = httpMock.expectOne((r) =>
        r.url.includes("/products/favorites")
      );
      expect(req.request.params.get("limit")).toBe("10");
      req.flush([]);
    });
  });

  describe("bulkImport()", () => {
    it("should POST to /products/bulk-import with FormData", () => {
      const fd = new FormData();
      service.bulkImport(fd).subscribe();
      const req = httpMock.expectOne(
        `${environment.apiUrl}/products/bulk-import`
      );
      expect(req.request.method).toBe("POST");
      req.flush({ successful: 5, failed: 0 });
    });
  });

  describe("generateUniqueEAN()", () => {
    it("should POST to /products/generate-ean", () => {
      service.generateUniqueEAN().subscribe();
      const req = httpMock.expectOne(
        `${environment.apiUrl}/products/generate-ean`
      );
      expect(req.request.method).toBe("POST");
      req.flush({ ean: "1234567890123" });
    });
  });

  describe("getQuickAccess()", () => {
    it("should GET /users/me/quick-access", () => {
      service.getQuickAccess().subscribe();
      const req = httpMock.expectOne(
        `${environment.apiUrl}/users/me/quick-access`
      );
      expect(req.request.method).toBe("GET");
      req.flush([]);
    });
  });

  describe("addToQuickAccess()", () => {
    it("should POST to /users/me/quick-access/:id", () => {
      service.addToQuickAccess("prod-1").subscribe();
      const req = httpMock.expectOne(
        `${environment.apiUrl}/users/me/quick-access/prod-1`
      );
      expect(req.request.method).toBe("POST");
      req.flush([]);
    });
  });

  describe("removeFromQuickAccess()", () => {
    it("should DELETE /users/me/quick-access/:id", () => {
      service.removeFromQuickAccess("prod-1").subscribe();
      const req = httpMock.expectOne(
        `${environment.apiUrl}/users/me/quick-access/prod-1`
      );
      expect(req.request.method).toBe("DELETE");
      req.flush([]);
    });
  });
});
