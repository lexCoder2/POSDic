import { Injectable } from "@angular/core";
import { PrintTemplateService } from "./print-template.service";
import { Observable, of } from "rxjs";
import { map } from "rxjs/operators";

@Injectable({
  providedIn: "root",
})
export class ReceiptGeneratorService {
  constructor(private printTemplateService: PrintTemplateService) {}

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
              @page { margin: 0; size: ${template.paperSize || "58mm"} auto; }
              body { margin: 0; padding: 0; }
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
              padding: 3mm;
              font-size: ${
                template.body?.fontSize === "large"
                  ? "11px"
                  : template.body?.fontSize === "medium"
                  ? "10px"
                  : "9px"
              };
              line-height: 1.2;
            }
            .receipt {
              text-align: ${template.styles?.textAlign || "center"};
            }
            .header {
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 3px;
              border-bottom: 1px dashed #000;
              padding-bottom: 3px;
            }
            .info {
              text-align: left;
              margin: 3px 0;
              font-size: 8px;
              line-height: 1.3;
            }
            .items {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 3px 0;
              margin: 3px 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
              text-align: left;
              font-size: 8px;
            }
            .item span:first-child {
              flex: 1;
              padding-right: 3px;
            }
            .totals {
              margin: 3px 0;
              font-size: 10px;
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
              font-size: 8px;
            }
            .footer {
              text-align: center;
              margin-top: 5px;
              font-size: 8px;
              border-top: 1px dashed #000;
              padding-top: 3px;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
        `;

        // Header
        if (template.header?.storeName || template.header?.storeAddress) {
          receiptContent += `
            <div class="header">
              ${
                template.header?.storeName
                  ? `${template.header.storeName}<br>`
                  : ""
              }
              RECEIPT
            </div>
          `;
        }

        // Store Info
        if (
          template.header?.storeAddress ||
          template.header?.storePhone ||
          template.header?.storeEmail
        ) {
          receiptContent += `
            <div class="info">
              ${
                template.header?.storeAddress
                  ? `<div>${template.header.storeAddress}</div>`
                  : ""
              }
              ${
                template.header?.storePhone
                  ? `<div>${template.header.storePhone}</div>`
                  : ""
              }
              ${
                template.header?.storeEmail
                  ? `<div>${template.header.storeEmail}</div>`
                  : ""
              }
            </div>
          `;
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
                ? `<div>Cashier: ${
                    currentUser?.firstName || currentUser?.username || "Unknown"
                  }</div>`
                : ""
            }
            ${sale.saleNumber ? `<div>Sale #: ${sale.saleNumber}</div>` : ""}
          </div>
        `;

        // Items
        if (template.body?.showQuantity || template.body?.showUnitPrice) {
          receiptContent += `<div class="items">`;

          sale.items.forEach((item: any, index: number) => {
            let itemDescription = item.productName || `Item ${index + 1}`;
            if (item.weight && item.pricePerKg) {
              itemDescription += ` (${item.weight.toFixed(
                3
              )}kg @ $${item.pricePerKg.toFixed(2)}/kg)`;
            }

            receiptContent += `
              <div class="item">
                <span>${itemDescription}</span>
                <span>$${item.total.toFixed(2)}</span>
              </div>
            `;
          });

          receiptContent += `</div>`;
        }

        // Totals
        if (template.footer?.showTotals) {
          receiptContent += `
            <div class="totals">
              <div class="total-row grand">
                <span>TOTAL:</span>
                <span>$${sale.total.toFixed(2)}</span>
              </div>
            </div>
          `;
        }

        // Payment Info
        if (template.footer?.showPaymentMethod || paymentMethod === "cash") {
          receiptContent += `<div class="payment">`;

          if (template.footer?.showPaymentMethod) {
            receiptContent += `
              <div class="total-row">
                <span>Payment Method:</span>
                <span>${paymentMethod.toUpperCase()}</span>
              </div>
            `;
          }

          if (paymentMethod === "cash") {
            receiptContent += `
              <div class="total-row">
                <span>Cash Received:</span>
                <span>$${(sale.total + change).toFixed(2)}</span>
              </div>
              <div class="total-row">
                <span>Change:</span>
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
              ${template.footer?.customMessage || "Thank you!"}
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

  printReceipt(receiptContent: string): void {
    // Open print window optimized for thermal printer
    const printWindow = window.open("", "_blank", "width=220,height=400");
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();

      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 250);
      };
    }
  }
}
