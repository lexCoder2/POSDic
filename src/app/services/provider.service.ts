import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "@environments/environment";
import { Provider, PaginatedResponse } from "../models";

@Injectable({
  providedIn: "root",
})
export class ProviderService {
  private apiUrl = `${environment.apiUrl}/providers`;

  constructor(private http: HttpClient) {}

  getProviders(filters?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PaginatedResponse<Provider>> {
    let params = new HttpParams();

    if (filters?.search) params = params.set("search", filters.search);
    if (filters?.page) params = params.set("page", filters.page.toString());
    if (filters?.pageSize)
      params = params.set("pageSize", filters.pageSize.toString());

    return this.http.get<PaginatedResponse<Provider>>(this.apiUrl, { params });
  }

  getProvider(id: string): Observable<Provider> {
    return this.http.get<Provider>(`${this.apiUrl}/${id}`);
  }

  createProvider(provider: Partial<Provider>): Observable<Provider> {
    return this.http.post<Provider>(this.apiUrl, provider);
  }

  updateProvider(
    id: string,
    provider: Partial<Provider>
  ): Observable<Provider> {
    return this.http.put<Provider>(`${this.apiUrl}/${id}`, provider);
  }

  deleteProvider(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getProviderByCode(code: string): Observable<Provider> {
    return this.http.get<Provider>(`${this.apiUrl}/code/${code}`);
  }
}
