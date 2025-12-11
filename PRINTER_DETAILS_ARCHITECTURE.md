# Printer Details Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     App Initialization                          │
│                   (app.config.ts via APP_INITIALIZER)           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ├─→ QzTrayService.initialize()
                     │   - Load certificate
                     │   - Setup security (SHA512 signing)
                     │   - Connect to QZ Tray websocket
                     │
                     └─→ QzTrayService.connect()
                         - Establish websocket connection
                         - Call logPrinterInfo()
                             │
                             └─→ Detect all printers
                                 Detect default printer
                                 Query printer capabilities (DPI, paper sizes)
                                 Log formatted output to console
```

## Print Receipt Flow

```
┌────────────────────────────────────────────────────────────────┐
│              POS Component - completeSale()                    │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      └─→ ReceiptGeneratorService.printSaleReceipt()
                          - Optional printerName parameter
                          │
                          ├─→ Get default template from server
                          │   (or fallback cached version)
                          │
                          ├─→ If printer specified:
                          │   │
                          │   ├─→ QzTrayService.getOptimalPaperWidth()
                          │   │   - Query printer capabilities
                          │   │   - Return 58mm or 80mm
                          │   │
                          │   ├─→ QzTrayService.getOptimalDpi()
                          │   │   - Query printer capabilities
                          │   │   - Return highest DPI supported
                          │   │
                          │   └─→ Adjust receipt config
                          │       - Select paper size
                          │       - Adjust chars per line
                          │
                          ├─→ generateReceipt()
                          │   - Build HTML with optimized sizing
                          │   - Embed barcodes with printer DPI
                          │   - Apply CSS with calculated dimensions
                          │
                          └─→ printReceipt()
                              │
                              ├─→ Get printer details
                              │   (cached if available)
                              │
                              └─→ QzTrayService.print()
                                  - Send HTML to QZ Tray
                                  - Include DPI and paper width hints
                                  - Sign with SHA512
                                  - Print to physical printer
```

## Barcode Generation Flow

```
┌────────────────────────────────────────────────────────────────┐
│         ReceiptGeneratorService.generateBarcode()              │
│         (called from generateReceipt during rendering)         │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      ├─→ If printerName provided:
                      │   │
                      │   ├─→ QzTrayService.getOptimalDpi(printer)
                      │   │   dpiMultiplier = dpi / 203
                      │   │
                      │   └─→ QzTrayService.getOptimalPaperWidth(printer)
                      │       widthMultiplier = paperWidth / 58
                      │
                      ├─→ Calculate optimized dimensions:
                      │   - barcodeHeight = baseHeight × dpiMultiplier
                      │   - barcodeScale = baseScale × widthMultiplier × 0.8
                      │
                      └─→ Generate barcode using bwip-js library
                          - Create canvas element
                          - Render to base64 PNG
                          - Return for embedding in HTML
```

## QR Badge Printing Flow

```
┌────────────────────────────────────────────────────────────────┐
│         Settings Component.printQrBadge()                      │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      └─→ printViaQzTray(badgeHtml, userName)
                          │
                          ├─→ QzTrayService.findPrinters()
                          │   - List available printers
                          │
                          ├─→ Get first printer from list
                          │
                          ├─→ QzTrayService.getOptimalPaperWidth(printer)
                          │   - If 80mm+: use 150x150px QR
                          │   - If 58mm: use 120x120px QR
                          │
                          ├─→ QzTrayService.getOptimalDpi(printer)
                          │   - Calculate font scaling: dpi / 203
                          │
                          ├─→ Optimize HTML:
                          │   - Replace QR size in URL
                          │   - Scale all fonts by dpiMultiplier
                          │   - Adjust padding/margins
                          │
                          └─→ QzTrayService.print(printer, optimized HTML, 'html', options)
                              - Send with DPI and paperWidthMm options
                              - Sign and transmit to printer
```

## Data Structures

### PrinterCapabilities Object

```typescript
{
  name: "Thermal Printer TM-T20",
  manufacturer: "Epson",
  model: "TM-T20",
  dpis: [203],
  defaultDpi: 203,
  paperSizes: [
    { width: 58, height: 297 },
    { width: 80, height: 297 }
  ],
  isColor: false,
  status: "online"
}
```

### Print Options Object

```typescript
{
  dpi: 203,           // DPI for optimal rendering
  paperWidthMm: 58    // Paper width in millimeters
}
```

### Receipt Configuration Object

```typescript
{
  paper: {
    widthMm: 58,      // 58 or 80
    widthPx: 420,     // Calculated at 203 DPI
    dpi: 300,
    margin: 6
  },
  font: {
    family: "'Courier New', Courier, monospace",
    baseSize: 9,
    headerSize: 11,
    titleSize: 10,
    smallSize: 8
  },
  barcode: {
    enabled: true,
    type: "code128",
    height: 33,       // Adjusted for printer
    scale: 1.2,       // Adjusted for printer
    includeText: true
  },
  charsPerLine: 28    // 28 for 58mm, 42 for 80mm
}
```

## Caching Strategy

### Printer Details Cache

```
┌─────────────────────────────┐
│  Map<string, PrinterCapabilities>  │
├─────────────────────────────┤
│ "Printer 1" → Capabilities  │
│ "Printer 2" → Capabilities  │
│ "Printer 3" → Capabilities  │
└─────────────────────────────┘
        ↑
        │ (checked on every print)
        │
    QzTrayService
