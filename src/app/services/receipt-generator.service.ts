import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { Sale, SaleItem, PrintTemplate } from "../models";
import { TranslationService } from "./translation.service";
import { QzTrayService } from "./qz-tray.service";
import { environment } from "@environments/environment";
import bwipjs from "@bwip-js/browser";

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

/**
 * Receipt paper size configuration
 */
export interface PaperConfig {
  /** Paper width in mm (58, 80, or custom) */
  widthMm: number;
  /** Paper width in pixels (calculated at 203 DPI) */
  widthPx: number;
  /** DPI for calculations */
  dpi: number;
  /** Margin in pixels */
  margin: number;
}

/**
 * Receipt font configuration
 */
export interface FontConfig {
  /** Font family for the receipt */
  family: string;
  /** Base font size in pixels */
  baseSize: number;
  /** Header font size in pixels */
  headerSize: number;
  /** Title font size in pixels */
  titleSize: number;
  /** Small text font size in pixels */
  smallSize: number;
}

/**
 * Receipt styling configuration
 */
export interface StyleConfig {
  /** Text color */
  textColor: string;
  /** Background color */
  backgroundColor: string;
  /** Line color for separators */
  lineColor: string;
  /** Line style: 'solid', 'dashed', 'dotted' */
  lineStyle: string;
  /** Character for text-mode separators */
  separatorChar: string;
}

/**
 * Barcode configuration
 */
export interface BarcodeConfig {
  /** Show barcode on receipt */
  enabled: boolean;
  /** Barcode type: 'code128', 'ean13', 'qrcode', etc. */
  type: string;
  /** Barcode height in pixels */
  height: number;
  /** Barcode scale factor */
  scale: number;
  /** Include text below barcode */
  includeText: boolean;
}

/**
 * Main receipt configuration
 */
export interface ReceiptConfig {
  /** Paper size configuration */
  paper: PaperConfig;
  /** Font configuration */
  font: FontConfig;
  /** Styling configuration */
  style: StyleConfig;
  /** Barcode configuration */
  barcode: BarcodeConfig;
  /** Use plain text mode (for ESC/POS compatibility) */
  plainTextMode: boolean;
  /** Characters per line in plain text mode */
  charsPerLine: number;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/** Predefined paper sizes */
export const PAPER_SIZES: Record<string, PaperConfig> = {
  "58mm": { widthMm: 58, widthPx: 420, dpi: 300, margin: 6 },
  "80mm": { widthMm: 80, widthPx: 600, dpi: 300, margin: 8 },
  A4: { widthMm: 210, widthPx: 2480, dpi: 300, margin: 40 },
};

/** Default font configuration */
export const DEFAULT_FONT_CONFIG: FontConfig = {
  family: "'Courier New', Courier, monospace",
  baseSize: 12,
  headerSize: 14,
  titleSize: 10,
  smallSize: 9,
};

/** Default style configuration */
export const DEFAULT_STYLE_CONFIG: StyleConfig = {
  textColor: "#000000",
  backgroundColor: "#ffffff",
  lineColor: "#000000",
  lineStyle: "dashed",
  separatorChar: "-",
};

/** Default barcode configuration */
export const DEFAULT_BARCODE_CONFIG: BarcodeConfig = {
  enabled: true,
  type: "code128",
  height: 33,
  scale: 1.2,
  includeText: true,
};

/** Default receipt configuration for 58mm thermal printer */
export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
  paper: PAPER_SIZES["58mm"],
  font: DEFAULT_FONT_CONFIG,
  style: DEFAULT_STYLE_CONFIG,
  barcode: DEFAULT_BARCODE_CONFIG,
  plainTextMode: false,
  charsPerLine: 28,
};

/** Default receipt configuration for 80mm thermal printer */
export const DEFAULT_80MM_CONFIG: ReceiptConfig = {
  paper: PAPER_SIZES["80mm"],
  font: { ...DEFAULT_FONT_CONFIG, baseSize: 10, headerSize: 12 },
  style: DEFAULT_STYLE_CONFIG,
  barcode: DEFAULT_BARCODE_CONFIG,
  plainTextMode: false,
  charsPerLine: 42,
};

// ============================================================================
// RECEIPT GENERATOR SERVICE
// ============================================================================

@Injectable({
  providedIn: "root",
})
export class ReceiptGeneratorService {
  private translationService = inject(TranslationService);
  private qzTrayService = inject(QzTrayService);
  private http = inject(HttpClient);

  // Cache for translated labels
  private labels: Record<string, string> = {};
  // Cache for default template
  private defaultTemplateCache: PrintTemplate | null = null;

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Get the default print template from the server
   */
  async getDefaultTemplate(): Promise<PrintTemplate> {
    if (this.defaultTemplateCache) {
      return this.defaultTemplateCache;
    }
    try {
      const template = await firstValueFrom(
        this.http.get<PrintTemplate>(`${environment.apiUrl}/templates/default`)
      );
      this.defaultTemplateCache = template;
      return template;
    } catch (error) {
      console.warn("Failed to fetch default template, using fallback:", error);
      return this.getFallbackTemplate();
    }
  }

