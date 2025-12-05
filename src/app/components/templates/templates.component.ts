import { Component, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from "@angular/forms";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import { PrintTemplateService } from "../../services/print-template.service";
import { ToastService } from "../../services/toast.service";
import { PrintTemplate } from "../../models";
import { PageTitleComponent } from "../page-title/page-title.component";
import { ToggleSwitchComponent } from "../toggle-switch/toggle-switch.component";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { TranslationService } from "../../services/translation.service";

@Component({
  selector: "app-templates",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PageTitleComponent,
    ToggleSwitchComponent,
    TranslatePipe,
  ],
  templateUrl: "./templates.component.html",
  styleUrls: ["./templates.component.scss"],
})
export class TemplatesComponent implements OnInit {
  templates = signal<PrintTemplate[]>([]);
  selectedTemplate = signal<PrintTemplate | null>(null);
  isLoading = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  showForm = signal<boolean>(false);
  templateForm: FormGroup;

  constructor(
    private printTemplateService: PrintTemplateService,
    private fb: FormBuilder,
    public sanitizer: DomSanitizer,
    private translationService: TranslationService,
    private toastService: ToastService
  ) {
    this.templateForm = this.fb.group({
      name: ["", [Validators.required, Validators.minLength(3)]],
      description: [""],
      templateType: ["receipt"],
      paperSize: ["58mm"],
      storeName: [""],
      storeAddress: [""],
      storePhone: [""],
      storeEmail: [""],
      customMessage: ["Thank you!"],
      showLogo: [false],
      showStoreName: [true],
      showStoreAddress: [true],
      showStorePhone: [true],
      showStoreEmail: [true],
      storeNameSize: ["medium"],
      storeNameFont: ["monospace"],
      storeNameBold: [true],
      storeAddressSize: ["small"],
      storeAddressFont: ["monospace"],
      storeAddressBold: [false],
      storePhoneSize: ["small"],
      storePhoneFont: ["monospace"],
      storePhoneBold: [false],
      storeEmailSize: ["small"],
      storeEmailFont: ["monospace"],
      storeEmailBold: [false],
      showProductCode: [false],
      showBarcode: [false],
      showQuantity: [true],
      showUnitPrice: [true],
      showDiscount: [false],
      showTax: [false],
      showSubtotal: [true],
      productSize: ["small"],
      productFont: ["monospace"],
      productBold: [false],
      showTotals: [true],
      showPaymentMethod: [true],
      showCashier: [true],
      showDateTime: [true],
      showThankYou: [true],
      totalSize: ["medium"],
      totalFont: ["monospace"],
      totalBold: [true],
      footerSize: ["small"],
      footerFont: ["monospace"],
      footerBold: [false],
      fontSize: ["small"],
      textAlign: ["center"],
      isDefault: [false],
    });
  }

  ngOnInit(): void {
    this.loadTemplates();
    // Subscribe to form changes for live preview
    this.templateForm.valueChanges.subscribe(() => {
      // This will trigger change detection for the preview
    });
  }