```

**Cache Benefits:**

- Reduces QZ Tray API calls
- Faster subsequent prints
- Automatic cache invalidation via `clearPrinterCache()`
- No cache expiration (valid until printer changes)

## Optimization Algorithms

### Receipt Size Selection

```typescript
if (printerName) {
  paperWidth = await getOptimalPaperWidth(printerName);
  // 58mm → 420px width, 28 chars/line
  // 80mm → 600px width, 42 chars/line
}
```

### Barcode Scaling

```typescript
dpiMultiplier = optimalDpi / 203;
widthMultiplier = paperWidth / 58;

optimizedHeight = baseHeight × dpiMultiplier;
optimizedScale = baseScale × widthMultiplier × 0.8;
// 0.8 is safety factor to prevent overflow
```

### Font Scaling

```typescript
// For QR badges
dpiMultiplier = optimalDpi / 203;

// CSS replacement
"font-size: 12px" → `font-size: ${Math.round(12 × dpiMultiplier)}px`
```

## Error Handling

### Graceful Degradation Strategy

```
Try printer detection
  ↓
If fail → Use defaults
  ↓
Try QZ Tray printing
  ↓
If fail → Fallback to browser print
  ↓
If fail → Show error toast (non-blocking)
```

### Non-Blocking Print Errors

```typescript
// In POS component
try {
  await receiptGeneratorService.printSaleReceipt(sale);
} catch (err) {
  console.error("Print failed:", err);
  // Don't show to user - checkout still completes
}
```

## Performance Characteristics

| Operation             | Time       | Notes                    |
| --------------------- | ---------- | ------------------------ |
| Get printer list      | ~50ms      | Cached after first query |
| Get printer details   | ~100ms     | Cached indefinitely      |
| Generate receipt HTML | ~200-500ms | Depends on item count    |
| Generate barcode      | ~50-100ms  | Canvas rendering         |
| Send to printer       | ~200-500ms | Network dependent        |

**Total Print Time**: 500ms - 2 seconds (typical)

## Integration Points

### With QZ Tray

- ✓ Certificate loading and signing
- ✓ Printer enumeration (find, getDefault)
- ✓ Printer details querying (if available)
- ✓ HTML printing with pixel formatting
- ✓ WebSocket connection management

### With Angular Services

- ✓ Dependency injection (HttpClient, TranslationService)
- ✓ Observable/Promise patterns
- ✓ Component communication via events

### With Translation System

- ✓ Multi-language support for badges
- ✓ Role translations in QR badges
- ✓ Toast notifications in user language

## Security Considerations

1. **Certificate Handling**
   - All printer communication requires valid certificate
   - Self-signed certs signed with SHA512
   - Backend validates signatures

2. **Data Transmission**
   - All print data signed before QZ Tray transmission
   - Prevents man-in-the-middle attacks
   - Uses cryptographic signatures

3. **Printer Communication**
   - Localhost/local network only
   - No internet transmission of receipt data
   - Secure websocket connection (WSS)

## Future Extension Points

1. **Printer Selection UI**

   ```typescript
   // Would allow user to select printer
   <select (change)="selectedPrinter = $event.target.value">
     <option *ngFor="let p of availablePrinters">{{p}}</option>
   </select>
   ```

2. **Printer Status Monitoring**

   ```typescript
   // Could subscribe to real-time status
   this.qzTray.getStatus(printerName).subscribe((status) => {
     if (status.offline) showWarning();
   });
   ```

3. **Advanced Paper Type Support**

   ```typescript
   // Could optimize based on paper type
   enum PaperType {
     REGULAR,
     THERMAL,
     LABEL,
   }
   ```

4. **Print Queue Management**
   ```typescript
   // Could track and manage multiple print jobs
   printQueue: PrintJob[] = [];
   ```

---

**Architecture Version**: 1.0
**Last Updated**: December 10, 2025
**Compatibility**: Angular 21+, QZ Tray 2.2.5+
