import { Component, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PageTitleComponent } from "../page-title/page-title.component";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { RouterLink } from "@angular/router";
import { ReceiptGeneratorService } from "../../services/receipt-generator.service";
import { TranslationService } from "../../services/translation.service";
import { AuthService } from "../../services/auth.service";
import { CurrencyService } from "../../services/currency.service";
import { ToastService } from "../../services/toast.service";
import { UserService } from "../../services/user.service";
import { QzTrayService } from "../../services/qz-tray.service";
import { ScaleService } from "../../services/scale.service";
import { ToggleSwitchComponent } from "../toggle-switch/toggle-switch.component";
import { environment } from "@environments/environment";

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageTitleComponent,
    TranslatePipe,
    RouterLink,
    ToggleSwitchComponent,
  ],
  templateUrl: "settings.component.html",
  styleUrls: ["./settings.component.scss"],
})
export class SettingsComponent implements OnInit {
  private receiptGen = inject(ReceiptGeneratorService);
  private translationService = inject(TranslationService);
  private authService = inject(AuthService);
  currencyService = inject(CurrencyService);
  private toastService = inject(ToastService);
  private userService = inject(UserService);
  private qzTrayService = inject(QzTrayService);
  private scaleService = inject(ScaleService);

  printerMode: "plain" | "styled" = "plain";
  showPrintPreview = false;

  displayName = "";
  preferredLang = "";
  userPrinterMode: "inherit" | "plain" | "styled" = "inherit";
  selectedCurrency: string = "USD";
  defaultPrinter: string = "default";
  availablePrinters: string[] = [];

  // QR Badge properties
  qrCodeUrl = "";
  currentUserName = "";
  currentUserRole = "";
  printingBadge = false;

  // Scale connection properties
  scaleConnected = false;
  connectingScale = false;
  currentWeight = 0;
  currentWeightUnit = "kg";
  currentWeightStable = false;

  // Reset Database properties
  showResetDBConfirm = false;
  resetConfirmationText = "";
  resettingDatabase = false;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  get isAdmin(): boolean {
    const u = this.authService.getCurrentUser();
    return u?.role === "admin";
  }

  ngOnInit(): void {
    // Load global printer mode from localStorage (for system-wide setting)
    const stored = localStorage.getItem("printer.mode");
    if (stored === "plain" || stored === "styled") {
      this.printerMode = stored as "plain" | "styled";
    } else {
      this.printerMode = "plain";
      localStorage.setItem("printer.mode", this.printerMode);
    }

    // Load print preview setting
    const previewSetting = localStorage.getItem("printer.showPreview");
    this.showPrintPreview = previewSetting === "true";

    // Load default printer setting
    const savedDefaultPrinter = localStorage.getItem("printer.default");
    if (savedDefaultPrinter) {
      this.defaultPrinter = savedDefaultPrinter;
    }

    // Load available printers
    this.loadAvailablePrinters();

    // Generate QR code for current user
    this.generateQrCode();

    // Check if scale is already connected
    this.scaleConnected = this.scaleService.isConnected();

    // Load user preferences from database
    this.userService.getUserSettings().subscribe({
      next: (settings) => {
        this.displayName = settings.displayName || "";
        this.preferredLang =
          settings.language || this.translationService.current || "en";
        this.userPrinterMode = settings.printerMode || "inherit";
        this.selectedCurrency =
          settings.currency || this.currencyService.getCode();

        // Apply language immediately
        if (this.preferredLang) {
          this.translationService.setLanguage(this.preferredLang);
        }

        // Apply currency immediately
        if (this.selectedCurrency) {
          this.currencyService.setCurrency(this.selectedCurrency);
        }
      },
      error: (err) => {
        console.error("Failed to load user settings:", err);
        // Fallback to defaults
        this.preferredLang = this.translationService.current || "en";
        this.selectedCurrency = this.currencyService.getCode();
        this.userPrinterMode = "inherit";
      },
    });
  }