  /**
   * Get a fallback template when server is unavailable
   */
  private getFallbackTemplate(): PrintTemplate {
    return {
      name: "Default",
      paperSize: "58mm",
      header: {
        showStoreName: true,
        storeName: "Store",
        showStoreAddress: false,
        showStorePhone: false,
        showStoreEmail: false,
      },
      body: {
        showQuantity: true,
        showUnitPrice: true,
        showDiscount: true,
        showTax: false,
      },
      footer: {
        showTotals: true,
        showPaymentMethod: true,
        showCashier: true,
        showDateTime: true,
        showBarcode: true,
        showThankYou: true,
      },
    };
  }

  /**
   * Check if print preview is enabled
   */
  shouldShowPreview(): boolean {
    return localStorage.getItem("printer.showPreview") === "true";
  }

  /**
   * Show preview window with receipt HTML
   */
  async showPreview(html: string): Promise<boolean> {
    return new Promise((resolve) => {
      const previewWindow = window.open("", "_blank", "width=480,height=640");
      if (!previewWindow) {
        resolve(false);
        return;
      }

      const styledHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt Preview</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px;
              background: #f5f5f5;
              font-family: Arial, sans-serif;
            }
            .preview-actions {
              position: fixed;
              top: 10px;
              right: 10px;
              display: flex;
              gap: 10px;
              z-index: 1000;
            }
            .preview-actions button {
              padding: 8px 16px;
              font-size: 14px;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 500;
            }
            .btn-print {
              background: #4f46e5;
              color: white;
            }
            .btn-cancel {
              background: #6b7280;
              color: white;
            }
            .btn-print:hover {
              background: #4338ca;
            }
            .btn-cancel:hover {
              background: #4b5563;
            }
            .receipt-container {
              max-width: 480px;
              margin: 50px auto 0;
              background: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              padding: 10px;
            }
          </style>
        </head>
        <body>
          <div class="preview-actions">
            <button class="btn-print" onclick="window.printConfirmed = true; window.close();">Print</button>
            <button class="btn-cancel" onclick="window.printConfirmed = false; window.close();">Cancel</button>
          </div>
          <div class="receipt-container">
            ${html}
          </div>
        </body>
        </html>
      `;

      previewWindow.document.write(styledHtml);
      previewWindow.document.close();

      // Wait for window to close
      const checkClosed = setInterval(() => {
        if (previewWindow.closed) {
          clearInterval(checkClosed);
          resolve((previewWindow as any).printConfirmed === true);
        }
      }, 100);
    });
  }

  /**
   * Simplified method to print a sale receipt using default template
   * Auto-detects printer capabilities and optimizes receipt format
   */
  async printSaleReceipt(
    sale: Sale,
    options: {
      plainText?: boolean;
      printerName?: string;
    } = {}
  ): Promise<void> {
    const template = await this.getDefaultTemplate();

    // Use default printer from settings if not specified
    let printerName = options.printerName;
    if (!printerName) {
      const savedDefaultPrinter = localStorage.getItem("printer.default");
      if (savedDefaultPrinter && savedDefaultPrinter !== "default") {
        printerName = savedDefaultPrinter;
        console.log(`Using default printer from settings: ${printerName}`);
      }
    }

    // Auto-detect optimal receipt configuration based on printer
    let config: Partial<ReceiptConfig> = {
      plainTextMode: options.plainText ?? false,
    };

    // If printer name is provided, optimize config for that printer
    if (printerName) {
      try {
        const paperWidth =
          await this.qzTrayService.getOptimalPaperWidth(printerName);
        const dpi = await this.qzTrayService.getOptimalDpi(printerName);

        // Select paper size based on printer capabilities
        config.paper =
          paperWidth >= 80 ? PAPER_SIZES["80mm"] : PAPER_SIZES["58mm"];
        config.charsPerLine = paperWidth >= 80 ? 42 : 28;

        console.log(
          `Optimized receipt for ${printerName}: ${paperWidth}mm @ ${dpi}DPI`
        );
      } catch (err) {
        console.log("Could not optimize for printer, using defaults:", err);
      }
    }

    // Check if preview is enabled
    if (this.shouldShowPreview()) {
      const html = await this.generateReceipt(sale, template, config);
      const confirmed = await this.showPreview(html);
      if (!confirmed) {
        return; // User cancelled
      }
    }

    await this.printReceipt(sale, template, config, printerName);
  }

  /**
   * Simplified method to generate receipt HTML using default template
   */
  async generateSaleReceipt(
    sale: Sale,
    options: {
      plainText?: boolean;
    } = {}
  ): Promise<string> {
    const template = await this.getDefaultTemplate();
    const config: Partial<ReceiptConfig> = {
      plainTextMode: options.plainText ?? false,
    };
    return this.generateReceipt(sale, template, config);
  }

  /**
   * Generate a complete HTML receipt
   */
  async generateReceipt(
    sale: Sale,
    template: PrintTemplate,
    config: Partial<ReceiptConfig> = {}
  ): Promise<string> {
    const fullConfig = this.mergeConfig(config, template);
    this.loadTranslations();

    if (fullConfig.plainTextMode) {
      return this.generatePlainTextReceipt(sale, template, fullConfig);
    }

    return this.generateHtmlReceipt(sale, template, fullConfig);
  }

  /**
   * Print a receipt using QZ Tray with optional printer optimization
   */
  async printReceipt(
    sale: Sale,
    template: PrintTemplate,
    config: Partial<ReceiptConfig> = {},
    printerName?: string
  ): Promise<void> {
    const html = await this.generateReceipt(sale, template, config);

    // Determine target printer
    const targetPrinter = printerName || "default";

    // Get printer-specific options if printer is specified
    let printOptions: { dpi?: number; paperWidthMm?: number } | undefined;
    if (printerName && printerName !== "default") {
      try {
        const dpi = await this.qzTrayService.getOptimalDpi(printerName);
        const paperWidth =
          await this.qzTrayService.getOptimalPaperWidth(printerName);
        printOptions = { dpi, paperWidthMm: paperWidth };
      } catch (err) {
        console.log("Could not retrieve printer options:", err);
      }
    }

    // Send print job with optimized options
    await this.qzTrayService.print(targetPrinter, html, "html", printOptions);
  }

  /**
   * Generate barcode as base64 image with optional printer optimization
   */
  async generateBarcode(
    text: string,
    config: BarcodeConfig = DEFAULT_BARCODE_CONFIG,
    printerName?: string
  ): Promise<string> {
    try {
      // Optimize barcode for printer if specified
      let optimizedConfig = { ...config };
      if (printerName) {
        try {
          const dpi = await this.qzTrayService.getOptimalDpi(printerName);
          const paperWidth =
            await this.qzTrayService.getOptimalPaperWidth(printerName);

          // Adjust barcode height and scale based on DPI and paper width
          // Higher DPI = can use smaller scale, wider paper = can use larger barcode
          const dpiMultiplier = dpi / 203; // 203 is standard thermal printer DPI
          const widthMultiplier = paperWidth / 58; // 58mm is standard thermal width

          optimizedConfig.height = config.height * dpiMultiplier;
          optimizedConfig.scale = config.scale * widthMultiplier * 0.8; // 0.8 = safety margin

          console.log(
            `Barcode optimized for ${printerName}: height=${optimizedConfig.height}, scale=${optimizedConfig.scale}`
          );
        } catch (err) {
          console.log(
            "Could not optimize barcode for printer, using defaults:",
            err
          );
        }
      }

      const canvas = document.createElement("canvas");
      const barcodeConfig: any = {
        bcid: optimizedConfig.type,
        text: text,
        scale: optimizedConfig.scale,
        height: optimizedConfig.height / 5,
        includetext: false, // Hide text by default
      };

      // QR code specific settings
      if (optimizedConfig.type === "qrcode") {
        barcodeConfig.eclevel = "M"; // Error correction level
        // Don't include text for QR codes
      } else {
        // For other barcodes, show text if configured
        if (optimizedConfig.includeText) {
          barcodeConfig.textxalign = "center";
        }
      }

      console.log(
        `Generating ${optimizedConfig.type} barcode for: ${text.substring(0, 20)}...`,
        barcodeConfig
      );
      bwipjs.toCanvas(canvas, barcodeConfig);
      const result = canvas.toDataURL("image/png");
      console.log(`Successfully generated ${optimizedConfig.type} barcode`);
      return result;
    } catch (error) {
      console.error("Error generating barcode:", error);
      return "";
    }
  }

  /**
   * Get configuration for a paper size
   */
  getPaperConfig(size: string): PaperConfig {
    return PAPER_SIZES[size] || PAPER_SIZES["58mm"];
  }

  /**
   * Create a custom configuration
   */
  createConfig(overrides: Partial<ReceiptConfig>): ReceiptConfig {
    return this.mergeConfig(overrides);
  }

  // ============================================================================
  // HTML RECEIPT GENERATION
  // ============================================================================

  private async generateHtmlReceipt(
    sale: Sale,
    template: PrintTemplate,
    config: ReceiptConfig
  ): Promise<string> {
    const styles = this.generateStyles(config);
    const header = this.generateHeader(template, config);
    const items = this.generateItemsTable(sale, template, config);
    const totals = this.generateTotals(sale, template, config);
    const footer = await this.generateFooter(sale, template, config);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=${
    config.paper.widthPx
  }px, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>${styles}</style>
</head>
<body>
  <div class="receipt">
    ${header}
    ${this.separator()}
    ${items}
    ${this.separator()}
    ${totals}
    ${this.separator()}
    ${footer}
  </div>
</body>
</html>`;
  }

  /**
   * Generate CSS styles for the receipt
   */
  private generateStyles(config: ReceiptConfig): string {
    const { paper, font, style } = config;

    // Scale down width for screen display - use realistic phone/tablet width
    // 58mm paper ≈ 200px (realistic phone width for receipt)
    // 80mm paper ≈ 280px (slightly wider for larger printer)
    const displayWidth =
      paper.widthMm === 58 ? 140 : paper.widthMm === 80 ? 170 : 160;

    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        width: ${displayWidth}px;
        max-width: ${displayWidth}px;
        margin: 0;
        padding: 0;
        background: ${style.backgroundColor};
        color: ${style.textColor};
        font-family: ${font.family};
        font-size: ${font.baseSize}px;
        line-height: 1.2;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .receipt {
        width: 100%;
        max-width: 100%;
        padding: ${Math.max(2, Math.floor(paper.margin / 3))}px;
        box-sizing: border-box;
      }
      
      /* Header Styles */
      .header {
        text-align: center;
        margin-bottom: 6px;
        padding: 0 2px;
        overflow-wrap: break-word;
        word-wrap: break-word;
      }
      
      .store-name {
        font-size: ${font.headerSize}px;
        font-weight: bold;
        margin-bottom: 3px;
        word-break: break-word;
      }
      
      .store-info {
        font-size: ${font.smallSize}px;
        line-height: 1.3;
        word-break: break-word;
      }
      
      .sale-number {
        font-size: ${font.titleSize}px;
        font-weight: bold;
        margin-top: 6px;
        word-break: break-word;
      }
      
      /* Separator */
      .separator {
        border: none;
        border-top: 2px ${style.lineStyle} ${style.lineColor};
        margin: 4px 0;
      }
      
      /* Items Table */
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin: 4px 0;
      }
      
      .items-table th,
      .items-table td {
        padding: 1px 2px;
        vertical-align: top;
        text-align: left;
        font-size: ${font.baseSize}px;
      }
      
      .items-table th {
        font-weight: bold;
        border-bottom: 2px solid ${style.lineColor};
        font-size: ${font.baseSize}px;
      }
      
      .col-qty {
        width: 18%;
        text-align: center;
      }
      
      .col-desc {
        width: 50%;
        word-break: break-word;
        overflow-wrap: break-word;
      }
      
      .col-price {
        width: 32%;
        text-align: right;
      }
      
      .item-name {
        font-size: ${font.baseSize}px;
        word-wrap: break-word;
        word-break: break-word;
        overflow-wrap: break-word;
      }
      
      .item-sku {
        font-size: ${Math.max(6, font.smallSize - 1)}px;
        color: #666;
      }
      
      /* Totals Section */
      .totals {
        margin: 4px 0;
        padding: 0 2px;
      }
      
      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 1px 0;
        font-size: ${font.baseSize}px;
        word-break: break-word;
      }
      
