import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { environment } from "@environments/environment";
import { Product, PaginatedResponse } from "../models";

@Injectable({
  providedIn: "root",
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getProducts(filters?: {
    category?: string;
    search?: string;
    active?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<PaginatedResponse<Product>> {
    let params = new HttpParams();

    if (filters?.category) params = params.set("category", filters.category);
    if (filters?.search) params = params.set("search", filters.search);
    if (filters?.active !== undefined)
      params = params.set("active", filters.active.toString());
    if (filters?.page) params = params.set("page", filters.page.toString());
    if (filters?.pageSize)
      params = params.set("pageSize", filters.pageSize.toString());

    return this.http.get<PaginatedResponse<Product>>(this.apiUrl, { params });
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  getProductByBarcode(barcode: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/barcode/${barcode}`);
  }

  getFavoriteProducts(limit?: number): Observable<Product[]> {
    let params = new HttpParams();
    if (limit) params = params.set("limit", limit.toString());
    return this.http.get<Product[]>(`${this.apiUrl}/favorites`, { params });
  }

  searchProducts(
    query: string,
    category?: string,
    limit?: number
  ): Observable<Product[]> {
    let params = new HttpParams().set("q", query);
    if (category) params = params.set("category", category);
    if (limit) params = params.set("limit", limit.toString());
    return this.http.get<Product[]>(`${this.apiUrl}/search`, { params });
  }

  createProduct(product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, product);
  }

  updateProduct(id: string, product: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, product);
  }

  deleteProduct(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  bulkImport(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/bulk-import`, formData);
  }
}
