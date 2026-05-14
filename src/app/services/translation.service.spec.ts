import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { TranslationService } from "./translation.service";

describe("TranslationService", () => {
  let service: TranslationService;
  let httpMock: HttpTestingController;

  const enTranslations = {
    POS: {
      TITLE: "Point of Sale",
      SEARCH_PLACEHOLDER: "Search products...",
      WELCOME: "Hello, {{ name }}!",
    },
    LOGIN: {
      BUTTON: "Login",
    },
  };

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TranslationService],
    });

    service = TestBed.inject(TranslationService);
    httpMock = TestBed.inject(HttpTestingController);

    // Flush initial translation load
    const req = httpMock.expectOne("assets/i18n/en.json");
    req.flush(enTranslations);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe("translate()", () => {
    it("should resolve a top-level key", () => {
      expect(service.translate("LOGIN.BUTTON")).toBe("Login");
    });

    it("should resolve a nested dot-notation key", () => {
      expect(service.translate("POS.TITLE")).toBe("Point of Sale");
    });

    it("should return the original key when translation is not found", () => {
      expect(service.translate("MISSING.KEY")).toBe("MISSING.KEY");
    });

    it("should return empty string for empty key input", () => {
      expect(service.translate("")).toBe("");
    });

    it("should replace {{param}} placeholders with provided params", () => {
      expect(service.translate("POS.WELCOME", { name: "World" })).toBe(
        "Hello, World!"
      );
    });

    it("should handle multiple param replacements", () => {
      // Inject a translation with multiple params
      (service as any).translations = {
        GREETING: "Dear {{ firstName }} {{ lastName }}",
      };

      const result = service.translate("GREETING", {
        firstName: "John",
        lastName: "Doe",
      });
      expect(result).toBe("Dear John Doe");
    });
  });

  describe("setLanguage()", () => {
    it("should update localStorage with the new language", () => {
      service.setLanguage("es");

      expect(localStorage.getItem("app_language")).toBe("es");

      const req = httpMock.expectOne("assets/i18n/es.json");
      req.flush({});
    });

    it("should load translations for the new language", () => {
      service.setLanguage("es");

      const req = httpMock.expectOne("assets/i18n/es.json");
      expect(req.request.url).toContain("es.json");
      req.flush({ POS: { TITLE: "Punto de Venta" } });
    });

    it("should update the current language immediately", () => {
      service.setLanguage("es");
      expect(service.current).toBe("es");

      httpMock.expectOne("assets/i18n/es.json").flush({});
    });

    it("should not update language for empty string input", () => {
      const before = service.current;
      service.setLanguage("");
      expect(service.current).toBe(before);
    });
  });
});
