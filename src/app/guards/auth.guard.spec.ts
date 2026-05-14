import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { authGuard, roleGuard } from "./auth.guard";
import { AuthService } from "../services/auth.service";

const makeAuthService = (isAuth: boolean, role = "admin") =>
  ({
    isAuthenticated: jest.fn().mockReturnValue(isAuth),
    hasRole: jest.fn((...roles: string[]) => roles.includes(role)),
  }) as unknown as AuthService;

describe("authGuard", () => {
  function setup(isAuth: boolean) {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: AuthService, useValue: makeAuthService(isAuth) },
      ],
    });
    return TestBed.inject(Router);
  }

  afterEach(() => TestBed.resetTestingModule());

  it("should allow access when user is authenticated", () => {
    setup(true);
    const result = TestBed.runInInjectionContext(() => authGuard());
    expect(result).toBe(true);
  });

  it("should redirect to /login and return false when not authenticated", () => {
    const router = setup(false);
    const result = TestBed.runInInjectionContext(() => authGuard());
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(["/login"]);
  });
});

describe("roleGuard", () => {
  function setup(role: string) {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: AuthService, useValue: makeAuthService(true, role) },
      ],
    });
    return TestBed.inject(Router);
  }

  afterEach(() => TestBed.resetTestingModule());

  it("should allow access when user has the required role", () => {
    setup("admin");
    const guard = roleGuard(["admin", "manager"]);
    const result = TestBed.runInInjectionContext(() => guard());
    expect(result).toBe(true);
  });

  it("should deny access and navigate when user lacks required role", () => {
    const router = setup("cashier");
    const guard = roleGuard(["admin", "manager"]);
    const result = TestBed.runInInjectionContext(() => guard());
    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(["/"]);
  });
});