      .total-row.grand-total {
        font-size: ${font.titleSize}px;
        font-weight: bold;
        border-top: 2px solid ${style.lineColor};
        margin-top: 3px;
        padding-top: 3px;
      }
      
      .total-row.change {
        font-size: ${font.titleSize}px;
        font-weight: bold;
      }
      
      /* Footer Styles */
      .footer {
        text-align: center;
        margin-top: 6px;
        font-size: ${font.smallSize}px;
        padding: 0 2px;
        word-break: break-word;
      }
      
      .footer-info {
        margin-bottom: 4px;
      }
      
      .barcode-container {
        margin: 8px auto;
        text-align: center;
        max-width: 100%;
        overflow: hidden;
      }
      
      .barcode-container img {
        max-width: 90%;
        height: auto;
      }
      
      .custom-message {
        margin-top: 6px;
        font-style: italic;
        word-break: break-word;
      }
      
      /* Print Styles */
      @media print {
        body {
          width: ${paper.widthPx}px !important;
          max-width: ${paper.widthPx}px !important;
        }
        .receipt {
          page-break-inside: avoid;
          width: 100%;
          max-width: 100%;
        }
      }
    `;
  }

  /**
   * Generate receipt header section
   */
  private generateHeader(
    template: PrintTemplate,
    config: ReceiptConfig
  ): string {
    const header = template.header || {};
    const parts: string[] = [];

    parts.push('<div class="header">');

    // Store name
    if (header.showStoreName && header.storeName) {
      const styleObj: Record<string, string> = {};
      if (header.storeNameSize) styleObj["fontSize"] = header.storeNameSize;
      if (header.storeNameFont) styleObj["fontFamily"] = header.storeNameFont;
      if (header.storeNameBold) styleObj["fontWeight"] = "bold";
      const inlineStyle = this.buildInlineStyle(styleObj);
      parts.push(
        `<div class="store-name" style="${inlineStyle}">${this.escapeHtml(
          header.storeName
        )}</div>`
      );
    }

    // Store info (address, phone, email)
    const infoLines: string[] = [];
    if (header.showStoreAddress && header.storeAddress) {
      infoLines.push(this.escapeHtml(header.storeAddress));
    }
    if (header.showStorePhone && header.storePhone) {
      infoLines.push(`Tel: ${this.escapeHtml(header.storePhone)}`);
    }
    if (header.showStoreEmail && header.storeEmail) {
      infoLines.push(this.escapeHtml(header.storeEmail));
    }
    if (header.taxId) {
      infoLines.push(`NIF: ${this.escapeHtml(header.taxId)}`);
    }

    if (infoLines.length > 0) {
      parts.push(`<div class="store-info">${infoLines.join("<br>")}</div>`);
    }

    // Custom text
    if (header.customText) {
      parts.push(
        `<div class="store-info">${this.escapeHtml(header.customText)}</div>`
      );
    }

    parts.push("</div>");

    return parts.join("\n");
  }

  /**
   * Generate items table
   */
  private generateItemsTable(
    sale: Sale,
    template: PrintTemplate,
    config: ReceiptConfig
  ): string {
    const body = template.body || {};
    const showQty = body.showQuantity !== false;
    const showPrice = body.showUnitPrice !== false;
    const showProductCode = body.showProductCode ?? false;
    const showBarcode = body.showBarcode ?? false;

    // Build item styling from template options
    const itemStyleObj: Record<string, string> = {};
    if (body.fontSize) itemStyleObj["fontSize"] = body.fontSize;
    if (body.productFont) itemStyleObj["fontFamily"] = body.productFont;
    if (body.productBold) itemStyleObj["fontWeight"] = "bold";
    const itemInlineStyle = this.buildInlineStyle(itemStyleObj);

    // Build product size styling if different from font size
    const productSizeStyleObj: Record<string, string> = {};
    if (body.productSize) productSizeStyleObj["fontSize"] = body.productSize;
    if (body.productFont) productSizeStyleObj["fontFamily"] = body.productFont;
    if (body.productBold) productSizeStyleObj["fontWeight"] = "bold";
    const productSizeInlineStyle = this.buildInlineStyle(productSizeStyleObj);

    const parts: string[] = [];
    parts.push('<table class="items-table">');

    // Table header
    parts.push("<thead><tr>");
    if (showQty) {
      parts.push(`<th class="col-qty">${this.labels["qty"] || "Qty"}</th>`);
    }
    parts.push(
      `<th class="col-desc">${this.labels["description"] || "Description"}</th>`
    );
    parts.push(`<th class="col-price">${this.labels["total"] || "Total"}</th>`);
    parts.push("</tr></thead>");

    // Table body
    parts.push("<tbody>");
    for (const item of sale.items) {
      parts.push("<tr>");

      if (showQty) {
        const qtyDisplay = this.formatQuantity(item);
        parts.push(`<td class="col-qty">${qtyDisplay}</td>`);
      }

      // Description cell
      const itemName = this.getItemName(item);
      const itemNameStyle = itemInlineStyle
        ? ` style="${itemInlineStyle}"`
        : "";
      let descHtml = `<div class="item-name"${itemNameStyle}>${this.escapeHtml(
        itemName
      )}</div>`;

      // Show product code if enabled
      if (
        showProductCode &&
        (item.productCode ||
          (typeof item.product === "object" && item.product?.sku))
      ) {
        const code =
          item.productCode ||
          (typeof item.product === "object" ? item.product.sku : "");
        const productCodeStyle = productSizeInlineStyle
          ? ` style="${productSizeInlineStyle}"`
          : "";
        descHtml += `<div class="item-sku"${productCodeStyle}>SKU: ${code}</div>`;
      }

      if (showPrice && item.unitPrice) {
        const priceStyle = productSizeInlineStyle
          ? ` style="${productSizeInlineStyle}"`
          : "";
        descHtml += `<div class="item-sku"${priceStyle}>@$${item.unitPrice.toFixed(2)}</div>`;
      }
      parts.push(`<td class="col-desc">${descHtml}</td>`);

      // Total cell
      const itemTotal =
        item.total || item.subtotal || item.unitPrice * item.quantity;
      parts.push(`<td class="col-price">$${itemTotal.toFixed(2)}</td>`);

      parts.push("</tr>");
    }
    parts.push("</tbody>");
    parts.push("</table>");

    return parts.join("\n");
  }

  /**
   * Generate totals section
   */
  private generateTotals(
    sale: Sale,
    template: PrintTemplate,
    config: ReceiptConfig
  ): string {
    const footer = template.footer || {};
    const body = template.body || {};
    if (footer.showTotals === false) {
      return "";
    }

    // Build totals styling from template options
    const totalStyleObj: Record<string, string> = {};
    if (footer.totalSize) totalStyleObj["fontSize"] = footer.totalSize;
    if (footer.totalFont) totalStyleObj["fontFamily"] = footer.totalFont;
    if (footer.totalBold) totalStyleObj["fontWeight"] = "bold";
    const totalInlineStyle = this.buildInlineStyle(totalStyleObj);

    const parts: string[] = [];
    parts.push('<div class="totals">');

    // Subtotal
    const subtotalStyle = totalInlineStyle
      ? ` style="${totalInlineStyle}"`
      : "";
    parts.push(
      this.totalRow(
        this.labels["subtotal"] || "Subtotal",
        sale.subtotal,
        "",
        false,
        subtotalStyle
      )
    );

    // Discount - only show if enabled in body options
    const showDiscount = body.showDiscount !== false;
    if (showDiscount && sale.discountTotal && sale.discountTotal > 0) {
      parts.push(
        this.totalRow(
          this.labels["discount"] || "Discount",
          -sale.discountTotal,
          "",
          false,
          subtotalStyle
        )
      );
    }

    // Tax - only show if enabled in body options
    const showTax = body.showTax !== false;
    if (showTax && sale.taxTotal && sale.taxTotal > 0) {
      parts.push(
        this.totalRow(
          this.labels["tax"] || "Tax",
          sale.taxTotal,
          "",
          false,
          subtotalStyle
        )
      );
    }

    // Grand total
    parts.push(
      this.totalRow(
        this.labels["total"] || "TOTAL",
        sale.total,
        "grand-total",
        false,
        totalInlineStyle
      )
    );

    // Payment info
    if (footer.showPaymentMethod && sale.paymentMethod) {
      const paymentLabel =
        this.labels[sale.paymentMethod.toLowerCase()] || sale.paymentMethod;
      parts.push(
        this.totalRow(
          this.labels["payment"] || "Payment",
          paymentLabel,
          "",
          true,
          subtotalStyle
        )
      );

      // Cash payment details
      if (sale.paymentMethod === "cash" && sale.paymentDetails?.cash) {
        parts.push(
          this.totalRow(
            this.labels["received"] || "Received",
            sale.paymentDetails.cash,
            "",
            false,
            subtotalStyle
          )
        );
        if (sale.paymentDetails.change && sale.paymentDetails.change > 0) {
          parts.push(
            this.totalRow(
              this.labels["change"] || "Change",
              sale.paymentDetails.change,
              "change",
              false,
              subtotalStyle
            )
          );
        }
      }
    }

    parts.push("</div>");
    return parts.join("\n");
  }

  /**
   * Generate footer section
   */
  private async generateFooter(
    sale: Sale,
    template: PrintTemplate,
    config: ReceiptConfig
  ): Promise<string> {
    const footer = template.footer || {};

    // Build footer styling from template options
    const footerStyleObj: Record<string, string> = {};
    if (footer.footerSize) footerStyleObj["fontSize"] = footer.footerSize;
    if (footer.footerFont) footerStyleObj["fontFamily"] = footer.footerFont;
    if (footer.footerBold) footerStyleObj["fontWeight"] = "bold";
    const footerInlineStyle = this.buildInlineStyle(footerStyleObj);

    const parts: string[] = [];

    parts.push(
      `<div class="footer"${footerInlineStyle ? ` style="${footerInlineStyle}"` : ""}>`
    );

    // Sale number
    if (sale.saleNumber) {
      parts.push(
        `<div class="sale-number">${this.labels["saleNo"] || "Sale #"}: ${
          sale.saleNumber
        }</div>`
      );
    }

    // Cashier info
    if (footer.showCashier && sale.cashier) {
      const cashierName = this.getCashierName(sale.cashier);
      parts.push(
        `<div class="footer-info">${
          this.labels["cashier"] || "Cashier"
        }: ${this.escapeHtml(cashierName)}</div>`
      );
    }

    // DateTime
    if (footer.showDateTime) {
      const date = sale.createdAt ? new Date(sale.createdAt) : new Date();
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString();
      parts.push(`<div class="footer-info">${dateStr} ${timeStr}</div>`);
    }

    // Barcode
    if (sale.saleNumber) {
      const barcodeImg = await this.generateBarcode(
        sale.saleNumber.toString(),
        config.barcode
      );
      if (barcodeImg) {
        parts.push(
          `<div class="barcode-container"><img src="${barcodeImg}" alt="barcode"></div>`
        );
      }
    }

    // Custom message
    if (footer.customMessage) {
      parts.push(
        `<div class="custom-message">${this.escapeHtml(
          footer.customMessage
        )}</div>`
      );
    }

    parts.push("</div>");
    return parts.join("\n");
  }

  // ============================================================================
  // PLAIN TEXT RECEIPT GENERATION
  // ============================================================================

  private async generatePlainTextReceipt(
    sale: Sale,
    template: PrintTemplate,
    config: ReceiptConfig
  ): Promise<string> {
    const width = config.charsPerLine;
    const lines: string[] = [];

    // Header
    const header = template.header || {};
    if (header.showStoreName && header.storeName) {
      lines.push(this.centerText(header.storeName.toUpperCase(), width));
    }
    if (header.showStoreAddress && header.storeAddress) {
      lines.push(this.centerText(header.storeAddress, width));
    }
    if (header.showStorePhone && header.storePhone) {
      lines.push(this.centerText(`Tel: ${header.storePhone}`, width));
    }

    lines.push(this.textSeparator(width, config.style.separatorChar));

    // Sale number
    if (sale.saleNumber) {
      lines.push(
        this.centerText(
          `${this.labels["saleNo"] || "SALE"} #${sale.saleNumber}`,
          width
        )
      );
    }
    lines.push("");

    // Items
    const body = template.body || {};
    const showQty = body.showQuantity !== false;

    for (const item of sale.items) {
      const qty = this.formatQuantity(item);
      const total = (
        item.total ||
        item.subtotal ||
        item.unitPrice * item.quantity
      ).toFixed(2);

      // Item name (may wrap)
      const name = this.getItemName(item).substring(0, width - 12);

      if (showQty) {
        lines.push(this.formatLine(`${qty}x ${name}`, `$${total}`, width));
      } else {
        lines.push(this.formatLine(name, `$${total}`, width));
      }
    }

    lines.push(this.textSeparator(width, config.style.separatorChar));

    // Totals
    const footer = template.footer || {};
    if (footer.showTotals !== false) {
      lines.push(
        this.formatLine(
          this.labels["subtotal"] || "Subtotal",
          `$${sale.subtotal.toFixed(2)}`,
          width
        )
      );

      if (sale.discountTotal && sale.discountTotal > 0) {
        lines.push(
          this.formatLine(
            this.labels["discount"] || "Discount",
            `-$${sale.discountTotal.toFixed(2)}`,
            width
          )
        );
      }

      if (sale.taxTotal && sale.taxTotal > 0) {
        lines.push(
          this.formatLine(
            this.labels["tax"] || "Tax",
            `$${sale.taxTotal.toFixed(2)}`,
            width
          )
        );
      }

      lines.push(this.textSeparator(width, "="));
      lines.push(
        this.formatLine(
          (this.labels["total"] || "TOTAL").toUpperCase(),
          `$${sale.total.toFixed(2)}`,
          width
        )
      );

      if (footer.showPaymentMethod && sale.paymentMethod) {
        lines.push("");
        const paymentLabel =
          this.labels[sale.paymentMethod.toLowerCase()] || sale.paymentMethod;
        lines.push(
          this.formatLine(
            this.labels["payment"] || "Payment",
            paymentLabel,
            width
          )
        );

        if (sale.paymentMethod === "cash" && sale.paymentDetails?.cash) {
          lines.push(
            this.formatLine(
              this.labels["received"] || "Received",
              `$${sale.paymentDetails.cash.toFixed(2)}`,
              width
            )
          );
          if (sale.paymentDetails.change && sale.paymentDetails.change > 0) {
            lines.push(
              this.formatLine(
                this.labels["change"] || "CHANGE",
                `$${sale.paymentDetails.change.toFixed(2)}`,
                width
              )
            );
          }
        }
      }
    }

    lines.push(this.textSeparator(width, config.style.separatorChar));

    // Footer info
    if (footer.showCashier && sale.cashier) {
      const cashierName = this.getCashierName(sale.cashier);
      lines.push(
        this.centerText(
          `${this.labels["cashier"] || "Cashier"}: ${cashierName}`,
          width
        )
      );
    }

    if (footer.showDateTime) {
      const date = sale.createdAt ? new Date(sale.createdAt) : new Date();
      lines.push(this.centerText(date.toLocaleString(), width));
    }

    if (footer.customMessage) {
      lines.push("");
      lines.push(this.centerText(footer.customMessage, width));
    }

    if (footer.showThankYou) {
      lines.push("");
      lines.push(
        this.centerText(this.labels["thankYou"] || "Thank you!", width)
      );
    }

    // Sale ID in text mode
    if (sale._id) {
      lines.push("");
      lines.push(this.centerText("---", width));
      lines.push(this.centerText(`ID: ${sale._id}`, width));
      lines.push(this.centerText("---", width));
    }

    lines.push("");
    lines.push("");

    // Wrap in HTML for QZ Tray
    const textContent = lines.join("\n");
    return this.wrapPlainTextAsHtml(textContent, config);
  }

  /**
   * Wrap plain text in minimal HTML for QZ Tray
   */
  private wrapPlainTextAsHtml(text: string, config: ReceiptConfig): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: ${Math.max(2, Math.floor(config.paper.margin / 2))}px;
      width: ${config.paper.widthPx}px;
      max-width: ${config.paper.widthPx}px;
      box-sizing: border-box;
      font-family: ${config.font.family};
      font-size: ${config.font.baseSize}px;
      line-height: 1.2;
      background: ${config.style.backgroundColor};
      color: ${config.style.textColor};
      overflow-x: hidden;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      font-family: inherit;
      font-size: inherit;
      overflow-x: hidden;
    }
  </style>
