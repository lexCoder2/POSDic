import { Component, OnInit, signal, computed, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { ToggleSwitchComponent } from "../toggle-switch/toggle-switch.component";
import { ProductService } from "../../services/product.service";
import { ReportService, ReportFormat } from "../../services/report.service";
import { Product } from "../../models";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";

@Component({
  selector: "app-reports",
  standalone: true,
  imports: [FormsModule, TranslatePipe, ToggleSwitchComponent],
  templateUrl: "./reports.component.html",
  styleUrls: ["./reports.component.scss"],
})
export class ReportsComponent implements OnInit {
  private productService = inject(ProductService);
  private toastService = inject(ToastService);
  private translationService = inject(TranslationService);
  private reportService = inject(ReportService);

  products = signal<Product[]>([]);
  isLoading = signal<boolean>(true);

  // Reports properties
  salesReportStartDate = "";
  salesReportEndDate = "";
  salesReportGroupBy = "day";
  salesReportIncludeRefunds = false;
  salesReportFormat: ReportFormat = "excel";
  generatingSalesReport = signal<boolean>(false);

  stockReportType = "current";
  stockReportCategory = "";
  generatingStockReport = signal<boolean>(false);

  cashflowReportStartDate = "";
  cashflowReportEndDate = "";
  cashflowIncludeWithdrawals = true;
  cashflowGroupByRegister = false;
  cashflowGroupByPayment = false;
  cashflowReportFormat: ReportFormat = "excel";
  generatingCashflowReport = signal<boolean>(false);

  profitReportStartDate = "";
  profitReportEndDate = "";
  generatingProfitReport = signal<boolean>(false);

  barcodeGenerationType = "category";
  barcodeCategory = "";
  barcodeType = "ean13";
  barcodeLabelSize = "medium";
  barcodeIncludePrice = true;
  barcodeIncludeName = true;
  generatingBarcodePDF = signal<boolean>(false);

  qrCodeCategory = "";
  qrCodeBarcodeStandardFilter = "yes";
  qrCodeLabelSize = "medium";
  qrCodeMultiplePerPage = false;
  qrCodeIncludePrice = true;
  qrCodeIncludeName = true;
  generatingQRCodePDF = signal<boolean>(false);

  // Get unique categories from products
  categories = computed(() => {
    const cats = new Set<string>();
    this.products().forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  });

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading.set(true);

    this.productService.getProducts({ pageSize: 10000 }).subscribe({
      next: (response) => {
        this.products.set(response.data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  generateSalesReport(): void {
    if (!this.salesReportStartDate || !this.salesReportEndDate) {
      this.toastService.show(
        this.translationService.translate("REPORTS.SALES_REPORT.ERROR") ||
          "Please select date range",
        "error"
      );
      return;
    }

    this.generatingSalesReport.set(true);
    const ext = this.salesReportFormat === "excel" ? "xlsx" : "pdf";

    this.reportService
      .downloadSalesReport({
        startDate: this.salesReportStartDate,
        endDate: this.salesReportEndDate,
        groupBy: this.salesReportGroupBy as "day" | "week" | "month",
        includeRefunds: this.salesReportIncludeRefunds,
        format: this.salesReportFormat,
      })
      .subscribe({
        next: (blob) => {
          this.reportService.triggerDownload(
            blob,
            `sales-report-${this.salesReportStartDate}-to-${this.salesReportEndDate}.${ext}`
          );
          this.toastService.show(
            this.translationService.translate("REPORTS.SALES_REPORT.SUCCESS") ||
              "Sales report generated successfully",
            "success"
          );
          this.generatingSalesReport.set(false);
        },
        error: () => {
          this.toastService.show(
            this.translationService.translate("REPORTS.SALES_REPORT.ERROR") ||
              "Failed to generate sales report",
            "error"
          );
          this.generatingSalesReport.set(false);
        },
      });
  }

  generateStockReport(): void {
    this.generatingStockReport.set(true);

    this.reportService
      .downloadStockReport({
        type: this.stockReportType as "current" | "low" | "out" | "value",
        category: this.stockReportCategory,
      })
      .subscribe({
        next: (blob) => {
          this.reportService.triggerDownload(
            blob,
            `stock-report-${this.stockReportType}-${Date.now()}.xlsx`
          );
          this.toastService.show(
            this.translationService.translate("REPORTS.STOCK_REPORT.SUCCESS") ||
              "Stock report generated successfully",
            "success"
          );
          this.generatingStockReport.set(false);
        },
        error: () => {
          this.toastService.show(
            this.translationService.translate("REPORTS.STOCK_REPORT.ERROR") ||
              "Failed to generate stock report",
            "error"
          );
          this.generatingStockReport.set(false);
        },
      });
  }

  generateCashflowReport(): void {
    if (!this.cashflowReportStartDate || !this.cashflowReportEndDate) {
      this.toastService.show(
        this.translationService.translate("REPORTS.CASHFLOW_REPORT.ERROR") ||
          "Please select date range",
        "error"
      );
      return;
    }

    this.generatingCashflowReport.set(true);
    const ext = this.cashflowReportFormat === "excel" ? "xlsx" : "pdf";

    this.reportService
      .downloadCashflowReport({
        startDate: this.cashflowReportStartDate,
        endDate: this.cashflowReportEndDate,
        includeWithdrawals: this.cashflowIncludeWithdrawals,
        groupByRegister: this.cashflowGroupByRegister,
        groupByPayment: this.cashflowGroupByPayment,
        format: this.cashflowReportFormat,
      })
      .subscribe({
        next: (blob) => {
          this.reportService.triggerDownload(
            blob,
            `cashflow-report-${this.cashflowReportStartDate}-to-${this.cashflowReportEndDate}.${ext}`
          );
          this.toastService.show(
            this.translationService.translate(
              "REPORTS.CASHFLOW_REPORT.SUCCESS"
            ) || "Cash flow report generated successfully",
            "success"
          );
          this.generatingCashflowReport.set(false);
        },
        error: () => {
          this.toastService.show(
            this.translationService.translate(
              "REPORTS.CASHFLOW_REPORT.ERROR"
            ) || "Failed to generate cash flow report",
            "error"
          );
          this.generatingCashflowReport.set(false);
        },
      });
  }

  generateProfitReport(): void {
    if (!this.profitReportStartDate || !this.profitReportEndDate) {
      this.toastService.show(
        this.translationService.translate("REPORTS.PROFIT_REPORT.ERROR") ||
          "Please select date range",
        "error"
      );
      return;
    }

    this.generatingProfitReport.set(true);

    this.reportService
      .downloadProfitReport({
        startDate: this.profitReportStartDate,
        endDate: this.profitReportEndDate,
      })
      .subscribe({
        next: (blob) => {
          this.reportService.triggerDownload(
            blob,
            `profit-report-${this.profitReportStartDate}-to-${this.profitReportEndDate}.xlsx`
          );
          this.toastService.show(
            this.translationService.translate(
              "REPORTS.PROFIT_REPORT.SUCCESS"
            ) || "Profit report generated successfully",
            "success"
          );
          this.generatingProfitReport.set(false);
        },
        error: () => {
          this.toastService.show(
            this.translationService.translate("REPORTS.PROFIT_REPORT.ERROR") ||
              "Failed to generate profit report",
            "error"
          );
          this.generatingProfitReport.set(false);
        },
      });
  }

  generateBarcodePDF(): void {
    this.generatingBarcodePDF.set(true);

    this.reportService
      .downloadBarcodeReport({
        generationType: this.barcodeGenerationType,
        category: this.barcodeCategory,
        barcodeType: this.barcodeType,
        labelSize: this.barcodeLabelSize,
        includePrice: this.barcodeIncludePrice,
        includeName: this.barcodeIncludeName,
      })
      .subscribe({
        next: (blob) => {
          this.reportService.triggerDownload(
            blob,
            `barcodes-${this.barcodeGenerationType}-${Date.now()}.pdf`
          );
          this.toastService.show(
            this.translationService.translate(
              "REPORTS.BARCODE_GENERATOR.SUCCESS"
            ) || "Barcode PDF generated successfully",
            "success"
          );
          this.generatingBarcodePDF.set(false);
        },
        error: (error) => {
          const errorMessage =
            error instanceof Error
              ? error.message
              : this.translationService.translate(
                  "REPORTS.BARCODE_GENERATOR.ERROR"
                ) || "Failed to generate barcode PDF";
          this.toastService.show(errorMessage, "error");
          this.generatingBarcodePDF.set(false);
        },
      });
  }

  generateQRCodePDF(): void {
    this.generatingQRCodePDF.set(true);

    this.reportService
      .downloadQRCodeReport({
        category: this.qrCodeCategory,
        barcodeStandardFilter: this.qrCodeBarcodeStandardFilter,
        labelSize: this.qrCodeLabelSize,
        multiplePerPage: this.qrCodeMultiplePerPage,
        includePrice: this.qrCodeIncludePrice,
        includeName: this.qrCodeIncludeName,
      })
      .subscribe({
        next: (blob) => {
          this.reportService.triggerDownload(
            blob,
            `qrcodes-${this.qrCodeCategory || "all"}-${Date.now()}.pdf`
          );
          this.toastService.show(
            this.translationService.translate(
              "REPORTS.QR_CODE_GENERATOR.SUCCESS"
            ) || "QR code PDF generated successfully",
            "success"
          );
          this.generatingQRCodePDF.set(false);
        },
        error: (error) => {
          const errorMessage =
            error instanceof Error
              ? error.message
              : this.translationService.translate(
                  "REPORTS.QR_CODE_GENERATOR.ERROR"
                ) || "Failed to generate QR code PDF";
          this.toastService.show(errorMessage, "error");
          this.generatingQRCodePDF.set(false);
        },
      });
  }
}
