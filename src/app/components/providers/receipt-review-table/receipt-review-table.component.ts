import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, forkJoin, of } from "rxjs";
import { catchError, debounceTime, switchMap, takeUntil } from "rxjs/operators";
import { ProductService } from "../../../services/product.service";
import { PurchaseReceiptService } from "../../../services/purchase-receipt.service";
import { ToastService } from "../../../services/toast.service";
import { TranslatePipe } from "../../../pipes/translate.pipe";
import {
  ConfirmedItem,
  ParsedInvoice,
  ParsedInvoiceItem,
  Product,
  PurchaseReceiptPayload,
} from "../../../models";

export interface ReviewRow extends ParsedInvoiceItem {
  matchedProduct: Product | null;
  createNew: boolean;
  included: boolean;
  searchQuery: string;
  searchResults: Product[];
  isSearching: boolean;
  showDropdown: boolean;
}

@Component({
  selector: "app-receipt-review-table",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: "./receipt-review-table.component.html",
  styleUrls: ["./receipt-review-table.component.scss"],
})
export class ReceiptReviewTableComponent implements OnInit, OnDestroy {
  @Input({ required: true }) parsedInvoice!: ParsedInvoice;
  @Input({ required: true }) providerId!: string;
  @Input() readOnly = false;

  @Output() confirmed = new EventEmitter<ConfirmedItem[]>();
  @Output() cancelled = new EventEmitter<void>();

