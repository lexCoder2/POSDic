import { Component, OnInit, OnDestroy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { CartService } from "../../services/cart.service";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-client-screen",
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: "./client-screen.component.html",
  styleUrls: ["./client-screen.component.scss"],
})
export class ClientScreenComponent implements OnInit, OnDestroy {
  cartItems$ = this.cartService.cartItems$;
  cashierName = "";
  saleId = "";
  currentTime = "";
  private clockTimer: any;

  constructor(
    private cartService: CartService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.cashierName = user?.firstName || user?.username || "";

    // simple sale id - could be replaced by real sale/session id
    this.saleId = `#${Math.floor(Math.random() * 900000 + 100000)}`;

    this.updateTime();
    this.clockTimer = setInterval(() => this.updateTime(), 1000);
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString();
  }

  get total(): number {
    return this.cartService.getTotal();
  }

  get subtotal(): number {
    return this.cartService.getSubtotal();
  }

  get discount(): number {
    return this.cartService.getTotalDiscount();
  }

  get tax(): number {
    return this.cartService.getTotalTax();
  }

  get itemCount(): number {
    return this.cartService.getItemCount();
  }

  formatPrice(value: number): string {
    return value?.toFixed ? value.toFixed(2) : "0.00";
  }
}
