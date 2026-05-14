import { TestBed } from "@angular/core/testing";
import { CurrencyService } from "./currency.service";

describe("CurrencyService", () => {
  let service: CurrencyService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [CurrencyService] });
    service = TestBed.inject(CurrencyService);
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("initial state", () => {
    it("should default to USD", () => {
      expect(service.getCode()).toBe("USD");
    });

    it("should default to $ symbol", () => {
      expect(service.getSymbol()).toBe("$");
    });
  });

  describe("setCurrency()", () => {
    it("should change the code and symbol for a valid currency", () => {
      service.setCurrency("EUR");
      expect(service.getCode()).toBe("EUR");
      expect(service.getSymbol()).toBe("€");
    });

    it("should persist the currency to localStorage", () => {
      service.setCurrency("MXN");
      expect(localStorage.getItem("currency.code")).toBe("MXN");
    });

    it("should ignore unknown currency codes", () => {
      service.setCurrency("INVALID");
      expect(service.getCode()).toBe("USD"); // unchanged
    });
  });

  describe("format()", () => {
    it("should format a number with the current symbol", () => {
      service.setCurrency("USD");
      expect(service.format(9.99)).toBe("$9.99");
    });

    it("should respect custom decimals", () => {
      service.setCurrency("USD");
      expect(service.format(9.9, 0)).toBe("$10");
    });

    it("should use BRL symbol after switching", () => {
      service.setCurrency("BRL");
      expect(service.format(10)).toBe("R$10.00");
    });
  });

  describe("getCurrencySymbol() signal", () => {
    it("should return a readonly signal that reflects current symbol", () => {
      const symbolSignal = service.getCurrencySymbol();
      service.setCurrency("GBP");
      expect(symbolSignal()).toBe("£");
    });
  });

  describe("getCurrencyCode() signal", () => {
    it("should return a readonly signal that reflects current code", () => {
      const codeSignal = service.getCurrencyCode();
      service.setCurrency("JPY");
      expect(codeSignal()).toBe("JPY");
    });
  });

  describe("loadFromStorage()", () => {
    it("should restore previously persisted currency on creation", () => {
      localStorage.setItem("currency.code", "PEN");
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [CurrencyService] });
      const fresh = TestBed.inject(CurrencyService);
      expect(fresh.getCode()).toBe("PEN");
      expect(fresh.getSymbol()).toBe("S/");
    });
  });
});
