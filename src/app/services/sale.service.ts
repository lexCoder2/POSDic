import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "@environments/environment";
import { Sale, PaginatedResponse } from "../models";

@Injectable({
  providedIn: "root",
})
export class SaleService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/sales`;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  getSales(filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    cashier?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PaginatedResponse<Sale>> {
    let params = new HttpParams();

    if (filters?.status) params = params.set("status", filters.status);
    if (filters?.startDate) params = params.set("startDate", filters.startDate);
    if (filters?.endDate) params = params.set("endDate", filters.endDate);
    if (filters?.cashier) params = params.set("cashier", filters.cashier);
    if (filters?.search) params = params.set("search", filters.search);
    if (filters?.page) params = params.set("page", filters.page.toString());
    if (filters?.pageSize)
      params = params.set("pageSize", filters.pageSize.toString());

    return this.http.get<PaginatedResponse<Sale>>(this.apiUrl, { params });
  }

  getSale(id: string): Observable<Sale> {
    return this.http.get<Sale>(`${this.apiUrl}/${id}`);
  }

  createSale(sale: Partial<Sale>): Observable<Sale> {
    return this.http.post<Sale>(this.apiUrl, sale);
  }

  updateSale(id: string, sale: Partial<Sale>): Observable<Sale> {
    return this.http.put<Sale>(`${this.apiUrl}/${id}`, sale);
  }

  cancelSale(id: string, reason: string): Observable<Sale> {
    return this.http.put<Sale>(`${this.apiUrl}/${id}/cancel`, {
      cancellationReason: reason,
    });
  }

  refundSale(
    id: string,
    refundType: "full" | "partial",
    reason: string,
    items?: { itemId: string; quantity: number }[]
  ): Observable<Sale> {
    return this.http.post<Sale>(`${this.apiUrl}/${id}/refund`, {
      refundType,
      reason,
      items,
    });
  }

  getSalesSummary(filters?: {
    startDate?: string;
    endDate?: string;
  }): Observable<any> {
    let params = new HttpParams();

    if (filters?.startDate) params = params.set("startDate", filters.startDate);
    if (filters?.endDate) params = params.set("endDate", filters.endDate);

    return this.http.get(`${this.apiUrl}/reports/summary`, { params });
  }

  createInternalSale(internalSale: {
    items: { product: string; quantity: number; weight?: number }[];
    notes?: string;
  }): Observable<Sale> {
    return this.http.post<Sale>(`${this.apiUrl}/internal`, internalSale);
  }

  getInternalSalesStats(filters?: {
    startDate?: string;
    endDate?: string;
  }): Observable<{
    totalAmount: number;
    totalCount: number;
    byUser: { name: string; count: number; total: number }[];
    recentSales: Sale[];
  }> {
    let params = new HttpParams();

    if (filters?.startDate) params = params.set("startDate", filters.startDate);
    if (filters?.endDate) params = params.set("endDate", filters.endDate);

    return this.http.get<{
      totalAmount: number;
      totalCount: number;
      byUser: { name: string; count: number; total: number }[];
      recentSales: Sale[];
    }>(`${this.apiUrl}/internal/stats`, { params });
  }
}
