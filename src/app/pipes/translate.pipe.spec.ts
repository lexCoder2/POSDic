import { TestBed } from "@angular/core/testing";
import { TranslatePipe } from "./translate.pipe";
import { TranslationService } from "../services/translation.service";
import { ChangeDetectorRef } from "@angular/core";

const makeTranslationService = (
  translateFn: (key: string, params?: any) => string
) =>
  ({
    translate: jest.fn(translateFn),
    translationsChanged$: { subscribe: jest.fn() },
  }) as unknown as TranslationService;

describe("TranslatePipe", () => {
  let pipe: TranslatePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TranslationService,
          useValue: makeTranslationService((key, params) => {
            const map: Record<string, string> = {
              "POS.TITLE": "Point of Sale",
              "POS.SEARCH": "Search...",
            };
            return map[key] ?? key;
          }),
        },
        { provide: ChangeDetectorRef, useValue: { markForCheck: jest.fn() } },
      ],
    });

    pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
  });

  it("should create the pipe", () => {
    expect(pipe).toBeTruthy();
  });

  it("should translate a known key", () => {
    const translationService = TestBed.inject(TranslationService);
    (translationService.translate as jest.Mock).mockReturnValue(
      "Point of Sale"
    );

    expect(pipe.transform("POS.TITLE")).toBe("Point of Sale");
  });

  it("should return the key itself when translation is not found", () => {
    const translationService = TestBed.inject(TranslationService);
    (translationService.translate as jest.Mock).mockReturnValue("MISSING.KEY");

    expect(pipe.transform("MISSING.KEY")).toBe("MISSING.KEY");
  });

  it("should pass params to translation service", () => {
    const translationService = TestBed.inject(TranslationService);
    (translationService.translate as jest.Mock).mockReturnValue(
      "Hello, World!"
    );

    const result = pipe.transform("GREETING", { name: "World" });

    expect(translationService.translate).toHaveBeenCalledWith("GREETING", {
      name: "World",
    });
    expect(result).toBe("Hello, World!");
  });
});
