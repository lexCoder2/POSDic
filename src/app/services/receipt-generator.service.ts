import { Injectable } from "@angular/core";
import { PrintTemplateService } from "./print-template.service";
import { TranslationService } from "./translation.service";
import { QzTrayService } from "./qz-tray.service";
import { Observable, of } from "rxjs";
import { map } from "rxjs/operators";
import bwipjs from "@bwip-js/browser";

@Injectable({
  providedIn: "root",
})
export class ReceiptGeneratorService {
  constructor(
    private printTemplateService: PrintTemplateService,
    private translationService: TranslationService,
    private qzTrayService: QzTrayService
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

        // Calculate dimensions for 203 DPI thermal printer
        // 58mm paper = ~464 pixels at 203 DPI (58mm / 25.4 * 203)
        // 80mm paper = ~640 pixels at 203 DPI (80mm / 25.4 * 203)
        const paperWidthPx =
          template.paperSize === "80mm"
            ? 640
            : template.paperSize === "A4"
            ? 1684
            : 156;

        let receiptContent = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @media print {
              @page { margin: 0; size: ${template.paperSize || "58mm"} auto; }
              body { margin: 0; padding: 0; }
            }
            body {
              font-family: '${
                template.styles?.fontFamily || "Arial, sans-serif"
              }';
              width: ${paperWidthPx}px;
              margin: 0;
              padding: 2px;
              padding-bottom: 0;
              color: #000;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-size: ${
                template.body?.fontSize === "large"
                  ? "14px"
                  : template.body?.fontSize === "medium"
                  ? "12px"
                  : "11px"
              };
              line-height: 1;
            }
            .receipt {
              text-align: ${template.styles?.textAlign || "center"};
              padding: 0;
              box-sizing: border-box;
              display: block;
              max-width: 100%;
            }
            .header {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 2px;
              border-bottom: 2px solid #000;
              padding-bottom: 6px;
            }
            .info {
              text-align: left;
              margin: 6px 0;
              font-size: 10px;
              line-height: 1.4;
            }
            .items {
              border-top: 2px solid #000;
              padding:  0;
              margin: 6px 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin: 4px 0;
              text-align: left;
              font-size: 11px;
              line-height: 1.3;
            }
            .item span:first-child {
              flex: 1;
              padding-right: 8px;
              word-wrap: break-word;
            }
            .item span:last-child {
              white-space: nowrap;
              font-weight: bold;
            }
            .totals {
              margin: 6px 0;
              font-size: 11px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
            .total-row.grand {
              font-size: 14px;
              font-weight: bold;
              border-top: 2px solid #000;
              padding-top: 2px;
              margin-top: 4px;
            }
            .payment {
              margin: 2px 0;
              padding-top: 2px;
              font-size: 11px;
            }
            .footer {
              text-align: center;
              width: 100%;
              margin-top: 4px;
              font-size: 10px;
              border-top: 1px solid #000;
              padding-top: 3px;
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
          </div>
        `;

        // Sale number as barcode
        if (sale.saleNumber) {
          try {
            // Generate barcode using bwip-js
            const canvas = document.createElement("canvas");
            bwipjs.toCanvas(canvas, {
              bcid: "code128",
              text: sale.saleNumber,
              scale: 4,
              height: 8,
              includetext: false,
              textxalign: "center",
            });
            const barcodeDataUrl = canvas.toDataURL("image/png");

            receiptContent += `
              <div style="text-align: center; margin: 0;">
                <img src="${barcodeDataUrl}" alt="Barcode" style="max-width: 98%; height: auto;" />
               
              </div>
            `;
          } catch (err) {
            console.error("Failed to generate barcode:", err);
            // Fallback to text if barcode generation fails
            receiptContent += `
              <div style="text-align: center; margin: 10px 0; font-size: 10px;">
                ${this.translationService.translate("RECEIPT.SALE_NUMBER")} ${
              sale.saleNumber
            }
              </div>
            `;
          }
        }

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
                <span>${this.translationService.translate(
                  `RECEIPT.${paymentMethod.toUpperCase()}_PAYMENT`
                )}</span>
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

  async printReceipt(
    receiptContent: string,
    format: "plain" | "html" = "plain"
  ): Promise<void> {
    try {
      // Use QZ Tray service for printing
      await this.qzTrayService.print("POS-58", receiptContent, format);
    } catch (err) {
      console.error("QZ Tray print error:", err);
    }
  }
}
