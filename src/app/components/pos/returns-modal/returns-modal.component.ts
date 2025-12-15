import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../../pipes/translate.pipe";
import { CurrencyPipe } from "../../../pipes/currency.pipe";
import { SaleService } from "../../../services/sale.service";
import { ToastService } from "../../../services/toast.service";
import { Sale, SaleItem } from "../../../models";

export interface RefundItem {
  itemId: string;
  productName: string;
  quantity: number;
  maxQuantity: number;
  unitPrice: number;
  selected: boolean;
}

export interface RefundResult {
  sale: Sale;
  refundType: "full" | "partial";
  refundAmount: number;
}

@Component({
  selector: "app-returns-modal",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, CurrencyPipe],
  templateUrl: "./returns-modal.component.html",
  styleUrls: ["./returns-modal.component.scss"],
})
export class ReturnsModalComponent implements OnChanges {
  private saleService = inject(SaleService);
  private toastService = inject(ToastService);

  @Input() show = false;
  @Output() close = new EventEmitter<void>();
  @Output() refundComplete = new EventEmitter<RefundResult>();

  // Expose Math for template
  Math = Math;

  // Search state
  searchQuery = "";
  isSearching = false;
  searchResults = signal<Sale[]>([]);

  // Selected sale for refund
  selectedSale: Sale | null = null;
  refundType: "full" | "partial" = "full";
  refundReason = "";
  refundItems: RefundItem[] = [];
  isProcessing = false;

  // Computed refund total
  refundTotal = computed(() => {
    if (!this.selectedSale) return 0;
    if (this.refundType === "full") {
      return this.selectedSale.total;
    }
    return this.refundItems
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  });

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["show"] && this.show) {
      this.resetModal();
    }
  }

  resetModal(): void {
    this.searchQuery = "";
    this.searchResults.set([]);
    this.selectedSale = null;
    this.refundType = "full";
    this.refundReason = "";
    this.refundItems = [];
    this.isProcessing = false;
  }

  onClose(): void {
    this.close.emit();
  }

  searchSales(): void {
    if (!this.searchQuery.trim()) {
      this.searchResults.set([]);
      return;
    }

    this.isSearching = true;
    this.saleService
      .getSales({
        search: this.searchQuery.trim(),
        status: "completed",
        pageSize: 20,
      })
      .subscribe({
        next: (response) => {
          this.searchResults.set(response.data);
          this.isSearching = false;
        },
        error: (err) => {
          console.error("Error searching sales:", err);
          this.toastService.show("Error searching sales", "error");
          this.isSearching = false;
        },
      });
  }

  selectSale(sale: Sale): void {
    this.selectedSale = sale;
    this.refundType = "full";
    this.refundReason = "";

    // Initialize refund items from sale items
    this.refundItems = sale.items.map((item: SaleItem) => ({
      itemId: (item as any)._id || "",
      productName: item.productName || this.getProductName(item.product),
      quantity: item.quantity,
      maxQuantity: item.quantity,
      unitPrice: item.unitPrice,
      selected: false,
    }));
  }

  getProductName(product: any): string {
    if (!product) return "Unknown Product";
    if (typeof product === "string") return product;
    return product.name || "Unknown Product";
  }

  getCashierName(cashier: any): string {
    if (!cashier) return "Unknown";
    if (typeof cashier === "string") return cashier;
    return cashier.firstName && cashier.lastName
      ? `${cashier.firstName} ${cashier.lastName}`
      : cashier.username || "Unknown";
  }

  formatDate(date: Date | string | undefined): string {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  onRefundTypeChange(): void {
    if (this.refundType === "full") {
      this.refundItems.forEach((item) => {
        item.selected = false;
        item.quantity = item.maxQuantity;
      });
    }
  }

  toggleItemSelection(item: RefundItem): void {
    item.selected = !item.selected;
    if (!item.selected) {
      item.quantity = item.maxQuantity;
    }
  }

  hasSelectedItems(): boolean {
    return this.refundItems.some((item) => item.selected);
  }

  canProcessRefund(): boolean {
    if (!this.selectedSale || !this.refundReason.trim()) {
      return false;
    }
    if (this.refundType === "partial" && !this.hasSelectedItems()) {
      return false;
    }
    return true;
  }

  goBackToSearch(): void {
    this.selectedSale = null;
    this.refundItems = [];
    this.refundReason = "";
  }

  processRefund(): void {
    if (!this.selectedSale || !this.canProcessRefund()) {
      return;
    }

    this.isProcessing = true;

    const itemsToRefund =
      this.refundType === "partial"
        ? this.refundItems
            .filter((item) => item.selected)
            .map((item) => ({ itemId: item.itemId, quantity: item.quantity }))
        : undefined;

    this.saleService
      .refundSale(
        this.selectedSale._id!,
        this.refundType,
        this.refundReason.trim(),
        itemsToRefund
      )
      .subscribe({
        next: (updatedSale) => {
          this.isProcessing = false;
          const refundAmount =
            this.refundType === "full"
              ? this.selectedSale!.total
              : this.refundTotal();

          this.toastService.show(
            `${
              this.refundType === "full" ? "Full" : "Partial"
            } refund of ${refundAmount.toFixed(2)} processed successfully`,
            "success"
          );

          this.refundComplete.emit({
            sale: updatedSale,
            refundType: this.refundType,
            refundAmount,
          });

          this.onClose();
        },
        error: (err) => {
          this.isProcessing = false;
          console.error("Error processing refund:", err);
          this.toastService.show(
            err.error?.message || "Failed to process refund",
            "error"
          );
        },
      });
  }
}
