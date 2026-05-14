import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { routes } from "./app.routes";
import { AuthService } from "./services/auth.service";

const getCategoriesRouteGuard = () => {
  const layoutRoute = routes.find((route) => Array.isArray(route.children));
  const categoriesRoute = layoutRoute?.children?.find(
    (route) => route.path === "categories"
  );

  return categoriesRoute?.canActivate?.[0] as (() => boolean) | undefined;
};

const makeAuthService = (role: string) =>
  ({
    isAuthenticated: jest.fn().mockReturnValue(true),
    hasRole: jest.fn((...roles: string[]) => roles.includes(role)),
  }) as unknown as AuthService;

describe("app routes", () => {
  afterEach(() => TestBed.resetTestingModule());

  function setup(role: string) {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { navigate: jest.fn() } },
        { provide: AuthService, useValue: makeAuthService(role) },
      ],
    });

    return {
      guard: getCategoriesRouteGuard(),
      router: TestBed.inject(Router),
    };
  }

  it("should allow categories access for manager users", () => {
    const { guard } = setup("manager");

    expect(guard).toBeDefined();

    const result = TestBed.runInInjectionContext(() => guard!());

    expect(result).toBe(true);
  });

  it("should deny categories access for cashier users", () => {
    const { guard, router } = setup("cashier");

    expect(guard).toBeDefined();

    const result = TestBed.runInInjectionContext(() => guard!());

    expect(result).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(["/"]);
  });
});
