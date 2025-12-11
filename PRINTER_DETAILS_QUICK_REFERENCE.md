# Printer Details - Quick Reference Guide

## Overview

The POS system now automatically detects printer capabilities and optimizes all print output (receipts, barcodes, QR badges) based on actual printer specifications.

## For Developers

### Using Printer Details in Your Code

#### Get Printer Capabilities

```typescript
import { QzTrayService } from '@app/services/qz-tray.service';

constructor(private qzTray: QzTrayService) {}

async printOptimized() {
  // Get detailed printer info
  const details = await this.qzTray.getPrinterDetails('Thermal Printer TM-T20');

  console.log(details);
  // Output: {
  //   name: "Thermal Printer TM-T20",
  //   manufacturer: "Epson",
  //   model: "TM-T20",
  //   dpis: [203],
  //   defaultDpi: 203,
  //   paperSizes: [{width: 58, height: 297}, {width: 80, height: 297}],
  //   isColor: false
  // }
}
```

#### Get Optimal Settings

```typescript
// Get best paper width for a printer
const paperWidth = await this.qzTray.getOptimalPaperWidth(
  "Thermal Printer TM-T20"
);
// Returns: 58 (or 80 if printer supports wider paper)

// Get best DPI for quality
const dpi = await this.qzTray.getOptimalDpi("Thermal Printer TM-T20");
// Returns: 203 (or higher if supported)
```

#### Print with Optimization

```typescript
// Print with specific printer optimization
await this.qzTray.print(
  "Thermal Printer TM-T20", // Printer name
  htmlContent, // HTML to print
  "html", // Format
  {
    dpi: 203, // Optional: override DPI
    paperWidthMm: 58, // Optional: override paper width
  }
);
```

#### Print Receipt with Auto-Detection

```typescript
import { ReceiptGeneratorService } from '@app/services/receipt-generator.service';

constructor(private receipt: ReceiptGeneratorService) {}

async completeSale() {
  // Automatically detects printer and optimizes receipt
  await this.receipt.printSaleReceipt(sale, {
    plainText: false,
    printerName: 'Thermal Printer TM-T20'  // Optional
  });
}
```

#### Generate Optimized Barcode

```typescript
import { ReceiptGeneratorService } from '@app/services/receipt-generator.service';

constructor(private receipt: ReceiptGeneratorService) {}

async generateBarcode() {
  // Barcode automatically scaled for printer
  const barcodeBase64 = await this.receipt.generateBarcode(
    '123456789',                         // Barcode text
    { type: 'code128', scale: 1.2 },    // Config
    'Thermal Printer TM-T20'             // Printer name
  );
}
```

## Key Components

### PrinterCapabilities Interface

```typescript
export interface PrinterCapabilities {
  name: string; // Printer name
  manufacturer?: string; // e.g., "Epson"
  model?: string; // e.g., "TM-T20"
  dpis?: number[]; // Supported resolutions
  defaultDpi?: number; // Default DPI
  paperSizes?: Array<{
    // Supported paper sizes
    width: number; // Width in mm
    height: number; // Height in mm
  }>;
  isColor?: boolean; // Color support
  status?: string; // Printer status
}
```

### Printer Details Cache

- Automatically caches printer details to reduce API calls
- Clear cache when printer configuration changes:

```typescript
this.qzTray.clearPrinterCache();
```

## Console Output

### On App Startup

Look for printer detection in browser console:

```
========== QZ Tray Printer Information ==========
Found 2 printer(s):

Default Printer: Thermal Printer TM-T20

All Printers:
  1. Microsoft Print to PDF
  2. Thermal Printer TM-T20 ⭐ (default)

Printer Capabilities:
  Thermal Printer TM-T20:
    • Manufacturer: Epson
    • Model: TM-T20
    • DPI Support: 203 (default: 203)
    • Color Support: Grayscale
================================================
```

### During Print

Look for optimization logs:

```
Optimized receipt for Thermal Printer TM-T20: 58mm @ 203DPI
Barcode optimized for Thermal Printer TM-T20: height=48.9, scale=0.96
Using printer config: 203DPI, 58mm width
✓ Receipt sent to printer "Thermal Printer TM-T20" via QZ Tray as html
```