  private async loadAvailablePrinters(): Promise<void> {
    try {
      const printers = await this.qzTrayService.findPrinters();
      this.availablePrinters = printers || [];

      // If no printers found, add default option
      if (this.availablePrinters.length === 0) {
        this.availablePrinters = ["default"];
      } else if (!this.availablePrinters.includes("default")) {
        // Always include 'default' as an option
        this.availablePrinters.unshift("default");
      }

      console.log("Available printers loaded:", this.availablePrinters);
    } catch (err) {
      console.error("Failed to load available printers:", err);
      // Fallback to just 'default'
      this.availablePrinters = ["default"];
    }
  }

  onDefaultPrinterChange(): void {
    localStorage.setItem("printer.default", this.defaultPrinter);
    console.log(`Default printer changed to: ${this.defaultPrinter}`);
  }

  setPrinterMode(mode: "plain" | "styled") {
    this.printerMode = mode;
    localStorage.setItem("printer.mode", mode);
  }
  togglePrintPreview(value: boolean) {
    this.showPrintPreview = value;
    localStorage.setItem(
      "printer.showPreview",
      this.showPrintPreview.toString()
    );
  }

  saveUserSettings() {
    const settings = {
      displayName: this.displayName || "",
      language: this.preferredLang,
      printerMode: this.userPrinterMode,
      currency: this.selectedCurrency,
    };

    this.userService.updateUserSettings(settings).subscribe({
      next: (user) => {
        // Apply settings immediately
        if (this.preferredLang) {
          this.translationService.setLanguage(this.preferredLang);
        }
        if (this.selectedCurrency) {
          this.currencyService.setCurrency(this.selectedCurrency);
        }

        this.toastService.show(
          this.translationService.translate("SETTINGS.SAVED") || "Saved",
          "success"
        );
      },
      error: (err) => {
        console.error("Failed to save user settings", err);
        this.toastService.show(
          this.translationService.translate("SETTINGS.SAVE_FAILED") ||
            "Save failed",
          "error"
        );
      },
    });
  }

  async previewReceipt() {
    // Minimal sample sale for preview
    const sampleSale: any = {
      saleNumber: "PREVIEW-001",
      items: [
        {
          productName: "Sample Product",
          quantity: 1,
          unitPrice: 9.99,
          subtotal: 9.99,
          total: 9.99,
        },
        {
          productName: "Another Item",
          quantity: 2,
          unitPrice: 4.5,
          subtotal: 9.0,
          total: 9.0,
        },
      ],
      subtotal: 18.99,
      total: 18.99,
      paymentMethod: "cash",
      cashier: { firstName: "Preview", fullName: "Preview User" },
      createdAt: new Date(),
    };

    const isPlainText = this.printerMode === "plain";

    try {
      const html = await this.receiptGen.generateSaleReceipt(sampleSale, {
        plainText: isPlainText,
      });
      const w = window.open("", "_blank", "width=480,height=640");
      if (!w) return;
      w.document.write(html);
      w.document.close();
    } catch (err) {
      console.error("Error generating receipt preview:", err);
      this.toastService.show("Failed to generate preview", "error");
    }
  }

