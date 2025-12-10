import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
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

interface InventoryUpdate {
  productId: string;
  productName: string;
  ean?: string;
  oldPrice: number;
  newPrice: number;
  oldStock: number;
  newStock: number;
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
  private destroy$ = new Subject<void>();
  currentUser: User | null = null;

  session = signal<InventorySession>({
    startedAt: new Date(),
    startedBy: "",
    updates: [],
  });

  currentProduct: Product | null = null;
  saving = false;
  isStockRegistration = false; // Checkbox for registering new stock

  // Form fields
  newPrice = 0;
  newStock = 0;
  newEan = "";

  get apiUrl(): string {
    return environment.apiUrl;
  }

  constructor(
    private productService: ProductService,
    private authService: AuthService,
    private toastService: ToastService,
    private translation: TranslationService,
    private router: Router,
    private route: ActivatedRoute,
    private searchStateService: SearchStateService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(["/login"]);
      return;
    }

    const currentSession = this.session();
    currentSession.startedBy =
      this.currentUser.username || this.currentUser.firstName || "Unknown";
    this.session.set(currentSession);

    // Check if EAN is in URL query params
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const ean = params["ean"];
        if (ean) {
          // Load product from URL EAN
          this.searchProduct(ean);
        }
      });

    // Subscribe to product search from global search bar
    this.searchStateService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe((query) => {
        if (query.trim()) {
          this.searchProduct(query);
        }
      });

    // Clear search on init if no EAN in URL
    if (!this.route.snapshot.queryParams["ean"]) {
      this.searchStateService.clearSearch();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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

          // Load first matching product
          this.loadProduct(products[0]);
          this.searchStateService.clearSearch();
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

  loadProduct(product: Product): void {
    this.currentProduct = product;
    this.newPrice = product.price || 0;

    // If stock registration mode, increment the stock by 1
    if (this.isStockRegistration) {
      this.newStock = (product.stock || 0) + 1;
    } else {
      this.newStock = product.stock || 0;
    }

    this.newEan = product.ean || "";

    // Update URL with EAN for state persistence
    if (product.ean) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { ean: product.ean },
        queryParamsHandling: "merge",
        replaceUrl: true,
      });
      this.searchStateService.setSearchQuery(product.ean);
    }

    // If in stock registration mode, auto-save immediately
    if (this.isStockRegistration) {
      setTimeout(() => {
        this.updateProduct();
      }, 100);
    } else {
      // Focus on price input for manual editing
      setTimeout(() => {
        const priceInput = document.getElementById(
          "price-input"
        ) as HTMLInputElement;
        priceInput?.focus();
        priceInput?.select();
      }, 100);
    }
  }

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
      this.newPrice !== this.currentProduct.price ||
      this.newStock !== this.currentProduct.stock ||
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

          // Add to session updates
          const update: InventoryUpdate = {
            productId: this.currentProduct!._id!,
            productName: this.currentProduct!.name,
            ean: this.newEan || this.currentProduct!.ean,
            oldPrice: this.currentProduct!.price || 0,
            newPrice: this.newPrice,
            oldStock: this.currentProduct!.stock || 0,
            newStock: this.newStock,
            timestamp: new Date(),
          };

          const currentSession = this.session();
          currentSession.updates = [update, ...currentSession.updates];
          this.session.set(currentSession);

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

  clearProduct(): void {
    this.currentProduct = null;
    this.newPrice = 0;
    this.newStock = 0;
    this.newEan = "";
    this.searchStateService.clearSearch();

    // Clear EAN from URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ean: null },
      queryParamsHandling: "merge",
      replaceUrl: true,
    });
  }

  completeSession(): void {
    const currentSession = this.session();

    if (currentSession.updates.length === 0) {
      this.toastService.show(
        this.translation.translate("INVENTORY_SESSION.NO_UPDATES"),
        "info"
      );
      return;
    }

    // Generate report
    this.generateReport();

    // Navigate back to inventory
    this.router.navigate(["/inventory"]);
  }

  cancelSession(): void {
    const currentSession = this.session();

    if (currentSession.updates.length > 0) {
      const confirmed = window.confirm(
        this.translation.translate("INVENTORY_SESSION.CONFIRM_CANCEL")
      );
      if (!confirmed) return;
    }

    this.router.navigate(["/inventory"]);
  }

  generateReport(): void {
    const currentSession = this.session();

    let reportText = `INVENTORY SESSION REPORT\n`;
    reportText += `=============================================\n\n`;
    reportText += `Started: ${currentSession.startedAt.toLocaleString()}\n`;
    reportText += `Completed: ${new Date().toLocaleString()}\n`;
    reportText += `Performed by: ${currentSession.startedBy}\n`;
    reportText += `Total Updates: ${currentSession.updates.length}\n\n`;
    reportText += `=============================================\n\n`;

    currentSession.updates.forEach((update, index) => {
      reportText += `${index + 1}. ${update.productName}\n`;
      if (update.ean) reportText += `   EAN: ${update.ean}\n`;
      reportText += `   Price: $${update.oldPrice.toFixed(
        2
      )} → $${update.newPrice.toFixed(2)}\n`;
      reportText += `   Stock: ${update.oldStock} → ${update.newStock}\n`;
      reportText += `   Time: ${update.timestamp.toLocaleTimeString()}\n\n`;
    });

    // Download as text file
    const blob = new Blob([reportText], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory-session-${
      new Date().toISOString().split("T")[0]
    }.txt`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.toastService.show(
      this.translation.translate("INVENTORY_SESSION.REPORT_GENERATED"),
      "success"
    );
  }

  getPriceChange(update: InventoryUpdate): number {
    return update.newPrice - update.oldPrice;
  }

  getStockChange(update: InventoryUpdate): number {
    return update.newStock - update.oldStock;
  }
}
