import { Injectable } from "@angular/core";
import { PrintTemplateService } from "./print-template.service";
import { TranslationService } from "./translation.service";
import { Observable, of } from "rxjs";
import { map } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class ReceiptGeneratorService {
  constructor(
    private printTemplateService: PrintTemplateService,
    private translationService: TranslationService
  ) {}

  generateReceipt(
    sale: any,
    paymentMethod: string,
    change: number,
    currentUser: any,
    templateId?: string
  ): Observable<string> {
    // Get the template (default or specific)
    const templateRequest = templateId
      ? this.printTemplateService.getTemplate(templateId)
      : this.printTemplateService.getDefaultTemplate();

    return templateRequest.pipe(
      map((template) => {
        const receiptDate = new Date();

        let receiptContent = `
      <html>
        <head>
          <style>
            @media print {
              /* remove page margins so content can be flush; printers add their own feeds */
              @page { margin: 0mm; size: ${template.paperSize || "58mm"} auto; }
              body { margin: 0px; padding: 0; }
            }
            body {
              font-family: '${
                template.styles?.fontFamily || "Courier New"
              }', monospace;
              width: ${
                template.paperSize === "A4"
                  ? "210mm"
                  : template.paperSize || "58mm"
              };
              margin: 0;
              /* minimize padding to avoid extra feed/white space at bottom */
              padding: 0mm;
              color: #000;
              background: #fff;
              -webkit-print-color-adjust: exact;
              font-size: ${
                template.body?.fontSize === "large"
                  ? "18px"
                  : template.body?.fontSize === "medium"
                  ? "16px"
                  : "14px"
              };
              line-height: 1.2;
            }
            .receipt {
              text-align: ${template.styles?.textAlign || "center"};
              /* reduce vertical padding inside receipt to avoid extra paper feed */
              padding: 2mm 0;
              box-sizing: border-box;
              display: block;
            }
            .header {
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 6px;
              border-bottom: 1px dashed #000;
              padding-bottom: 5px;
            }
            .info {
              text-align: left;
              margin: 5px 0;
              font-size: 10px;
              line-height: 1.3;
            }
            .items {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 5px 0;
              margin: 5px 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
              text-align: left;
              font-size: 12px;
            }
            .item span:first-child {
              flex: 1;
              padding-right: 3px;
            }
            .totals {
              margin: 3px 0;
              font-size: 11px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .total-row.grand {
              font-size: 12px;
              font-weight: bold;
              border-top: 1px solid #000;
              padding-top: 3px;
              margin-top: 3px;
            }
            .payment {
              margin: 3px 0;
              border-top: 1px dashed #000;
              padding-top: 3px;
              font-size: 12px;
            }
            .footer {
              text-align: center;
              width: 100%;
              margin-top: 2px;
              font-size: 11px;
              border-top: 1px dashed #000;
              padding-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
        `;

        // Header (respect show flags)
        const hasHeader =
          template.header?.showLogo ||
          template.header?.showStoreName ||
          template.header?.showStoreAddress;
        if (hasHeader) {
          receiptContent += `<div class="header">`;
          if (template.header?.showStoreName && template.header?.storeName) {
            receiptContent += `${template.header.storeName}<br>`;
          }
          const receiptTitle =
            this.translationService.translate("RECEIPT.TITLE");
          receiptContent += `</div>`;
        }

        // Store Info (respect individual show flags)
        if (
          (template.header?.showStoreAddress &&
            template.header?.storeAddress) ||
          (template.header?.showStorePhone && template.header?.storePhone) ||
          (template.header?.showStoreEmail && template.header?.storeEmail)
        ) {
          receiptContent += `<div class="info">`;
          if (
            template.header?.showStoreAddress &&
            template.header?.storeAddress
          ) {
            receiptContent += `<div>${template.header.storeAddress}</div>`;
          }
          if (template.header?.showStorePhone && template.header?.storePhone) {
            receiptContent += `<div>${template.header.storePhone}</div>`;
          }
          if (template.header?.showStoreEmail && template.header?.storeEmail) {
            receiptContent += `<div>${template.header.storeEmail}</div>`;
          }
          receiptContent += `</div>`;
        }

        // Transaction Info
        receiptContent += `
          <div class="info">
            ${
              template.footer?.showDateTime
                ? `<div>${receiptDate.toLocaleDateString()} ${receiptDate.toLocaleTimeString()}</div>`
                : ""
            }
            ${
              template.footer?.showCashier
                ? `<div>${this.translationService.translate(
                    "RECEIPT.CASHIER"
                  )} ${
                    currentUser?.firstName || currentUser?.username || "Unknown"
                  }</div>`
                : ""
            }
            ${
              sale.saleNumber
                ? `<div>${this.translationService.translate(
                    "RECEIPT.SALE_NUMBER"
                  )} ${sale.saleNumber}</div>`
                : ""
            }
          </div>
        `;

        // Items (always include product lines; show qty/price details if requested)
        receiptContent += `<div class="items">`;
        sale.items.forEach((item: any, index: number) => {
          let itemDescription = item.productName || `Item ${index + 1}`;
          if (item.weight && item.pricePerKg) {
            itemDescription += ` (${item.weight.toFixed(
              3
            )}kg @ $${item.pricePerKg.toFixed(2)}/kg)`;
          }

          let rightText = `$${(item.total || 0).toFixed(2)}`;
          if (template.body?.showQuantity || template.body?.showUnitPrice) {
            const qty = item.qty ?? item.quantity ?? item.amount ?? 1;
            const unit = item.unitPrice ?? item.price ?? item.pricePerKg ?? 0;
            rightText = `${qty} $${(unit || 0).toFixed(2)} $${(
              item.total || 0
            ).toFixed(2)}`;
          }

          receiptContent += `
            <div class="item">
              <span>${itemDescription}</span>
              <span>${rightText}</span>
            </div>
          `;
        });
        receiptContent += `</div>`;

        // Totals
        if (template.footer?.showTotals) {
          receiptContent += `
            <div class="totals">
              <div class="total-row grand">
                <span>${this.translationService.translate(
                  "RECEIPT.TOTAL_LABEL"
                )}</span>
                <span>$${sale.total.toFixed(2)}</span>
              </div>
            </div>
          `;
        }

        // Payment Info (respect showPaymentMethod flag)
        if (template.footer?.showPaymentMethod) {
          receiptContent += `<div class="payment">`;

          receiptContent += `
              <div class="total-row">
                <span>${this.translationService.translate(
                  "RECEIPT.PAYMENT_METHOD"
                )}</span>
                <span>${paymentMethod.toUpperCase()}</span>
              </div>
            `;

          if (paymentMethod === "cash") {
            receiptContent += `
              <div class="total-row">
                <span>${this.translationService.translate(
                  "RECEIPT.CASH_RECEIVED"
                )}</span>
                <span>$${(sale.total + change).toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>${this.translationService.translate(
                  "RECEIPT.CHANGE"
                )}</span>
                <span>$${change.toFixed(2)}</span>
              </div>
            `;
          }

          receiptContent += `</div>`;
        }

        // Footer Message
        if (template.footer?.showThankYou) {
          receiptContent += `
            <div class="footer">
              ${
                template.footer?.customMessage ||
                this.translationService.translate("RECEIPT.THANK_YOU")
              }
            </div>
          `;
        }

        receiptContent += `
          </div>
        </body>
      </html>
    `;

        return receiptContent;
      })
    );
  }

  /**
   * Generate a plain text preformatted receipt wrapped in minimal HTML
   * (useful for thermal printers / ESC/POS that handle plain text better).
   * Returns an Observable<string> with HTML containing a <pre> block.
   */
  generatePlainTextReceipt(
    sale: any,
    paymentMethod: string,
    change: number,
    currentUser: any,
    templateId?: string
  ): Observable<string> {
    const templateRequest = templateId
      ? this.printTemplateService.getTemplate(templateId)
      : this.printTemplateService.getDefaultTemplate();

    return templateRequest.pipe(
      map((template) => {
        // Choose character width based on paper size and reserve a small right padding
        const widthChars =
          template.paperSize === "80mm"
            ? 48
            : template.paperSize === "A4"
            ? 80
            : 32; // default 58mm
        // reserve some characters on the right to avoid clipping on some printers
        // remove padding for flush output (adjustable per-printer if needed)
        const rightPadChars = 0;
        const effWidth = Math.max(30, widthChars - rightPadChars);

        const padRight = (s: string, len: number) => {
          if (s == null) s = "";
          if (s.length >= len) return s.substring(0, len);
          return s + " ".repeat(len - s.length);
        };

        const padLeft = (s: string, len: number) => {
          if (s == null) s = "";
          if (s.length >= len) return s.substring(0, len);
          return " ".repeat(len - s.length) + s;
        };

        const center = (s: string, len: number) => {
          if (s == null) s = "";
          if (s.length >= len) return s.substring(0, len);
          const left = Math.floor((len - s.length) / 2);
          const right = len - s.length - left;
          return " ".repeat(left) + s + " ".repeat(right);
        };

        const line = (content = "") => content + "\n";

        const separator = "-".repeat(effWidth);

        // helper: wrap a text to max width returning array of lines
        const wrapText = (text: string, maxWidth: number) => {
          if (!text) return [""];
          const words = String(text).split(/\s+/);
          const lines: string[] = [];
          let current = "";
          for (const w of words) {
            if ((current + (current ? " " : "") + w).length <= maxWidth) {
              current = current ? current + " " + w : w;
            } else {
              if (current) lines.push(current);
              // if single word longer than width, break it
              if (w.length > maxWidth) {
                let i = 0;
                while (i < w.length) {
                  lines.push(w.substring(i, i + maxWidth));
                  i += maxWidth;
                }
                current = "";
              } else {
                current = w;
              }
            }
          }
          if (current) lines.push(current);
          return lines;
        };

        let txt = "";

        // Header
        if (template.header?.showStoreName && template.header?.storeName) {
          txt += line(center(template.header.storeName, effWidth));
        }
        if (
          template.header?.showStoreAddress &&
          template.header?.storeAddress
        ) {
          txt += line(center(template.header.storeAddress, effWidth));
        }
        if (template.header?.showStorePhone && template.header?.storePhone) {
          txt += line(center(template.header.storePhone, effWidth));
        }
        if (template.header?.showStoreEmail && template.header?.storeEmail) {
          txt += line(center(template.header.storeEmail, effWidth));
        }

        // Receipt title
        const receiptTitle = this.translationService.translate("RECEIPT.TITLE");
        txt = receiptTitle + "\n" + txt;

        txt += line(separator);

        // Date / cashier

        if (template.footer?.showDateTime) {
          const now = new Date();
          txt += line(padRight(now.toLocaleString(), effWidth));
        }
        if (template.footer?.showCashier) {
          const cashier =
            currentUser?.firstName || currentUser?.username || "Unknown";
          const cashierLabel =
            this.translationService.translate("RECEIPT.CASHIER");
          txt += line(padRight(`${cashierLabel} ${cashier}`, effWidth));
        }

        if (sale.saleNumber) {
          const saleLabel = this.translationService.translate(
            "RECEIPT.SALE_NUMBER"
          );
          txt += line(padRight(`${saleLabel} ${sale.saleNumber}`, effWidth));
        }

        txt += line(separator);

        // Items header
        // compute columns based on effective width (after right padding)
        const nameCol = Math.max(10, Math.floor(effWidth * 0.55));
        const qtyCol = Math.max(4, Math.floor(effWidth * 0.12));
        const unitCol = Math.max(6, Math.floor(effWidth * 0.16));
        const totalCol = effWidth - (nameCol + qtyCol + unitCol);

        const headerName = padRight(
          this.translationService.translate("RECEIPT.ITEM"),
          nameCol
        );
        const headerQty = padLeft(
          this.translationService.translate("RECEIPT.QTY"),
          qtyCol
        );
        const headerUnit = padLeft(
          this.translationService.translate("RECEIPT.UNIT"),
          unitCol
        );
        const headerTotal = padLeft(
          this.translationService.translate("RECEIPT.TOTAL"),
          totalCol
        );
        txt += line(`${headerName} ${headerQty} ${headerUnit} ${headerTotal} `);

        // Items
        sale.items.forEach((item: any, idx: number) => {
          const rawName = item.productName || `Item ${idx + 1}`;
          const nameLines = wrapText(rawName, nameCol);
          const qty = String(item.qty ?? item.quantity ?? item.amount ?? 1);
          const unit = Number(
            item.unitPrice ?? item.price ?? item.pricePerKg ?? 0
          ).toFixed(2);
          const total = Number(
            item.total ?? item.price ?? (Number(unit) * Number(qty) || 0)
          ).toFixed(2);

          // first line contains qty/unit/total
          const firstName = nameLines.length ? nameLines[0] : "";
          const firstLine = `${padRight(firstName, nameCol)} ${padLeft(
            qty,
            qtyCol
          )} ${padLeft(unit, unitCol)} ${padLeft(total, totalCol)}`;
          txt += line(firstLine);

          // remaining name lines printed under the name column
          for (let i = 1; i < nameLines.length; i++) {
            const continued = `${padRight(nameLines[i], nameCol)} ${" ".repeat(
              qtyCol
            )} ${" ".repeat(unitCol)} ${" ".repeat(totalCol)}`;
            txt += line(continued);
          }
        });

        txt += line(separator);

        // Totals
        if (template.footer?.showTotals) {
          const totalLabel = this.translationService.translate(
            "RECEIPT.TOTAL_LABEL"
          );
          txt += line(
            padLeft(`${totalLabel} $${(sale.total || 0).toFixed(2)}`, effWidth)
          );
        }

        // Payment
        if (template.footer?.showPaymentMethod) {
          const paymentLabel = this.translationService.translate(
            "RECEIPT.PAYMENT_METHOD"
          );
          txt += line(
            padLeft(`${paymentLabel} ${paymentMethod.toUpperCase()}`, effWidth)
          );
          if (paymentMethod === "cash") {
            const cashReceivedLabel = this.translationService.translate(
              "RECEIPT.CASH_RECEIVED"
            );
            const changeLabel =
              this.translationService.translate("RECEIPT.CHANGE");
            txt += line(
              padLeft(
                `${cashReceivedLabel} $${(sale.total + change).toFixed(2)}`,
                effWidth
              )
            );
            txt += line(
              padLeft(`${changeLabel} $${change.toFixed(2)}`, effWidth)
            );
          }
        }

        txt += line(separator);

        // Footer / thank you — wrap and center using effective width so long
        // messages are not truncated on narrow paper.
        if (template.footer?.showThankYou) {
          const footerText =
            template.footer?.customMessage ||
            this.translationService.translate("RECEIPT.THANK_YOU");
          const footerLines = wrapText(footerText, effWidth);
          footerLines.forEach((l) => (txt += line(center(l, effWidth))));
        }

        // Wrap in minimal HTML with <pre>. Remove margins and padding so the
        // printed content is as flush as possible with the paper (useful for
        // high-DPI printers such as 300dpi thermal mechanisms).
        const preStyle = `font-family: monospace; font-size:12px; white-space:pre; margin:0; padding:0;`;
        const bodyStyle = `margin:0; padding:0; background:#fff;`;
        const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{${bodyStyle}} pre{${preStyle}}</style></head><body><pre>${txt}</pre></body></html>`;
        return html;
      })
    );
  }

  printReceipt(receiptContent: string): void {
    // Open print window optimized for thermal printer
    const printWindow = window.open("", "_blank", "width=220,height=400");
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();

      // Make printing idempotent to avoid duplicate print dialogs caused by
      // load/readyState race conditions or duplicate calls.
      const doPrint = () => {
        try {
          // guard: only print once per opened window
          if ((printWindow as any).__hasPrinted) return;
          (printWindow as any).__hasPrinted = true;
        } catch (e) {
          // ignore
        }

        try {
          printWindow.focus();
        } catch (e) {
          /* ignore */
        }

        setTimeout(() => {
          try {
            printWindow.print();
          } catch (e) {
            console.error("Print failed", e);
          }
          try {
            printWindow.close();
          } catch (e) {
            /* ignore */
          }
        }, 700);
      };

      // Attach onload handler and also attempt immediate print if already loaded.
      // doPrint() itself is idempotent so both paths are safe.
      try {
        printWindow.onload = doPrint;
      } catch (e) {
        /* ignore */
      }

      if (
        printWindow.document &&
        printWindow.document.readyState === "complete"
      ) {
        // call asynchronously to allow onload handlers to settle
        setTimeout(doPrint, 50);
      }
    }
  }
}
