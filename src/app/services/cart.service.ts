import { Injectable, inject } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { CartItem, Product } from "../models";

@Injectable({
  providedIn: "root",
})
export class CartService {
  private http = inject(HttpClient);

  private cartItems = new BehaviorSubject<CartItem[]>([]);
  public cartItems$ = this.cartItems.asObservable();
  private apiUrl = `${environment.apiUrl}/carts`;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    this.loadCart();
  }

  private loadCart(): void {
    const savedCart = localStorage.getItem("pos_cart");
    if (savedCart) {
      try {
        const items = JSON.parse(savedCart);
        this.cartItems.next(items);
      } catch (e) {
        console.error("Error loading cart:", e);
      }
    }
  }

  private saveCart(): void {
    localStorage.setItem("pos_cart", JSON.stringify(this.cartItems.value));
  }

  addItem(product: Product, quantity = 1, weight?: number): void {
    const items = this.cartItems.value;
    const existingItem = items.find((item) => item.product._id === product._id);

    if (existingItem) {
      if (product.requiresScale && weight) {
        existingItem.weight = weight;
        existingItem.quantity = weight;
      } else {
        existingItem.quantity += quantity;
      }
      existingItem.subtotal =
        existingItem.product.price * existingItem.quantity -
        (existingItem.product.price *
          existingItem.quantity *
          existingItem.discount) /
          100;
    } else {
      const qty = product.requiresScale && weight ? weight : quantity;
      items.push({
        product,
        quantity: qty,
        discount: 0,
        weight: weight,
        subtotal: product.price * qty,
      });
    }

    this.cartItems.next(items);
    this.saveCart();
  }

  updateQuantity(productId: string, quantity: number): void {
    const items = this.cartItems.value;
    const item = items.find((i) => i.product._id === productId);

    if (item) {
      item.quantity = quantity;
      if (quantity <= 0) {
        this.removeItem(productId);
      } else {
        item.subtotal =
          item.product.price * item.quantity -
          (item.product.price * item.quantity * item.discount) / 100;
        this.cartItems.next(items);
        this.saveCart();
      }
    }
  }

  updateDiscount(productId: string, discount: number): void {
    const items = this.cartItems.value;
    const item = items.find((i) => i.product._id === productId);

    if (item) {
      item.discount = Math.max(0, Math.min(100, discount));
      item.subtotal =
        item.product.price * item.quantity -
        (item.product.price * item.quantity * item.discount) / 100;
      this.cartItems.next(items);
      this.saveCart();
    }
  }

  removeItem(productId: string): void {
    const items = this.cartItems.value.filter(
      (i) => i.product._id !== productId
    );
    this.cartItems.next(items);
    this.saveCart();
  }

  clearCart(): void {
    this.cartItems.next([]);
    localStorage.removeItem("pos_cart");
  }

  getTotal(): number {
    return this.cartItems.value.reduce((total, item) => {
      const itemPrice = item.product.price * item.quantity;
      const discountAmount = (itemPrice * item.discount) / 100;
      const taxAmount =
        ((itemPrice - discountAmount) * (item.product.taxRate || 0)) / 100;
      return total + itemPrice - discountAmount + taxAmount;
    }, 0);
  }

  getSubtotal(): number {
    return this.cartItems.value.reduce((total, item) => {
      return total + item.product.price * item.quantity;
    }, 0);
  }

  getTotalDiscount(): number {
    return this.cartItems.value.reduce((total, item) => {
      const itemPrice = item.product.price * item.quantity;
      return total + (itemPrice * item.discount) / 100;
    }, 0);
  }

  getTotalTax(): number {
    return this.cartItems.value.reduce((total, item) => {
      const itemPrice = item.product.price * item.quantity;
      const discountAmount = (itemPrice * item.discount) / 100;
      return (
        total +
        ((itemPrice - discountAmount) * (item.product.taxRate || 0)) / 100
      );
    }, 0);
  }

  getItemCount(): number {
    return this.cartItems.value.reduce(
      (count, item) => count + item.quantity,
      0
    );
  }

  // API methods for database cart operations
  getActiveCart(cashierId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/active/${cashierId}`);
  }

  createCart(cartData: any): Observable<any> {
    return this.http.post(this.apiUrl, cartData);
  }

  updateCart(cartId: string, cartData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${cartId}`, cartData);
  }

  deleteCart(cartId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${cartId}`);
  }

  getAllCarts(filters?: any): Observable<any> {
    return this.http.get(this.apiUrl, { params: filters });
  }

  markCartAsAbandoned(cartId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${cartId}`, { status: "abandoned" });
  }

  getIncompleteCartForCashier(cashierId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}`, {
      params: { cashier: cashierId, status: "active" },
    });
  }
}
