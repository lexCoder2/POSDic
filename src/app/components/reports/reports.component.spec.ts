import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { of, throwError } from "rxjs";
import { EMPTY } from "rxjs";
import { ReportsComponent } from "./reports.component";
import { ProductService } from "../../services/product.service";
import { ReportService } from "../../services/report.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";

const mockProducts = [
  { _id: "p1", name: "Coffee", category: "Drinks", price: 5 },
  { _id: "p2", name: "Tea", category: "Drinks", price: 3 },
  { _id: "p3", name: "Bread", category: "Food", price: 2 },
];

const mockBlob = new Blob(["test"], { type: "application/octet-stream" });

describe("ReportsComponent", () => {
  let component: ReportsComponent;
  let fixture: ComponentFixture<ReportsComponent>;
  let productServiceSpy: any;
  let toastSpy: any;
  let reportServiceSpy: any;

  beforeEach(async () => {
    productServiceSpy = {
      getProducts: jest
        .fn()
        .mockReturnValue(of({ data: mockProducts, total: 3 })),
    };
    toastSpy = { show: jest.fn() };
    reportServiceSpy = {
      downloadSalesReport: jest.fn().mockReturnValue(of(mockBlob)),
      downloadStockReport: jest.fn().mockReturnValue(of(mockBlob)),
      downloadCashflowReport: jest.fn().mockReturnValue(of(mockBlob)),
      downloadProfitReport: jest.fn().mockReturnValue(of(mockBlob)),
      downloadBarcodeReport: jest.fn().mockReturnValue(of(mockBlob)),
      downloadQRCodeReport: jest.fn().mockReturnValue(of(mockBlob)),
      triggerDownload: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ReportsComponent],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: ReportService, useValue: reportServiceSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            translationsChanged$: EMPTY,
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportsComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load products on init", () => {
    expect(productServiceSpy.getProducts).toHaveBeenCalled();
    expect(component.products()).toHaveLength(3);
  });

  it("should set isLoading to false after products load", () => {
    expect(component.isLoading()).toBe(false);
  });

  it("should handle product loading error", () => {
    productServiceSpy.getProducts.mockReturnValue(
      throwError(() => new Error("API error"))
    );
    component.loadProducts();
    expect(component.isLoading()).toBe(false);
  });

  describe("categories computed", () => {
    it("should compute unique sorted categories", () => {
      const cats = component.categories();
      expect(cats).toContain("Drinks");
      expect(cats).toContain("Food");
      expect(cats.filter((c) => c === "Drinks")).toHaveLength(1);
    });
  });

  describe("generateSalesReport()", () => {
    it("should show error toast when dates are missing", () => {
      component.salesReportStartDate = "";
      component.salesReportEndDate = "";
      component.generateSalesReport();
      expect(toastSpy.show).toHaveBeenCalled();
      expect(reportServiceSpy.downloadSalesReport).not.toHaveBeenCalled();
    });

    it("should call reportService.downloadSalesReport and triggerDownload on success", () => {
      component.salesReportStartDate = "2024-01-01";
      component.salesReportEndDate = "2024-01-31";
      component.salesReportFormat = "excel";
      component.generateSalesReport();
      expect(reportServiceSpy.downloadSalesReport).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: "2024-01-01", format: "excel" })
      );
      expect(reportServiceSpy.triggerDownload).toHaveBeenCalled();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "success");
    });

    it("should show error toast on service failure", () => {
      reportServiceSpy.downloadSalesReport.mockReturnValue(
        throwError(() => new Error("error"))
      );
      component.salesReportStartDate = "2024-01-01";
      component.salesReportEndDate = "2024-01-31";
      component.generateSalesReport();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
    });

    it("should set generatingSalesReport to false after success", () => {
      component.salesReportStartDate = "2024-01-01";
      component.salesReportEndDate = "2024-01-31";
      component.generateSalesReport();
      expect(component.generatingSalesReport()).toBe(false);
    });
  });

  describe("generateStockReport()", () => {
    it("should call reportService.downloadStockReport and triggerDownload on success", () => {
      component.generateStockReport();
      expect(reportServiceSpy.downloadStockReport).toHaveBeenCalled();
      expect(reportServiceSpy.triggerDownload).toHaveBeenCalled();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "success");
    });

    it("should show error toast on failure", () => {
      reportServiceSpy.downloadStockReport.mockReturnValue(
        throwError(() => new Error("error"))
      );
      component.generateStockReport();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
    });

    it("should set generatingStockReport to false after completion", () => {
      component.generateStockReport();
      expect(component.generatingStockReport()).toBe(false);
    });

    it("should pass category to service", () => {
      component.stockReportCategory = "Drinks";
      component.generateStockReport();
      expect(reportServiceSpy.downloadStockReport).toHaveBeenCalledWith(
        expect.objectContaining({ category: "Drinks" })
      );
    });

    it("should pass type=value to service without type cast error", () => {
      component.stockReportType = "value";
      component.generateStockReport();
      expect(reportServiceSpy.downloadStockReport).toHaveBeenCalledWith(
        expect.objectContaining({ type: "value" })
      );
    });
  });

  describe("generateCashflowReport()", () => {
    it("should show error toast when dates are missing", () => {
      component.cashflowReportStartDate = "";
      component.cashflowReportEndDate = "";
      component.generateCashflowReport();
      expect(toastSpy.show).toHaveBeenCalled();
      expect(reportServiceSpy.downloadCashflowReport).not.toHaveBeenCalled();
    });

    it("should call reportService.downloadCashflowReport on success", () => {
      component.cashflowReportStartDate = "2024-01-01";
      component.cashflowReportEndDate = "2024-01-31";
      component.cashflowReportFormat = "excel";
      component.generateCashflowReport();
      expect(reportServiceSpy.downloadCashflowReport).toHaveBeenCalledWith(
        expect.objectContaining({ startDate: "2024-01-01", format: "excel" })
      );
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "success");
    });

    it("should pass includeWithdrawals param from component state", () => {
      component.cashflowReportStartDate = "2024-01-01";
      component.cashflowReportEndDate = "2024-12-31";
      component.cashflowIncludeWithdrawals = false;
      component.generateCashflowReport();
      expect(reportServiceSpy.downloadCashflowReport).toHaveBeenCalledWith(
        expect.objectContaining({ includeWithdrawals: false })
      );
    });

    it("should pass groupByRegister=true and groupByPayment=true", () => {
      component.cashflowReportStartDate = "2024-01-01";
      component.cashflowReportEndDate = "2024-12-31";
      component.cashflowGroupByRegister = true;
      component.cashflowGroupByPayment = true;
      component.generateCashflowReport();
      expect(reportServiceSpy.downloadCashflowReport).toHaveBeenCalledWith(
        expect.objectContaining({ groupByRegister: true, groupByPayment: true })
      );
    });

    it("should set generatingCashflowReport to false after error", () => {
      reportServiceSpy.downloadCashflowReport.mockReturnValue(
        throwError(() => new Error("error"))
      );
      component.cashflowReportStartDate = "2024-01-01";
      component.cashflowReportEndDate = "2024-12-31";
      component.generateCashflowReport();
      expect(component.generatingCashflowReport()).toBe(false);
    });
  });

  describe("generateProfitReport() — Spec 5", () => {
    it("should show error toast when dates are missing", () => {
      component.profitReportStartDate = "";
      component.profitReportEndDate = "";
      component.generateProfitReport();
      expect(toastSpy.show).toHaveBeenCalled();
      expect(reportServiceSpy.downloadProfitReport).not.toHaveBeenCalled();
    });

    it("should call reportService.downloadProfitReport when dates are set", () => {
      component.profitReportStartDate = "2024-01-01";
      component.profitReportEndDate = "2024-12-31";
      component.generateProfitReport();
      expect(reportServiceSpy.downloadProfitReport).toHaveBeenCalledWith({
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      });
    });

    it("should trigger download with xlsx filename on success", () => {
      component.profitReportStartDate = "2024-01-01";
      component.profitReportEndDate = "2024-12-31";
      component.generateProfitReport();
      expect(reportServiceSpy.triggerDownload).toHaveBeenCalledWith(
        mockBlob,
        expect.stringContaining(".xlsx")
      );
    });

    it("should show success toast after download", () => {
      component.profitReportStartDate = "2024-01-01";
      component.profitReportEndDate = "2024-12-31";
      component.generateProfitReport();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "success");
    });

    it("should show error toast when service fails", () => {
      reportServiceSpy.downloadProfitReport.mockReturnValue(
        throwError(() => new Error("error"))
      );
      component.profitReportStartDate = "2024-01-01";
      component.profitReportEndDate = "2024-12-31";
      component.generateProfitReport();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
    });

    it("should set generatingProfitReport to false after completion", () => {
      component.profitReportStartDate = "2024-01-01";
      component.profitReportEndDate = "2024-12-31";
      component.generateProfitReport();
      expect(component.generatingProfitReport()).toBe(false);
    });
  });

  describe("generateBarcodePDF()", () => {
    it("should call reportService.downloadBarcodeReport and show success toast", async () => {
      URL.createObjectURL = jest.fn().mockReturnValue("blob:test");
      URL.revokeObjectURL = jest.fn();
      await component.generateBarcodePDF();
      expect(reportServiceSpy.downloadBarcodeReport).toHaveBeenCalled();
      expect(reportServiceSpy.triggerDownload).toHaveBeenCalled();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "success");
    });

    it("should show error toast when service fails", async () => {
      reportServiceSpy.downloadBarcodeReport.mockReturnValue(
        throwError(() => new Error("No products"))
      );
      await component.generateBarcodePDF();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
    });

    it("should set generatingBarcodePDF to false after error", async () => {
      reportServiceSpy.downloadBarcodeReport.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      await component.generateBarcodePDF();
      expect(component.generatingBarcodePDF()).toBe(false);
    });
  });

  describe("generateQRCodePDF()", () => {
    it("should call reportService.downloadQRCodeReport and show success toast", async () => {
      URL.createObjectURL = jest.fn().mockReturnValue("blob:test");
      URL.revokeObjectURL = jest.fn();
      await component.generateQRCodePDF();
      expect(reportServiceSpy.downloadQRCodeReport).toHaveBeenCalled();
      expect(reportServiceSpy.triggerDownload).toHaveBeenCalled();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "success");
    });

    it("should show error toast when service fails", async () => {
      reportServiceSpy.downloadQRCodeReport.mockReturnValue(
        throwError(() => new Error("No products"))
      );
      await component.generateQRCodePDF();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
    });

    it("should set generatingQRCodePDF to false after error", async () => {
      reportServiceSpy.downloadQRCodeReport.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      await component.generateQRCodePDF();
      expect(component.generatingQRCodePDF()).toBe(false);
    });
  });
});
