import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, map } from "rxjs";
import { environment } from "../../environments/environment";
import { Ticket, TicketItem, TicketStatus } from "../models";

@Injectable({ providedIn: "root" })
export class TicketService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tickets`;

  getTickets(status?: TicketStatus | string): Observable<Ticket[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set("status", status);
    }
    return this.http
      .get<{ tickets: Ticket[] }>(this.apiUrl, { params })
      .pipe(map((r) => r.tickets));
  }

  getTicket(id: string): Observable<Ticket> {
    return this.http
      .get<{ ticket: Ticket }>(`${this.apiUrl}/${id}`)
      .pipe(map((r) => r.ticket));
  }

  createTicket(
    items: TicketItem[],
    subtotal: number,
    total: number,
    discount = 0,
    notes = ""
  ): Observable<Ticket> {
    return this.http
      .post<{
        ticket: Ticket;
      }>(this.apiUrl, { items, subtotal, total, discount, notes })
      .pipe(map((r) => r.ticket));
  }

  claimTicket(id: string): Observable<Ticket> {
    return this.http
      .put<{ ticket: Ticket }>(`${this.apiUrl}/${id}/claim`, {})
      .pipe(map((r) => r.ticket));
  }

  completeTicket(
    id: string,
    paymentMethod: string,
    amountTendered: number
  ): Observable<Ticket> {
    return this.http
      .put<{
        ticket: Ticket;
      }>(`${this.apiUrl}/${id}/complete`, { paymentMethod, amountTendered })
      .pipe(map((r) => r.ticket));
  }

  cancelTicket(id: string): Observable<Ticket> {
    return this.http
      .put<{ ticket: Ticket }>(`${this.apiUrl}/${id}/cancel`, {})
      .pipe(map((r) => r.ticket));
  }
}
