import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

export interface CategorizationResult {
  name?: string;
  category: string;
  confidence: number;
  source: "ollama" | "heuristic";
}

@Injectable({ providedIn: "root" })
export class AiCategorizerService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/ai`;

  categorize(
    name: string,
    brand?: string,
    type?: string
  ): Observable<CategorizationResult> {
    return this.http.post<CategorizationResult>(`${this.apiUrl}/categorize`, {
      name,
      brand,
      type,
    });
  }

  categorizeBatch(
    products: Array<{ name: string; brand?: string; type?: string }>
  ): Observable<{ results: CategorizationResult[] }> {
    return this.http.post<{ results: CategorizationResult[] }>(
      `${this.apiUrl}/categorize/batch`,
      { products }
    );
  }
}
