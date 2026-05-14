import { Injectable, inject } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { QzTrayService } from "./qz-tray.service";
import { ReceiptGeneratorService } from "./receipt-generator.service";
import { EscPosService } from "./esc-pos.service";
import { ToastService } from "./toast.service";
import { TranslationService } from "./translation.service";
import { Sale, PrintTemplate } from "../models";

export type PrinterStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";
export type PrintMode = "html" | "escpos";

@Injectable({ providedIn: "root" })
export class ReceiptPrinterService {
  private qzTray = inject(QzTrayService);
  private receiptGen = inject(ReceiptGeneratorService);
  private escPos = inject(EscPosService);
  private toastService = inject(ToastService);
  private translationService = inject(TranslationService);

  private _statusSubject = new BehaviorSubject<PrinterStatus>("disconnected");
  readonly printerStatus$: Observable<PrinterStatus> =
    this._statusSubject.asObservable();

  /** Controls whether to use HTML or ESC/POS plain text printing */
  printMode: PrintMode = "html";

  async connect(): Promise<void> {
    this._statusSubject.next("connecting");
    try {
      await this.qzTray.connect();
      this._statusSubject.next("connected");
    } catch {
      this._statusSubject.next("error");
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.qzTray.disconnect();
    } finally {
      this._statusSubject.next("disconnected");
    }
  }

  async getPrinters(): Promise<string[]> {
    return this.qzTray.findPrinters();
  }

  getDefaultPrinter(): string {
    return this.qzTray.getDefaultPrinter();
  }

  setDefaultPrinter(name: string): void {
    this.qzTray.setDefaultPrinter(name);
  }

  async printSale(sale: Sale, template?: PrintTemplate): Promise<void> {
    const connected = this.qzTray.isConnected();

    if (!connected) {
      const html = await this.receiptGen.generateSaleReceipt(sale, {
        plainText: false,
      });
      this.printWithBrowser(html);
      return;
    }

    const printerName = this.getDefaultPrinter();

    if (this.printMode === "escpos") {
      const escPosText = this.escPos.generateReceiptText(sale, {
        storeName: "",
        charsPerLine: 32,
      });
      await this.qzTray.print(printerName, escPosText, "plain");
    } else {
      const html = await this.receiptGen.generateSaleReceipt(sale, {
        plainText: false,
      });
      await this.qzTray.print(printerName, html, "html");
    }
  }

  async printTestPage(printerName: string): Promise<void> {
    if (!this.qzTray.isConnected()) {
      this.toastService.show("PRINTER.NOT_CONNECTED", "error");
      return;
    }

    const testContent = this.escPos.generateTestPage({
      storeName: "POS System",
      charsPerLine: 32,
    });
    await this.qzTray.print(printerName, testContent, "plain");
  }

  /**
   * Open receipt in browser print dialog.
   * Used as fallback when QZ Tray is not available.
   */
  printWithBrowser(html: string): void {
    const win = window.open("", "_blank", "width=400,height=600");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
      win.close();
    }
  }
}
