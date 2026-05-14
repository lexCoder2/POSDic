import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { ShoppingList, ShoppingItem, ShoppingRecommendation } from "../models";

@Injectable({ providedIn: "root" })
export class ShoppingListService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/shopping-lists`;

  getLists(): Observable<{ lists: ShoppingList[] }> {
    return this.http.get<{ lists: ShoppingList[] }>(this.apiUrl);
  }

  getList(id: string): Observable<{ list: ShoppingList }> {
    return this.http.get<{ list: ShoppingList }>(`${this.apiUrl}/${id}`);
  }

  createList(
    name: string,
    items: ShoppingItem[] = [],
    weekday?: number
  ): Observable<{ list: ShoppingList }> {
    return this.http.post<{ list: ShoppingList }>(this.apiUrl, {
      name,
      items,
      weekday,
    });
  }

  updateList(
    id: string,
    changes: Partial<
      Pick<ShoppingList, "name" | "items" | "status" | "weekday">
    >
  ): Observable<{ list: ShoppingList }> {
    return this.http.put<{ list: ShoppingList }>(
      `${this.apiUrl}/${id}`,
      changes
    );
  }

  deleteList(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  toggleItem(
    listId: string,
    itemIndex: number
  ): Observable<{ list: ShoppingList }> {
    return this.http.put<{ list: ShoppingList }>(
      `${this.apiUrl}/${listId}/items/${itemIndex}/toggle`,
      {}
    );
  }

  getRecommendations(): Observable<{
    recommendations: ShoppingRecommendation[];
    weekday: number;
  }> {
    return this.http.get<{
      recommendations: ShoppingRecommendation[];
      weekday: number;
    }>(`${this.apiUrl}/recommendations`);
  }
}
