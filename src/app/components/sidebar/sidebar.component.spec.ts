import { ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { BehaviorSubject, EMPTY } from "rxjs";
import { SidebarComponent } from "./sidebar.component";
import { TranslationService } from "../../services/translation.service";
import { SettingsService } from "../../services/settings.service";

describe("SidebarComponent", () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let settings$: BehaviorSubject<any>;

  beforeEach(async () => {
    localStorage.clear();
    settings$ = new BehaviorSubject({
      estimatedCostEnabled: false,
      estimatedCostMarginPercent: 30,
      sellMode: "combined",
    });

    await TestBed.configureTestingModule({
      imports: [SidebarComponent, RouterTestingModule],
      providers: [
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            translationsChanged$: EMPTY,
          },
        },
        {
          provide: SettingsService,
          useValue: { settings$: settings$.asObservable() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("ngOnInit()", () => {
    it("should load isExtended false when nothing in localStorage", () => {
      expect(component.isExtended).toBe(false);
    });

    it("should load isExtended true from localStorage", () => {
      localStorage.setItem("sidebar_extended", "true");
      component.ngOnInit();
      expect(component.isExtended).toBe(true);
    });
  });

  describe("toggleSidebar()", () => {
    it("should toggle isExtended from false to true", () => {
      component.isExtended = false;
      component.toggleSidebar();
      expect(component.isExtended).toBe(true);
      expect(localStorage.getItem("sidebar_extended")).toBe("true");
    });

    it("should toggle isExtended from true to false", () => {
      component.isExtended = true;
      component.toggleSidebar();
      expect(component.isExtended).toBe(false);
      expect(localStorage.getItem("sidebar_extended")).toBe("false");
    });
  });

  describe("@Input properties", () => {
    it("should accept mobileSidebarOpen input", () => {
      component.mobileSidebarOpen = true;
      expect(component.mobileSidebarOpen).toBe(true);
    });

    it("should accept isAdminOrManager input", () => {
      component.isAdminOrManager = true;
      expect(component.isAdminOrManager).toBe(true);
    });

    it("should accept isAdmin input", () => {
      component.isAdmin = true;
      expect(component.isAdmin).toBe(true);
    });
  });

  describe("Spec 4: Settings must not appear in sidebar navigation", () => {
    it("should NOT render a /settings link even for admin users", () => {
      component.isAdminOrManager = true;
      component.isAdmin = true;
      fixture.detectChanges();
      const nav = fixture.nativeElement as HTMLElement;
      const links = Array.from(nav.querySelectorAll("[routerLink]"));
      const settingsLinks = links.filter(
        (el) => el.getAttribute("routerLink") === "/settings"
      );
      expect(settingsLinks).toHaveLength(0);
    });

    it("should NOT render a /settings link for non-admin users", () => {
      component.isAdminOrManager = false;
      component.isAdmin = false;
      fixture.detectChanges();
      const nav = fixture.nativeElement as HTMLElement;
      const links = Array.from(nav.querySelectorAll("[routerLink]"));
      const settingsLinks = links.filter(
        (el) => el.getAttribute("routerLink") === "/settings"
      );
      expect(settingsLinks).toHaveLength(0);
    });
  });

  describe("Spec 3: Quick Cashier must not appear in sidebar navigation", () => {
    it("should NOT render a /cashier link in the navigation", () => {
      fixture.detectChanges();
      const nav = fixture.nativeElement as HTMLElement;
      const links = Array.from(nav.querySelectorAll("[routerLink]"));
      const cashierLinks = links.filter(
        (el) => el.getAttribute("routerLink") === "/cashier"
      );
      expect(cashierLinks).toHaveLength(0);
    });
  });

  describe("sell mode navigation", () => {
    it("should NOT render dispatcher or checkout-desk links in combined mode", () => {
      fixture.detectChanges();
      const nav = fixture.nativeElement as HTMLElement;
      const links = Array.from(nav.querySelectorAll("[routerLink]"));

      expect(
        links.filter((el) => el.getAttribute("routerLink") === "/dispatcher")
      ).toHaveLength(0);
      expect(
        links.filter((el) => el.getAttribute("routerLink") === "/checkout-desk")
      ).toHaveLength(0);
    });

    it("should render checkout-desk and hide dispatcher in split mode", () => {
      settings$.next({
        estimatedCostEnabled: false,
        estimatedCostMarginPercent: 30,
        sellMode: "split",
      });
      fixture.detectChanges();
      const nav = fixture.nativeElement as HTMLElement;
      const links = Array.from(nav.querySelectorAll("[routerLink]"));

      expect(
        links.filter((el) => el.getAttribute("routerLink") === "/dispatcher")
      ).toHaveLength(0);
      expect(
        links.filter((el) => el.getAttribute("routerLink") === "/checkout-desk")
      ).toHaveLength(1);
    });
  });

  describe("categories navigation", () => {
    it("should render a /categories link for admin or manager users", () => {
      component.isAdminOrManager = true;
      fixture.detectChanges();

      const nav = fixture.nativeElement as HTMLElement;
      const links = Array.from(nav.querySelectorAll("[routerLink]"));
      const categoryLinks = links.filter(
        (el) => el.getAttribute("routerLink") === "/categories"
      );

      expect(categoryLinks).toHaveLength(1);
    });

    it("should hide the /categories link for users without inventory access", () => {
      component.isAdminOrManager = false;
      fixture.detectChanges();

      const nav = fixture.nativeElement as HTMLElement;
      const links = Array.from(nav.querySelectorAll("[routerLink]"));
      const categoryLinks = links.filter(
        (el) => el.getAttribute("routerLink") === "/categories"
      );

      expect(categoryLinks).toHaveLength(0);
    });
  });
});