  private generateQrCode(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserName = user.firstName + " " + (user.lastName || "");
      this.currentUserRole = user.role || "";

      // Generate QR code with user ID in POSDIC format
      const qrData = `POSDIC:${user.id}`;
      // Use QR Server API to generate QR code (optimized for display)
      this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
        qrData
      )}`;
    }
  }

  printQrBadge(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.toastService.show(
        this.translationService.translate("SETTINGS.QR_BADGE.ERROR") ||
          "Unable to generate badge",
        "error"
      );
      return;
    }

    this.printingBadge = true;

    const userName = user.firstName + " " + (user.lastName || "");
    const userRole =
      this.translationService.translate(
        `USERS.ROLES.${user.role?.toUpperCase()}`
      ) || user.role;
    const qrData = `POSDIC:${user.id}`;
    // Optimized QR size for thermal printers (58mm/80mm)
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
      qrData
    )}`;

    const badgeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee Badge - ${userName}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', Courier, monospace;
            background: white;
            margin: 0;
            padding: 4px;
          }
          .badge {
            max-width: 58mm;
            margin: 0 auto;
            background: white;
            text-align: center;
            padding: 8px 4px;
          }
          .company-name {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 6px;
            text-transform: uppercase;
          }
          .qr-code {
            margin: 6px auto;
          }
          .qr-code img {
            width: 120px;
            height: 120px;
            display: block;
            margin: 0 auto;
          }
          .user-name {
            font-size: 12px;
            font-weight: bold;
            margin-top: 6px;
            word-wrap: break-word;
          }
          .user-role {
            font-size: 10px;
            margin-top: 2px;
            text-transform: uppercase;
          }
          .instructions {
            font-size: 8px;
            margin-top: 8px;
            padding-top: 4px;
            border-top: 1px dashed #000;
          }
          @media print {
            body { 
              background: white;
              margin: 0;
              padding: 0;
            }
            .badge { 
              box-shadow: none;
              border: none;
              padding: 4px 2px;
            }
          }
        </style>
      </head>
      <body>
        <div class="badge">
          <div class="company-name">POSDic</div>
          <div class="qr-code">
            <img src="${qrCodeUrl}" alt="Login QR Code" />
          </div>
          <div class="user-name">${userName}</div>
          <div class="user-role">${userRole}</div>
          <div class="instructions">${
            this.translationService.translate(
              "SETTINGS.QR_BADGE.SCAN_TO_LOGIN"
            ) || "Scan to login"
          }</div>
        </div>
      </body>
      </html>
    `;

    // Try to print via QZ Tray first
    this.printViaQzTray(badgeHtml, userName);
  }

  private async printViaQzTray(
    badgeHtml: string,
    userName: string
  ): Promise<void> {
    try {
      const printers = await this.qzTrayService.findPrinters();

      if (printers && printers.length > 0) {
        // Detect printer capabilities and optimize badge size
        let optimizedBadgeHtml = badgeHtml;

        try {
          // Use the selected default printer or fallback to first available
          const savedDefaultPrinter = localStorage.getItem("printer.default");
          const printerName =
            savedDefaultPrinter && savedDefaultPrinter !== "default"
              ? savedDefaultPrinter
              : printers[0];

          console.log(`Using printer for QR badge: ${printerName}`);

          const paperWidth =
            await this.qzTrayService.getOptimalPaperWidth(printerName);
          const dpi = await this.qzTrayService.getOptimalDpi(printerName);

          // Optimize QR code size based on paper width
          // 58mm paper: use 120x120px, 80mm+ paper: can use 150x150px
          const qrSize = paperWidth >= 80 ? 150 : 120;
          const optimizedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(`POSDIC:${this.authService.getCurrentUser()?.id}`)}`;

          // Adjust badge CSS for printer capabilities
          optimizedBadgeHtml = badgeHtml.replace(
            "size=120x120",
            `size=${qrSize}x${qrSize}`
          );

          // Adjust font sizes based on DPI
          const dpiMultiplier = dpi / 203;
          optimizedBadgeHtml = optimizedBadgeHtml.replace(
            /font-size:\s*(\d+)px/g,
            (match: string, size: string) => {
              const newSize = Math.round(parseInt(size) * dpiMultiplier);
              return `font-size: ${newSize}px`;
            }
          );

          console.log(
            `Optimized QR badge for ${printerName}: ${qrSize}px QR, ${dpi}DPI font scaling`
          );

          // Print with printer-specific options
          await this.qzTrayService.print(
            printerName,
            optimizedBadgeHtml,
            "html",
            {
              dpi,
              paperWidthMm: paperWidth,
            }
          );
        } catch (err) {
          // Fallback: try to print with default settings
          console.log("Could not optimize badge, using default printer:", err);
          await this.qzTrayService.print(printers[0], badgeHtml, "html");
        }

        this.toastService.show(
          this.translationService.translate("SETTINGS.QR_BADGE.PRINTED") ||
            "Badge sent to printer",
          "success"
        );
      } else {
        // Fallback to browser print if no printers found
        this.printViaBrowser(badgeHtml);
      }
    } catch (err) {
      console.warn(
        "QZ Tray printing failed, falling back to browser print:",
        err
      );
      // Fallback to browser print
      this.printViaBrowser(badgeHtml);
    } finally {
      this.printingBadge = false;
    }
  }

  private printViaBrowser(badgeHtml: string): void {
    const htmlWithPrint = badgeHtml.replace(
      "</body>",
      `<script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
      </body>`
    );

    const printWindow = window.open("", "_blank", "width=500,height=700");
    if (printWindow) {
      printWindow.document.write(htmlWithPrint);
      printWindow.document.close();
    }
  }

  // Scale connection methods
  async connectScale(): Promise<void> {
    this.connectingScale = true;
    try {
      const connected = await this.scaleService.connectScale();
      this.scaleConnected = connected;

      if (connected) {
        this.toastService.show(
          this.translationService.translate("SETTINGS.SCALE.CONNECTED") ||
            "Scale connected successfully",
          "success"
        );

        // Subscribe to scale readings
        this.scaleService.currentWeight$.subscribe((reading) => {
          if (reading) {
            this.currentWeight = reading.weight;
            this.currentWeightUnit = reading.unit;
            this.currentWeightStable = reading.stable;
          }
        });
      } else {
        this.toastService.show(
          this.translationService.translate(
            "SETTINGS.SCALE.CONNECTION_FAILED"
          ) || "Failed to connect to scale",
          "error"
        );
      }
    } catch (error) {
      console.error("Error connecting to scale:", error);
      this.toastService.show(
        this.translationService.translate("SETTINGS.SCALE.CONNECTION_ERROR") ||
          "Error connecting to scale",
        "error"
      );
    } finally {
      this.connectingScale = false;
    }
  }

  async disconnectScale(): Promise<void> {
    try {
      await this.scaleService.disconnectScale();
      this.scaleConnected = false;
      this.currentWeight = 0;
      this.toastService.show(
        this.translationService.translate("SETTINGS.SCALE.DISCONNECTED") ||
          "Scale disconnected",
        "info"
      );
    } catch (error) {
      console.error("Error disconnecting scale:", error);
      this.toastService.show(
        this.translationService.translate(
          "SETTINGS.SCALE.DISCONNECTION_ERROR"
        ) || "Error disconnecting scale",
        "error"
      );
    }
  }

  toggleResetDBConfirm(): void {
    this.showResetDBConfirm = !this.showResetDBConfirm;
    this.resetConfirmationText = "";
  }

  async resetDatabase(): Promise<void> {
    if (this.resetConfirmationText.toLowerCase() !== "confirm") {
      this.toastService.show(
        this.translationService.translate(
          "SETTINGS.RESET_DB.INVALID_CONFIRM"
        ) || "Please type 'confirm' to proceed",
        "error"
      );
      return;
    }

    if (!this.isAdmin) {
      this.toastService.show(
        this.translationService.translate("SETTINGS.RESET_DB.ADMIN_ONLY") ||
          "Only administrators can reset the database",
        "error"
      );
      return;
    }

    this.resettingDatabase = true;

    try {
      // Make API call to reset database
      const response = await fetch(
        `${environment.apiUrl}/admin/reset-database`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("pos_token")}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (response.ok) {
        this.toastService.show(
          this.translationService.translate("SETTINGS.RESET_DB.SUCCESS") ||
            "Database reset successfully",
          "success"
        );
        this.showResetDBConfirm = false;
        this.resetConfirmationText = "";
      } else {
        const error = await response.json();
        this.toastService.show(
          error.message ||
            this.translationService.translate("SETTINGS.RESET_DB.ERROR") ||
            "Error resetting database",
          "error"
        );
      }
    } catch (error) {
      console.error("Error resetting database:", error);
      this.toastService.show(
        this.translationService.translate("SETTINGS.RESET_DB.ERROR") ||
          "Error resetting database",
        "error"
      );
    } finally {
      this.resettingDatabase = false;
    }
  }
}
