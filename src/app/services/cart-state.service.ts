import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable } from "rxjs";
import { map, tap } from "rxjs/operators";
import { environment } from "@environments/environment";
import { Cart, CartItem } from "../models";

@Injectable({
  providedIn: "root",
})
export class CartStateService {
  private apiUrl = `${environment.apiUrl}/carts`;
  private cartSubject = new BehaviorSubject<Cart | null>(null);
  public cart$ = this.cartSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get current cart from memory
  getCurrentCart(): Cart | null {
    return this.cartSubject.value;
  }

  // Set current cart in memory
  setCart(cart: Cart | null): void {
    this.cartSubject.next(cart);
  }

  // Get active cart for cashier from DB
  getActiveCart(cashierId: string): Observable<Cart | null> {
    return this.http.get<Cart>(`${this.apiUrl}/active/${cashierId}`).pipe(
      tap((cart) => this.cartSubject.next(cart)),
      map((cart) => cart || null)
    );
  }

  // Create new cart in DB
  createCart(cart: Partial<Cart>): Observable<Cart> {
    return this.http
      .post<Cart>(this.apiUrl, cart)
      .pipe(tap((newCart) => this.cartSubject.next(newCart)));
  }

  // Update cart in DB
  updateCart(cartId: string, cart: Partial<Cart>): Observable<Cart> {
    return this.http
      .put<Cart>(`${this.apiUrl}/${cartId}`, cart)
      .pipe(tap((updatedCart) => this.cartSubject.next(updatedCart)));
  }

  // Save current cart state to DB
  saveCartState(cart: Cart): Observable<Cart> {
    if (cart._id) {
      return this.updateCart(cart._id, cart);
    } else {
      return this.createCart(cart);
    }
  }

  // Delete cart from DB
  deleteCart(cartId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${cartId}`).pipe(
      tap(() => {
        if (this.cartSubject.value?._id === cartId) {
          this.cartSubject.next(null);
        }
      })
    );
  }

  // Mark cart as completed
  completeCart(cartId: string): Observable<Cart> {
    return this.http
      .put<Cart>(`${this.apiUrl}/${cartId}/complete`, {})
      .pipe(tap(() => this.cartSubject.next(null)));
  }

  // Get all carts for a cashier (with filters)
  getCarts(filters?: {
    cashier?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Observable<Cart[]> {
    const params: any = {};
    if (filters?.cashier) params.cashier = filters.cashier;
    if (filters?.status) params.status = filters.status;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;

    return this.http.get<Cart[]>(this.apiUrl, { params });
  }

  // Calculate cart totals
  calculateTotals(
    items: CartItem[],
    discount = 0,
    taxRate = 0
  ): {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const discountAmount = discount;
    const taxableAmount = subtotal - discountAmount;
    const tax = taxableAmount * (taxRate / 100);
    const total = taxableAmount + tax;

    return {
      subtotal,
      tax,
      discount: discountAmount,
      total,
    };
  }

  // Clear current cart from memory
  clearCart(): void {
    this.cartSubject.next(null);
  }
}
