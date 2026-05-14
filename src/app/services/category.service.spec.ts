import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { CategoryService } from "./category.service";
import { environment } from "@environments/environment";

describe("CategoryService", () => {
  let service: CategoryService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/categories`;
  const productsApiUrl = `${environment.apiUrl}/products`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CategoryService],
    });
    service = TestBed.inject(CategoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("getCategories()", () => {
    it("should GET /api/products/categories", () => {
      const mockCategories = [{ id: "c1", name: "Fruits" }];
      service
        .getCategories()
        .subscribe((res) => expect(res).toEqual(mockCategories));
      const req = httpMock.expectOne(`${productsApiUrl}/categories`);
      expect(req.request.method).toBe("GET");
      req.flush(mockCategories);
    });
  });

  describe("getCategory()", () => {
    it("should GET /api/categories/:id", () => {
      service.getCategory("c1").subscribe();
      const req = httpMock.expectOne(`${apiUrl}/c1`);
      expect(req.request.method).toBe("GET");
      req.flush({ id: "c1", name: "Fruits" });
    });
  });

  describe("createCategory()", () => {
    it("should POST /api/categories with payload", () => {
      const payload = { name: "Beverages", icon: "fas fa-glass" };
      service.createCategory(payload).subscribe();
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toEqual(payload);
      req.flush({ id: "c2", ...payload });
    });
  });

  describe("updateCategory()", () => {
    it("should PUT /api/categories/:id with payload", () => {
      const payload = { name: "Updated" };
      service.updateCategory("c1", payload).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/c1`);
      expect(req.request.method).toBe("PUT");
      expect(req.request.body).toEqual(payload);
      req.flush({ id: "c1", ...payload });
    });
  });

  describe("deleteCategory()", () => {
    it("should DELETE /api/categories/:id", () => {
      service.deleteCategory("c1").subscribe();
      const req = httpMock.expectOne(`${apiUrl}/c1`);
      expect(req.request.method).toBe("DELETE");
      req.flush({ message: "deleted" });
    });
  });
});
