import { Component, OnInit, OnDestroy, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute } from "@angular/router";
import { CartService } from "../../services/cart.service";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { AuthService } from "../../services/auth.service";
// using Angular signals for the clock; no rxjs needed here

@Component({
  selector: "app-client-screen",
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: "./client-screen.component.html",
  styleUrls: ["./client-screen.component.scss"],
})
export class ClientScreenComponent implements OnInit, OnDestroy {
  cartItems$ = this.cartService.cartItems$;
  // activeTab controls which panel is visible: 'fast' = Fast Cashier, 'pos' = POS Sales
  activeTab: "fast" | "pos" = "pos";
  cashierName = "";
  saleId = "";
  // make currentTime a signal so templates update reactively
  currentTime = signal<string>(new Date().toLocaleTimeString());
  private clockTimer: any;
  // signal to hold the active cart items fetched from the database for this cashier
  currentCart = signal<any[]>([]);
  private cartPollTimer: any;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.cashierName = user?.firstName || user?.username || "";

    // read the `view` query param to restore active tab (fast | pos)
    const qp = this.route.snapshot.queryParamMap.get("view");
    if (qp === "fast" || qp === "pos") {
      this.activeTab = qp as "fast" | "pos";
    }

    // simple sale id - could be replaced by real sale/session id
    this.saleId = `#${Math.floor(Math.random() * 900000 + 100000)}`;

    // Set initial time and start a simple interval that updates the signal every second
    this.currentTime.set(new Date().toLocaleTimeString());
    this.clockTimer = setInterval(() => {
      const t = new Date().toLocaleTimeString();
      this.currentTime.set(t);
      // debug trace to help verify the timer is running in the browser console
      // remove or comment out in production
      console.debug("client-screen clock tick:", t);
    }, 1000);

    // start polling the server for the cashier's active cart every second
    const cashierId = (user as any)?.id || (user as any)?._id;
    if (user && cashierId) {
      // initial fetch
      this.fetchActiveCart(cashierId);
      this.cartPollTimer = setInterval(
        () => this.fetchActiveCart(cashierId),
        1000
      );
    }
  }

  setTab(tab: "fast" | "pos") {
    this.activeTab = tab;
    // update URL query param so the selected tab is bookmarkable/shareable
    try {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { view: tab },
        queryParamsHandling: "merge",
        replaceUrl: true,
      });
    } catch (e) {
      // navigation can fail in tests or certain environments; ignore silently
      console.debug("Unable to update query param for view", e);
    }
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
    if (this.cartPollTimer) {
      clearInterval(this.cartPollTimer);
    }
  }

  private updateTime(): void {
    const now = new Date();
    this.currentTime.set(now.toLocaleTimeString());
  }

  private fetchActiveCart(cashierId: string): void {
    this.cartService.getIncompleteCartForCashier(cashierId).subscribe(
      (res: any) => {
        const cart = Array.isArray(res) ? res[0] : res;
        const rawItems = cart && cart.items ? cart.items : [];
        // normalize items so template can display manual items (description) or product objects
        const items = rawItems.map((it: any) => {
          const quantity = it.quantity ?? it.qty ?? 1;
          const unitPrice =
            it.price ?? it.unitPrice ?? it.unit_price ?? it.product?.price ?? 0;
          const subtotal = it.subtotal ?? it.price ?? unitPrice * quantity;
          return {
            product: it.product ?? null,
            description:
              it.description ??
              it.product?.name ??
              it.productName ??
              it.product_name ??
              null,
            brand: it.product?.brand ?? it.brand ?? null,
            quantity,
            unitPrice,
            subtotal,
          };
        });
        this.currentCart.set(items);
      },
      (err) => {
        console.error("Error fetching active cart for cashier", err);
        this.currentCart.set([]);
      }
    );
  }

  // Compute totals from the currentCart signal (items fetched from DB)
  get currentCartItemCount(): number {
    return this.currentCart().reduce((cnt, it) => cnt + (it.quantity || 0), 0);
  }

  get currentCartSubtotal(): number {
    return this.currentCart().reduce(
      (sum, it) => sum + (it.unitPrice || 0) * (it.quantity || 1),
      0
    );
  }

  get currentCartDiscount(): number {
    // discount not provided in current shape; default to 0
    return this.currentCart().reduce((sum, it) => sum + (it.discount || 0), 0);
  }

  get currentCartTax(): number {
    // tax not provided in current shape; default to 0
    return 0;
  }

  get currentCartTotal(): number {
    // Prefer subtotal + tax - discount, respecting available fields
    const subtotal = this.currentCartSubtotal;
    const discount = this.currentCartDiscount;
    const tax = this.currentCartTax;
    return subtotal - discount + tax;
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
