import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { PageTitleComponent } from "../page-title/page-title.component";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { ReceiptGeneratorService } from "../../services/receipt-generator.service";
import { TranslationService } from "../../services/translation.service";

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [CommonModule, FormsModule, PageTitleComponent, TranslatePipe],
  templateUrl: "settings.component.html",
  styleUrls: ["./settings.component.scss"],
})
export class SettingsComponent implements OnInit {
  printerMode: "plain" | "styled" = "plain";

  displayName: string = "";
  preferredLang: string = "";
  userPrinterMode: "inherit" | "plain" | "styled" = "inherit";

  constructor(
    private receiptGen: ReceiptGeneratorService,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    const stored = localStorage.getItem("printer.mode");
    if (stored === "plain" || stored === "styled") {
      this.printerMode = stored as "plain" | "styled";
    } else {
      this.printerMode = "plain";
      localStorage.setItem("printer.mode", this.printerMode);
    }

    // Load user preferences
    try {
      const dn = localStorage.getItem("user.displayName");
      const ul = localStorage.getItem("user.language");
      const up = localStorage.getItem("user.printer.mode");
      if (dn) this.displayName = dn;
      if (ul) {
        this.preferredLang = ul;
        // apply preferred language immediately
        this.translationService.setLanguage(ul);
      } else {
        this.preferredLang = this.translationService.current || "en";
      }
      if (up === "plain" || up === "styled") this.userPrinterMode = up as any;
      else this.userPrinterMode = "inherit";
    } catch (e) {
      // ignore storage errors
    }
  }

  setPrinterMode(mode: "plain" | "styled") {
    this.printerMode = mode;
    localStorage.setItem("printer.mode", mode);
  }

  saveUserSettings() {
    try {
      localStorage.setItem("user.displayName", this.displayName || "");
      if (this.preferredLang) {
        localStorage.setItem("user.language", this.preferredLang);
        this.translationService.setLanguage(this.preferredLang);
      }
      if (this.userPrinterMode === "inherit") {
        localStorage.removeItem("user.printer.mode");
      } else {
        localStorage.setItem("user.printer.mode", this.userPrinterMode);
      }
      // Optionally, reflect user printer mode as current global fallback
      // if user wants it to immediately apply for demo, leave as-is.
      alert(this.translationService.translate("SETTINGS.SAVED") || "Saved");
    } catch (e) {
      console.error("Failed to save user settings", e);
      alert(
        this.translationService.translate("SETTINGS.SAVE_FAILED") ||
          "Save failed"
      );
    }
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
