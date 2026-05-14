import { TestBed } from "@angular/core/testing";
import { EscPosService } from "./esc-pos.service";

describe("EscPosService", () => {
  let service: EscPosService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [EscPosService] });
    service = TestBed.inject(EscPosService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  // ─── Text formatting ───────────────────────────────────────────────────

  describe("formatLine()", () => {
    it("should pad short text to the given width", () => {
      const result = service.formatLine("Hello", 20);
      expect(result).toHaveLength(20);
      expect(result.startsWith("Hello")).toBe(true);
    });

    it("should truncate text that exceeds width", () => {
      const result = service.formatLine("Hello World", 5);
      expect(result).toHaveLength(5);
      expect(result).toBe("Hello");
    });
  });

  describe("centerText()", () => {
    it("should center text within given width", () => {
      const result = service.centerText("HI", 10);
      expect(result).toHaveLength(10);
      expect(result.trim()).toBe("HI");
    });
  });

  describe("formatColumns()", () => {
    it("should format two columns filling the given total width", () => {
      const result = service.formatColumns(["Item", "$5.00"], [20, 8], 28);
      expect(result).toHaveLength(28);
      expect(result.startsWith("Item")).toBe(true);
      expect(result.endsWith("$5.00")).toBe(true);
    });
  });

  describe("separator()", () => {
    it("should return a string of the given char repeated to width", () => {
      const result = service.separator(10, "-");
      expect(result).toBe("----------");
    });

    it("should default to dashes", () => {
      const result = service.separator(5);
      expect(result).toBe("-----");
    });
  });

  // ─── ESC/POS commands ─────────────────────────────────────────────────

  describe("initPrinter()", () => {
    it("should return ESC @ command", () => {
      const cmd = service.initPrinter();
      expect(cmd).toContain("\x1B\x40");
    });
  });

  describe("cutPaper()", () => {
    it("should return full cut command", () => {
      const cmd = service.cutPaper(true);
      expect(cmd).toContain("\x1D\x56\x00");
    });

    it("should return partial cut command", () => {
      const cmd = service.cutPaper(false);
      expect(cmd).toContain("\x1D\x56\x01");
    });
  });

  describe("setAlignment()", () => {
    it("should return left-align command", () => {
      const cmd = service.setAlignment("left");
      expect(cmd).toContain("\x1B\x61\x00");
    });

    it("should return center-align command", () => {
      const cmd = service.setAlignment("center");
      expect(cmd).toContain("\x1B\x61\x01");
    });

    it("should return right-align command", () => {
      const cmd = service.setAlignment("right");
      expect(cmd).toContain("\x1B\x61\x02");
    });
  });

  describe("setBold()", () => {
    it("should turn bold on", () => {
      const cmd = service.setBold(true);
      expect(cmd).toBe("\x1B\x45\x01");
    });

    it("should turn bold off", () => {
      const cmd = service.setBold(false);
      expect(cmd).toBe("\x1B\x45\x00");
    });
  });

  // ─── Full receipt generation ──────────────────────────────────────────

  describe("generateReceiptText()", () => {
    const mockSale = {
      saleNumber: 42,
      items: [
        { productName: "Bread", quantity: 2, unitPrice: 1.5, subtotal: 3.0 },
        { productName: "Milk", quantity: 1, unitPrice: 2.0, subtotal: 2.0 },
      ],
      subtotal: 5.0,
      discount: 0,
      total: 5.0,
      paymentMethod: "cash",
      cashier: { username: "cashier1" },
      createdAt: new Date("2024-01-15"),
    };

    it("should include the sale number", () => {
      const text = service.generateReceiptText(mockSale as any, {
        storeName: "My Store",
        charsPerLine: 32,
      });
      expect(text).toContain("42");
    });

    it("should include store name when configured", () => {
      const text = service.generateReceiptText(mockSale as any, {
        storeName: "My Store",
        charsPerLine: 32,
      });
      expect(text).toContain("My Store");
    });

    it("should include each item name", () => {
      const text = service.generateReceiptText(mockSale as any, {
        storeName: "Store",
        charsPerLine: 32,
      });
      expect(text).toContain("Bread");
      expect(text).toContain("Milk");
    });

    it("should include total amount", () => {
      const text = service.generateReceiptText(mockSale as any, {
        storeName: "Store",
        charsPerLine: 32,
      });
      expect(text).toContain("5.00");
    });

    it("should include ESC/POS init and cut commands", () => {
      const text = service.generateReceiptText(mockSale as any, {
        storeName: "Store",
        charsPerLine: 32,
      });
      expect(text).toContain("\x1B\x40"); // init
      expect(text).toContain("\x1D\x56"); // cut
    });
  });

  describe("generateTestPage()", () => {
    it("should include test header text", () => {
      const text = service.generateTestPage({
        storeName: "Test Store",
        charsPerLine: 32,
      });
      expect(text).toContain("TEST");
    });

    it("should have proper ESC/POS structure", () => {
      const text = service.generateTestPage({
        storeName: "Store",
        charsPerLine: 32,
      });
      expect(text).toContain("\x1B\x40"); // init
    });
  });
});
