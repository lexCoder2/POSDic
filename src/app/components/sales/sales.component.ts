import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil, skip } from "rxjs";
import { SaleService } from "../../services/sale.service";
import { ReceiptGeneratorService } from "../../services/receipt-generator.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { SearchStateService } from "../../services/search-state.service";
import { Sale, SaleItem, User } from "../../models";
import { PageTitleComponent } from "../page-title/page-title.component";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";
import { ModalComponent } from "../modal/modal.component";

@Component({
  selector: "app-sales",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageTitleComponent,
    TranslatePipe,
    ModalComponent,
    CurrencyPipe,
  ],
  templateUrl: "./sales.component.html",
  styleUrls: ["./sales.component.scss"],
})
export class SalesComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  sales = signal<Sale[]>([]);
  searchQuery = signal<string>("");
  filteredSales = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const salesList = this.sales();
    if (!query) return salesList;
    return salesList.filter(
      (s) =>
        s.saleNumber?.toLowerCase().includes(query) ||
        this.getCashierName(s.cashier).toLowerCase().includes(query) ||
        s.paymentMethod?.toLowerCase().includes(query) ||
        s.status?.toLowerCase().includes(query)
    );
  });
  showSaleModal = false;
  selectedSale: Sale | null = null;

  // Refund modal properties
  showRefundModal = false;
  selectedSaleForRefund: Sale | null = null;
  refundType: "full" | "partial" = "full";
  refundReason = "";
  refundItems: Array<{ itemId: string; quantity: number; selected: boolean }> =
    [];
  refundTotal = 0;

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  paginatedSales = computed(() => {
    const filtered = this.filteredSales();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });
  totalPages = computed(() =>
    Math.ceil(this.filteredSales().length / this.pageSize())
  );

  filters = {
    status: "",
    startDate: "",
    endDate: "",
  };

  summary = {
    totalSales: 0,
    totalRevenue: 0,
    averageSale: 0,
    totalItems: 0,
  };

  private destroy$ = new Subject<void>();

  constructor(
    private saleService: SaleService,
    private authService: AuthService,
    private searchStateService: SearchStateService,
    private receiptGeneratorService: ReceiptGeneratorService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.searchStateService.clearSearch();
    this.loadSales();

    // Subscribe to header search bar
    this.searchStateService.searchQuery$
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchStateService.clearSearch();
  }

  isAdmin(): boolean {
    return this.currentUser?.role === "admin";
  }

  loadSales(): void {
    const filterParams: any = {};
    if (this.filters.status) filterParams.status = this.filters.status;
    if (this.filters.startDate) filterParams.startDate = this.filters.startDate;
    if (this.filters.endDate) filterParams.endDate = this.filters.endDate;

    this.saleService.getSales(filterParams).subscribe({
      next: (response) => {
        this.sales.set(response.data);
        this.calculateSummary();
      },
      error: (err) => console.error("Error loading sales:", err),
    });
  }

  calculateSummary(): void {
    const filtered = this.filteredSales();
    this.summary.totalSales = filtered.length;
    this.summary.totalRevenue = filtered.reduce(
      (sum, sale) => sum + (sale.total || 0),
      0
    );
    this.summary.averageSale =
      this.summary.totalSales > 0
        ? this.summary.totalRevenue / this.summary.totalSales
        : 0;
    this.summary.totalItems = filtered.reduce(
      (sum, sale) => sum + this.getTotalItems(sale),
      0
    );
  }

  getTotalItems(sale: Sale): number {
    return sale.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  getCashierName(cashier: string | User): string {
    if (typeof cashier === "string") {
      return cashier;
    }
    return cashier.firstName && cashier.lastName
      ? `${cashier.firstName} ${cashier.lastName}`
      : cashier.username || "Unknown";
  }

  getProductName(product: any): string {
    if (typeof product === "string") {
      return product;
    }
    return product?.name || "Unknown Product";
  }

  viewSale(sale: Sale): void {
    this.selectedSale = sale;
    this.showSaleModal = true;
  }

  printReceipt(sale: Sale): void {
    const currentUser = this.currentUser || this.authService.getCurrentUser();
    const paymentMethod = sale.paymentMethod || "cash";
    const change = sale.paymentDetails?.change ?? 0;

    const mode = localStorage.getItem("printer.mode") || "plain";
    if (mode === "styled") {
      this.receiptGeneratorService
        .generateReceipt(sale, paymentMethod, change, currentUser)
        .subscribe({
          next: (receiptContent) => {
            this.receiptGeneratorService.printReceipt(receiptContent, "html");
          },
          error: (err) => {
            console.error("Error generating styled receipt for sale:", err);
            this.toastService.show(
              "Failed to generate receipt. See console for details.",
              "error"
            );
          },
        });
    } else {
      this.receiptGeneratorService
        .generatePlainTextReceipt(sale, paymentMethod, change, currentUser)
        .subscribe({
          next: (receiptContent) => {
            this.receiptGeneratorService.printReceipt(receiptContent, "plain");
          },
          error: (err) => {
            console.error("Error generating plain-text receipt for sale:", err);
            this.toastService.show(
              "Failed to generate receipt. See console for details.",
              "error"
            );
          },
        });
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  getVisiblePages(): number[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const delta = 2;
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > delta + 2) pages.push(-1);
      const start = Math.max(2, current - delta);
      const end = Math.min(total - 1, current + delta);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (current < total - delta - 1) pages.push(-1);
      pages.push(total);
    }
    return pages;
  }

  cancelSale(id: string): void {
    if (!this.isAdmin()) {
      this.toastService.show("Only administrators can cancel sales", "error");
      return;
    }

    const reason = prompt("Enter cancellation reason:");
    if (!reason) {
      return;
    }

    this.saleService.cancelSale(id, reason).subscribe({
      next: (updated) => {
        const index = this.sales().findIndex((s) => s._id === updated._id);
        if (index !== -1) {
          const updatedSales = [...this.sales()];
          updatedSales[index] = updated;
          this.sales.set(updatedSales);
          this.calculateSummary();
        }
        this.toastService.show("Sale cancelled successfully", "success");
      },
      error: (err) => {
        console.error("Error cancelling sale:", err);
        this.toastService.show("Failed to cancel sale", "error");
      },
    });
  }

  openRefundModal(sale: Sale): void {
    if (!this.isAdmin()) {
      this.toastService.show("Only administrators can refund sales", "error");
      return;
    }

    this.selectedSaleForRefund = sale;
    this.refundType = "full";
    this.refundReason = "";

    // Initialize refund items array
    this.refundItems = sale.items.map((item) => ({
      itemId: (item as any)._id || "",
      quantity: item.quantity,
      selected: false,
    }));

    this.refundTotal = 0;
    this.showRefundModal = true;
  }

  onRefundTypeChange(): void {
    if (this.refundType === "full") {
      // Reset partial refund selections
      this.refundItems.forEach((item) => {
        item.selected = false;
      });
      this.refundTotal = 0;
    }
  }

  updateRefundTotal(): void {
    if (!this.selectedSaleForRefund) {
      this.refundTotal = 0;
      return;
    }

    this.refundTotal = this.selectedSaleForRefund.items.reduce(
      (sum, item, index) => {
        if (this.refundItems[index].selected) {
          const refundQty = this.refundItems[index].quantity;
          const itemTotal = item.unitPrice * refundQty;
          const discountPortion =
            (item.discountAmount || 0) * (refundQty / item.quantity);
          return sum + itemTotal - discountPortion;
        }
        return sum;
      },
      0
    );
  }

  hasSelectedItems(): boolean {
    return this.refundItems.some((item) => item.selected);
  }

  processRefund(): void {
    if (!this.selectedSaleForRefund || !this.refundReason) {
      this.toastService.show("Please provide a reason for the refund", "info");
      return;
    }

    if (this.refundType === "partial" && !this.hasSelectedItems()) {
      this.toastService.show(
        "Please select at least one item to refund",
        "info"
      );
      return;
    }

    const itemsToRefund =
      this.refundType === "partial"
        ? this.refundItems
            .filter((item) => item.selected)
            .map((item) => ({ itemId: item.itemId, quantity: item.quantity }))
        : undefined;

    this.saleService
      .refundSale(
        this.selectedSaleForRefund._id!,
        this.refundType,
        this.refundReason,
        itemsToRefund
      )
      .subscribe({
        next: (updated) => {
          const index = this.sales().findIndex((s) => s._id === updated._id);
          if (index !== -1) {
            const updatedSales = [...this.sales()];
            updatedSales[index] = updated;
            this.sales.set(updatedSales);
            this.calculateSummary();
          }
          this.showRefundModal = false;
          this.toastService.show(
            `${
              this.refundType === "full" ? "Full" : "Partial"
            } refund processed successfully`,
            "success"
          );
        },
        error: (err) => {
          console.error("Error processing refund:", err);
          this.toastService.show(
            err.error?.message || "Failed to process refund",
            "error"
          );
        },
      });
  }
}
