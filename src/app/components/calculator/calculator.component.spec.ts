import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Subject } from "rxjs";
import {
  CalculatorComponent,
  CalculatorAddEvent,
  CalculatorMultiplyConfirmEvent,
} from "./calculator.component";
import { TranslationService } from "../../services/translation.service";

const translationsChanged$ = new Subject<void>();
const mockTranslationService = {
  translate: (key: string) => key,
  translationsChanged$,
  currentLanguage: () => "en",
};

describe("CalculatorComponent", () => {
  let component: CalculatorComponent;
  let fixture: ComponentFixture<CalculatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalculatorComponent],
      providers: [
        { provide: TranslationService, useValue: mockTranslationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalculatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("display initial state", () => {
    it('should display "0" initially', () => {
      expect(component.display()).toBe("0");
    });
  });

  describe("appendNumber()", () => {
    it('should replace "0" with the first digit pressed', () => {
      component.appendNumber("5");
      expect(component.display()).toBe("5");
    });

    it("should append digits to an existing non-zero display", () => {
      component.appendNumber("1");
      component.appendNumber("2");
      component.appendNumber("3");
      expect(component.display()).toBe("123");
    });
  });

  describe("appendDecimal()", () => {
    it("should add decimal point to the display", () => {
      component.appendNumber("5");
      component.appendDecimal();
      expect(component.display()).toBe("5.");
    });

    it("should not add a second decimal point", () => {
      component.appendNumber("5");
      component.appendDecimal();
      component.appendDecimal();
      expect(component.display()).toBe("5.");
    });

    it('should show "0." when decimal pressed on empty/zero display', () => {
      component.appendDecimal();
      expect(component.display()).toBe("0.");
    });
  });

  describe("backspace()", () => {
    it("should remove the last character from the display", () => {
      component.appendNumber("1");
      component.appendNumber("2");
      component.appendNumber("3");
      component.backspace();
      expect(component.display()).toBe("12");
    });

    it('should reset to "0" when only one character remains', () => {
      component.appendNumber("5");
      component.backspace();
      expect(component.display()).toBe("0");
    });
  });

  describe("clear()", () => {
    it('should reset display to "0"', () => {
      component.appendNumber("9");
      component.appendNumber("9");
      component.clear();
      expect(component.display()).toBe("0");
    });
  });

  describe("onAddItem()", () => {
    it("should emit addItem with the current display value", () => {
      let emitted: CalculatorAddEvent | null = null;
      component.addItem.subscribe((e) => (emitted = e));

      component.appendNumber("2");
      component.appendNumber("5");
      component.onAddItem();

      expect(emitted).not.toBeNull();
      expect(emitted!.value).toBe(25);
    });

    it('should reset display to "0" after emitting', () => {
      component.addItem.subscribe(() => {});
      component.appendNumber("5");
      component.onAddItem();
      expect(component.display()).toBe("0");
    });

    it('should not emit when display is "0"', () => {
      let emitted = false;
      component.addItem.subscribe(() => (emitted = true));

      component.onAddItem();
      expect(emitted).toBe(false);
    });
  });

  describe("multiplyItem()", () => {
    it('should enter "update" mode when display is "0" and items exist', () => {
      // Simulate having items
      fixture.componentRef.setInput("itemsCount", 1);
      fixture.detectChanges();

      component.multiplyItem();

      expect(component.isMultiplying()).toBe(true);
      expect(component.multiplyMode()).toBe("update");
      expect(component.pendingMultiplyValue()).toBeNull();
    });

    it('should enter "add" mode when display has a value', () => {
      component.appendNumber("5");
      component.multiplyItem();

      expect(component.isMultiplying()).toBe(true);
      expect(component.multiplyMode()).toBe("add");
      expect(component.pendingMultiplyValue()).toBe(5);
    });

    it("should clear the display when entering multiply mode", () => {
      component.appendNumber("5");
      component.multiplyItem();
      expect(component.display()).toBe("");
    });
  });

  describe("confirmMultiply()", () => {
    it("should emit multiplyConfirm with correct quantity and mode", () => {
      let emitted: CalculatorMultiplyConfirmEvent | null = null;
      component.multiplyConfirm.subscribe((e) => (emitted = e));

      // Setup multiply mode
      component.appendNumber("5");
      component.multiplyItem(); // enters "add" mode with pendingValue=5
      component.appendNumber("3");
      component.confirmMultiply();

      expect(emitted).not.toBeNull();
      expect(emitted!.quantity).toBe(3);
      expect(emitted!.mode).toBe("add");
      expect(emitted!.pendingValue).toBe(5);
    });

    it("should reset all state after confirming", () => {
      component.multiplyConfirm.subscribe(() => {});

      fixture.componentRef.setInput("itemsCount", 1);
      fixture.detectChanges();
      component.multiplyItem();
      component.appendNumber("2");
      component.confirmMultiply();

      expect(component.isMultiplying()).toBe(false);
      expect(component.multiplyMode()).toBeNull();
      expect(component.display()).toBe("0");
    });
  });

  describe("handleEnter()", () => {
    it("should call onAddItem when not in multiply mode", () => {
      jest.spyOn(component, "onAddItem");
      component.handleEnter();
      expect(component.onAddItem).toHaveBeenCalled();
    });

    it("should call confirmMultiply when in multiply mode", () => {
      jest.spyOn(component, "confirmMultiply");
      component.appendNumber("5");
      component.multiplyItem();
      component.handleEnter();
      expect(component.confirmMultiply).toHaveBeenCalled();
    });
  });

  describe("handleMultiply()", () => {
    it("should call multiplyItem()", () => {
      jest.spyOn(component, "multiplyItem");
      fixture.componentRef.setInput("itemsCount", 1);
      fixture.detectChanges();
      component.handleMultiply();
      expect(component.multiplyItem).toHaveBeenCalled();
    });
  });

  describe("clearAll()", () => {
    it('should reset display to "0"', () => {
      component.appendNumber("7");
      component.clearAll();
      expect(component.display()).toBe("0");
    });
  });

  describe("blurButton()", () => {
    it("should call blur on the event target", () => {
      const blurFn = jest.fn();
      const mockEvent = { target: { blur: blurFn } } as any;
      component.blurButton(mockEvent);
      expect(blurFn).toHaveBeenCalled();
    });
  });

  describe("appendDecimal() with isSelected", () => {
    it('should set display to "0." and clear isSelected when isSelected is true', () => {
      component.appendNumber("9");
      component.selectAll(); // sets isSelected = true
      component.appendDecimal();
      expect(component.display()).toBe("0.");
    });
  });

  describe("onAddItem() when isMultiplying", () => {
    it("should call confirmMultiply when isMultiplying is true", () => {
      jest.spyOn(component, "confirmMultiply");
      component.appendNumber("5");
      component.multiplyItem(); // enter multiply mode, display = ''
      component.appendNumber("2");
      component.onAddItem(); // isMultiplying = true, so calls confirmMultiply
      expect(component.confirmMultiply).toHaveBeenCalled();
    });
  });

  describe("openLooseProductModal()", () => {
    it("should emit looseProductRequest", () => {
      let emitted = false;
      component.looseProductRequest.subscribe(() => (emitted = true));
      component.openLooseProductModal();
      expect(emitted).toBe(true);
    });
  });

  describe("getDisplayValue()", () => {
    it("should return the current display as a number", () => {
      component.appendNumber("4");
      component.appendNumber("2");
      expect(component.getDisplayValue()).toBe(42);
    });
  });

  describe("selectAll()", () => {
    it("should set isSelected to true", () => {
      component.selectAll();
      expect(component.isSelected()).toBe(true);
    });
  });

  describe("confirmMultiply() invalid quantity", () => {
    it("should reset state when display is empty/invalid", () => {
      component.appendNumber("5");
      component.multiplyItem(); // enter multiply mode, display = ''
      // display is now '' which is NaN
      component.confirmMultiply();
      expect(component.isMultiplying()).toBe(false);
      expect(component.display()).toBe("0");
    });
  });
});
