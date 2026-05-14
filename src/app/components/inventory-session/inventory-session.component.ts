import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  signal,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { Subject, takeUntil, take } from "rxjs";
import { ProductService } from "../../services/product.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";
import { SearchStateService } from "../../services/search-state.service";
import { Product, User } from "../../models";
import { PageTitleComponent } from "../page-title/page-title.component";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";
import { environment } from "@environments/environment";

export type SessionMode = "edit" | "receive" | "stocktake";

export interface InventoryUpdate {
  productId: string;
  productName: string;
  ean?: string;
  oldPrice: number;
  newPrice: number;
  oldStock: number;
  newStock: number;
  mode: SessionMode;
  timestamp: Date;
}

interface InventorySession {
  startedAt: Date;
  startedBy: string;
  updates: InventoryUpdate[];
}

@Component({
  selector: "app-inventory-session",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageTitleComponent,
    TranslatePipe,
    CurrencyPipe,
  ],
  templateUrl: "./inventory-session.component.html",
  styleUrls: ["./inventory-session.component.scss"],
})
export class InventorySessionComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private translation = inject(TranslationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private searchStateService = inject(SearchStateService);

  private destroy$ = new Subject<void>();
  currentUser: User | null = null;

  session = signal<InventorySession>({
    startedAt: new Date(),
    startedBy: "",
    updates: [],
  });

  currentProduct: Product | null = null;
  saving = false;

  /** Current workflow mode */
  mode = signal<SessionMode>("edit");

  /** Multi-result picker: populated when search returns 2+ matches */
  searchResults = signal<Product[]>([]);

  /** Form fields */
  newPrice = 0;
  newStock = 0;
  newEan = "";

  /** Quantity for Receive mode (units received per product scan) */
  receiveQty = 1;

  /** productId currently being undone; null when idle */
  undoing = signal<string | null>(null);

  /** Report export format */
  exportFormat = signal<"txt" | "csv" | "print">("txt");

  get apiUrl(): string {
    return environment.apiUrl;
  }

  /** True when form values differ from the loaded product's saved values */
  get isFormDirty(): boolean {
    if (!this.currentProduct) return false;
    return (
      this.newPrice !== (this.currentProduct.price || 0) ||
      this.newStock !== (this.currentProduct.stock || 0) ||
      this.newEan !== (this.currentProduct.ean || "")
    );
  }

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  @HostListener("window:beforeunload", ["$event"])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.session().updates.length > 0) {
      event.preventDefault();
      event.returnValue = "";
    }
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(["/login"]);
      return;
    }

    this.session.set({
      ...this.session(),
      startedBy:
        this.currentUser.username || this.currentUser.firstName || "Unknown",
    });

    // Restore draft from sessionStorage (if any)
    this.restoreSessionFromStorage();

    // Read initial ?ean= once only — prevents re-triggering on subsequent router.navigate calls
    this.route.queryParams.pipe(take(1)).subscribe((params) => {
      const ean = params["ean"];
      if (ean) {
        this.searchProduct(ean);
      }
    });

    // Subscribe to global search bar
    this.searchStateService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe((query) => {
        if (query.trim()) {
          this.searchProduct(query);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Mode ─────────────────────────────────────────────────────────────────

  setMode(m: SessionMode): void {
    if (this.isFormDirty) {
      const confirmed = window.confirm(
        this.translation.translate("INVENTORY_SESSION.UNSAVED_CHANGES_CONFIRM")
      );
      if (!confirmed) return;
    }
    this.mode.set(m);
    if (this.currentProduct) {
      this.applyModeToStock();
    }
  }

  private applyModeToStock(): void {
    if (!this.currentProduct) return;
    if (this.mode() === "receive") {
      this.newStock = (this.currentProduct.stock || 0) + this.receiveQty;
    } else {
      // edit / stocktake: pre-fill with current stock; user edits manually
      this.newStock = this.currentProduct.stock || 0;
    }
  }

  /** Called from the Receive-mode quantity input */
  onReceiveQtyChange(qty: number): void {
    this.receiveQty = qty;
    if (this.currentProduct && this.mode() === "receive") {
      this.newStock = (this.currentProduct.stock || 0) + qty;
    }
  }

  // ─── Search & Load ────────────────────────────────────────────────────────

  searchProduct(query: string): void {
    if (!query.trim()) {
      return;
    }

    this.productService
      .searchProducts(query.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (products) => {
          if (products.length === 0) {
            this.toastService.show(
              this.translation.translate("INVENTORY_SESSION.PRODUCT_NOT_FOUND"),
              "info"
            );
            this.searchStateService.clearSearch();
            return;
          }

          if (products.length === 1) {
            this.searchStateService.clearSearch();
            this.maybeLoadProduct(products[0]);
          } else if (products.length <= 10) {
            this.searchResults.set(products);
            this.searchStateService.clearSearch();
            this.toastService.show(
              this.translation.translate("INVENTORY_SESSION.MULTIPLE_MATCHES"),
              "info"
            );
          } else {
            // >10 — cap at 10 and ask user to refine
            this.searchResults.set(products.slice(0, 10));
            this.searchStateService.clearSearch();
            this.toastService.show(
              this.translation.translate("INVENTORY_SESSION.REFINE_SEARCH"),
              "info"
            );
          }
        },
        error: (err) => {
          console.error("Error searching product:", err);
          this.toastService.show(
            this.translation.translate("INVENTORY_SESSION.SEARCH_ERROR"),
            "error"
          );
        },
      });
  }

  private maybeLoadProduct(product: Product): void {
    if (this.isFormDirty) {
      const confirmed = window.confirm(
        this.translation.translate("INVENTORY_SESSION.UNSAVED_CHANGES_CONFIRM")
      );
      if (!confirmed) return;
    }
    this.loadProduct(product);
  }

  pickResult(product: Product): void {
    this.searchResults.set([]);
    this.maybeLoadProduct(product);
  }

  loadProduct(product: Product): void {
    this.currentProduct = product;
    this.newPrice = product.price || 0;
    this.newEan = product.ean || "";
    this.searchResults.set([]);

    this.applyModeToStock();

    // Persist EAN to URL for page-refresh recovery
    if (product.ean) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { ean: product.ean },
        queryParamsHandling: "merge",
        replaceUrl: true,
      });
    }

    // Focus the most relevant input for the current mode
    setTimeout(() => {
      const inputId =
        this.mode() === "receive"
          ? "receive-qty-input"
          : this.mode() === "stocktake"
            ? "stock-input"
            : "price-input";
      const el = document.getElementById(inputId) as HTMLInputElement | null;
      el?.focus();
      el?.select();
    }, 100);
  }

  // ─── Update & Undo ────────────────────────────────────────────────────────

  updateProduct(): void {
    if (!this.currentProduct) return;

    if (this.newPrice < 0 || this.newStock < 0) {
      this.toastService.show(
        this.translation.translate("INVENTORY_SESSION.INVALID_VALUES"),
        "error"
      );
      return;
    }

    const hasChanges =
      this.newPrice !== (this.currentProduct.price || 0) ||
      this.newStock !== (this.currentProduct.stock || 0) ||
      this.newEan !== (this.currentProduct.ean || "");

    if (!hasChanges) {
      this.toastService.show(
        this.translation.translate("INVENTORY_SESSION.NO_CHANGES"),
        "info"
      );
      this.clearProduct();
      return;
    }

    this.saving = true;

    const updatedProduct: Partial<Product> = {
      ...this.currentProduct,
      price: this.newPrice,
      stock: this.newStock,
      ean: this.newEan || undefined,
    };

    this.productService
      .updateProduct(this.currentProduct._id!, updatedProduct)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;

          const update: InventoryUpdate = {
            productId: this.currentProduct!._id!,
            productName: this.currentProduct!.name,
            ean: this.newEan || this.currentProduct!.ean,
            oldPrice: this.currentProduct!.price || 0,
            newPrice: this.newPrice,
            oldStock: this.currentProduct!.stock || 0,
            newStock: this.newStock,
            mode: this.mode(),
            timestamp: new Date(),
          };

          // Immutable update — guarantees Angular change detection
          this.session.set({
            ...this.session(),
            updates: [update, ...this.session().updates],
          });

          this.saveSessionToStorage();

          this.toastService.show(
            this.translation.translate("INVENTORY_SESSION.PRODUCT_UPDATED"),
            "success"
          );

          this.clearProduct();
        },
        error: (err) => {
          this.saving = false;
          console.error("Error updating product:", err);
          this.toastService.show(
            this.translation.translate("INVENTORY_SESSION.UPDATE_ERROR"),
            "error"
          );
        },
      });
  }

  undoUpdate(update: InventoryUpdate): void {
    if (this.undoing()) return; // prevent concurrent undos

    this.undoing.set(update.productId);

    this.productService
      .updateProduct(update.productId, {
        price: update.oldPrice,
        stock: update.oldStock,
        ean: update.ean,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.undoing.set(null);
          this.session.set({
            ...this.session(),
            updates: this.session().updates.filter((u) => u !== update),
          });
          this.saveSessionToStorage();
          this.toastService.show(
            this.translation.translate("INVENTORY_SESSION.UNDO_SUCCESS"),
            "success"
          );
        },
        error: (err) => {
          this.undoing.set(null);
          console.error("Error reverting update:", err);
          this.toastService.show(
            this.translation.translate("INVENTORY_SESSION.UNDO_ERROR"),
            "error"
          );
        },
      });
  }

  /** Re-search product by EAN so user can edit it again */
  editAgain(update: InventoryUpdate): void {
    if (update.ean) {
      this.searchProduct(update.ean);
    }
  }

  clearProduct(): void {
    this.currentProduct = null;
    this.newPrice = 0;
    this.newStock = 0;
    this.newEan = "";
    this.searchResults.set([]);
    this.searchStateService.clearSearch();

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ean: null },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }

  // ─── Session lifecycle ────────────────────────────────────────────────────

  completeSession(): void {
    if (this.session().updates.length === 0) {
      this.toastService.show(
        this.translation.translate("INVENTORY_SESSION.NO_UPDATES"),
        "info"
      );
      return;
    }

    switch (this.exportFormat()) {
      case "csv":
        this.generateCsvReport();
        break;
      case "print":
        this.generatePrintableReport();
        break;
      default:
        this.generateReport();
        break;
    }

    this.clearSessionStorage();
    this.router.navigate(["/inventory"]);
  }

  cancelSession(): void {
    if (this.session().updates.length > 0) {
      const confirmed = window.confirm(
        this.translation.translate("INVENTORY_SESSION.CONFIRM_CANCEL")
      );
      if (!confirmed) return;
    }

    this.clearSessionStorage();
    this.router.navigate(["/inventory"]);
  }

  // ─── Reports ──────────────────────────────────────────────────────────────

  generateReport(): void {
    const s = this.session();
    let text = "INVENTORY SESSION REPORT\n";
    text += "=============================================\n\n";
    text += `Started: ${s.startedAt.toLocaleString()}\n`;
    text += `Completed: ${new Date().toLocaleString()}\n`;
    text += `Performed by: ${s.startedBy}\n`;
    text += `Total Updates: ${s.updates.length}\n\n`;
    text += "=============================================\n\n";

    s.updates.forEach((u, i) => {
      text += `${i + 1}. ${u.productName}  [${u.mode.toUpperCase()}]\n`;
      if (u.ean) text += `   EAN: ${u.ean}\n`;
      text += `   Price: $${u.oldPrice.toFixed(2)} -> $${u.newPrice.toFixed(2)}\n`;
      text += `   Stock: ${u.oldStock} -> ${u.newStock}\n`;
      text += `   Time: ${u.timestamp.toLocaleTimeString()}\n\n`;
    });

    this.downloadBlob(
      text,
      `inventory-session-${new Date().toISOString().split("T")[0]}.txt`,
      "text/plain"
    );
    this.toastService.show(
      this.translation.translate("INVENTORY_SESSION.REPORT_GENERATED"),
      "success"
    );
  }

  generateCsvReport(): void {
    const s = this.session();
    const header = [
      "Time",
      "Product",
      "EAN",
      "Mode",
      "OldPrice",
      "NewPrice",
      "PriceChange",
      "OldStock",
      "NewStock",
      "StockChange",
    ];
    const rows = s.updates.map((u) =>
      [
        u.timestamp.toLocaleString(),
        `"${u.productName.replace(/"/g, '""')}"`,
        u.ean || "",
        u.mode,
        u.oldPrice.toFixed(2),
        u.newPrice.toFixed(2),
        (u.newPrice - u.oldPrice).toFixed(2),
        String(u.oldStock),
        String(u.newStock),
        String(u.newStock - u.oldStock),
      ].join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");
    this.downloadBlob(
      csv,
      `inventory-session-${new Date().toISOString().split("T")[0]}.csv`,
      "text/csv;charset=utf-8"
    );
    this.toastService.show(
      this.translation.translate("INVENTORY_SESSION.REPORT_GENERATED"),
      "success"
    );
  }

  generatePrintableReport(): void {
    const s = this.session();
    const rows = s.updates
      .map(
        (u, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${u.timestamp.toLocaleTimeString()}</td>
        <td>${u.productName}</td>
        <td><code>${u.ean || "-"}</code></td>
        <td>${u.mode}</td>
        <td>$${u.oldPrice.toFixed(2)} -> $${u.newPrice.toFixed(2)}</td>
        <td>${u.oldStock} -> ${u.newStock} (${u.newStock - u.oldStock >= 0 ? "+" : ""}${u.newStock - u.oldStock})</td>
      </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html><head><title>Inventory Session Report</title>
<style>
  body{font-family:sans-serif;padding:20px}
  table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #ccc;padding:6px 10px;text-align:left}
  th{background:#f0f0f0}
  code{font-size:0.85em;background:#f5f5f5;padding:2px 4px;border-radius:3px}
  h1{margin-bottom:4px}p{margin:2px 0;color:#555}
</style></head><body>
<h1>Inventory Session Report</h1>
<p>Started: ${s.startedAt.toLocaleString()}</p>
<p>Completed: ${new Date().toLocaleString()}</p>
<p>Performed by: ${s.startedBy} &nbsp;|&nbsp; Total updates: ${s.updates.length}</p>
<br>
<table>
  <thead>
    <tr><th>#</th><th>Time</th><th>Product</th><th>EAN</th><th>Mode</th><th>Price</th><th>Stock</th></tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
    this.toastService.show(
      this.translation.translate("INVENTORY_SESSION.REPORT_GENERATED"),
      "success"
    );
  }

  private downloadBlob(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getPriceChange(update: InventoryUpdate): number {
    return update.newPrice - update.oldPrice;
  }

  getStockChange(update: InventoryUpdate): number {
    return update.newStock - update.oldStock;
  }

  // ─── SessionStorage draft ─────────────────────────────────────────────────

  private saveSessionToStorage(): void {
    try {
      const s = this.session();
      sessionStorage.setItem(
        "inventory-session-draft",
        JSON.stringify({
          startedAt: s.startedAt.toISOString(),
          startedBy: s.startedBy,
          updates: s.updates.map((u) => ({
            ...u,
            timestamp: u.timestamp.toISOString(),
          })),
        })
      );
    } catch {
      // Storage quota exceeded or unavailable — silently ignore
    }
  }

  private restoreSessionFromStorage(): void {
    try {
      const raw = sessionStorage.getItem("inventory-session-draft");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data?.updates?.length) return;

      const confirmed = window.confirm(
        this.translation.translate("INVENTORY_SESSION.RESTORE_DRAFT")
      );
      if (!confirmed) {
        sessionStorage.removeItem("inventory-session-draft");
        return;
      }

      this.session.set({
        startedAt: new Date(data.startedAt),
        startedBy: data.startedBy || this.session().startedBy,
        updates: data.updates.map(
          (u: InventoryUpdate & { timestamp: string }) => ({
            ...u,
            timestamp: new Date(u.timestamp),
          })
        ),
      });

      this.toastService.show(
        this.translation.translate("INVENTORY_SESSION.DRAFT_RESTORED"),
        "success"
      );
    } catch {
      sessionStorage.removeItem("inventory-session-draft");
    }
  }

  private clearSessionStorage(): void {
    sessionStorage.removeItem("inventory-session-draft");
  }
}