</head>
<body>
  <pre>${this.escapeHtml(text)}</pre>
</body>
</html>`;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Merge partial config with defaults
   */
  private mergeConfig(
    overrides: Partial<ReceiptConfig>,
    template?: PrintTemplate
  ): ReceiptConfig {
    // Determine base config from paper size
    let baseConfig = DEFAULT_RECEIPT_CONFIG;

    if (template?.paperSize === "80mm") {
      baseConfig = DEFAULT_80MM_CONFIG;
    }

    if (overrides.paper?.widthMm === 80) {
      baseConfig = DEFAULT_80MM_CONFIG;
    }

    return {
      paper: { ...baseConfig.paper, ...overrides.paper },
      font: { ...baseConfig.font, ...overrides.font },
      style: { ...baseConfig.style, ...overrides.style },
      barcode: { ...baseConfig.barcode, ...overrides.barcode },
      plainTextMode: overrides.plainTextMode ?? baseConfig.plainTextMode,
      charsPerLine: overrides.charsPerLine ?? baseConfig.charsPerLine,
    };
  }

  /**
   * Load translations for receipt labels
   */
  private loadTranslations(): void {
    this.labels = {
      qty: this.translationService.translate("RECEIPT.QTY"),
      description: this.translationService.translate("RECEIPT.DESCRIPTION"),
      total: this.translationService.translate("RECEIPT.TOTAL"),
      subtotal: this.translationService.translate("RECEIPT.SUBTOTAL"),
      discount: this.translationService.translate("RECEIPT.DISCOUNT"),
      tax: this.translationService.translate("RECEIPT.TAX"),
      payment: this.translationService.translate("RECEIPT.PAYMENT"),
      received: this.translationService.translate("RECEIPT.RECEIVED"),
      change: this.translationService.translate("RECEIPT.CHANGE"),
      cashier: this.translationService.translate("RECEIPT.CASHIER"),
      saleNo: this.translationService.translate("RECEIPT.SALE_NO"),
      cash: this.translationService.translate("RECEIPT.CASH"),
      card: this.translationService.translate("RECEIPT.CARD"),
      transfer: this.translationService.translate("RECEIPT.TRANSFER"),
      thankYou: this.translationService.translate("RECEIPT.THANK_YOU"),
    };
  }

  /**
   * Generate HTML separator line
   */
  private separator(): string {
    return '<hr class="separator">';
  }

  /**
   * Generate text separator line
   */
  private textSeparator(width: number, char = "-"): string {
    return char.repeat(width);
  }

  /**
   * Generate a total row for HTML
   */
  private totalRow(
    label: string,
    value: number | string,
    className: string = "",
    isText: boolean = false,
    inlineStyle: string = ""
  ): string {
    const displayValue = isText
      ? value
      : typeof value === "number"
        ? `$${value.toFixed(2)}`
        : value;
    const styleAttr = inlineStyle ? ` style="${inlineStyle}"` : "";
    return `<div class="total-row ${className}"${styleAttr}><span>${label}:</span><span>${displayValue}</span></div>`;
  }

  /**
   * Format a line with left and right aligned text
   */
  private formatLine(left: string, right: string, width: number): string {
    const spaces = width - left.length - right.length;
    if (spaces < 1) {
      return left.substring(0, width - right.length - 1) + " " + right;
    }
    return left + " ".repeat(spaces) + right;
  }

  /**
   * Center text within a given width
   */
  private centerText(text: string, width: number): string {
    if (text.length >= width) {
      return text.substring(0, width);
    }
    const padding = Math.floor((width - text.length) / 2);
    return " ".repeat(padding) + text;
  }

  /**
   * Build inline CSS style from style object
   */
  private buildInlineStyle(style: Record<string, string>): string {
    const parts: string[] = [];
    if (style["fontSize"]) parts.push(`font-size: ${style["fontSize"]}`);
    if (style["fontWeight"]) parts.push(`font-weight: ${style["fontWeight"]}`);
    if (style["fontFamily"]) parts.push(`font-family: ${style["fontFamily"]}`);
    if (style["color"]) parts.push(`color: ${style["color"]}`);
    if (style["textAlign"]) parts.push(`text-align: ${style["textAlign"]}`);
    return parts.join("; ");
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Get item name from SaleItem
   */
  private getItemName(item: SaleItem): string {
    if (item.productName) return item.productName;
    if (typeof item.product === "object" && item.product !== null) {
      return (item.product as any).name || "Unknown Product";
    }
    return item.productCode || "Unknown Product";
  }

  /**
   * Format quantity display
   */
  private formatQuantity(item: SaleItem): string {
    // Check if sold by weight (quantity has decimals)
    const isWeight = item.quantity % 1 !== 0;
    return isWeight
      ? `${item.quantity.toFixed(3)}kg`
      : item.quantity.toString();
  }

  /**
   * Get cashier name from User object or string
   */
  private getCashierName(cashier: string | any): string {
    if (typeof cashier === "string") return cashier;
    if (typeof cashier === "object" && cashier !== null) {
      return (
        cashier.fullName || cashier.username || cashier.firstName || "Unknown"
      );
    }
    return "Unknown";
  }
}
