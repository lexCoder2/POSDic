import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { environment } from "@environments/environment";
import { Register } from "../models";

@Injectable({
  providedIn: "root",
})
export class RegisterService {
  private apiUrl = `${environment.apiUrl}/registers`;
  private currentRegisterSubject = new BehaviorSubject<Register | null>(null);
  public currentRegister$ = this.currentRegisterSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadCurrentRegister();
  }

  private loadCurrentRegister(): void {
    const storedRegisterId = localStorage.getItem("currentRegisterId");
    if (storedRegisterId) {
      // Fetch full register data from database
      this.getActiveRegister().subscribe({
        next: (register) => {
          if (register) {
            this.currentRegisterSubject.next(register);
          } else {
            // Register no longer active, clear localStorage
            localStorage.removeItem("currentRegisterId");
          }
        },
        error: (err) => {
          console.error("Error loading register from database:", err);
          localStorage.removeItem("currentRegisterId");
        },
      });
    }
  }

  getCurrentRegister(): Register | null {
    return this.currentRegisterSubject.value;
  }

  openRegister(
    openingCash: number,
    registerNumber: string
  ): Observable<Register> {
    return this.http
      .post<Register>(`${this.apiUrl}/open`, {
        openingCash,
        registerNumber,
      })
      .pipe(
        tap((register) => {
          this.currentRegisterSubject.next(register);
          if (register._id) {
            localStorage.setItem("currentRegisterId", register._id);
          }
        })
      );
  }

  closeRegister(
    registerId: string,
    closingCash: number,
    notes?: string
  ): Observable<Register> {
    return this.http
      .post<Register>(`${this.apiUrl}/${registerId}/close`, {
        closingCash,
        notes,
      })
      .pipe(
        tap((register) => {
          this.currentRegisterSubject.next(null);
          localStorage.removeItem("currentRegisterId");
        })
      );
  }

  getActiveRegister(): Observable<Register | null> {
    return this.http.get<Register | null>(`${this.apiUrl}/active`).pipe(
      tap((register) => {
        if (register) {
          this.currentRegisterSubject.next(register);
          if (register._id) {
            localStorage.setItem("currentRegisterId", register._id);
          }
        }
      })
    );
  }

  getRegisterHistory(startDate?: Date, endDate?: Date): Observable<Register[]> {
    let url = `${this.apiUrl}/history`;
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate.toISOString());
    if (endDate) params.append("endDate", endDate.toISOString());

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    return this.http.get<Register[]>(url);
  }

  getRegisterById(id: string): Observable<Register> {
    return this.http.get<Register>(`${this.apiUrl}/${id}`);
  }

  deleteRegister(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  getExpectedCash(): Observable<{
    openingCash: number;
    totalCashSales: number;
    expectedCash: number;
    totalSales: number;
    totalTransactions: number;
    totalWithdrawals: number;
  }> {
    return this.http.get<{
      openingCash: number;
      totalCashSales: number;
      expectedCash: number;
      totalSales: number;
      totalTransactions: number;
      totalWithdrawals: number;
    }>(`${this.apiUrl}/active/expected-cash`);
  }

  recordWithdrawal(
    registerId: string,
    amount: number,
    reason: string
  ): Observable<{ message: string; withdrawal: any }> {
    return this.http.post<{ message: string; withdrawal: any }>(
      `${this.apiUrl}/${registerId}/withdraw`,
      { amount, reason }
    );
  }
}
