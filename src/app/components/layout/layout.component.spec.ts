import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { Router, NavigationEnd, ActivatedRoute } from "@angular/router";
import { Subject, BehaviorSubject, of } from "rxjs";
import { EMPTY } from "rxjs";
import { LayoutComponent } from "./layout.component";
import { AuthService } from "../../services/auth.service";
import { TranslationService } from "../../services/translation.service";
import { ToastService } from "../../services/toast.service";
import { RegisterService } from "../../services/register.service";
import { UserService } from "../../services/user.service";
import { ThemeService } from "../../services/theme.service";
import { SessionEntry } from "../../models";

const mockUser = {
  id: "u1",
  username: "admin",
  role: "admin",
  firstName: "Admin",
  permissions: [],
};
const mockUser2 = {
  id: "u2",
  username: "cashier",
  role: "cashier",
  firstName: "Cashier",
  permissions: [],
};
const mockRegister = {
  _id: "r1",
  name: "POS 1",
  status: "open",
  printReceiptsEnabled: true,
};

describe("LayoutComponent", () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;
  let routerEventSubject: Subject<any>;
  let routerSpy: any;
  let isDarkMode$: BehaviorSubject<boolean>;
  let currentRegister$: BehaviorSubject<any>;
  let currentLanguage$: BehaviorSubject<string>;
  let sessionsSubject: BehaviorSubject<SessionEntry[]>;
  let mockAuthService: any;

  beforeEach(async () => {
    routerEventSubject = new Subject<any>();
    isDarkMode$ = new BehaviorSubject<boolean>(false);
    currentRegister$ = new BehaviorSubject<any>(null);
    currentLanguage$ = new BehaviorSubject<string>("en");
    sessionsSubject = new BehaviorSubject<SessionEntry[]>([
      { token: "t1", user: mockUser as any },
    ]);
    mockAuthService = {
      getCurrentUser: jest.fn().mockReturnValue(mockUser),
      sessions$: sessionsSubject.asObservable(),
      switchSession: jest.fn(),
      removeSession: jest.fn(),
    };

    routerSpy = {
      events: routerEventSubject.asObservable(),
      url: "/dashboard",
      navigate: jest.fn().mockResolvedValue(true),
    };

    // Mock window.matchMedia for ThemeService
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }),
    });

    await TestBed.configureTestingModule({
      imports: [LayoutComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: routerSpy },
        {
          provide: TranslationService,
          useValue: {
            current: "en",
            translate: jest.fn().mockImplementation((key: string) => key),
            currentLanguage$: currentLanguage$.asObservable(),
            translationsChanged$: EMPTY,
          },
        },
        {
          provide: ToastService,
          useValue: {
            show: jest.fn(),
            onToast: jest.fn().mockReturnValue(EMPTY),
          },
        },
        {
          provide: RegisterService,
          useValue: {
            currentRegister$: currentRegister$.asObservable(),
            getActiveRegister: jest.fn().mockReturnValue(of(mockRegister)),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUsers: jest.fn().mockReturnValue(of({ data: [] })),
          },
        },
        {
          provide: ThemeService,
          useValue: {
            isDarkMode$: isDarkMode$.asObservable(),
            loadTheme: jest.fn(),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParams: {} },
            queryParams: of({}),
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    component.ngOnInit();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should set currentUser on init", () => {
    expect(component.currentUser).toEqual(mockUser);
  });

  it("should set currentLang on init", () => {
    expect(component.currentLang).toBe("en");
  });

  it("isAdmin getter should return true for admin role", () => {
    expect(component.isAdmin).toBe(true);
  });

  it("isAdminOrManager getter should return true for admin role", () => {
    expect(component.isAdminOrManager).toBe(true);
  });

  it("isAdminOrManager getter should return false for cashier role", () => {
    component.currentUser = { role: "cashier" } as any;
    expect(component.isAdminOrManager).toBe(false);
  });

  describe("toggleSidebar()", () => {
    it("should toggle mobileSidebarOpen", () => {
      expect(component.mobileSidebarOpen).toBe(false);
      component.toggleSidebar();
      expect(component.mobileSidebarOpen).toBe(true);
      component.toggleSidebar();
      expect(component.mobileSidebarOpen).toBe(false);
    });
  });

  describe("closeSidebar()", () => {
    it("should set mobileSidebarOpen to false", () => {
      component.mobileSidebarOpen = true;
      component.closeSidebar();
      expect(component.mobileSidebarOpen).toBe(false);
    });
  });

  describe("page title updating", () => {
    it("should set pageTitle for known routes", () => {
      routerEventSubject.next(
        Object.assign(new NavigationEnd(1, "/dashboard", "/dashboard"))
      );
      expect(component.pageTitle).toBe("GLOBAL.SIDEBAR.DASHBOARD");
    });

    it("should clear pageTitle for unknown routes", () => {
      routerEventSubject.next(
        Object.assign(new NavigationEnd(1, "/unknown", "/unknown"))
      );
      expect(component.pageTitle).toBe("");
    });
  });

  describe("register state subscription", () => {
    it("should update currentRegister when register opens", () => {
      currentRegister$.next(mockRegister);
      expect(component.currentRegister).toEqual(mockRegister);
    });

    it("should clear expectedCashData when register closes", () => {
      currentRegister$.next(mockRegister);
      currentRegister$.next(null);
      expect(component.expectedCashData()).toBeNull();
    });

    it("should sync printReceiptsEnabled from register", () => {
      currentRegister$.next({ ...mockRegister, printReceiptsEnabled: false });
      expect(component.printReceiptsEnabled).toBe(false);
    });
  });

  describe("isDarkMode subscription", () => {
    it("should update isDarkMode when theme changes", () => {
      isDarkMode$.next(true);
      expect(component.isDarkMode).toBe(true);
    });
  });

  describe("onDocumentClick()", () => {
    it("should close user dropdown when clicking outside", () => {
      component.showUserDropdown = true;
      const mockEvent = { target: document.createElement("div") };
      component.onDocumentClick(mockEvent as any);
      expect(component.showUserDropdown).toBe(false);
    });

    it("should close mobile sidebar when clicking outside", () => {
      component.mobileSidebarOpen = true;
      const mockEvent = { target: document.createElement("div") };
      component.onDocumentClick(mockEvent as any);
      expect(component.mobileSidebarOpen).toBe(false);
    });
  });

  it("ngOnDestroy() should complete destroy$ without error", () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  // ─── Spec 1: Session chips UI ─────────────────────────────────────────────

  describe("Spec 1: switchToSession()", () => {
    it("should call authService.switchSession() with the given userId", () => {
      component.switchToSession("u2");
      expect(mockAuthService.switchSession).toHaveBeenCalledWith("u2");
    });

    it("should update currentUser after switching", () => {
      const newUser = { ...mockUser2 };
      mockAuthService.getCurrentUser.mockReturnValue(newUser);
      component.switchToSession("u2");
      expect(component.currentUser).toEqual(newUser);
    });

    it("should NOT call switchSession when userId equals current user id", () => {
      component.switchToSession("u1");
      expect(mockAuthService.switchSession).not.toHaveBeenCalled();
    });
  });

  describe("Spec 1: closeSession()", () => {
    it("should call authService.removeSession() with the given userId", () => {
      component.closeSession("u2");
      expect(mockAuthService.removeSession).toHaveBeenCalledWith("u2");
    });

    it("should not throw when removing non-existing session", () => {
      expect(() => component.closeSession("unknown")).not.toThrow();
      expect(mockAuthService.removeSession).toHaveBeenCalledWith("unknown");
    });
  });

  describe("Spec 1: sessions$ observable", () => {
    it("sessions$ should be the observable from authService", (done) => {
      component.sessions$.subscribe((sessions) => {
        expect(sessions.length).toBe(1);
        expect(sessions[0].user.id).toBe("u1");
        done();
      });
    });

    it("sessions$ should emit updated list when sessions change", (done) => {
      const newSession: SessionEntry = { token: "t2", user: mockUser2 as any };
      let callCount = 0;
      component.sessions$.subscribe((sessions) => {
        callCount++;
        if (callCount === 2) {
          expect(sessions.length).toBe(2);
          done();
        }
      });
      sessionsSubject.next([
        { token: "t1", user: mockUser as any },
        newSession,
      ]);
    });
  });
});
