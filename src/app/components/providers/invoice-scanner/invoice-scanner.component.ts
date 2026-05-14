import {
  Component,
  EventEmitter,
  OnDestroy,
  Output,
  inject,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PurchaseReceiptService } from "../../../services/purchase-receipt.service";
import { ToastService } from "../../../services/toast.service";
import { TranslatePipe } from "../../../pipes/translate.pipe";
import { ParsedInvoice } from "../../../models";

@Component({
  selector: "app-invoice-scanner",
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: "./invoice-scanner.component.html",
  styleUrls: ["./invoice-scanner.component.scss"],
})
export class InvoiceScannerComponent implements OnDestroy {
  @Output() scanned = new EventEmitter<ParsedInvoice>();
  @Output() cancelled = new EventEmitter<void>();

  private receiptService = inject(PurchaseReceiptService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  isLoading = signal<boolean>(false);
  isDragging = signal<boolean>(false);
  selectedFile = signal<File | null>(null);

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeModal(): void {
    this.cancelled.emit();
  }

  onOverlayClick(): void {
    if (!this.isLoading()) this.closeModal();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this._processFile(file);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this._processFile(file);
    // Reset so same file can be re-selected
    input.value = "";
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private _processFile(file: File): void {
    this.selectedFile.set(file);
    this.isLoading.set(true);

    this.receiptService
      .parseFile(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (parsed) => {
          this.isLoading.set(false);
          if (parsed.visionUnavailable) {
            this.toastService.show(
              "PROVIDERS.INVOICES.ALERTS.VISION_UNAVAILABLE",
              "info"
            );
          }
          this.scanned.emit(parsed);
        },
        error: (err) => {
          this.isLoading.set(false);
          const msg =
            err?.error?.message || "PROVIDERS.INVOICES.ALERTS.PARSE_ERROR";
          this.toastService.show(msg, "error");
        },
      });
  }
}
