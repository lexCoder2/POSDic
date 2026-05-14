import { ComponentFixture, TestBed } from "@angular/core/testing";
import { EMPTY, of, throwError } from "rxjs";
import { AiCategorizerButtonComponent } from "./ai-categorizer-button.component";
import { AiCategorizerService } from "../../services/ai-categorizer.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";

describe("AiCategorizerButtonComponent", () => {
  let component: AiCategorizerButtonComponent;
  let fixture: ComponentFixture<AiCategorizerButtonComponent>;
  let aiSpy: any;
  let toastSpy: any;

  beforeEach(async () => {
    aiSpy = {
      categorize: jest
        .fn()
        .mockReturnValue(
          of({ category: "Dairy", confidence: 0.6, source: "heuristic" })
        ),
    };
    toastSpy = { show: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [AiCategorizerButtonComponent],
      providers: [
        { provide: AiCategorizerService, useValue: aiSpy },
        { provide: ToastService, useValue: toastSpy },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            translationsChanged$: EMPTY,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AiCategorizerButtonComponent);
    component = fixture.componentInstance;
    component.productName = "Whole Milk";
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should be created", () => {
    expect(component).toBeTruthy();
  });

  it("should expose isLoading signal initially false", () => {
    expect(component.isLoading()).toBe(false);
  });

  it("should expose result signal initially null", () => {
    expect(component.result()).toBeNull();
  });

  describe("classify()", () => {
    it("should call aiService.categorize with productName", () => {
      component.productName = "Whole Milk";
      component.productBrand = "Lala";
      component.classify();
      expect(aiSpy.categorize).toHaveBeenCalledWith(
        "Whole Milk",
        "Lala",
        undefined
      );
    });

    it("should set result signal after successful classification", async () => {
      component.classify();
      await fixture.whenStable();
      expect(component.result()).toMatchObject({ category: "Dairy" });
    });

    it("should set isLoading to false after completion", async () => {
      component.classify();
      await fixture.whenStable();
      expect(component.isLoading()).toBe(false);
    });

    it("should emit categorySelected with the category", () => {
      const emitted: string[] = [];
      component.categorySelected.subscribe((c) => emitted.push(c));
      component.classify();
      expect(emitted).toContain("Dairy");
    });

    it("should show error toast on failure", () => {
      aiSpy.categorize.mockReturnValue(throwError(() => new Error("fail")));
      component.classify();
      expect(toastSpy.show).toHaveBeenCalledWith(expect.any(String), "error");
    });

    it("should not call service if productName is empty", () => {
      component.productName = "";
      component.classify();
      expect(aiSpy.categorize).not.toHaveBeenCalled();
    });
  });
});
