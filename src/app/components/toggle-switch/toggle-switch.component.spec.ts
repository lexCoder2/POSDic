import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ToggleSwitchComponent } from "./toggle-switch.component";

describe("ToggleSwitchComponent", () => {
  let component: ToggleSwitchComponent;
  let fixture: ComponentFixture<ToggleSwitchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToggleSwitchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ToggleSwitchComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("toggle()", () => {
    it("emits the new toggled value and flips checked", () => {
      const spy = jest.spyOn(component.change, "emit");
      component.checked = false;
      component.toggle();
      expect(component.checked).toBe(true);
      expect(spy).toHaveBeenCalledWith(true);
    });

    it("does nothing when disabled", () => {
      const spy = jest.spyOn(component.change, "emit");
      component.disabled = true;
      component.checked = false;
      component.toggle();
      expect(component.checked).toBe(false);
      expect(spy).not.toHaveBeenCalled();
    });

    it("toggles from true to false", () => {
      component.checked = true;
      component.toggle();
      expect(component.checked).toBe(false);
    });
  });
});