  private productService = inject(ProductService);
  private receiptService = inject(PurchaseReceiptService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  rows = signal<ReviewRow[]>([]);
  isApplying = signal<boolean>(false);

  selectedCount = computed(() => this.rows().filter((r) => r.included).length);

  ngOnInit(): void {
    const initial: ReviewRow[] = (this.parsedInvoice.items ?? []).map(
      (item) => ({
        ...item,
        matchedProduct: null,
        createNew: false,
        included: true,
        searchQuery: item.barcode ?? item.description ?? "",
        searchResults: [],
        isSearching: false,
        showDropdown: false,
      })
    );
    this.rows.set(initial);

    this._autoMatchAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Product matching ───────────────────────────────────────────────────────

  private _autoMatchAll(): void {
    const currentRows = this.rows();

    const lookups = currentRows.map((row, index) => {
      // Try barcode first, then fuzzy search by description
      const barcode$ = row.barcode
        ? this.productService
            .getProductByBarcode(row.barcode)
            .pipe(catchError(() => of(null)))
        : of(null);

      return barcode$.pipe(
        switchMap((product) => {
          if (product) return of({ index, product });
          const query = row.description || "";
          if (!query) return of({ index, product: null });
          return this.productService.searchProducts(query, undefined, 1).pipe(
            catchError(() => of([])),
            switchMap((results: Product[] | Product | null) => {
              const arr = Array.isArray(results) ? results : [];
              return of({ index, product: arr[0] ?? null });
            })
          );
        })
      );
    });

    forkJoin(lookups)
      .pipe(takeUntil(this.destroy$))
      .subscribe((results) => {
        this.rows.update((rs) => {
          const updated = [...rs];
          results.forEach(({ index, product }) => {
            updated[index] = { ...updated[index], matchedProduct: product };
          });
          return updated;
        });
      });
  }

  searchProduct(rowIndex: number, query: string): void {
    this.rows.update((rs) => {
      const updated = [...rs];
      updated[rowIndex] = {
        ...updated[rowIndex],
        searchQuery: query,
        isSearching: true,
        showDropdown: false,
      };
      return updated;
    });

    this.productService
      .searchProducts(query, undefined, 8)
      .pipe(
        debounceTime(300),
        catchError(() => of([])),
        takeUntil(this.destroy$)
      )
      .subscribe((results) => {
        this.rows.update((rs) => {
          const updated = [...rs];
          const arr = Array.isArray(results) ? results : [];
          updated[rowIndex] = {
            ...updated[rowIndex],
            isSearching: false,
            searchResults: arr,
            showDropdown: arr.length > 0,
          };
          return updated;
        });
      });
  }

  selectProduct(rowIndex: number, product: Product): void {
    this.rows.update((rs) => {
      const updated = [...rs];
      updated[rowIndex] = {
        ...updated[rowIndex],
        matchedProduct: product,
        createNew: false,
        searchQuery: product.name,
        showDropdown: false,
        searchResults: [],
      };
      return updated;
    });
  }

  clearMatch(rowIndex: number): void {
    this.rows.update((rs) => {
      const updated = [...rs];
      updated[rowIndex] = {
        ...updated[rowIndex],
        matchedProduct: null,
        createNew: false,
        searchQuery:
          updated[rowIndex].barcode ?? updated[rowIndex].description ?? "",
        showDropdown: false,
        searchResults: [],
      };
      return updated;
    });
  }

  toggleCreateNew(rowIndex: number): void {
    this.rows.update((rs) => {
      const updated = [...rs];
      updated[rowIndex] = {
        ...updated[rowIndex],
        createNew: !updated[rowIndex].createNew,
        matchedProduct: null,
        showDropdown: false,
      };
      return updated;
    });
  }

  toggleIncluded(rowIndex: number): void {
    this.rows.update((rs) => {
      const updated = [...rs];
      updated[rowIndex] = {
        ...updated[rowIndex],
        included: !updated[rowIndex].included,
      };
      return updated;
    });
  }

  updateField(
    rowIndex: number,
    field: "quantity" | "unitCost" | "barcode",
    value: string
  ): void {
    this.rows.update((rs) => {
      const updated = [...rs];
      const row = { ...updated[rowIndex] };
      if (field === "quantity") row.quantity = parseFloat(value) || 0;
      else if (field === "unitCost") row.unitCost = parseFloat(value) || 0;
      else if (field === "barcode") row.barcode = value;
      row.total = row.quantity * row.unitCost;
      updated[rowIndex] = row;
      return updated;
    });
  }

  hideDropdown(rowIndex: number): void {
    setTimeout(() => {
      this.rows.update((rs) => {
        const updated = [...rs];
        updated[rowIndex] = { ...updated[rowIndex], showDropdown: false };
        return updated;
      });
    }, 200);
  }

  // ─── Apply ──────────────────────────────────────────────────────────────────

  confirmAndApply(): void {
    const includedRows = this.rows().filter((r) => r.included);
    if (includedRows.length === 0) {
      this.toastService.show("PROVIDERS.INVOICES.ALERTS.NO_ITEMS", "info");
      return;
    }

    const confirmedItems: ConfirmedItem[] = includedRows.map((r) => ({
      description: r.description,
      barcode: r.barcode,
      noIdentificacion: r.noIdentificacion,
      quantity: r.quantity,
      unitCost: r.unitCost,
      total: r.total,
      included: true,
      matchedProduct: (r.matchedProduct as Product)?._id ?? null,
      createNew: r.createNew,
    }));

    if (this.readOnly) {
      this.confirmed.emit(confirmedItems);
      return;
    }

    const payload: PurchaseReceiptPayload = {
      providerId: this.providerId,
      originalFilename: this.parsedInvoice.originalFilename ?? "invoice",
      fileType: this.parsedInvoice.fileType ?? "upload",
      storagePath: this.parsedInvoice.storagePath,
      invoiceNumber: this.parsedInvoice.invoiceNumber,
      invoiceDate: this.parsedInvoice.invoiceDate,
      providerRfc: this.parsedInvoice.providerRfc,
      providerName: this.parsedInvoice.providerName,
      totals: this.parsedInvoice.totals,
      confirmedItems,
    };

    this.isApplying.set(true);
    this.receiptService
      .saveAndApply(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isApplying.set(false);
          this.toastService.show(
            "PROVIDERS.INVOICES.ALERTS.APPLY_SUCCESS",
            "success"
          );
          this.confirmed.emit(confirmedItems);
        },
        error: () => {
          this.isApplying.set(false);
          this.toastService.show(
            "PROVIDERS.INVOICES.ALERTS.APPLY_ERROR",
            "error"
          );
        },
      });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  getProductName(row: ReviewRow): string {
    if (row.matchedProduct) {
      return (row.matchedProduct as Product).name;
    }
    if (row.createNew) return "(New)";
    return "—";
  }

  trackByIndex(index: number): number {
    return index;
  }
}