  loadTemplates(): void {
    this.isLoading.set(true);
    this.printTemplateService.getTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error("Error loading templates:", err);
        this.isLoading.set(false);
      },
    });
  }

  selectTemplate(template: PrintTemplate): void {
    this.selectedTemplate.set(template);
    this.populateForm(template);
    this.isEditing.set(false);
    this.showForm.set(true);
  }

  populateForm(template: PrintTemplate): void {
    this.templateForm.patchValue({
      name: template.name,
      description: template.description,
      templateType: template.templateType,
      paperSize: template.paperSize,
      storeName: template.header?.storeName,
      storeAddress: template.header?.storeAddress,
      storePhone: template.header?.storePhone,
      storeEmail: template.header?.storeEmail,
      customMessage: template.footer?.customMessage,
      showLogo: template.header?.showLogo,
      showStoreName: template.header?.showStoreName ?? true,
      showStoreAddress: template.header?.showStoreAddress ?? true,
      showStorePhone: template.header?.showStorePhone ?? true,
      showStoreEmail: template.header?.showStoreEmail ?? true,
      storeNameSize: template.header?.storeNameSize || "medium",
      storeNameFont: template.header?.storeNameFont || "monospace",
      storeNameBold: template.header?.storeNameBold ?? true,
      storeAddressSize: template.header?.storeAddressSize || "small",
      storeAddressFont: template.header?.storeAddressFont || "monospace",
      storeAddressBold: template.header?.storeAddressBold ?? false,
      storePhoneSize: template.header?.storePhoneSize || "small",
      storePhoneFont: template.header?.storePhoneFont || "monospace",
      storePhoneBold: template.header?.storePhoneBold ?? false,
      storeEmailSize: template.header?.storeEmailSize || "small",
      storeEmailFont: template.header?.storeEmailFont || "monospace",
      storeEmailBold: template.header?.storeEmailBold ?? false,
      showProductCode: template.body?.showProductCode,
      showBarcode: template.body?.showBarcode,
      showQuantity: template.body?.showQuantity,
      showUnitPrice: template.body?.showUnitPrice,
      showDiscount: template.body?.showDiscount,
      showTax: template.body?.showTax,
      showSubtotal: template.body?.showSubtotal,
      productSize: template.body?.productSize || "small",
      productFont: template.body?.productFont || "monospace",
      productBold: template.body?.productBold ?? false,
      showTotals: template.footer?.showTotals,
      showPaymentMethod: template.footer?.showPaymentMethod,
      showCashier: template.footer?.showCashier,
      showDateTime: template.footer?.showDateTime,
      showThankYou: template.footer?.showThankYou,
      totalSize: template.footer?.totalSize || "medium",
      totalFont: template.footer?.totalFont || "monospace",
      totalBold: template.footer?.totalBold ?? true,
      footerSize: template.footer?.footerSize || "small",
      footerFont: template.footer?.footerFont || "monospace",
      footerBold: template.footer?.footerBold ?? false,
      fontSize: template.body?.fontSize,
      textAlign: template.styles?.textAlign,
      isDefault: template.isDefault || false,
    });
  }

  createNew(): void {
    this.selectedTemplate.set(null);
    this.templateForm.reset({
      templateType: "receipt",
      paperSize: "58mm",
      customMessage: "Thank you!",
      fontSize: "small",
      textAlign: "center",
      showQuantity: true,
      showUnitPrice: true,
      showSubtotal: true,
      showTotals: true,
      showPaymentMethod: true,
      showCashier: true,
      showDateTime: true,
      showThankYou: true,
    });
    this.isEditing.set(false);
    this.showForm.set(true);
  }

  editTemplate(): void {
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.showForm.set(false);
    this.isEditing.set(false);
    this.templateForm.reset();
  }

  saveTemplate(): void {
    if (!this.templateForm.valid) return;

    const formValue = this.templateForm.value;
    const templateData: Partial<PrintTemplate> = {
      name: formValue.name,
      description: formValue.description,
      templateType: formValue.templateType,
      paperSize: formValue.paperSize,
      header: {
        showLogo: formValue.showLogo,
        storeName: formValue.storeName,
        showStoreName: formValue.showStoreName,
        storeNameSize: formValue.storeNameSize,
        storeNameFont: formValue.storeNameFont,
        storeNameBold: formValue.storeNameBold,
        storeAddress: formValue.storeAddress,
        showStoreAddress: formValue.showStoreAddress,
        storeAddressSize: formValue.storeAddressSize,
        storeAddressFont: formValue.storeAddressFont,
        storeAddressBold: formValue.storeAddressBold,
        storePhone: formValue.storePhone,
        showStorePhone: formValue.showStorePhone,
        storePhoneSize: formValue.storePhoneSize,
        storePhoneFont: formValue.storePhoneFont,
        storePhoneBold: formValue.storePhoneBold,
        storeEmail: formValue.storeEmail,
        showStoreEmail: formValue.showStoreEmail,
        storeEmailSize: formValue.storeEmailSize,
        storeEmailFont: formValue.storeEmailFont,
        storeEmailBold: formValue.storeEmailBold,
      },
      body: {
        showProductCode: formValue.showProductCode,
        showBarcode: formValue.showBarcode,
        showQuantity: formValue.showQuantity,
        showUnitPrice: formValue.showUnitPrice,
        showDiscount: formValue.showDiscount,
        showTax: formValue.showTax,
        showSubtotal: formValue.showSubtotal,
        productSize: formValue.productSize,
        productFont: formValue.productFont,
        productBold: formValue.productBold,
        fontSize: formValue.fontSize,
      },
      footer: {
        showTotals: formValue.showTotals,
        showPaymentMethod: formValue.showPaymentMethod,
        showCashier: formValue.showCashier,
        showDateTime: formValue.showDateTime,
        customMessage: formValue.customMessage,
        showThankYou: formValue.showThankYou,
        totalSize: formValue.totalSize,
        totalFont: formValue.totalFont,
        totalBold: formValue.totalBold,
        footerSize: formValue.footerSize,
        footerFont: formValue.footerFont,
        footerBold: formValue.footerBold,
      },
      styles: {
        textAlign: formValue.textAlign,
      },
      isDefault: formValue.isDefault,
    };

    if (this.selectedTemplate()) {
      // Update existing template
      this.printTemplateService
        .updateTemplate(this.selectedTemplate()?._id || "", templateData)
        .subscribe({
          next: () => {
            this.toastService.show(
              this.translationService.translate("TEMPLATES.UPDATED"),
              "success"
            );
            this.loadTemplates();
            this.cancelEdit();
          },
          error: (err) => {
            console.error("Error updating template:", err);
            this.toastService.show(
              this.translationService.translate("TEMPLATES.UPDATE_FAILED"),
              "error"
            );
          },
        });
    } else {
      // Create new template
      this.printTemplateService.createTemplate(templateData).subscribe({
        next: () => {
          this.toastService.show(
            this.translationService.translate("TEMPLATES.CREATED"),
            "success"
          );
          this.loadTemplates();
          this.cancelEdit();
        },
        error: (err) => {
          console.error("Error creating template:", err);
          this.toastService.show(
            this.translationService.translate("TEMPLATES.CREATE_FAILED"),
            "error"
          );
        },
      });
    }
  }

  setAsDefault(template: PrintTemplate): void {
    if (!template?._id) return;
    this.isLoading.set(true);
    this.printTemplateService
      .updateTemplate(template._id, { isDefault: true })
      .subscribe({
        next: (updated) => {
          this.toastService.show(
            this.translationService.translate("TEMPLATES.DEFAULT_SET", {
              name: updated.name,
            }),
            "success"
          );
          this.loadTemplates();
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error("Error setting default template:", err);
          this.toastService.show(
            this.translationService.translate("TEMPLATES.DEFAULT_SET_FAILED"),
            "error"
          );
          this.isLoading.set(false);
        },
      });
  }

  deleteTemplate(): void {
    if (!this.selectedTemplate() || !confirm("Are you sure?")) return;

    this.printTemplateService
      .deleteTemplate(this.selectedTemplate()?._id || "")
      .subscribe({
        next: () => {
          this.toastService.show(
            this.translationService.translate("TEMPLATES.DELETED"),
            "success"
          );
          this.loadTemplates();
          this.cancelEdit();
        },
        error: (err) => {
          console.error("Error deleting template:", err);
          this.toastService.show(
            this.translationService.translate("TEMPLATES.DELETE_FAILED"),
            "error"
          );
        },
      });
  }

  getFieldError(fieldName: string): string {
    const control = this.templateForm.get(fieldName);
    if (control?.hasError("required")) {
      return `${fieldName} is required`;
    }
    if (control?.hasError("minlength")) {
      return `${fieldName} must be at least 3 characters`;
    }
    return "";
  }

  getSafePreview(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.generatePreview());
  }

  generatePreview(): string {
    const formValue = this.templateForm.value;
    const fontSize =
      formValue.fontSize === "small"
        ? "14px"
        : formValue.fontSize === "medium"
        ? "16px"
        : "18px";
    const align = formValue.textAlign;

    // Helper function to convert size name to px
    const getSizeInPx = (size: string) => {
      if (size === "small") return "12px";
      if (size === "large") return "16px";
      return "14px"; // medium
    };

    // Helper function to get font style CSS
    const getFontStyle = (size: string, font: string, bold: boolean) => {
      return `font-size: ${getSizeInPx(
        size
      )}; font-family: ${font}; font-weight: ${bold ? "bold" : "normal"};`;
    };

    let preview = `<div style="font-family: monospace; width: ${
      formValue.paperSize === "58mm"
        ? "200px"
        : formValue.paperSize === "80mm"
        ? "280px"
        : "800px"
    }; margin: 0 auto; padding: 8px; box-sizing: border-box; border: 1px solid #ddd; font-size: ${fontSize}; text-align: ${align}; line-height: 1.2;">`;

    // Header
    if (formValue.showLogo) {
      preview += `<div style="font-size: 18px; margin-bottom: 6px;">🏪</div>`;
    }
    if (formValue.showStoreName && formValue.storeName) {
      const storeNameStyle = getFontStyle(
        formValue.storeNameSize,
        formValue.storeNameFont,
        formValue.storeNameBold
      );
      preview += `<div style="${storeNameStyle} margin-bottom: 3px;">${formValue.storeName}</div>`;
    }
    if (formValue.showStoreAddress && formValue.storeAddress) {
      const storeAddressStyle = getFontStyle(
        formValue.storeAddressSize,
        formValue.storeAddressFont,
        formValue.storeAddressBold
      );
      preview += `<div style="${storeAddressStyle} margin-bottom: 3px;">${formValue.storeAddress}</div>`;
    }
    if (formValue.showStorePhone && formValue.storePhone) {
      const storePhoneStyle = getFontStyle(
        formValue.storePhoneSize,
        formValue.storePhoneFont,
        formValue.storePhoneBold
      );
      preview += `<div style="${storePhoneStyle} margin-bottom: 3px;">Tel: ${formValue.storePhone}</div>`;
    }
    if (formValue.showStoreEmail && formValue.storeEmail) {
      const storeEmailStyle = getFontStyle(
        formValue.storeEmailSize,
        formValue.storeEmailFont,
        formValue.storeEmailBold
      );
      preview += `<div style="${storeEmailStyle} margin-bottom: 8px;">${formValue.storeEmail}</div>`;
    }

    // Divider
    preview += `<div style="border-bottom: 1px dashed #999; margin: 8px 0;"></div>`;

    // Items header
    const productStyle = getFontStyle(
      formValue.productSize,
      formValue.productFont,
      formValue.productBold
    );
    preview += `<div style="display: grid; grid-template-columns: 1fr 60px; gap: 5px; margin-bottom: 5px; font-weight: bold; ${productStyle}">`;
    preview += `<span>Item</span>`;
    if (formValue.showQuantity || formValue.showUnitPrice) {
      preview += `<span style="text-align: right;">Qty Price</span>`;
    }
    preview += `</div>`;

    // Sample items
    const items = [
      { name: "Product A", qty: 2, price: 10.0 },
      { name: "Product B", qty: 1, price: 25.5 },
    ];

    items.forEach((item) => {
      let itemLine = `${item.name}`;
      if (formValue.showQuantity || formValue.showUnitPrice) {
        const qtyPrice = `${item.qty} $${item.price.toFixed(2)} $${(
          item.qty * item.price
        ).toFixed(2)}`;
        preview += `<div style="display: grid; grid-template-columns: 1fr 60px; gap: 5px; ${productStyle}"><span>${itemLine}</span><span style="text-align: right;">${qtyPrice}</span></div>`;
      } else {
        preview += `<div style="${productStyle}">${itemLine}</div>`;
      }
    });

    // Divider
    preview += `<div style="border-bottom: 1px dashed #999; margin: 8px 0;"></div>`;

    // Totals
    const totalStyle = getFontStyle(
      formValue.totalSize,
      formValue.totalFont,
      formValue.totalBold
    );
    if (formValue.showSubtotal) {
      preview += `<div style="display: grid; grid-template-columns: 1fr 60px; gap: 10px; margin-bottom: 2px; ${totalStyle}"><span>Subtotal:</span><span style="text-align: right;">$46.50</span></div>`;
    }
    if (formValue.showTax) {
      preview += `<div style="display: grid; grid-template-columns: 1fr 60px; gap: 10px; margin-bottom: 2px; ${totalStyle}"><span>Tax:</span><span style="text-align: right;">$3.50</span></div>`;
    }
    if (formValue.showTotals) {
      preview += `<div style="display: grid; grid-template-columns: 1fr 60px; gap: 10px; margin-bottom: 8px; ${totalStyle}"><span>TOTAL:</span><span style="text-align: right;">$50.00</span></div>`;
    }

    // Footer
    const footerStyle = getFontStyle(
      formValue.footerSize,
      formValue.footerFont,
      formValue.footerBold
    );
    if (formValue.showPaymentMethod) {
      preview += `<div style="${footerStyle} margin-bottom: 3px;">Payment: Cash</div>`;
    }

    // Cashier info
    if (formValue.showCashier) {
      preview += `<div style="${footerStyle} margin-bottom: 3px;">Cashier: John Doe</div>`;
    }

    // Date/Time
    if (formValue.showDateTime) {
      const now = new Date().toLocaleString();
      preview += `<div style="${footerStyle} margin-bottom: 8px;">${now}</div>`;
    }

    // Thank you message
    if (formValue.showThankYou && formValue.customMessage) {
      preview += `<div style="${footerStyle} margin-top: 8px; font-weight: bold;">${formValue.customMessage}</div>`;
    }

    preview += `</div>`;
    return preview;
  }

  toggleFieldVisibility(fieldName: string): void {
    const currentValue = this.templateForm.get(fieldName)?.value;
    this.templateForm.patchValue({
      [fieldName]: !currentValue,
    });
  }

  isFieldVisible(fieldName: string): boolean {
    return this.templateForm.get(fieldName)?.value ?? false;
  }

  generateTemplatePreview(template: PrintTemplate): string {
    const fontSize =
      template.body?.fontSize === "small"
        ? "14px"
        : template.body?.fontSize === "medium"
        ? "16px"
        : "18px";
    const align = template.styles?.textAlign || "center";

    let preview = `<div style="font-family: monospace; width: ${
      template.paperSize === "58mm"
        ? "150px"
        : template.paperSize === "80mm"
        ? "210px"
        : "600px"
    }; margin: 0 auto; padding: 11px; border: 1px solid #ddd; font-size: ${fontSize}; text-align: ${align}; line-height: 1.3; background: white;">`;

    // Header
    if (template.header?.showLogo) {
      preview += `<div style="font-size: 14px; margin-bottom: 3px;">🏪</div>`;
    }
    if (template.header?.showStoreName && template.header?.storeName) {
      preview += `<div style="font-weight: bold; margin-bottom: 2px; font-size: 12px;">${template.header.storeName}</div>`;
    }
    if (template.header?.showStoreAddress && template.header?.storeAddress) {
      preview += `<div style="font-size: 10px; margin-bottom: 2px;">${template.header.storeAddress}</div>`;
    }
    if (template.header?.showStorePhone && template.header?.storePhone) {
      preview += `<div style="font-size: 10px; margin-bottom: 2px;">Tel: ${template.header.storePhone}</div>`;
    }
    if (template.header?.showStoreEmail && template.header?.storeEmail) {
      preview += `<div style="font-size: 10px; margin-bottom: 5px;">${template.header.storeEmail}</div>`;
    }

    // Divider
    preview += `<div style="border-bottom: 1px dashed #999; margin: 5px 0;"></div>`;

    // Items
    preview += `<div style="font-size: 9px; margin-bottom: 3px;">Product A</div>`;
    if (template.body?.showQuantity || template.body?.showUnitPrice) {
      preview += `<div style="font-size: 9px; text-align: right;">2 $10.00 $20.00</div>`;
    }

    // Divider
    preview += `<div style="border-bottom: 1px dashed #999; margin: 5px 0;"></div>`;

    // Totals
    if (template.footer?.showTotals) {
      preview += `<div style="display: grid; grid-template-columns: 1fr 50px; gap: 5px; font-size: 10px; font-weight: bold;"><span>TOTAL:</span><span style="text-align: right;">$20.00</span></div>`;
    }

    if (template.footer?.showThankYou && template.footer?.customMessage) {
      preview += `<div style="margin-top: 5px; font-size: 10px; font-weight: bold;">${template.footer.customMessage}</div>`;
    }

    preview += `</div>`;
    return preview;
  }
}
