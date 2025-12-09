import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "@environments/environment";

@Injectable({
  providedIn: "root",
})
export class QzTrayService {
  private certificateCache: string | null = null;
  private qzInitialized = false;
  private qz: any = null;
  private initializationPromise: Promise<void> | null = null;

  private apiUrl = `${environment.apiUrl}`;
  constructor(private http: HttpClient) {
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
    this.qz.security.setCertificatePromise(() => {
      return Promise.resolve(this.certificateCache || "");
    });

    // Override certificate check for self-signed certificates
    this.qz.security.setSignatureAlgorithm("SHA512");

    // Set trust built-in to allow localhost and local network
    if (this.qz.security.setTrustBuiltIn) {
      this.qz.security.setTrustBuiltIn(true);
      console.log("QZ Tray: Trust built-in enabled");
    }

    // Set signing function using backend - this signs ALL data sent to QZ Tray
    this.qz.security.setSignaturePromise((toSign: string) => {
      console.log("QZ Tray requesting signature for data...");
      return new Promise<string>((resolve, reject) => {
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
      });
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
    }
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
    format: "plain" | "html" = "plain"
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
        // For HTML printing
        data = [
          {
            type: "pixel",
            format: "html",
            flavor: "plain",
            data: content,
          },
        ];
        console.log("Sending as HTML");
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

  isInitialized(): boolean {
    return this.qzInitialized;
  }
}
