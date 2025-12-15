import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "@environments/environment";

// ============================================================================
// PRINTER CAPABILITIES INTERFACES
// ============================================================================

export interface PrinterCapabilities {
  /** Printer name */
  name: string;
  /** Manufacturer (if available) */
  manufacturer?: string;
  /** Printer model (if available) */
  model?: string;
  /** Supported DPI resolutions */
  dpis?: number[];
  /** Default DPI */
  defaultDpi?: number;
  /** Paper sizes in mm */
  paperSizes?: { width: number; height: number }[];
  /** Is color printer */
  isColor?: boolean;
  /** Printer status */
  status?: string;
}

@Injectable({
  providedIn: "root",
})
export class QzTrayService {
  private http = inject(HttpClient);

  private certificateCache: string | null = null;
  private qzInitialized = false;
  private qz: any = null;
  private initializationPromise: Promise<void> | null = null;
  private printerDetailsCache: Map<string, PrinterCapabilities> = new Map();

  private apiUrl = `${environment.apiUrl}`;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);
  constructor() {
    this.initializationPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      console.log("Initializing QZ Tray...");
      // Import QZ Tray
      this.qz = await import("qz-tray");
      console.log("QZ Tray module loaded");

      // Load and cache the certificate
      const publicKey = await this.http
        .get("/assets/digital-certificate.txt", { responseType: "text" })
        .toPromise();

      if (!publicKey) {
        throw new Error("Failed to load certificate");
      }

      console.log("Certificate loaded");
      this.certificateCache = publicKey;
      await this.setupSecurity();

      this.connect();
    } catch (err) {
      console.error("Failed to initialize QZ Tray:", err);
      throw err;
    }
  }

  private setupSecurity(): void {
    if (!this.qz || !this.qz.security) {
      console.error("QZ Tray not available");
      return;
    }

    // Set certificate promise - return as a function that returns a promise
    this.qz.security.setCertificatePromise(
      (resolve: (arg0: string) => any, reject: any) => {
        return resolve(this.certificateCache || "");
      }
    );

    // Override certificate check for self-signed certificates
    this.qz.security.setSignatureAlgorithm("SHA512");

    // Set trust built-in to allow localhost and local network
    if (this.qz.security.setTrustBuiltIn) {
      this.qz.security.setTrustBuiltIn(true);
      console.log("QZ Tray: Trust built-in enabled");
    }

    // Set signing function using backend - this signs ALL data sent to QZ Tray
    this.qz.security.setSignaturePromise((toSign: string) => {
      console.log("QZ Tray requesting signature for data...", toSign);
      return (
        resolve: (arg0: string) => void,
        reject: (arg0: Error) => void
      ) => {
        this.http
          .post<{
            signature: string;
            error?: string;
            message?: string;
          }>(this.apiUrl + "/sign", { toSign })
          .subscribe({
            next: (res) => {
              if (res?.error) {
                console.error("Signing error from server:", res.message);
                reject(new Error(res.message || "Server signing error"));
                return;
              }
              const signature = res?.signature || "";
              console.log("✓ Data signed successfully with SHA512");
              resolve(signature);
            },
            error: (err) => {
              const errorMsg =
                err?.error?.message || err?.message || "Failed to sign request";
              console.error("✗ Signing failed:", errorMsg);
              reject(new Error(errorMsg));
            },
          });
      };
    });

    this.qzInitialized = true;
    console.log("QZ Tray certificate and signature configured");
  }

  async connect(): Promise<void> {
    if (!this.qz) {
      throw new Error("QZ Tray not initialized");
    }

    if (!this.qz.websocket.isActive()) {
      await this.qz.websocket.connect();
      console.log("QZ Tray connected");

      // Log printer info after connection
      await this.logPrinterInfo();
    }
  }

  async logPrinterInfo(): Promise<void> {
    try {
      if (!this.qz || !this.qz.websocket.isActive()) {
        console.warn("QZ Tray not connected, skipping printer info logging");
        return;
      }

      console.log("\n========== QZ Tray Printer Information ==========");

      // Get list of all printers
      const printers = await this.qz.printers.find();
      console.log(`Found ${printers.length} printer(s):`);

      if (printers.length === 0) {
        console.log("  ⚠ No printers detected");
        console.log("================================================\n");
        return;
      }

      // Get default printer
      const defaultPrinter = await this.qz.printers.getDefault();
      console.log(`\nDefault Printer: ${defaultPrinter || "None"}`);

      // List all printers with details
      console.log("\nAll Printers:");
      printers.forEach((printer: string, index: number) => {
        const isDefault = printer === defaultPrinter;
        console.log(
          `  ${index + 1}. ${printer}${isDefault ? " ⭐ (default)" : ""}`
        );
      });

      // Try to get detailed capabilities for each printer
      console.log("\nPrinter Capabilities:");
      for (const printer of printers) {
        try {
          const details = await this.getPrinterDetails(printer);
          console.log(`  ${printer}:`);
          if (details.manufacturer)
            console.log(`    • Manufacturer: ${details.manufacturer}`);
          if (details.model) console.log(`    • Model: ${details.model}`);
          if (details.dpis && details.dpis.length > 0) {
            console.log(
              `    • DPI Support: ${details.dpis.join(", ")} (default: ${details.defaultDpi || "auto"})`
            );
          }
          if (details.isColor !== undefined)
            console.log(
              `    • Color Support: ${details.isColor ? "Yes" : "Grayscale"}`
            );
        } catch (err) {
          // Some printers may not support detailed queries
          console.log(`  ${printer}: (detailed info unavailable)`);
        }
      }

      console.log("================================================\n");
    } catch (err) {
      console.error("Failed to retrieve printer information:", err);
    }
  }

  /**
   * Get detailed capabilities for a specific printer
   */
  async getPrinterDetails(printerName: string): Promise<PrinterCapabilities> {
    // Check cache first
    if (this.printerDetailsCache.has(printerName)) {
      return this.printerDetailsCache.get(printerName)!;
    }

    const capabilities: PrinterCapabilities = {
      name: printerName,
      dpis: [203, 300], // Common DPI resolutions for thermal printers
      defaultDpi: 203,
      paperSizes: [
        { width: 58, height: 297 }, // 58mm thermal
        { width: 80, height: 297 }, // 80mm thermal
      ],
      isColor: false,
    };

    try {
      // Try to get detailed printer info using QZ Tray API
      if (this.qz?.printers?.details) {
        const config = this.qz.configs.create(printerName);
        // Get printer attributes if available
        const attributes = await this.qz.printers.details(printerName);

        if (attributes) {
          // Parse detailed attributes if returned
          if (attributes.manufacturer)
            capabilities.manufacturer = attributes.manufacturer;
          if (attributes.model) capabilities.model = attributes.model;
          if (attributes.dpis) capabilities.dpis = attributes.dpis;
          if (attributes.isColor !== undefined)
            capabilities.isColor = attributes.isColor;
        }
      }
    } catch (err) {
      // Fallback to default capabilities
      console.log(
        `Could not retrieve detailed capabilities for ${printerName}, using defaults`
      );
    }

    // Cache the result
    this.printerDetailsCache.set(printerName, capabilities);
    return capabilities;
  }

  /**
   * Get optimal paper width for a printer (in mm)
   * Returns 58 or 80mm based on printer type or user preference
   */
  async getOptimalPaperWidth(printerName: string): Promise<number> {
    try {
      const details = await this.getPrinterDetails(printerName);
      // Check if printer supports 80mm (wider paper)
      const supports80mm = details.paperSizes?.some((size) => size.width >= 80);
      return supports80mm ? 80 : 58;
    } catch {
      return 58; // Default to 58mm
    }
  }

  /**
   * Get optimal DPI for a printer
   */
  async getOptimalDpi(printerName: string): Promise<number> {
    try {
      const details = await this.getPrinterDetails(printerName);
      // Return highest supported DPI for best quality
      return (
        details.dpis?.[details.dpis.length - 1] || details.defaultDpi || 203
      );
    } catch {
      return 203; // Default DPI for thermal printers
    }
  }

  /**
   * Clear printer details cache (useful when printer configuration changes)
   */
  clearPrinterCache(): void {
    this.printerDetailsCache.clear();
    console.log("Printer details cache cleared");
  }

  async disconnect(): Promise<void> {
    if (this.qz && this.qz.websocket.isActive()) {
      await this.qz.websocket.disconnect();
      console.log("QZ Tray disconnected");
    }
  }

  async findPrinters(): Promise<string[]> {
    //await this.connect();
    return await this.qz.printers.find();
  }

  async print(
    printerName: string,
    content: string,
    format: "plain" | "html" = "plain",
    options?: {
      /** DPI override for printer */
      dpi?: number;
      /** Paper width in mm override */
      paperWidthMm?: number;
    }
  ): Promise<void> {
    console.log("Print request received");
    console.log("QZ initialized:", this.qzInitialized);

    // Wait for initialization to complete
    if (this.initializationPromise) {
      console.log("Waiting for QZ Tray initialization...");
      await this.initializationPromise;
    }

    if (!this.qzInitialized) {
      throw new Error(
        "QZ Tray not initialized. Please wait for certificate to load."
      );
    }

    if (!this.qz) {
      throw new Error("QZ Tray module not loaded");
    }

    console.log("Connecting to QZ Tray...");
    await this.connect();

    try {
      // List available printers for debugging
      console.log("Fetching available printers...");
      const printers = await this.qz.printers.find();
      console.log("Available printers:", printers);

      // Try to find the printer or use default
      let targetPrinter = printerName;
      if (!printers.includes(printerName)) {
        console.warn(
          `Printer "${printerName}" not found. Available printers:`,
          printers
        );
        if (printers.length > 0) {
          targetPrinter = printers[0];
          console.log(`Using default printer: ${targetPrinter}`);
        } else {
          throw new Error("No printers available");
        }
      }

      // Get printer capabilities if options not provided
      let dpi = options?.dpi;
      let paperWidthMm = options?.paperWidthMm;

      if (!dpi || !paperWidthMm) {
        try {
          const details = await this.getPrinterDetails(targetPrinter);
          if (!dpi) dpi = details.defaultDpi || 203;
          if (!paperWidthMm) {
            const maxWidth =
              details.paperSizes?.reduce(
                (max, size) => Math.max(max, size.width),
                58
              ) || 58;
            paperWidthMm = maxWidth;
          }
          console.log(
            `Using printer config: ${dpi}DPI, ${paperWidthMm}mm width`
          );
        } catch (err) {
          console.log("Could not get printer details, using defaults");
          dpi = dpi || 203;
          paperWidthMm = paperWidthMm || 58;
        }
      }

      // Create config with printer name
      const config = this.qz.configs.create(targetPrinter);
      console.log("Config created for:", targetPrinter);

      // Format data according to QZ Tray specs
      let data: any;

      if (format === "plain") {
        // For plain text/raw printing - send as simple string array
        data = [content];
        console.log("Sending as plain text, content length:", content.length);
      } else {
        // For HTML printing with printer-optimized settings
        data = [
          {
            type: "pixel",
            format: "html",
            flavor: "plain",
            data: content,
            // Include printer-specific hints in the data
            printerDpi: dpi,
            paperWidthMm: paperWidthMm,
          },
        ];
        console.log("Sending as HTML with printer optimization");
      }

      console.log("Sending print job to QZ Tray...");
      console.log("→ All data will be signed with SHA512 before sending");
      await this.qz.print(config, data);
      console.log(
        `✓ Receipt sent to printer "${targetPrinter}" via QZ Tray as ${format}`
      );
      console.log("✓ Print job was cryptographically signed and verified");
    } catch (err) {
      console.error("Error during print operation:", err);
      throw err;
    }
  }

  /**
   * Get the default printer name from localStorage
   * Returns the user-configured default printer or 'default' if not set
   */
  getDefaultPrinter(): string {
    return localStorage.getItem("printer.default") || "default";
  }

  /**
   * Set the default printer in localStorage
   */
  setDefaultPrinter(printerName: string): void {
    localStorage.setItem("printer.default", printerName);
    console.log(`Default printer set to: ${printerName}`);
  }

  isInitialized(): boolean {
    return this.qzInitialized;
  }
}
