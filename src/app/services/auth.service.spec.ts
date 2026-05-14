import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { Router } from "@angular/router";
import { AuthService } from "./auth.service";
import { environment } from "@environments/environment";

describe("AuthService", () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  const mockUser = {
    id: "user-1",
    username: "admin",
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "User",
    role: "admin" as const,
    permissions: ["sales", "inventory", "reports"],
    active: true,
  };

  const mockAuthResponse = { token: "test-token-123", user: mockUser };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: { navigate: jest.fn() } },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe("isAuthenticated()", () => {
    it("should return false when no token in localStorage", () => {
      expect(service.isAuthenticated()).toBe(false);
    });

    it("should return true when token exists in localStorage", () => {
      localStorage.setItem("pos_token", "some-token");
      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe("login()", () => {
    it("should POST to /auth/login and store token in localStorage", () => {
      service.login("admin", "admin123").subscribe((response) => {
        expect(response.token).toBe("test-token-123");
        expect(localStorage.getItem("pos_token")).toBe("test-token-123");
        expect(localStorage.getItem("pos_user")).toBe(JSON.stringify(mockUser));
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toEqual({
        username: "admin",
        password: "admin123",
      });
      req.flush(mockAuthResponse);
    });

    it("should update currentUser$ BehaviorSubject on successful login", () => {
      let emittedUser: any = null;
      service.currentUser$.subscribe((user) => (emittedUser = user));

      service.login("admin", "admin123").subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockAuthResponse);

      expect(emittedUser).toEqual(mockUser);
    });

    it("should propagate HTTP errors on login failure", (done) => {
      service.login("admin", "wrong").subscribe({
        error: (err) => {
          expect(err.status).toBe(401);
          done();
        },
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(
        { message: "Invalid credentials" },
        { status: 401, statusText: "Unauthorized" }
      );
    });
  });

  describe("logout()", () => {
    it("should remove token and user from localStorage", () => {
      localStorage.setItem("pos_token", "token");
      localStorage.setItem("pos_user", JSON.stringify(mockUser));

      service.logout();

      expect(localStorage.getItem("pos_token")).toBeNull();
      expect(localStorage.getItem("pos_user")).toBeNull();
    });

    it("should navigate to /login", () => {
      service.logout();
      expect(router.navigate).toHaveBeenCalledWith(["/login"]);
    });

    it("should set currentUser$ to null", () => {
      let emittedUser: any = "initial";
      service.currentUser$.subscribe((u) => (emittedUser = u));

      service.logout();

      expect(emittedUser).toBeNull();
    });
  });

  describe("getCurrentUser()", () => {
    it("should return null when no user is stored", () => {
      expect(service.getCurrentUser()).toBeNull();
    });

    it("should return user from BehaviorSubject after login", () => {
      service.login("admin", "pass").subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/auth/login`)
        .flush(mockAuthResponse);

      expect(service.getCurrentUser()).toEqual(mockUser);
    });
  });

  describe("hasRole()", () => {
    beforeEach(() => {
      service.login("admin", "pass").subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/auth/login`)
        .flush(mockAuthResponse);
    });

    it("should return true when user role matches", () => {
      expect(service.hasRole("admin")).toBe(true);
    });

    it("should return true when one of multiple roles matches", () => {
      expect(service.hasRole("manager", "admin")).toBe(true);
    });

    it("should return false when role does not match", () => {
      expect(service.hasRole("cashier")).toBe(false);
    });

    it("should return false when no user logged in", () => {
      service.logout();
      expect(service.hasRole("admin")).toBe(false);
    });
  });

  describe("hasPermission()", () => {
    it("should return true for admin regardless of permissions list", () => {
      service.login("admin", "pass").subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/auth/login`)
        .flush(mockAuthResponse);

      expect(service.hasPermission("any_permission")).toBe(true);
    });

    it("should return true when non-admin user has the permission", () => {
      const cashier = {
        ...mockUser,
        role: "cashier" as const,
        permissions: ["sales"],
      };
      service.login("cashier", "pass").subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/auth/login`)
        .flush({ token: "tk", user: cashier });

      expect(service.hasPermission("sales")).toBe(true);
    });

    it("should return false when non-admin user lacks the permission", () => {
      const cashier = {
        ...mockUser,
        role: "cashier" as const,
        permissions: ["sales"],
      };
      service.login("cashier", "pass").subscribe();
      httpMock
        .expectOne(`${environment.apiUrl}/auth/login`)
        .flush({ token: "tk", user: cashier });

      expect(service.hasPermission("inventory")).toBe(false);
    });

    it("should return false when no user is logged in", () => {
      expect(service.hasPermission("sales")).toBe(false);
    });
  });

  describe("getToken()", () => {
    it("should return null when no token stored", () => {
      expect(service.getToken()).toBeNull();
    });

    it("should return the stored token", () => {
      localStorage.setItem("pos_token", "my-jwt-token");
      expect(service.getToken()).toBe("my-jwt-token");
    });
  });

  describe("loadStoredUser() - via constructor", () => {
    it("should restore user from localStorage when token and user exist", () => {
      localStorage.setItem("pos_token", "some-token");
      localStorage.setItem("pos_user", JSON.stringify(mockUser));
      // Re-instantiate the service to trigger constructor → loadStoredUser
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: { navigate: jest.fn() } },
        ],
      });
      const freshService = TestBed.inject(AuthService);
      TestBed.inject(HttpTestingController).verify();
      expect(freshService.getCurrentUser()?.username).toBe("admin");
    });

    it("should logout when stored user JSON is invalid", () => {
      localStorage.setItem("pos_token", "some-token");
      localStorage.setItem("pos_user", "INVALID_JSON");
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [HttpClientTestingModule],
        providers: [
          AuthService,
          { provide: Router, useValue: { navigate: jest.fn() } },
        ],
      });
      const freshService = TestBed.inject(AuthService);
      TestBed.inject(HttpTestingController).verify();
      expect(freshService.getCurrentUser()).toBeNull();
    });
  });

  describe("loginWithQr()", () => {
    it("should POST to /auth/qr-login and store token", (done) => {
      service.loginWithQr("qr-data-string").subscribe((resp) => {
        expect(localStorage.getItem("pos_token")).toBe("qr-token");
        expect(resp.user.username).toBe("admin");
        done();
      });
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/qr-login`);
      expect(req.request.method).toBe("POST");
      expect(req.request.body).toEqual({ qrData: "qr-data-string" });
      req.flush({ token: "qr-token", user: mockUser });
    });
  });

  describe("register()", () => {
    it("should POST to /auth/register and store token", (done) => {
      const newUser = { username: "newuser", password: "pass123" };
      service.register(newUser).subscribe((resp) => {
        expect(localStorage.getItem("pos_token")).toBe("reg-token");
        expect(resp.user.username).toBe("admin");
        done();
      });
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe("POST");
      req.flush({ token: "reg-token", user: mockUser });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Spec 1: Multi-user browser sessions
  // ───────────────────────────────────────────────────────────────────────────
  describe("Spec 1: Multi-user browser sessions", () => {
    const mockUser2 = {
      id: "user-2",
      username: "cashier",
      email: "cashier@test.com",
      firstName: "Cashier",
      lastName: "User",
      role: "cashier" as const,
      permissions: ["sales"],
      active: true,
    };
    const mockAuthResponse2 = { token: "test-token-456", user: mockUser2 };

    describe("addSession()", () => {
      it("should store a session in pos_sessions", () => {
        service.addSession("token-1", mockUser as any);
        const sessions = service.getSessions();
        expect(sessions).toHaveLength(1);
        expect(sessions[0].user.id).toBe("user-1");
      });

      it("should allow multiple sessions with different users", () => {
        service.addSession("token-1", mockUser as any);
        service.addSession("token-456", mockUser2 as any);
        expect(service.getSessions()).toHaveLength(2);
      });

      it("should update existing session token when the same user logs in again", () => {
        service.addSession("token-1", mockUser as any);
        service.addSession("token-new", mockUser as any);
        expect(service.getSessions()).toHaveLength(1);
        expect(service.getSessions()[0].token).toBe("token-new");
      });
    });

    describe("switchSession()", () => {
      beforeEach(() => {
        service.addSession("token-1", mockUser as any);
        service.addSession("token-2", mockUser2 as any);
        service.switchSession("user-1");
      });

      it("should change the active user", () => {
        service.switchSession("user-2");
        expect(service.getCurrentUser()?.id).toBe("user-2");
      });

      it("should emit the new user on currentUser$", () => {
        const emissions: any[] = [];
        service.currentUser$.subscribe((u) => emissions.push(u));

        service.switchSession("user-2");

        const last = emissions[emissions.length - 1];
        expect(last?.id).toBe("user-2");
      });

      it("should sync pos_token to the new session token", () => {
        service.switchSession("user-2");
        expect(localStorage.getItem("pos_token")).toBe("token-2");
      });

      it("should do nothing when switching to a non-existent session id", () => {
        service.switchSession("user-1");
        const beforeUser = service.getCurrentUser();
        service.switchSession("nonexistent-id");
        expect(service.getCurrentUser()).toEqual(beforeUser);
      });
    });

    describe("removeSession()", () => {
      beforeEach(() => {
        service.addSession("token-1", mockUser as any);
        service.addSession("token-2", mockUser2 as any);
        service.switchSession("user-1");
      });

      it("should remove the session from sessions list", () => {
        service.removeSession("user-1");
        expect(
          service.getSessions().find((s) => s.user.id === "user-1")
        ).toBeUndefined();
      });

      it("should switch to a remaining session without navigating to /login", () => {
        service.removeSession("user-1");
        expect(service.getCurrentUser()?.id).toBe("user-2");
        expect(router.navigate).not.toHaveBeenCalledWith(["/login"]);
      });

      it("should navigate to /login when removing the last session", () => {
        service.removeSession("user-1");
        service.removeSession("user-2");
        expect(router.navigate).toHaveBeenCalledWith(["/login"]);
      });

      it("should gracefully ignore removing a session that does not exist", () => {
        expect(() => service.removeSession("ghost-id")).not.toThrow();
        expect(service.getSessions()).toHaveLength(2);
      });
    });

    describe("getSessions()", () => {
      it("should return an empty array when no sessions have been added", () => {
        expect(service.getSessions()).toEqual([]);
      });

      it("should return all active sessions", () => {
        service.addSession("token-1", mockUser as any);
        service.addSession("token-2", mockUser2 as any);
        expect(service.getSessions()).toHaveLength(2);
      });
    });

    describe("login() with multi-session", () => {
      it("should ADD a session without clearing existing sessions", (done) => {
        service.addSession("existing-token", mockUser2 as any);

        service.login("admin", "admin123").subscribe(() => {
          expect(service.getSessions()).toHaveLength(2);
          done();
        });

        httpMock
          .expectOne(`${environment.apiUrl}/auth/login`)
          .flush(mockAuthResponse);
      });

      it("should activate the newly logged-in user", (done) => {
        service.addSession("existing-token", mockUser2 as any);
        service.switchSession("user-2");

        service.login("admin", "admin123").subscribe(() => {
          expect(service.getCurrentUser()?.id).toBe("user-1");
          done();
        });

        httpMock
          .expectOne(`${environment.apiUrl}/auth/login`)
          .flush(mockAuthResponse);
      });
    });

    describe("logout() with multi-session", () => {
      it("should remove only the active session when others exist", () => {
        service.addSession("token-1", mockUser as any);
        service.addSession("token-2", mockUser2 as any);
        service.switchSession("user-1");

        service.logout();

        expect(service.getSessions()).toHaveLength(1);
        expect(service.getCurrentUser()?.id).toBe("user-2");
        expect(router.navigate).not.toHaveBeenCalledWith(["/login"]);
      });

      it("should navigate to /login when logging out the last session", () => {
        service.addSession("token-1", mockUser as any);
        service.switchSession("user-1");

        service.logout();

        expect(service.getSessions()).toHaveLength(0);
        expect(router.navigate).toHaveBeenCalledWith(["/login"]);
      });
    });
  });
});
