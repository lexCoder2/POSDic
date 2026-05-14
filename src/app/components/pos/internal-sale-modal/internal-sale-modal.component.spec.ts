import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { InternalSaleModalComponent } from "./internal-sale-modal.component";
import { TranslationService } from "../../../services/translation.service";
import { EMPTY } from "rxjs";

describe("InternalSaleModalComponent", () => {
  let component: InternalSaleModalComponent;
  let fixture: ComponentFixture<InternalSaleModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InternalSaleModalComponent],
      providers: [
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
    fixture = TestBed.createComponent(InternalSaleModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("onClose()", () => {
    it("should emit close event and clear notes", () => {
      const closeSpy = jest.spyOn(component.close, "emit");
      component.notes = "some notes";
      component.onClose();
      expect(closeSpy).toHaveBeenCalled();
      expect(component.notes).toBe("");
    });
  });

  describe("onConfirm()", () => {
    it("should emit confirm with notes and clear notes", () => {
      const confirmSpy = jest.spyOn(component.confirm, "emit");
      component.notes = "Test notes";
      component.onConfirm();
      expect(confirmSpy).toHaveBeenCalledWith({ notes: "Test notes" });
      expect(component.notes).toBe("");
    });

    it("should use default message when notes is empty", () => {
      const confirmSpy = jest.spyOn(component.confirm, "emit");
      component.notes = "";
      component.onConfirm();
      expect(confirmSpy).toHaveBeenCalledWith({
        notes: "Internal consumption",
      });
    });
  });
});
