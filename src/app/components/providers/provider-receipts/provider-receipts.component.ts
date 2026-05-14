import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PurchaseReceiptService } from "../../../services/purchase-receipt.service";
import { ToastService } from "../../../services/toast.service";
import { TranslatePipe } from "../../../pipes/translate.pipe";
import { InvoiceScannerComponent } from "../invoice-scanner/invoice-scanner.component";
import { ReceiptReviewTableComponent } from "../receipt-review-table/receipt-review-table.component";
import { ParsedInvoice, PurchaseReceipt } from "../../../models";

@Component({
  selector: "app-provider-receipts",
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
    InvoiceScannerComponent,
    ReceiptReviewTableComponent,
  ],
  templateUrl: "./provider-receipts.component.html",
  styleUrls: ["./provider-receipts.component.scss"],
})
export class ProviderReceiptsComponent implements OnInit, OnDestroy {
  @Input({ required: true }) providerId!: string;

  private receiptService = inject(PurchaseReceiptService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  receipts = signal<PurchaseReceipt[]>([]);
  totalReceipts = signal<number>(0);
  isLoading = signal<boolean>(false);
  showScanner = signal<boolean>(false);
  showReview = signal<boolean>(false);
  parsedInvoice = signal<ParsedInvoice | null>(null);
  selectedReceipt = signal<PurchaseReceipt | null>(null);

  currentPage = signal<number>(1);
  pageSize = 10;

  ngOnInit(): void {
    this.loadReceipts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReceipts(): void {
    this.isLoading.set(true);
    this.receiptService
      .getReceipts(this.providerId, this.currentPage(), this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.receipts.set(res.data);
          this.totalReceipts.set(res.pagination?.total ?? res.data.length);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  openScanner(): void {
    this.showScanner.set(true);
  }

  onScanned(invoice: ParsedInvoice): void {
    this.showScanner.set(false);
    this.parsedInvoice.set(invoice);
    this.showReview.set(true);
  }

  onScanCancelled(): void {
    this.showScanner.set(false);
  }

  onReviewConfirmed(): void {
    this.showReview.set(false);
    this.parsedInvoice.set(null);
    this.loadReceipts();
  }

  onReviewCancelled(): void {
    this.showReview.set(false);
    this.parsedInvoice.set(null);
  }

  viewReceipt(receipt: PurchaseReceipt): void {
    this.receiptService
      .getReceipt(receipt._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (full) => {
          this.selectedReceipt.set(full);
        },
        error: () => {
          this.toastService.show(
            "PROVIDERS.INVOICES.ALERTS.APPLY_ERROR",
            "error"
          );
        },
      });
  }

  closeReceiptDetail(): void {
    this.selectedReceipt.set(null);
  }

  deleteReceipt(receipt: PurchaseReceipt, event: Event): void {
    event.stopPropagation();
    if (receipt.status === "applied") return;
    this.receiptService
      .deleteReceipt(receipt._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.show(
            "PROVIDERS.INVOICES.ALERTS.DELETE_SUCCESS",
            "success"
          );
          this.loadReceipts();
        },
        error: () => {
          this.toastService.show(
            "PROVIDERS.INVOICES.ALERTS.DELETE_ERROR",
            "error"
          );
        },
      });
  }

  getFileTypeIcon(fileType: string): string {
    const icons: Record<string, string> = {
      image: "fa-image",
      pdf: "fa-file-pdf",
      excel: "fa-file-excel",
      xml: "fa-file-code",
      camera: "fa-camera",
    };
    return icons[fileType] ?? "fa-file";
  }

  toReadonlyParsedInvoice(receipt: PurchaseReceipt): ParsedInvoice {
    return {
      items: receipt.parsedItems as any,
      totals: receipt.totals,
      invoiceNumber: (receipt as any).invoiceNumber,
      invoiceDate: (receipt as any).invoiceDate,
      providerRfc: (receipt as any).providerRfc,
      providerName: (receipt as any).providerName,
      fileType: receipt.fileType,
    };
  }

  trackByReceiptId(_: number, r: PurchaseReceipt): string {
    return r._id ?? "";
  }
}
