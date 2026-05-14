import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { SaleService } from "./sale.service";
import { environment } from "@environments/environment";

describe("SaleService", () => {
  let service: SaleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SaleService],
    });

    service = TestBed.inject(SaleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe("getSales()", () => {
    it("should GET /sales without filters", () => {
      service.getSales().subscribe();

      const req = httpMock.expectOne((r) => r.url.endsWith("/sales"));
      expect(req.request.method).toBe("GET");
      req.flush({
        data: [],
        pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      });
    });

    it("should include status filter param", () => {
      service.getSales({ status: "completed" }).subscribe();

      const req = httpMock.expectOne((r) => r.url.includes("/sales"));
      expect(req.request.params.get("status")).toBe("completed");
      req.flush({ data: [], pagination: {} });
    });

    it("should include date range params", () => {
      service
        .getSales({ startDate: "2026-01-01", endDate: "2026-01-31" })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url.includes("/sales"));
      expect(req.request.params.get("startDate")).toBe("2026-01-01");
      expect(req.request.params.get("endDate")).toBe("2026-01-31");
      req.flush({ data: [], pagination: {} });
    });
  });

  describe("createSale()", () => {
    it("should POST to /sales with sale data", () => {
      const sale = { total: 100, paymentMethod: "cash", cashier: "user-1" };
      service.createSale(sale as any).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/sales`);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toEqual(sale);
      req.flush({ ...sale, _id: "sale-1", saleNumber: "S001" });
    });
  });

  describe("cancelSale()", () => {
    it("should PUT to /sales/:id/cancel with reason in body", () => {
      service.cancelSale("sale-1", "Customer request").subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}/sales/sale-1/cancel`
      );
      expect(req.request.method).toBe("PUT");
      expect(req.request.body).toEqual({
        cancellationReason: "Customer request",
      });
      req.flush({ _id: "sale-1", status: "cancelled" });
    });
  });

  describe("createInternalSale()", () => {
    it("should POST to /sales/internal", () => {
      const internalSale = {
        items: [{ product: "prod-1", quantity: 2 }],
        notes: "Internal",
      };
      service.createInternalSale(internalSale).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/sales/internal`);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toEqual(internalSale);
      req.flush({ _id: "sale-2", isInternal: true });
    });
  });

  describe("getSalesSummary()", () => {
    it("should GET /sales/reports/summary", () => {
      service
        .getSalesSummary({ startDate: "2026-01-01", endDate: "2026-01-31" })
        .subscribe();

      const req = httpMock.expectOne((r) => r.url.includes("/reports/summary"));
      expect(req.request.method).toBe("GET");
      req.flush({ totalRevenue: 5000, totalSales: 50 });
    });
  });

  describe("getSales() with pageSize", () => {
    it("should include pageSize param", () => {
      service.getSales({ pageSize: 50 }).subscribe();
      const req = httpMock.expectOne((r) => r.url.includes("/sales"));
      expect(req.request.params.get("pageSize")).toBe("50");
      req.flush({ data: [], pagination: {} });
    });
  });

  describe("getSale()", () => {
    it("should GET /sales/:id", () => {
      service.getSale("sale-1").subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/sales/sale-1`);
      expect(req.request.method).toBe("GET");
      req.flush({ _id: "sale-1" });
    });
  });

  describe("updateSale()", () => {
    it("should PUT to /sales/:id", () => {
      service.updateSale("sale-1", { status: "completed" } as any).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/sales/sale-1`);
      expect(req.request.method).toBe("PUT");
      req.flush({ _id: "sale-1" });
    });
  });

  describe("refundSale()", () => {
    it("should POST to /sales/:id/refund with full refund data", () => {
      service.refundSale("sale-1", "full", "Customer request").subscribe();
      const req = httpMock.expectOne(
        `${environment.apiUrl}/sales/sale-1/refund`
      );
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toMatchObject({
        refundType: "full",
        reason: "Customer request",
      });
      req.flush({ _id: "sale-1" });
    });

    it("should include items for partial refund", () => {
      const items = [{ itemId: "item-1", quantity: 1 }];
      service.refundSale("sale-1", "partial", "Partial", items).subscribe();
      const req = httpMock.expectOne(
        `${environment.apiUrl}/sales/sale-1/refund`
      );
      expect(req.request.body.items).toEqual(items);
      req.flush({ _id: "sale-1" });
    });
  });

  describe("getInternalSalesStats()", () => {
    it("should GET /sales/internal with no filters", () => {
      service.getInternalSalesStats().subscribe();
      const req = httpMock.expectOne((r) => r.url.includes("/sales/internal"));
      expect(req.request.method).toBe("GET");
      req.flush({ totalAmount: 0, totalCount: 0, byUser: [], recentSales: [] });
    });

    it("should include date range params for internal stats", () => {
      service
        .getInternalSalesStats({
          startDate: "2026-01-01",
          endDate: "2026-01-31",
        })
        .subscribe();
      const req = httpMock.expectOne((r) => r.url.includes("/sales/internal"));
      expect(req.request.params.get("startDate")).toBe("2026-01-01");
      req.flush({ totalAmount: 0 });
    });
  });
});
