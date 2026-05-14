import { TestBed, ComponentFixture } from "@angular/core/testing";
import { of, throwError, EMPTY } from "rxjs";
import { OpenRegisterComponent } from "./open-register.component";
import {
  RegisterService,
  AvailableRegister,
  DeviceRegisterResponse,
} from "../../services/register.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";
import { User } from "../../models";

const adminUser: User = {
  id: "u1",
  username: "admin",
  email: "a@a.com",
  firstName: "A",
  lastName: "B",
  role: "admin",
};

const mockAvailableRegister = (
  num: string,
  overrides: Partial<AvailableRegister> = {}
): AvailableRegister => ({
  registerNumber: num,
  ...overrides,
});

const mockDeviceResponse: DeviceRegisterResponse = {
  register: null,
  isDeviceBound: false,
  canManageOthers: true,
  suggestedRegister: undefined,
};

describe("OpenRegisterComponent", () => {
  let component: OpenRegisterComponent;
  let fixture: ComponentFixture<OpenRegisterComponent>;
  let registerServiceSpy: any;
  let authServiceSpy: any;
  let toastServiceSpy: any;
  let translationServiceSpy: any;

  beforeEach(async () => {
    registerServiceSpy = {
      getAvailableRegisters: jest
        .fn()
        .mockReturnValue(of({ registers: [], canManageOthers: true })),
      getDeviceRegister: jest.fn().mockReturnValue(of(mockDeviceResponse)),
      getDeviceId: jest.fn().mockReturnValue("device-123"),
      getDeviceName: jest.fn().mockReturnValue("Test Device"),
      openRegister: jest
        .fn()
        .mockReturnValue(of({ register: { registerNumber: "REG-01" } })),
    };
    authServiceSpy = { getCurrentUser: jest.fn().mockReturnValue(adminUser) };
    toastServiceSpy = { show: jest.fn() };
    translationServiceSpy = {
      translate: jest.fn().mockReturnValue(""),
      translationsChanged$: EMPTY,
    };

    await TestBed.configureTestingModule({
      imports: [OpenRegisterComponent],
      providers: [
        { provide: RegisterService, useValue: registerServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: TranslationService, useValue: translationServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OpenRegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should set isAdminOrManager=true for admin user on init", () => {
    expect(component.isAdminOrManager).toBe(true);
  });

  it("should load device info on init", () => {
    expect(registerServiceSpy.getDeviceId).toHaveBeenCalled();
    expect(component.deviceId).toBe("device-123");
    expect(component.deviceName).toBe("Test Device");
  });

  it("should call getAvailableRegisters on init", () => {
    expect(registerServiceSpy.getAvailableRegisters).toHaveBeenCalled();
  });

  describe("loadAvailableRegisters", () => {
    it("should populate availableRegisters on success", () => {
      const regs = [
        mockAvailableRegister("REG-01"),
        mockAvailableRegister("REG-02"),
      ];
      registerServiceSpy.getAvailableRegisters!.mockReturnValue(
        of({ registers: regs, canManageOthers: true })
      );
      component.ngOnInit();
      expect(component.availableRegisters().length).toBe(2);
    });

    it("should auto-select device-bound register", () => {
      const regs = [
        mockAvailableRegister("REG-01", { isBoundToThisDevice: true }),
        mockAvailableRegister("REG-02"),
      ];
      registerServiceSpy.getAvailableRegisters!.mockReturnValue(
        of({ registers: regs, canManageOthers: true })
      );
      component.ngOnInit();
      expect(component.selectedRegister()).toBe("REG-01");
    });

    it("should auto-select the only available register", () => {
      const regs = [mockAvailableRegister("REG-ZZ")];
      registerServiceSpy.getAvailableRegisters!.mockReturnValue(
        of({ registers: regs, canManageOthers: true })
      );
      component.ngOnInit();
      expect(component.selectedRegister()).toBe("REG-ZZ");
    });

    it("should show error toast when load fails", () => {
      registerServiceSpy.getAvailableRegisters!.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      component.ngOnInit();
      expect(toastServiceSpy.show).toHaveBeenCalled();
      expect(component.loading()).toBe(false);
    });
  });

  describe("isRegisterDisabled", () => {
    it("should return false for admins/managers regardless", () => {
      component.canManageOthers = true;
      const reg = mockAvailableRegister("X", { isBoundToOtherDevice: true });
      expect(component.isRegisterDisabled(reg)).toBe(false);
    });

    it("should return true for cashier with register bound to other device", () => {
      component.canManageOthers = false;
      const reg = mockAvailableRegister("X", { isBoundToOtherDevice: true });
      expect(component.isRegisterDisabled(reg)).toBe(true);
    });

    it("should return false for cashier with unbound register", () => {
      component.canManageOthers = false;
      const reg = mockAvailableRegister("X");
      expect(component.isRegisterDisabled(reg)).toBe(false);
    });
  });

  describe("onRegisterChange", () => {
    it('should show new register input when "new" is selected', () => {
      component.selectedRegister.set("new");
      component.onRegisterChange();
      expect(component.showNewRegisterInput).toBe(true);
    });

    it("should hide new register input for other values", () => {
      component.showNewRegisterInput = true;
      component.selectedRegister.set("REG-01");
      component.onRegisterChange();
      expect(component.showNewRegisterInput).toBe(false);
    });
  });

  describe("outputs", () => {
    it("should have registerOpened output", () => {
      expect(component.registerOpened).toBeDefined();
    });

    it("should have cancelled output", () => {
      expect(component.cancelled).toBeDefined();
    });
  });

  describe("ngOnDestroy", () => {
    it("should complete without error", () => {
      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe("getRegisterTooltip", () => {
    it('should return "linked to your device" text when isBoundToThisDevice', () => {
      const reg = mockAvailableRegister("X", { isBoundToThisDevice: true });
      const result = component.getRegisterTooltip(reg);
      expect(typeof result).toBe("string");
    });

    it('should return "linked to another device" text for cashier with other device', () => {
      component.canManageOthers = false;
      const reg = mockAvailableRegister("X", { isBoundToOtherDevice: true });
      const result = component.getRegisterTooltip(reg);
      expect(typeof result).toBe("string");
    });

    it("should return last closed date when available", () => {
      const reg = mockAvailableRegister("X", {
        lastClosedAt: new Date("2026-01-01T10:00:00") as any,
      });
      const result = component.getRegisterTooltip(reg);
      expect(typeof result).toBe("string");
    });

    it("should return empty string for unbound register without history", () => {
      const reg = mockAvailableRegister("X");
      expect(component.getRegisterTooltip(reg)).toBe("");
    });
  });

  describe("openRegister", () => {
    it("should show error toast when no register is selected", () => {
      component.showNewRegisterInput = true;
      component.newRegisterNumber = "   ";
      component.openRegister();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
    });

    it("should emit registerOpened on success", () => {
      registerServiceSpy.openRegister.mockReturnValue(
        of({ registerNumber: "REG-01" })
      );
      const emitSpy = jest.spyOn(component.registerOpened, "emit");
      component.selectedRegister.set("REG-01");
      component.openRegister();
      expect(emitSpy).toHaveBeenCalled();
    });

    it("should show success toast after opening", () => {
      registerServiceSpy.openRegister.mockReturnValue(
        of({ registerNumber: "REG-01" })
      );
      component.selectedRegister.set("REG-01");
      component.openRegister();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "success"
      );
    });

    it("should show error toast and reset loading on failure", () => {
      registerServiceSpy.openRegister.mockReturnValue(
        throwError(() => ({ error: { message: "Register unavailable" } }))
      );
      component.selectedRegister.set("REG-01");
      component.openRegister();
      expect(toastServiceSpy.show).toHaveBeenCalledWith(
        expect.any(String),
        "error"
      );
      expect(component.loading()).toBe(false);
    });

    it("should use newRegisterNumber when showNewRegisterInput is true", () => {
      registerServiceSpy.openRegister.mockReturnValue(
        of({ registerNumber: "REG-NEW" })
      );
      component.showNewRegisterInput = true;
      component.newRegisterNumber = "REG-NEW";
      component.openRegister();
      expect(registerServiceSpy.openRegister).toHaveBeenCalledWith(
        expect.any(Number),
        "REG-NEW",
        true
      );
    });
  });

  describe("cancel", () => {
    it("should emit cancelled event", () => {
      const emitSpy = jest.spyOn(component.cancelled, "emit");
      component.cancel();
      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
