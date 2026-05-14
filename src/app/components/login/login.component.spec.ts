import { TestBed, fakeAsync, tick } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { of, throwError } from "rxjs";
import { LoginComponent } from "./login.component";
import { AuthService } from "../../services/auth.service";
import { Router } from "@angular/router";

describe("LoginComponent", () => {
  let component: LoginComponent;
  let authServiceSpy: jest.Mocked<AuthService>;
  let router: Router;

  beforeEach(() => {
    authServiceSpy = {
      isAuthenticated: jest.fn().mockReturnValue(false),
      login: jest
        .fn()
        .mockReturnValue(of({ token: "jwt", user: { username: "admin" } })),
      loginWithQr: jest
        .fn()
        .mockReturnValue(of({ token: "jwt", user: { username: "admin" } })),
      logout: jest.fn(),
      getCurrentUser: jest.fn().mockReturnValue(null),
      currentUser$: { subscribe: jest.fn() } as any,
    } as any;

    TestBed.configureTestingModule({
      imports: [LoginComponent, HttpClientTestingModule, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    });

    const fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  it("should be created", () => {
    expect(component).toBeTruthy();
  });

  describe("ngOnInit", () => {
    it("should redirect to /pos if already authenticated", () => {
      authServiceSpy.isAuthenticated.mockReturnValue(true);
      const navigateSpy = jest.spyOn(router, "navigate");

      component.ngOnInit();

      expect(navigateSpy).toHaveBeenCalledWith(["/pos"]);
    });

    it("should not redirect if not authenticated", () => {
      authServiceSpy.isAuthenticated.mockReturnValue(false);
      const navigateSpy = jest.spyOn(router, "navigate");

      component.ngOnInit();

      expect(navigateSpy).not.toHaveBeenCalled();
    });
  });

  describe("setLoginMode", () => {
    it("should switch to password mode", () => {
      component.setLoginMode("password");
      expect(component.loginMode).toBe("password");
      expect(component.error).toBe("");
    });

    it("should switch to scanner mode", () => {
      component.loginMode = "password";
      component.setLoginMode("scanner");
      expect(component.loginMode).toBe("scanner");
    });
  });

  describe("initial state", () => {
    it("should have default loginMode as scanner", () => {
      expect(component.loginMode).toBe("scanner");
    });

    it("should have empty username and password", () => {
      expect(component.username).toBe("");
      expect(component.password).toBe("");
    });

    it("should have loading false", () => {
      expect(component.loading).toBe(false);
    });

    it("should have error as empty string", () => {
      expect(component.error).toBe("");
    });
  });

  describe("togglePasswordVisibility", () => {
    it("should toggle showPassword", () => {
      expect(component.showPassword).toBe(false);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(true);
      component.togglePasswordVisibility();
      expect(component.showPassword).toBe(false);
    });
  });

  describe("ngOnDestroy", () => {
    it("should stop camera scanner if active", () => {
      const stopCameraScanner = jest
        .spyOn(component as any, "stopQrScanner")
        .mockImplementation(() => {});
      component.ngOnDestroy();
      expect(stopCameraScanner).toHaveBeenCalled();
    });
  });

  describe("onSubmit()", () => {
    it("should set error when credentials are missing", () => {
      component.username = "";
      component.password = "";
      component.onSubmit();
      expect(component.error).toBeTruthy();
      expect(authServiceSpy.login).not.toHaveBeenCalled();
    });

    it("should call authService.login with credentials", () => {
      component.username = "admin";
      component.password = "admin123";
      component.onSubmit();
      expect(authServiceSpy.login).toHaveBeenCalledWith("admin", "admin123");
    });

    it("should navigate to /pos on successful login", () => {
      const navigateSpy = jest.spyOn(router, "navigate");
      component.username = "admin";
      component.password = "admin123";
      component.onSubmit();
      expect(navigateSpy).toHaveBeenCalledWith(["/pos"]);
    });

    it("should set error on 401", () => {
      authServiceSpy.login.mockReturnValue(throwError(() => ({ status: 401 })));
      component.username = "admin";
      component.password = "wrong";
      component.onSubmit();
      expect(component.error).toContain("Invalid username");
    });

    it("should set connection error on status 0", () => {
      authServiceSpy.login.mockReturnValue(throwError(() => ({ status: 0 })));
      component.username = "admin";
      component.password = "test";
      component.onSubmit();
      expect(component.error).toContain("Unable to connect");
    });

    it("should set error from err.error.message when available", () => {
      authServiceSpy.login.mockReturnValue(
        throwError(() => ({
          status: 500,
          error: { message: "Custom server error" },
        }))
      );
      component.username = "admin";
      component.password = "test";
      component.onSubmit();
      expect(component.error).toContain("Custom server error");
    });

    it("should reset loading after completion", () => {
      component.username = "admin";
      component.password = "admin123";
      component.onSubmit();
      expect(component.loading).toBe(false);
    });
  });

  describe("onInputChange()", () => {
    it("should clear error when user starts typing", () => {
      component.error = "Some error";
      component.onInputChange();
      expect(component.error).toBe("");
    });

    it("should do nothing when error is already empty", () => {
      component.error = "";
      component.onInputChange();
      expect(component.error).toBe("");
    });
  });

  describe("onMainQrInputEnter()", () => {
    it("should call loginWithQr on Enter", () => {
      component.qrInputValue = "QR_DATA";
      component.onMainQrInputEnter();
      expect(authServiceSpy.loginWithQr).toHaveBeenCalledWith("QR_DATA");
    });

    it("should not call loginWithQr when input is empty", () => {
      component.qrInputValue = "";
      component.onMainQrInputEnter();
      expect(authServiceSpy.loginWithQr).not.toHaveBeenCalled();
    });

    it("should navigate to /pos on QR login success", () => {
      const navigateSpy = jest.spyOn(router, "navigate");
      component.qrInputValue = "VALID_QR";
      component.onMainQrInputEnter();
      expect(navigateSpy).toHaveBeenCalledWith(["/pos"]);
    });

    it("should set error on QR 401", () => {
      authServiceSpy.loginWithQr.mockReturnValue(
        throwError(() => ({ status: 401 }))
      );
      component.qrInputValue = "BAD_QR";
      component.onMainQrInputEnter();
      expect(component.error).toContain("Invalid QR code");
    });

    it("should set connection error on QR status 0", () => {
      authServiceSpy.loginWithQr.mockReturnValue(
        throwError(() => ({ status: 0 }))
      );
      component.qrInputValue = "BAD_QR";
      component.onMainQrInputEnter();
      expect(component.error).toContain("Unable to connect");
    });

    it("should set err.error.message on QR login error", () => {
      authServiceSpy.loginWithQr.mockReturnValue(
        throwError(() => ({
          status: 500,
          error: { message: "QR Custom error" },
        }))
      );
      component.qrInputValue = "BAD_QR";
      component.onMainQrInputEnter();
      expect(component.error).toContain("QR Custom error");
    });

    it("should set generic QR error as fallback", () => {
      authServiceSpy.loginWithQr.mockReturnValue(
        throwError(() => ({ status: 500 }))
      );
      component.qrInputValue = "BAD_QR";
      component.onMainQrInputEnter();
      expect(component.error).toContain("QR login failed");
    });
  });

  describe("onSubmit() - additional error branches", () => {
    it("should set 404 error", () => {
      authServiceSpy.login.mockReturnValue(throwError(() => ({ status: 404 })));
      component.username = "admin";
      component.password = "test";
      component.onSubmit();
      expect(component.error).toContain("Server not found");
    });

    it("should set error from err.message when no err.error.message", () => {
      authServiceSpy.login.mockReturnValue(
        throwError(() => ({ status: 500, message: "Custom msg" }))
      );
      component.username = "admin";
      component.password = "test";
      component.onSubmit();
      expect(component.error).toContain("Custom msg");
    });

    it("should set generic fallback error", () => {
      authServiceSpy.login.mockReturnValue(throwError(() => ({ status: 500 })));
      component.username = "admin";
      component.password = "test";
      component.onSubmit();
      expect(component.error).toContain("Login failed");
    });
  });
});
