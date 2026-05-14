import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { AiCategorizerService } from "./ai-categorizer.service";
import { environment } from "../../environments/environment";

describe("AiCategorizerService", () => {
  let service: AiCategorizerService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/ai`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AiCategorizerService],
    });
    service = TestBed.inject(AiCategorizerService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("categorize()", () => {
    it("should POST to categorize single product", () => {
      service.categorize("Whole Milk", "Lala").subscribe();
      const req = httpMock.expectOne(`${base}/categorize`);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toMatchObject({
        name: "Whole Milk",
        brand: "Lala",
      });
      req.flush({ category: "Dairy", confidence: 0.6, source: "heuristic" });
    });
  });

  describe("categorizeBatch()", () => {
    it("should POST to categorize batch", () => {
      const products = [{ name: "Milk" }, { name: "Bread" }];
      service.categorizeBatch(products).subscribe();
      const req = httpMock.expectOne(`${base}/categorize/batch`);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toMatchObject({ products });
      req.flush({ results: [] });
    });
  });
});
