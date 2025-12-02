import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "@environments/environment";
import { User, PaginatedResponse } from "../models";

@Injectable({
  providedIn: "root",
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getUsers(filters?: {
    search?: string;
    page?: number;
    pageSize?: number;
  }): Observable<PaginatedResponse<User>> {
    let params = new HttpParams();

    if (filters?.search) params = params.set("search", filters.search);
    if (filters?.page) params = params.set("page", filters.page.toString());
    if (filters?.pageSize)
      params = params.set("pageSize", filters.pageSize.toString());

    return this.http.get<PaginatedResponse<User>>(this.apiUrl, { params });
  }

  getUser(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  updateUser(id: string, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getCurrentUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me/profile`);
  }

  getUserSettings(): Observable<{
    displayName?: string;
    language?: string;
    printerMode?: "inherit" | "plain" | "styled";
    currency?: string;
  }> {
    return this.http.get<any>(`${this.apiUrl}/me/settings`);
  }

  updateUserSettings(settings: {
    displayName?: string;
    language?: string;
    printerMode?: "inherit" | "plain" | "styled";
    currency?: string;
  }): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/me/settings`, settings);
  }
}
