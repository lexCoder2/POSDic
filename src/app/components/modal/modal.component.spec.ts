import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ModalComponent } from "./modal.component";

describe("ModalComponent", () => {
  let component: ModalComponent;
  let fixture: ComponentFixture<ModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("onClose()", () => {
    it("should emit close event", () => {
      const closeSpy = jest.spyOn(component.close, "emit");
      component.onClose();
      expect(closeSpy).toHaveBeenCalled();
    });
  });

  describe("onBackdropClick()", () => {
    it("should emit close when closeOnBackdropClick is true", () => {
      const closeSpy = jest.spyOn(component.close, "emit");
      component.closeOnBackdropClick = true;
      component.onBackdropClick();
      expect(closeSpy).toHaveBeenCalled();
    });

    it("should not emit close when closeOnBackdropClick is false", () => {
      const closeSpy = jest.spyOn(component.close, "emit");
      component.closeOnBackdropClick = false;
      component.onBackdropClick();
      expect(closeSpy).not.toHaveBeenCalled();
    });
  });
});
