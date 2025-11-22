import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "@environments/environment";
import { Category } from "../models";

@Injectable({
  providedIn: "root",
})
export class CategoryService {
  private apiUrl = `${environment.apiUrl}/categories`;
  private productsApiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  getCategories(): Observable<Category[]> {
    // Get categories from products collection
    return this.http.get<Category[]>(`${this.productsApiUrl}/categories`);
  }

  getCategory(id: string): Observable<Category> {
    return this.http.get<Category>(`${this.apiUrl}/${id}`);
  }

  createCategory(category: Partial<Category>): Observable<Category> {
    return this.http.post<Category>(this.apiUrl, category);
  }

  updateCategory(
    id: string,
    category: Partial<Category>
  ): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/${id}`, category);
  }

  deleteCategory(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
