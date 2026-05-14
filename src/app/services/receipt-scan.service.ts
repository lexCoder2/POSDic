import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

export interface ParsedReceiptItem {
  name: string;
  quantity: number;
  price: number | null;
}

export interface ParsedReceipt {
  provider: string;
  items: ParsedReceiptItem[];
  total: number | null;
  date: string | null;
}

@Injectable({ providedIn: "root" })
export class ReceiptScanService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/receipt-scan`;

  parseReceiptText(text: string): Observable<ParsedReceipt> {
    return this.http.post<ParsedReceipt>(`${this.apiUrl}/parse`, { text });
  }
}
