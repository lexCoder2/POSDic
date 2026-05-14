import { Component, OnInit, OnDestroy, inject, signal } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  ReceiptPrinterService,
  PrinterStatus,
  PrintMode,
} from "../../services/receipt-printer.service";
import { ToastService } from "../../services/toast.service";
import { TranslatePipe } from "../../pipes/translate.pipe";

@Component({
  selector: "app-printer-setup",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: "./printer-setup.component.html",
  styleUrls: ["./printer-setup.component.scss"],
})
export class PrinterSetupComponent implements OnInit, OnDestroy {
  private printerService = inject(ReceiptPrinterService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  status = signal<PrinterStatus>("disconnected");
  printers = signal<string[]>([]);
  selectedPrinter = signal<string>("");
  isLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.printerService.printerStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((s) => this.status.set(s));

    const defaultPrinter = this.printerService.getDefaultPrinter();
    if (defaultPrinter) {
      this.selectedPrinter.set(defaultPrinter);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async connect(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.printerService.connect();
      await this.loadPrinters();
    } catch {
      this.toastService.show("PRINTER.CONNECTION_ERROR", "error");
    } finally {
      this.isLoading.set(false);
    }
  }

  async disconnect(): Promise<void> {
    await this.printerService.disconnect();
    this.printers.set([]);
  }

  selectPrinter(name: string): void {
    this.selectedPrinter.set(name);
    this.printerService.setDefaultPrinter(name);
  }

  async printTest(): Promise<void> {
    if (!this.selectedPrinter()) {
      this.toastService.show("PRINTER.SELECT_PRINTER_FIRST", "info");
      return;
    }
    await this.printerService.printTestPage(this.selectedPrinter());
  }

  async loadPrinters(): Promise<void> {
    const list = await this.printerService.getPrinters();
    this.printers.set(list);
  }

  get printMode(): PrintMode {
    return this.printerService.printMode;
  }

  set printMode(mode: PrintMode) {
    this.printerService.printMode = mode;
  }
}
