import { TestBed } from "@angular/core/testing";
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
} from "@angular/common/http/testing";
import { authInterceptor } from "./auth.interceptor";
import { AuthService } from "../services/auth.service";

const makeAuthService = (token: string | null) =>
  ({
    getToken: jest.fn().mockReturnValue(token),
    logout: jest.fn(),
  }) as unknown as AuthService;

describe("authInterceptor", () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  const setupWithToken = (token: string | null) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: makeAuthService(token) },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  };

  afterEach(() => {
    httpMock.verify();
  });

  it("should add Authorization header when token is present", () => {
    setupWithToken("my-jwt-token");

    http.get("/api/products").subscribe();

    const req = httpMock.expectOne("/api/products");
    expect(req.request.headers.get("Authorization")).toBe(
      "Bearer my-jwt-token"
    );
    req.flush([]);
  });

  it("should not add Authorization header when no token", () => {
    setupWithToken(null);

    http.get("/api/products").subscribe();

    const req = httpMock.expectOne("/api/products");
    expect(req.request.headers.has("Authorization")).toBe(false);
    req.flush([]);
  });

  it("should call logout when receiving 401 on non-login request", () => {
    setupWithToken("expired-token");
    const authService = TestBed.inject(AuthService);

    http.get("/api/products").subscribe({ error: () => {} });

    const req = httpMock.expectOne("/api/products");
    req.flush("Unauthorized", { status: 401, statusText: "Unauthorized" });

    expect(authService.logout).toHaveBeenCalled();
  });

  it("should NOT call logout on 401 for login endpoint", () => {
    setupWithToken(null);
    const authService = TestBed.inject(AuthService);

    http.post("/api/auth/login", {}).subscribe({ error: () => {} });

    const req = httpMock.expectOne("/api/auth/login");
    req.flush("Unauthorized", { status: 401, statusText: "Unauthorized" });

    expect(authService.logout).not.toHaveBeenCalled();
  });
});
