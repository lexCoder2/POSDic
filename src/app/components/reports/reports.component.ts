import { Component, OnInit, signal, computed, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { ToggleSwitchComponent } from "../toggle-switch/toggle-switch.component";
import { ProductService } from "../../services/product.service";
import { Product } from "../../models";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";
import { environment } from "@environments/environment";

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

  products = signal<Product[]>([]);
  isLoading = signal<boolean>(true);

  // Reports properties
  salesReportStartDate = "";
  salesReportEndDate = "";
  salesReportGroupBy = "day";
  salesReportIncludeRefunds = false;
  generatingSalesReport = signal<boolean>(false);

  stockReportType = "current";
  stockReportCategory = "";
  generatingStockReport = signal<boolean>(false);

  cashflowReportStartDate = "";
  cashflowReportEndDate = "";
  cashflowIncludeWithdrawals = true;
  cashflowGroupByRegister = false;
  cashflowGroupByPayment = false;
  generatingCashflowReport = signal<boolean>(false);

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

  async generateSalesReport(): Promise<void> {
    if (!this.salesReportStartDate || !this.salesReportEndDate) {
      this.toastService.show(
        this.translationService.translate("REPORTS.SALES_REPORT.ERROR") ||
          "Please select date range",
        "error"
      );
      return;
    }

    this.generatingSalesReport.set(true);

    try {
      const params = new URLSearchParams({
        startDate: this.salesReportStartDate,
        endDate: this.salesReportEndDate,
        groupBy: this.salesReportGroupBy,
        includeRefunds: this.salesReportIncludeRefunds.toString(),
      });

      const response = await fetch(
        `${environment.apiUrl}/reports/sales?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("pos_token")}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `sales-report-${this.salesReportStartDate}-to-${this.salesReportEndDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        this.toastService.show(
          this.translationService.translate("REPORTS.SALES_REPORT.SUCCESS") ||
            "Sales report generated successfully",
          "success"
        );
      } else {
        throw new Error("Failed to generate report");
      }
    } catch (error) {
      console.error("Error generating sales report:", error);
      this.toastService.show(
        this.translationService.translate("REPORTS.SALES_REPORT.ERROR") ||
          "Failed to generate sales report",
        "error"
      );
    } finally {
      this.generatingSalesReport.set(false);
    }
  }

  async generateStockReport(): Promise<void> {
    this.generatingStockReport.set(true);

    try {
      const params = new URLSearchParams({
        type: this.stockReportType,
        category: this.stockReportCategory,
      });

      const response = await fetch(
        `${environment.apiUrl}/reports/stock?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("pos_token")}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `stock-report-${this.stockReportType}-${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        this.toastService.show(
          this.translationService.translate("REPORTS.STOCK_REPORT.SUCCESS") ||
            "Stock report generated successfully",
          "success"
        );
      } else {
        throw new Error("Failed to generate report");
      }
    } catch (error) {
      console.error("Error generating stock report:", error);
      this.toastService.show(
        this.translationService.translate("REPORTS.STOCK_REPORT.ERROR") ||
          "Failed to generate stock report",
        "error"
      );
    } finally {
      this.generatingStockReport.set(false);
    }
  }

  async generateCashflowReport(): Promise<void> {
    if (!this.cashflowReportStartDate || !this.cashflowReportEndDate) {
      this.toastService.show(
        this.translationService.translate("REPORTS.CASHFLOW_REPORT.ERROR") ||
          "Please select date range",
        "error"
      );
      return;
    }

    this.generatingCashflowReport.set(true);

    try {
      const params = new URLSearchParams({
        startDate: this.cashflowReportStartDate,
        endDate: this.cashflowReportEndDate,
        includeWithdrawals: this.cashflowIncludeWithdrawals.toString(),
        groupByRegister: this.cashflowGroupByRegister.toString(),
        groupByPayment: this.cashflowGroupByPayment.toString(),
      });

      const response = await fetch(
        `${environment.apiUrl}/reports/cashflow?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("pos_token")}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cashflow-report-${this.cashflowReportStartDate}-to-${this.cashflowReportEndDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        this.toastService.show(
          this.translationService.translate(
            "REPORTS.CASHFLOW_REPORT.SUCCESS"
          ) || "Cash flow report generated successfully",
          "success"
        );
      } else {
        throw new Error("Failed to generate report");
      }
    } catch (error) {
      console.error("Error generating cashflow report:", error);
      this.toastService.show(
        this.translationService.translate("REPORTS.CASHFLOW_REPORT.ERROR") ||
          "Failed to generate cash flow report",
        "error"
      );
    } finally {
      this.generatingCashflowReport.set(false);
    }
  }

  async generateBarcodePDF(): Promise<void> {
    this.generatingBarcodePDF.set(true);

    try {
      const params = new URLSearchParams({
        generationType: this.barcodeGenerationType,
        category: this.barcodeCategory,
        barcodeType: this.barcodeType,
        labelSize: this.barcodeLabelSize,
        includePrice: this.barcodeIncludePrice.toString(),
        includeName: this.barcodeIncludeName.toString(),
      });

      const response = await fetch(
        `${environment.apiUrl}/reports/barcodes?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("pos_token")}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `barcodes-${this.barcodeGenerationType}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        this.toastService.show(
          this.translationService.translate(
            "REPORTS.BARCODE_GENERATOR.SUCCESS"
          ) || "Barcode PDF generated successfully",
          "success"
        );
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate barcodes");
      }
    } catch (error) {
      console.error("Error generating barcode PDF:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : this.translationService.translate(
              "REPORTS.BARCODE_GENERATOR.ERROR"
            ) || "Failed to generate barcode PDF";
      this.toastService.show(errorMessage, "error");
    } finally {
      this.generatingBarcodePDF.set(false);
    }
  }

  async generateQRCodePDF(): Promise<void> {
    this.generatingQRCodePDF.set(true);

    try {
      const params = new URLSearchParams({
        category: this.qrCodeCategory,
        barcodeStandardFilter: this.qrCodeBarcodeStandardFilter,
        labelSize: this.qrCodeLabelSize,
        multiplePerPage: this.qrCodeMultiplePerPage.toString(),
        includePrice: this.qrCodeIncludePrice.toString(),
        includeName: this.qrCodeIncludeName.toString(),
      });

      const response = await fetch(
        `${environment.apiUrl}/reports/qrcodes?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("pos_token")}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `qrcodes-${this.qrCodeCategory || "all"}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        this.toastService.show(
          this.translationService.translate(
            "REPORTS.QR_CODE_GENERATOR.SUCCESS"
          ) || "QR code PDF generated successfully",
          "success"
        );
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate QR codes");
      }
    } catch (error) {
      console.error("Error generating QR code PDF:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : this.translationService.translate(
              "REPORTS.QR_CODE_GENERATOR.ERROR"
            ) || "Failed to generate QR code PDF";
      this.toastService.show(errorMessage, "error");
    } finally {
      this.generatingQRCodePDF.set(false);
    }
  }
}
