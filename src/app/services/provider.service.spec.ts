import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { ProviderService } from "./provider.service";
import { environment } from "@environments/environment";

describe("ProviderService", () => {
  let service: ProviderService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/providers`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProviderService],
    });
    service = TestBed.inject(ProviderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("getProviders()", () => {
    it("should GET /api/providers and return paginated response", () => {
      const mockResponse = {
        data: [],
        pagination: { total: 0, page: 1, pageSize: 100, totalPages: 0 },
      };
      service
        .getProviders()
        .subscribe((res) => expect(res).toEqual(mockResponse));
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe("GET");
      req.flush(mockResponse);
    });

    it("should send search param when provided", () => {
      service.getProviders({ search: "acme" }).subscribe();
      const req = httpMock.expectOne(
        (r) => r.url === apiUrl && r.params.get("search") === "acme"
      );
      req.flush({ data: [], pagination: {} });
    });
  });

  describe("getProvider()", () => {
    it("should GET /api/providers/:id", () => {
      service.getProvider("p1").subscribe();
      const req = httpMock.expectOne(`${apiUrl}/p1`);
      expect(req.request.method).toBe("GET");
      req.flush({ id: "p1", name: "ACME" });
    });
  });

  describe("createProvider()", () => {
    it("should POST /api/providers with payload", () => {
      const payload = { code: "ACM", name: "ACME Corp" };
      service.createProvider(payload).subscribe();
      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toEqual(payload);
      req.flush({ id: "p1", ...payload });
    });
  });

  describe("updateProvider()", () => {
    it("should PUT /api/providers/:id with payload", () => {
      const payload = { name: "ACME Updated" };
      service.updateProvider("p1", payload).subscribe();
      const req = httpMock.expectOne(`${apiUrl}/p1`);
      expect(req.request.method).toBe("PUT");
      expect(req.request.body).toEqual(payload);
      req.flush({ id: "p1", ...payload });
    });
  });

  describe("deleteProvider()", () => {
    it("should DELETE /api/providers/:id", () => {
      service.deleteProvider("p1").subscribe();
      const req = httpMock.expectOne(`${apiUrl}/p1`);
      expect(req.request.method).toBe("DELETE");
      req.flush({ message: "deleted" });
    });
  });

  describe("getProviderByCode()", () => {
    it("should GET /api/providers/code/:code", () => {
      service.getProviderByCode("ACM").subscribe();
      const req = httpMock.expectOne(`${apiUrl}/code/ACM`);
      expect(req.request.method).toBe("GET");
      req.flush({ id: "p1", code: "ACM" });
    });
  });
});
