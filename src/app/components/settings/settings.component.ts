import { Component, OnInit } from "@angular/core";
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

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageTitleComponent,
    TranslatePipe,
    RouterLink,
  ],
  templateUrl: "settings.component.html",
  styleUrls: ["./settings.component.scss"],
})
export class SettingsComponent implements OnInit {
  printerMode: "plain" | "styled" = "plain";

  displayName: string = "";
  preferredLang: string = "";
  userPrinterMode: "inherit" | "plain" | "styled" = "inherit";
  selectedCurrency: string = "USD";

  // QR Badge properties
  qrCodeUrl: string = "";
  currentUserName: string = "";
  currentUserRole: string = "";
  printingBadge: boolean = false;

  constructor(
    private receiptGen: ReceiptGeneratorService,
    private translationService: TranslationService,
    private authService: AuthService,
    public currencyService: CurrencyService,
    private toastService: ToastService,
    private userService: UserService,
    private qzTrayService: QzTrayService
  ) {}

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

    // Generate QR code for current user
    this.generateQrCode();

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

  setPrinterMode(mode: "plain" | "styled") {
    this.printerMode = mode;
    localStorage.setItem("printer.mode", mode);
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

  previewReceipt() {
    // Minimal sample sale for preview
    const sampleSale: any = {
      saleNumber: "PREVIEW-001",
      items: [
        { productName: "Sample Product", qty: 1, unitPrice: 9.99, total: 9.99 },
        { productName: "Another Item", qty: 2, unitPrice: 4.5, total: 9.0 },
      ],
      total: 18.99,
    };

    const paymentMethod = "cash";
    const change = 0;
    const currentUser = { firstName: "Preview" };

    const generator =
      this.printerMode === "plain"
        ? this.receiptGen.generatePlainTextReceipt(
            sampleSale,
            paymentMethod,
            change,
            currentUser
          )
        : this.receiptGen.generateReceipt(
            sampleSale,
            paymentMethod,
            change,
            currentUser
          );

    generator.subscribe((html) => {
      const w = window.open("", "_blank", "width=480,height=640");
      if (!w) return;
      w.document.write(html);
      w.document.close();
    });
  }

  private generateQrCode(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.currentUserName = user.firstName + " " + (user.lastName || "");
      this.currentUserRole = user.role || "";

      // Generate QR code with user ID in POSDIC format
      const qrData = `POSDIC:${user.id}`;
      // Use QR Server API to generate QR code
      this.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
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
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      qrData
    )}`;

    const badgeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employee Badge - ${userName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #f5f5f5;
          }
          .badge {
            width: 3.5in;
            padding: 0.5in 0.4in;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #4f46e5;
            margin-bottom: 16px;
          }
          .qr-code {
            margin: 16px auto;
          }
          .qr-code img {
            width: 200px;
            height: 200px;
            border: 3px solid #e5e7eb;
            border-radius: 12px;
          }
          .user-name {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-top: 16px;
          }
          .user-role {
            font-size: 14px;
            color: #6b7280;
            margin-top: 4px;
            text-transform: capitalize;
          }
          .instructions {
            font-size: 11px;
            color: #9ca3af;
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px dashed #e5e7eb;
          }
          @media print {
            body { background: white; }
            .badge { box-shadow: none; border: 1px solid #e5e7eb; }
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
        // Use the first available printer or a default one
        const printerName = printers[0];
        await this.qzTrayService.print("POS-58", badgeHtml, "html");

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
}