## Supported Printers

### Thermal Printers (Recommended)

- **58mm Width**
  - Epson TM-T20, TM-T70, TM-T88
  - Star Micronics TSP100, TSP650
  - Other 58mm thermal printers

- **80mm Width**
  - Epson TM-L90, TM-U220
  - Star Micronics TSP800
  - Other 80mm thermal printers

### Standard Printers

- Microsoft Print to PDF
- HP LaserJet, DeskJet
- Brother printers
- Canon printers

**Note**: System works best with thermal printers. Standard printers will receive optimized output but may not fill entire page.

## DPI Support

| DPI | Use Case                  | Scale Factor |
| --- | ------------------------- | ------------ |
| 203 | Standard thermal printers | 1.0x         |
| 300 | Higher quality thermal    | 1.48x        |
| 600 | Specialty printers        | 2.96x        |

## Paper Size Support

| Width | Common Use        | Printers                   |
| ----- | ----------------- | -------------------------- |
| 58mm  | Standard thermal  | Compact thermal, POS       |
| 80mm  | Wide thermal      | Kitchen printers, receipts |
| A4    | Standard printing | Office printers            |

## Troubleshooting

### Printer Not Detected

1. Check QZ Tray is running: `qz://start`
2. Verify printer is installed on system
3. Check browser console for detailed errors
4. Restart QZ Tray and refresh page

### Barcode Too Small/Large

- System auto-adjusts based on printer DPI and paper width
- Override with manual config if needed:

```typescript
const config: BarcodeConfig = {
  height: 50, // Barcode height
  scale: 1.5, // Scale factor
  type: "code128",
};
```

### Receipt Formatting Issues

- Verify paper size is correctly detected: check console logs
- Check CSS in receipt HTML - media queries may override print settings
- Test with print preview first: enable in settings

### Font Size Issues

- Font sizes automatically scale with printer DPI
- Manual override in receipt config:

```typescript
const config: ReceiptConfig = {
  font: {
    baseSize: 10, // Override base size
    headerSize: 12,
    titleSize: 11,
    smallSize: 8,
  },
};
```

## Best Practices

1. **Always provide printer name when available**

   ```typescript
   await qzTray.print(printerName, content, "html");
   ```

2. **Check console logs for optimization details**
   - Helps debug printing issues
   - Confirms printer detection worked

3. **Test with actual printer before deploying**
   - Different printers may have slight variations
   - Verify receipt formatting and barcode quality

4. **Clear printer cache when configuration changes**

   ```typescript
   this.qzTray.clearPrinterCache();
   ```

5. **Handle printer unavailable gracefully**
   ```typescript
   try {
     await this.qzTray.print(printerName, content, "html");
   } catch (err) {
     console.warn("Printer unavailable, using fallback");
     // Fallback to browser print or offline mode
   }
   ```

## API Reference

### QzTrayService Methods

| Method                                  | Parameters | Returns                        | Purpose                           |
| --------------------------------------- | ---------- | ------------------------------ | --------------------------------- |
| `getPrinterDetails(name)`               | `string`   | `Promise<PrinterCapabilities>` | Get detailed printer info         |
| `getOptimalPaperWidth(name)`            | `string`   | `Promise<number>`              | Get best paper width (58 or 80)   |
| `getOptimalDpi(name)`                   | `string`   | `Promise<number>`              | Get highest supported DPI         |
| `clearPrinterCache()`                   | None       | `void`                         | Clear cached printer details      |
| `logPrinterInfo()`                      | None       | `Promise<void>`                | Log all printers and capabilities |
| `print(name, content, format, options)` | See below  | `Promise<void>`                | Print with optimization           |

### ReceiptGeneratorService Methods

| Method                                   | Parameters                     | Returns           | Purpose                            |
| ---------------------------------------- | ------------------------------ | ----------------- | ---------------------------------- |
| `printSaleReceipt(sale, options)`        | `Sale`, optional settings      | `Promise<void>`   | Print optimized receipt            |
| `generateBarcode(text, config, printer)` | Text, config, optional printer | `Promise<string>` | Generate printer-optimized barcode |

---

**Last Updated**: December 10, 2025
**Version**: 1.0
