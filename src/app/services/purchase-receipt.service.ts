import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import {
  PaginatedResponse,
  ParsedInvoice,
  PurchaseReceipt,
  PurchaseReceiptPayload,
} from "../models";

@Injectable({ providedIn: "root" })
export class PurchaseReceiptService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/purchase-receipts`;

  /**
   * Upload an invoice file to be parsed.
   * Returns extracted items and metadata (no DB write).
   */
  parseFile(file: File): Observable<ParsedInvoice> {
    const formData = new FormData();
    formData.append("invoice", file, file.name);
    return this.http.post<ParsedInvoice>(`${this.apiUrl}/parse`, formData);
  }

  /**
   * Save a reviewed receipt and apply product cost/stock updates.
   */
  saveAndApply(payload: PurchaseReceiptPayload): Observable<PurchaseReceipt> {
    return this.http.post<PurchaseReceipt>(this.apiUrl, payload);
  }

  /**
   * List receipts, optionally filtered by provider ID.
   */
  getReceipts(
    providerId?: string,
    page = 1,
    pageSize = 20
  ): Observable<PaginatedResponse<PurchaseReceipt>> {
    let params = new HttpParams()
      .set("page", String(page))
      .set("pageSize", String(pageSize));
    if (providerId) params = params.set("provider", providerId);
    return this.http.get<PaginatedResponse<PurchaseReceipt>>(this.apiUrl, {
      params,
    });
  }

  /**
   * Get a single receipt by ID.
   */
  getReceipt(id: string): Observable<PurchaseReceipt> {
    return this.http.get<PurchaseReceipt>(`${this.apiUrl}/${id}`);
  }

  /**
   * Delete a pending receipt (applied receipts are protected).
   */
  deleteReceipt(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }
}
