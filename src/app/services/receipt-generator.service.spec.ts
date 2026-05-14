import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { EMPTY, of } from "rxjs";
import { ReceiptGeneratorService } from "./receipt-generator.service";
import { TranslationService } from "./translation.service";
import { QzTrayService } from "./qz-tray.service";

describe("ReceiptGeneratorService", () => {
  let service: ReceiptGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ReceiptGeneratorService,
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            current: "en",
            translationsChanged$: EMPTY,
          },
        },
        {
          provide: QzTrayService,
          useValue: {
            getOptimalPaperWidth: jest.fn().mockResolvedValue(58),
            getOptimalDpi: jest.fn().mockResolvedValue(203),
            isConnected: jest.fn().mockReturnValue(false),
          },
        },
      ],
    });
    service = TestBed.inject(ReceiptGeneratorService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  // ──────────────────────────────────────────────
  // getPaperConfig()
  // ──────────────────────────────────────────────

  describe("getPaperConfig()", () => {
    it('should return 58mm config for "58mm"', () => {
      const config = service.getPaperConfig("58mm");
      expect(config.widthMm).toBe(58);
    });

    it('should return 80mm config for "80mm"', () => {
      const config = service.getPaperConfig("80mm");
      expect(config.widthMm).toBe(80);
    });

    it("should fall back to 58mm for unknown size", () => {
      const config = service.getPaperConfig("unknown");
      expect(config.widthMm).toBe(58);
    });
  });

  // ──────────────────────────────────────────────
  // createConfig()
  // ──────────────────────────────────────────────

  describe("createConfig()", () => {
    it("should return a config object with paper property", () => {
      const config = service.createConfig({});
      expect(config.paper).toBeDefined();
    });

    it("should apply overrides", () => {
      const config = service.createConfig({
        plainTextMode: true,
        charsPerLine: 32,
      });
      expect(config.plainTextMode).toBe(true);
      expect(config.charsPerLine).toBe(32);
    });
  });

  // ──────────────────────────────────────────────
  // shouldShowPreview()
  // ──────────────────────────────────────────────

  describe("shouldShowPreview()", () => {
    it("should return false when localStorage key not set", () => {
      localStorage.removeItem("printer.showPreview");
      expect(service.shouldShowPreview()).toBe(false);
    });

    it('should return true when localStorage key is "true"', () => {
      localStorage.setItem("printer.showPreview", "true");
      expect(service.shouldShowPreview()).toBe(true);
      localStorage.removeItem("printer.showPreview");
    });
  });

  // ──────────────────────────────────────────────
  // Private helper methods (accessed via `any` cast)
  // ──────────────────────────────────────────────

  describe("getFallbackTemplate() [private]", () => {
    it("should return a default template with required fields", () => {
      const tpl = (service as any).getFallbackTemplate();
      expect(tpl.name).toBe("Default");
      expect(tpl.paperSize).toBe("58mm");
      expect(tpl.header).toBeDefined();
      expect(tpl.body).toBeDefined();
      expect(tpl.footer).toBeDefined();
    });
  });

  describe("textSeparator() [private]", () => {
    it("should repeat the char N times", () => {
      const result = (service as any).textSeparator(5, "-");
      expect(result).toBe("-----");
    });

    it('should default to "-" char', () => {
      const result = (service as any).textSeparator(3);
      expect(result).toBe("---");
    });
  });

  describe("centerText() [private]", () => {
    it("should center text within a given width", () => {
      const result = (service as any).centerText("AB", 6);
      // 2 chars in 6 → 2 leading spaces: "  AB"
      expect(result.trim()).toBe("AB");
      expect(result.length).toBe(4); // 2 spaces + 2 chars
    });

    it("should truncate text longer than width", () => {
      const result = (service as any).centerText("ABCDEFG", 4);
      expect(result.length).toBe(4);
    });
  });

  describe("formatLine() [private]", () => {
    it("should right-align the right text to fit width", () => {
      const result = (service as any).formatLine("ITEM", "$5.00", 24);
      expect(result.startsWith("ITEM")).toBe(true);
      expect(result.endsWith("$5.00")).toBe(true);
      expect(result.length).toBe(24);
    });

    it("should handle overflow by truncating left text", () => {
      const result = (service as any).formatLine("LONG_NAME_HERE", "$5", 10);
      expect(result.length).toBe(10);
    });
  });

  describe("buildInlineStyle() [private]", () => {
    it("should build inline CSS string from style object", () => {
      const result = (service as any).buildInlineStyle({
        fontSize: "12px",
        fontWeight: "bold",
        color: "#000",
      });
      expect(result).toContain("font-size: 12px");
      expect(result).toContain("font-weight: bold");
      expect(result).toContain("color: #000");
    });

    it("should return empty string for empty style object", () => {
      const result = (service as any).buildInlineStyle({});
      expect(result).toBe("");
    });
  });

  describe("escapeHtml() [private]", () => {
    it('should escape & < > " and apostrophe', () => {
      const result = (service as any).escapeHtml(
        'Tom & <Jerry> says "hi" & it\'s fine'
      );
      expect(result).toContain("&amp;");
      expect(result).toContain("&lt;");
      expect(result).toContain("&gt;");
      expect(result).toContain("&quot;");
      expect(result).toContain("&#039;");
    });

    it("should return empty string for falsy input", () => {
      expect((service as any).escapeHtml("")).toBe("");
      expect((service as any).escapeHtml(null)).toBe("");
      expect((service as any).escapeHtml(undefined)).toBe("");
    });
  });

  describe("getItemName() [private]", () => {
    it("should prefer productName", () => {
      const item = { productName: "Coffee", productCode: "COF01" } as any;
      expect((service as any).getItemName(item)).toBe("Coffee");
    });

    it("should use product.name when productName is absent", () => {
      const item = { product: { name: "Tea" }, productCode: "TEA01" } as any;
      expect((service as any).getItemName(item)).toBe("Tea");
    });

    it("should fall back to productCode when product is a string id", () => {
      const item = { product: "product-id-123", productCode: "SKU123" } as any;
      expect((service as any).getItemName(item)).toBe("SKU123");
    });

    it('should return "Unknown Product" as last resort when product is object with no name', () => {
      const item = { product: {} } as any;
      expect((service as any).getItemName(item)).toBe("Unknown Product");
    });
  });

  describe("formatQuantity() [private]", () => {
    it("should return integer quantity as string", () => {
      expect((service as any).formatQuantity({ quantity: 3 })).toBe("3");
    });

    it("should return weight format for decimal quantities", () => {
      const result = (service as any).formatQuantity({ quantity: 1.5 });
      expect(result).toMatch(/1\.500kg/);
    });
  });

  describe("getCashierName() [private]", () => {
    it("should return string cashier as-is", () => {
      expect((service as any).getCashierName("John Doe")).toBe("John Doe");
    });

    it("should return fullName from User object", () => {
      expect((service as any).getCashierName({ fullName: "Jane Doe" })).toBe(
        "Jane Doe"
      );
    });

    it("should fall back to username", () => {
      expect((service as any).getCashierName({ username: "jdoe" })).toBe(
        "jdoe"
      );
    });

    it('should return "Unknown" for null', () => {
      expect((service as any).getCashierName(null)).toBe("Unknown");
    });
  });

  describe("separator() [private]", () => {
    it("should return an HR element string", () => {
      const result = (service as any).separator();
      expect(result).toContain("<hr");
    });
  });

  // ──────────────────────────────────────────────
  // getDefaultTemplate()
  // ──────────────────────────────────────────────

  describe("getDefaultTemplate()", () => {
    it("should return fallback template on HTTP error", async () => {
      const httpTestingController = TestBed.inject(HttpTestingController);
      const promise = service.getDefaultTemplate();
      const req = httpTestingController.expectOne((r) =>
        r.url.includes("templates")
      );
      req.flush(null, { status: 500, statusText: "Server Error" });
      const tpl = await promise;
      expect(tpl.name).toBe("Default");
    });
  });
});
