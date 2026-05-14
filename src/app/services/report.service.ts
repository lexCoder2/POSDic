import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "@environments/environment";

export type ReportFormat = "pdf" | "excel";

export interface ReportSalesParams {
  startDate: string;
  endDate: string;
  groupBy?: "day" | "week" | "month";
  includeRefunds?: boolean;
  format?: ReportFormat;
}

export interface ReportStockParams {
  type?: "current" | "low" | "out" | "value";
  category?: string;
}

export interface ReportCashflowParams {
  startDate: string;
  endDate: string;
  includeWithdrawals?: boolean;
  groupByRegister?: boolean;
  groupByPayment?: boolean;
  format?: ReportFormat;
}

export interface ReportProfitParams {
  startDate: string;
  endDate: string;
}

@Injectable({ providedIn: "root" })
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports`;

  downloadSalesReport(params: ReportSalesParams): Observable<Blob> {
    const p = new HttpParams()
      .set("startDate", params.startDate)
      .set("endDate", params.endDate)
      .set("groupBy", params.groupBy ?? "day")
      .set("includeRefunds", String(params.includeRefunds ?? false))
      .set("format", params.format ?? "pdf");

    return this.http.get(`${this.apiUrl}/sales`, {
      params: p,
      responseType: "blob",
    });
  }

  downloadStockReport(params: ReportStockParams): Observable<Blob> {
    let p = new HttpParams()
      .set("type", params.type ?? "current")
      .set("category", params.category ?? "");

    return this.http.get(`${this.apiUrl}/stock`, {
      params: p,
      responseType: "blob",
    });
  }

  downloadCashflowReport(params: ReportCashflowParams): Observable<Blob> {
    const p = new HttpParams()
      .set("startDate", params.startDate)
      .set("endDate", params.endDate)
      .set("includeWithdrawals", String(params.includeWithdrawals ?? true))
      .set("groupByRegister", String(params.groupByRegister ?? false))
      .set("groupByPayment", String(params.groupByPayment ?? false))
      .set("format", params.format ?? "pdf");

    return this.http.get(`${this.apiUrl}/cashflow`, {
      params: p,
      responseType: "blob",
    });
  }

  downloadProfitReport(params: ReportProfitParams): Observable<Blob> {
    const p = new HttpParams()
      .set("startDate", params.startDate)
      .set("endDate", params.endDate);

    return this.http.get(`${this.apiUrl}/profit`, {
      params: p,
      responseType: "blob",
    });
  }

  downloadBarcodeReport(params: {
    generationType?: string;
    category?: string;
    barcodeType?: string;
    labelSize?: string;
    includePrice?: boolean;
    includeName?: boolean;
  }): Observable<Blob> {
    let p = new HttpParams()
      .set("generationType", params.generationType ?? "category")
      .set("category", params.category ?? "")
      .set("barcodeType", params.barcodeType ?? "ean13")
      .set("labelSize", params.labelSize ?? "medium")
      .set("includePrice", String(params.includePrice ?? true))
      .set("includeName", String(params.includeName ?? true));

    return this.http.get(`${this.apiUrl}/barcodes`, {
      params: p,
      responseType: "blob",
    });
  }

  downloadQRCodeReport(params: {
    category?: string;
    barcodeStandardFilter?: string;
    labelSize?: string;
    multiplePerPage?: boolean;
    includePrice?: boolean;
    includeName?: boolean;
  }): Observable<Blob> {
    let p = new HttpParams()
      .set("category", params.category ?? "")
      .set("barcodeStandardFilter", params.barcodeStandardFilter ?? "yes")
      .set("labelSize", params.labelSize ?? "medium")
      .set("multiplePerPage", String(params.multiplePerPage ?? false))
      .set("includePrice", String(params.includePrice ?? true))
      .set("includeName", String(params.includeName ?? true));

    return this.http.get(`${this.apiUrl}/qrcodes`, {
      params: p,
      responseType: "blob",
    });
  }

  triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
