import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import {
  ReportService,
  ReportFormat,
  ReportSalesParams,
  ReportCashflowParams,
  ReportProfitParams,
} from "./report.service";
import { environment } from "@environments/environment";

describe("ReportService", () => {
  let service: ReportService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/reports`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReportService],
    });
    service = TestBed.inject(ReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("downloadSalesReport()", () => {
    it("should call GET /reports/sales with PDF format by default", () => {
      const params: ReportSalesParams = {
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        groupBy: "day",
        includeRefunds: false,
        format: "pdf",
      };
      service.downloadSalesReport(params).subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/sales") &&
          r.params.get("format") === "pdf" &&
          r.params.get("startDate") === "2025-01-01"
      );
      expect(req.request.method).toBe("GET");
      req.flush(new Blob(["pdf"], { type: "application/pdf" }));
    });

    it("should call GET /reports/sales with excel format when specified", () => {
      const params: ReportSalesParams = {
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        groupBy: "day",
        includeRefunds: false,
        format: "excel",
      };
      service.downloadSalesReport(params).subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/sales") && r.params.get("format") === "excel"
      );
      expect(req.request.method).toBe("GET");
      req.flush(
        new Blob(["xlsx"], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );
    });
  });

  describe("downloadStockReport()", () => {
    it("should call GET /reports/stock with type and category params", () => {
      service
        .downloadStockReport({ type: "low", category: "Drinks" })
        .subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/stock") &&
          r.params.get("type") === "low" &&
          r.params.get("category") === "Drinks"
      );
      expect(req.request.method).toBe("GET");
      req.flush(
        new Blob(["xlsx"], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );
    });

    it('should default type to "current"', () => {
      service.downloadStockReport({}).subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/stock") && r.params.get("type") === "current"
      );
      req.flush(new Blob(["xlsx"]));
    });

    it("should send type=value when specified", () => {
      service.downloadStockReport({ type: "value" }).subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/stock") && r.params.get("type") === "value"
      );
      expect(req.request.method).toBe("GET");
      req.flush(new Blob(["xlsx"]));
    });
  });

  describe("downloadCashflowReport()", () => {
    it("should call GET /reports/cashflow with date range and format", () => {
      const params: ReportCashflowParams = {
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        groupByRegister: true,
        groupByPayment: false,
        format: "excel",
      };
      service.downloadCashflowReport(params).subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/cashflow") &&
          r.params.get("format") === "excel" &&
          r.params.get("groupByRegister") === "true"
      );
      expect(req.request.method).toBe("GET");
      req.flush(new Blob(["xlsx"]));
    });

    it("should send includeWithdrawals=false when specified", () => {
      const params: ReportCashflowParams = {
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        includeWithdrawals: false,
      };
      service.downloadCashflowReport(params).subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/cashflow") &&
          r.params.get("includeWithdrawals") === "false"
      );
      expect(req.request.method).toBe("GET");
      req.flush(new Blob(["pdf"]));
    });

    it("should default includeWithdrawals to true when not specified", () => {
      service
        .downloadCashflowReport({
          startDate: "2025-01-01",
          endDate: "2025-12-31",
        })
        .subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/cashflow") &&
          r.params.get("includeWithdrawals") === "true"
      );
      expect(req.request.method).toBe("GET");
      req.flush(new Blob(["pdf"]));
    });
  });

  describe("downloadProfitReport()", () => {
    it("should call GET /reports/profit with date range", () => {
      const params: ReportProfitParams = {
        startDate: "2025-01-01",
        endDate: "2025-12-31",
      };
      service.downloadProfitReport(params).subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/profit") &&
          r.params.get("startDate") === "2025-01-01" &&
          r.params.get("endDate") === "2025-12-31"
      );
      expect(req.request.method).toBe("GET");
      req.flush(new Blob(["xlsx"]));
    });
  });

  describe("triggerDownload()", () => {
    it("should create and click an anchor element and revoke URL", () => {
      const appendSpy = jest.spyOn(document.body, "appendChild");
      const removeSpy = jest.spyOn(document.body, "removeChild");
      URL.createObjectURL = jest.fn().mockReturnValue("blob:test-url");
      URL.revokeObjectURL = jest.fn();

      const blob = new Blob(["test"], { type: "application/pdf" });
      service.triggerDownload(blob, "test-report.pdf");

      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(appendSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
    });

    it("should work with xlsx MIME blob", () => {
      URL.createObjectURL = jest.fn().mockReturnValue("blob:xlsx");
      URL.revokeObjectURL = jest.fn();
      const blob = new Blob(["xlsx"], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      service.triggerDownload(blob, "report.xlsx");
      expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:xlsx");
    });
  });

  describe("downloadBarcodeReport()", () => {
    it("should call GET /reports/barcodes with params", () => {
      service
        .downloadBarcodeReport({
          generationType: "category",
          category: "Food",
          labelSize: "medium",
        })
        .subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/barcodes") &&
          r.params.get("generationType") === "category" &&
          r.params.get("category") === "Food"
      );
      expect(req.request.method).toBe("GET");
      req.flush(new Blob(["pdf"], { type: "application/pdf" }));
    });

    it("should default generationType to category when not specified", () => {
      service.downloadBarcodeReport({}).subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/barcodes") &&
          r.params.get("generationType") === "category"
      );
      req.flush(new Blob(["pdf"]));
    });
  });

  describe("downloadQRCodeReport()", () => {
    it("should call GET /reports/qrcodes with params", () => {
      service
        .downloadQRCodeReport({
          category: "Drinks",
          barcodeStandardFilter: "yes",
        })
        .subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/qrcodes") &&
          r.params.get("barcodeStandardFilter") === "yes" &&
          r.params.get("category") === "Drinks"
      );
      expect(req.request.method).toBe("GET");
      req.flush(new Blob(["pdf"], { type: "application/pdf" }));
    });

    it("should default barcodeStandardFilter to yes when not specified", () => {
      service.downloadQRCodeReport({}).subscribe();
      const req = httpMock.expectOne(
        (r) =>
          r.url.includes("/reports/qrcodes") &&
          r.params.get("barcodeStandardFilter") === "yes"
      );
      req.flush(new Blob(["pdf"]));
    });
  });
});
