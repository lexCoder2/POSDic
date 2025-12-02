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

  constructor(
    private receiptGen: ReceiptGeneratorService,
    private translationService: TranslationService,
    private authService: AuthService,
    public currencyService: CurrencyService,
    private toastService: ToastService,
    private userService: UserService
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
}
