import { ComponentFixture, TestBed } from "@angular/core/testing";
import { EMPTY } from "rxjs";
import { NumberKeyboardComponent } from "./number-keyboard.component";
import { TranslationService } from "../../services/translation.service";

describe("NumberKeyboardComponent", () => {
  let component: NumberKeyboardComponent;
  let fixture: ComponentFixture<NumberKeyboardComponent>;
  let emitted: any[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumberKeyboardComponent],
      providers: [
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            translationsChanged$: EMPTY,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NumberKeyboardComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.valueChange.subscribe((e: any) => emitted.push(e));
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it('should display "0" initially', () => {
    expect(component.display()).toBe("0");
  });

  describe("appendNumber()", () => {
    it('should replace "0" with the first pressed digit', () => {
      component.appendNumber("5");
      expect(component.display()).toBe("5");
    });

    it("should append to existing number", () => {
      component.appendNumber("1");
      component.appendNumber("2");
      expect(component.display()).toBe("12");
    });

    it("should emit valueChange event", () => {
      component.appendNumber("7");
      expect(emitted.length).toBeGreaterThan(0);
      expect(emitted[emitted.length - 1].value).toBe("7");
    });
  });

  describe("appendDecimal()", () => {
    it("should add decimal point to current display", () => {
      component.appendNumber("5");
      component.appendDecimal();
      expect(component.display()).toBe("5.");
    });

    it("should not add second decimal point", () => {
      component.appendNumber("5");
      component.appendDecimal();
      component.appendDecimal();
      expect(component.display()).toBe("5.");
    });

    it('should start with "0." when display is 0', () => {
      component.appendDecimal();
      expect(component.display()).toBe("0.");
    });
  });

  describe("clear()", () => {
    it('should reset display to "0"', () => {
      component.appendNumber("9");
      component.clear();
      expect(component.display()).toBe("0");
    });

    it('should emit valueChange with "0"', () => {
      component.appendNumber("5");
      emitted = [];
      component.clear();
      expect(emitted[0].value).toBe("0");
    });
  });

  describe("backspace()", () => {
    it("should remove last character", () => {
      component.appendNumber("1");
      component.appendNumber("2");
      component.backspace();
      expect(component.display()).toBe("1");
    });

    it('should reset to "0" when one digit remains', () => {
      component.appendNumber("9");
      component.backspace();
      expect(component.display()).toBe("0");
    });

    it("should emit valueChange", () => {
      component.appendNumber("5");
      emitted = [];
      component.backspace();
      expect(emitted.length).toBeGreaterThan(0);
    });
  });

  describe("onKeyDown()", () => {
    const fakeKey = (key: string) =>
      new KeyboardEvent("keydown", { key, bubbles: true });

    it("should append digit on number key press", () => {
      component.onKeyDown(fakeKey("3"));
      expect(component.display()).toBe("3");
    });

    it('should append decimal on "." key', () => {
      component.onKeyDown(fakeKey("."));
      expect(component.display()).toBe("0.");
    });

    it('should append decimal on "," key', () => {
      component.onKeyDown(fakeKey(","));
      expect(component.display()).toBe("0.");
    });

    it("should backspace on Backspace key", () => {
      component.appendNumber("5");
      component.onKeyDown(fakeKey("Backspace"));
      expect(component.display()).toBe("0");
    });

    it("should clear on Escape key", () => {
      component.appendNumber("9");
      component.onKeyDown(fakeKey("Escape"));
      expect(component.display()).toBe("0");
    });

    it('should clear on "c" key', () => {
      component.appendNumber("4");
      component.onKeyDown(fakeKey("c"));
      expect(component.display()).toBe("0");
    });

    it('should clear on "C" key', () => {
      component.appendNumber("4");
      component.onKeyDown(fakeKey("C"));
      expect(component.display()).toBe("0");
    });

    it("should ignore non-numeric keys", () => {
      component.onKeyDown(fakeKey("a"));
      expect(component.display()).toBe("0");
    });
  });

  describe("blurButton()", () => {
    it("should call blur on the target element", () => {
      const mockEl = { blur: jest.fn() };
      component.blurButton({ target: mockEl } as any);
      expect(mockEl.blur).toHaveBeenCalled();
    });
  });
});
