import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { of, throwError } from "rxjs";
import { EMPTY } from "rxjs";
import { TemplatesComponent } from "./templates.component";
import { PrintTemplateService } from "../../services/print-template.service";
import { ToastService } from "../../services/toast.service";
import { ReceiptGeneratorService } from "../../services/receipt-generator.service";
import { TranslationService } from "../../services/translation.service";

const mockTemplate = {
  _id: "tpl1",
  name: "Standard Receipt",
  description: "Default receipt",
  templateType: "receipt",
  paperSize: "58mm",
  isDefault: false,
  header: {
    storeName: "Test Store",
    showStoreName: true,
    showStoreAddress: true,
    showStorePhone: true,
    showStoreEmail: true,
    showLogo: false,
  },
  body: {
    showQuantity: true,
    showUnitPrice: true,
    showSubtotal: true,
    fontSize: "small",
  },
  footer: {
    showTotals: true,
    showPaymentMethod: true,
    showCashier: true,
    showDateTime: true,
    showThankYou: true,
    customMessage: "Thanks!",
  },
  styles: { textAlign: "center" },
};

describe("TemplatesComponent", () => {
  let component: TemplatesComponent;
  let fixture: ComponentFixture<TemplatesComponent>;
  let printTemplateServiceSpy: any;
  let toastSpy: any;

  beforeEach(async () => {
    printTemplateServiceSpy = {
      getTemplates: jest.fn().mockReturnValue(of([mockTemplate])),
      createTemplate: jest.fn().mockReturnValue(of(mockTemplate)),
      updateTemplate: jest
        .fn()
        .mockReturnValue(of({ ...mockTemplate, name: "Updated" })),
      deleteTemplate: jest.fn().mockReturnValue(of({})),
    };

    toastSpy = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [TemplatesComponent],
      providers: [
        { provide: PrintTemplateService, useValue: printTemplateServiceSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: ReceiptGeneratorService,
          useValue: {
            generateHtmlReceipt: jest
              .fn()
              .mockReturnValue("<div>Preview</div>"),
            generateTextReceipt: jest.fn().mockReturnValue("Text preview"),
          },
        },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            translationsChanged$: EMPTY,
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplatesComponent);
    component = fixture.componentInstance;
    // Trigger ngOnInit without rendering to avoid template complexity
    component.ngOnInit();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("loadTemplates()", () => {
    it("should load templates on init", () => {
      expect(printTemplateServiceSpy.getTemplates).toHaveBeenCalled();
      expect(component.templates()).toHaveLength(1);
    });

    it("should set isLoading to false after load", () => {
      expect(component.isLoading()).toBe(false);
    });

    it("should handle error on load", () => {
      printTemplateServiceSpy.getTemplates.mockReturnValue(
        throwError(() => new Error("API error"))
      );
      component.loadTemplates();
      expect(component.isLoading()).toBe(false);
    });
  });

  describe("selectTemplate()", () => {
    it("should set selectedTemplate and show form", () => {
      component.selectTemplate(mockTemplate as any);
      expect(component.selectedTemplate()).toEqual(mockTemplate);
      expect(component.showForm()).toBe(true);
      expect(component.isEditing()).toBe(false);
    });

    it("should populate form with template values", () => {
      component.selectTemplate(mockTemplate as any);
      expect(component.templateForm.get("name")?.value).toBe(
        "Standard Receipt"
      );
    });
  });

  describe("createNew()", () => {
    it("should reset form and show empty form", () => {
      component.createNew();
      expect(component.selectedTemplate()).toBeNull();
      expect(component.showForm()).toBe(true);
      expect(component.isEditing()).toBe(false);
    });
  });

  describe("editTemplate()", () => {
    it("should set isEditing to true", () => {
      component.editTemplate();
      expect(component.isEditing()).toBe(true);
    });
  });

  describe("cancelEdit()", () => {
    it("should hide form and reset edit state", () => {
      component.showForm.set(true);
      component.isEditing.set(true);
      component.cancelEdit();
      expect(component.showForm()).toBe(false);
      expect(component.isEditing()).toBe(false);
    });
  });

  describe("saveTemplate()", () => {
    beforeEach(() => {
      component.templateForm.patchValue({
        name: "New Template",
        templateType: "receipt",
        paperSize: "58mm",
      });
    });

    it("should not save when form is invalid", () => {
      component.templateForm.get("name")?.setValue("");
      component.saveTemplate();
      expect(printTemplateServiceSpy.createTemplate).not.toHaveBeenCalled();
      expect(printTemplateServiceSpy.updateTemplate).not.toHaveBeenCalled();
    });

    it("should call createTemplate when no selectedTemplate", () => {
      component.selectedTemplate.set(null);
      component.saveTemplate();
      expect(printTemplateServiceSpy.createTemplate).toHaveBeenCalled();
    });

    it("should call updateTemplate when selectedTemplate is set", () => {
      component.selectedTemplate.set(mockTemplate as any);
      component.saveTemplate();
      expect(printTemplateServiceSpy.updateTemplate).toHaveBeenCalledWith(
        "tpl1",
        expect.any(Object)
      );
    });

    it("should show error toast when createTemplate fails", () => {
      printTemplateServiceSpy.createTemplate.mockReturnValue(
        throwError(() => new Error("Fail"))
      );
      component.selectedTemplate.set(null);
      component.saveTemplate();
      expect(toastSpy.show).toHaveBeenCalled();
    });

    it("should show error toast when updateTemplate fails", () => {
      printTemplateServiceSpy.updateTemplate.mockReturnValue(
        throwError(() => new Error("Fail"))
      );
      component.selectedTemplate.set(mockTemplate as any);
      component.saveTemplate();
      expect(toastSpy.show).toHaveBeenCalled();
    });
  });

  describe("setAsDefault()", () => {
    it("should call updateTemplate with isDefault: true", () => {
      component.setAsDefault(mockTemplate as any);
      expect(printTemplateServiceSpy.updateTemplate).toHaveBeenCalledWith(
        "tpl1",
        expect.objectContaining({ isDefault: true })
      );
    });

    it("should not call updateTemplate when template has no id", () => {
      component.setAsDefault({ name: "No ID" } as any);
      expect(printTemplateServiceSpy.updateTemplate).not.toHaveBeenCalled();
    });
  });

  describe("deleteTemplate()", () => {
    it("should skip delete if no selectedTemplate", () => {
      component.selectedTemplate.set(null);
      component.deleteTemplate();
      expect(printTemplateServiceSpy.deleteTemplate).not.toHaveBeenCalled();
    });

    it("should call deleteTemplate when confirmed", () => {
      component.selectedTemplate.set(mockTemplate as any);
      jest.spyOn(window, "confirm").mockReturnValue(true);
      component.deleteTemplate();
      expect(printTemplateServiceSpy.deleteTemplate).toHaveBeenCalledWith(
        "tpl1"
      );
    });

    it("should not delete when confirm returns false", () => {
      component.selectedTemplate.set(mockTemplate as any);
      jest.spyOn(window, "confirm").mockReturnValue(false);
      component.deleteTemplate();
      expect(printTemplateServiceSpy.deleteTemplate).not.toHaveBeenCalled();
    });
  });

  describe("getFieldError()", () => {
    it("should return required error message", () => {
      component.templateForm.get("name")?.setValue("");
      component.templateForm.get("name")?.markAsTouched();
      const err = component.getFieldError("name");
      expect(err).toContain("required");
    });

    it("should return empty string when no error", () => {
      component.templateForm.get("name")?.setValue("Valid Name");
      expect(component.getFieldError("name")).toBe("");
    });

    it("returns minlength error for short name", () => {
      component.templateForm.get("name")?.setValue("ab");
      component.templateForm.get("name")?.markAsTouched();
      const err = component.getFieldError("name");
      expect(err).toContain("least");
    });
  });

  describe("setAsDefault() error handling", () => {
    it("shows error toast and resets loading on failure", () => {
      printTemplateServiceSpy.updateTemplate.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.setAsDefault(mockTemplate as any);
      expect(toastSpy.show).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });
  });

  describe("deleteTemplate() error handling", () => {
    it("shows error toast on delete failure", () => {
      printTemplateServiceSpy.deleteTemplate.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.selectedTemplate.set(mockTemplate as any);
      jest.spyOn(window, "confirm").mockReturnValue(true);
      component.deleteTemplate();
      expect(toastSpy.show).toHaveBeenCalled();
    });
  });

  describe("toggleFieldVisibility()", () => {
    it("toggles a boolean form field", () => {
      component.templateForm.patchValue({ showLogo: false });
      component.toggleFieldVisibility("showLogo");
      expect(component.templateForm.get("showLogo")?.value).toBe(true);
      component.toggleFieldVisibility("showLogo");
      expect(component.templateForm.get("showLogo")?.value).toBe(false);
    });
  });

  describe("isFieldVisible()", () => {
    it("returns the current boolean value of a form field", () => {
      component.templateForm.patchValue({ showLogo: true });
      expect(component.isFieldVisible("showLogo")).toBe(true);
      component.templateForm.patchValue({ showLogo: false });
      expect(component.isFieldVisible("showLogo")).toBe(false);
    });
  });

  describe("generateTemplatePreview()", () => {
    it("returns an HTML string with store name", () => {
      const preview = component.generateTemplatePreview(mockTemplate as any);
      expect(typeof preview).toBe("string");
      expect(preview).toContain("Test Store");
    });

    it("handles template with all show flags enabled", () => {
      const fullTemplate = {
        ...mockTemplate,
        header: {
          ...mockTemplate.header,
          showLogo: true,
          storeAddress: "123 Main St",
          showStoreAddress: true,
          storePhone: "555-555-5555",
          showStorePhone: true,
          storeEmail: "test@test.com",
          showStoreEmail: true,
        },
        footer: {
          ...mockTemplate.footer,
          showTotals: true,
          showThankYou: true,
          customMessage: "Thank you!",
        },
        body: {
          ...mockTemplate.body,
          showQuantity: true,
          showUnitPrice: true,
        },
      };
      const preview = component.generateTemplatePreview(fullTemplate as any);
      expect(preview).toContain("TOTAL");
    });
  });

  describe("getSafePreview()", () => {
    it("returns a SafeHtml value", () => {
      component.previewHtml.set("<p>Test</p>");
      const safe = component.getSafePreview();
      expect(safe).toBeDefined();
    });
  });

  describe("generatePreview()", () => {
    it("sets previewHtml when generateReceipt resolves", async () => {
      const receiptSvc = TestBed.inject(ReceiptGeneratorService) as any;
      receiptSvc.generateReceipt = jest
        .fn()
        .mockResolvedValue("<b>Receipt</b>");
      await component.generatePreview();
      expect(component.previewHtml()).toBe("<b>Receipt</b>");
    });

    it("falls back to generateFallbackPreview on error", async () => {
      const receiptSvc = TestBed.inject(ReceiptGeneratorService) as any;
      receiptSvc.generateReceipt = jest
        .fn()
        .mockRejectedValue(new Error("fail"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      await component.generatePreview();
      // fallback sets some html
      expect(typeof component.previewHtml()).toBe("string");
      consoleSpy.mockRestore();
    });

    it("generates text preview (plain text mode) on fallback error", async () => {
      const receiptSvc = TestBed.inject(ReceiptGeneratorService) as any;
      receiptSvc.generateReceipt = jest
        .fn()
        .mockRejectedValue(new Error("fail"));
      component.previewMode.set("text");
      component.templateForm.patchValue({
        storeName: "My Store",
        showStoreName: true,
        showLogo: true,
        showStoreAddress: true,
        storeAddress: "123 Street",
        showStorePhone: true,
        storePhone: "555-1234",
        showStoreEmail: true,
        storeEmail: "store@example.com",
        showQuantity: true,
        showSubtotal: true,
        showTax: true,
        showTotals: true,
        showPaymentMethod: true,
        showCashier: true,
        showDateTime: true,
        showThankYou: true,
        customMessage: "Thanks!",
        paperSize: "80mm",
      });
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      await component.generatePreview();
      expect(component.previewHtml()).toContain("code");
      consoleSpy.mockRestore();
    });
  });

  describe("generateStyledPreview() private", () => {
    it("renders full styled preview with all flags enabled", () => {
      const formValue = {
        paperSize: "80mm",
        fontSize: "medium",
        textAlign: "left",
        showLogo: true,
        storeName: "Test Store",
        showStoreName: true,
        storeNameSize: "medium",
        storeNameFont: "monospace",
        storeNameBold: true,
        storeAddress: "123 Main St",
        showStoreAddress: true,
        storeAddressSize: "small",
        storeAddressFont: "monospace",
        storeAddressBold: false,
        storePhone: "555-1234",
        showStorePhone: true,
        storePhoneSize: "small",
        storePhoneFont: "monospace",
        storePhoneBold: false,
        storeEmail: "store@test.com",
        showStoreEmail: true,
        storeEmailSize: "small",
        storeEmailFont: "monospace",
        storeEmailBold: false,
        productSize: "small",
        productFont: "monospace",
        productBold: false,
        showQuantity: true,
        showUnitPrice: true,
        showSubtotal: true,
        showTax: true,
        showTotals: true,
        totalSize: "large",
        totalFont: "monospace",
        totalBold: true,
        showPaymentMethod: true,
        showCashier: true,
        showDateTime: true,
        showThankYou: true,
        customMessage: "Thank you!",
        footerSize: "small",
        footerFont: "monospace",
        footerBold: false,
      };
      const result = (component as any).generateStyledPreview(formValue);
      expect(result).toContain("Test Store");
      expect(result).toContain("TOTAL:");
      expect(result).toContain("Cash");
      expect(result).toContain("Thank you!");
    });

    it("renders styled preview for A4 paper size", () => {
      const formValue = {
        paperSize: "A4",
        fontSize: "large",
        textAlign: "center",
        showLogo: false,
        showStoreName: false,
        showStoreAddress: false,
        showStorePhone: false,
        showStoreEmail: false,
        productSize: "small",
        productFont: "monospace",
        productBold: true,
        showQuantity: false,
        showUnitPrice: false,
        showSubtotal: false,
        showTax: false,
        showTotals: false,
        showPaymentMethod: false,
        showCashier: false,
        showDateTime: false,
        showThankYou: false,
        totalSize: "small",
        totalFont: "monospace",
        totalBold: false,
        footerSize: "small",
        footerFont: "monospace",
        footerBold: false,
      };
      const result = (component as any).generateStyledPreview(formValue);
      expect(typeof result).toBe("string");
      expect(result).toContain("800px");
    });
  });

  describe("generatePlainTextPreview() private", () => {
    it("renders text preview with all fields", () => {
      const formValue = {
        paperSize: "58mm",
        showLogo: true,
        storeName: "TextStore",
        showStoreName: true,
        showStoreAddress: true,
        storeAddress: "456 Elm",
        showStorePhone: true,
        storePhone: "555-9876",
        showStoreEmail: true,
        storeEmail: "txt@store.com",
        showQuantity: true,
        showUnitPrice: true,
        showSubtotal: true,
        showTax: true,
        showTotals: true,
        showPaymentMethod: true,
        showCashier: true,
        showDateTime: true,
        showThankYou: true,
        customMessage: "Come again!",
      };
      const result = (component as any).generatePlainTextPreview(formValue);
      expect(result).toContain("TEXTSTORE");
      expect(result).toContain("TOTAL:");
    });
  });
});
