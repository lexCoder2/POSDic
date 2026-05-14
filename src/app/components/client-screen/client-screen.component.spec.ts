import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from "@angular/core/testing";
import { of, Subject } from "rxjs";
import { EMPTY } from "rxjs";
import { ClientScreenComponent } from "./client-screen.component";
import { CartService } from "../../services/cart.service";
import { AuthService } from "../../services/auth.service";
import { Router, ActivatedRoute } from "@angular/router";
import { TranslationService } from "../../services/translation.service";

describe("ClientScreenComponent", () => {
  let component: ClientScreenComponent;
  let fixture: ComponentFixture<ClientScreenComponent>;
  let cartServiceSpy: any;
  let authServiceSpy: any;
  let routerSpy: any;

  const mockUser = {
    id: "u1",
    username: "cashier1",
    firstName: "John",
    role: "cashier",
  };
  const mockCartItems = [
    {
      product: { _id: "p1", name: "P1" },
      quantity: 2,
      price: 10,
      subtotal: 20,
    },
  ];

  beforeEach(async () => {
    cartServiceSpy = {
      cartItems$: of([]),
      getTotal: jest.fn().mockReturnValue(100),
      getSubtotal: jest.fn().mockReturnValue(90),
      getTotalDiscount: jest.fn().mockReturnValue(10),
      getTotalTax: jest.fn().mockReturnValue(0),
      getItemCount: jest.fn().mockReturnValue(3),
      getIncompleteCartForCashier: jest
        .fn()
        .mockReturnValue(of({ items: mockCartItems })),
    };

    authServiceSpy = {
      getCurrentUser: jest.fn().mockReturnValue(mockUser),
    };

    routerSpy = {
      navigate: jest.fn().mockResolvedValue(true),
    };

    await TestBed.configureTestingModule({
      imports: [ClientScreenComponent],
      providers: [
        { provide: CartService, useValue: cartServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: jest.fn().mockReturnValue(null) },
            },
            queryParams: of({}),
          },
        },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            translationsChanged$: EMPTY,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientScreenComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Ensure timers are cleared after each test to prevent leaks
    component.ngOnDestroy();
    TestBed.resetTestingModule();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should set cashierName from user firstName on init", () => {
    component.ngOnInit();
    expect(component.cashierName).toBe("John");
  });

  it("should fall back to username if no firstName", () => {
    authServiceSpy.getCurrentUser.mockReturnValue({
      id: "u2",
      username: "admin",
      role: "admin",
    });
    component.ngOnInit();
    expect(component.cashierName).toBe("admin");
  });

  it("should generate a saleId on init", () => {
    component.ngOnInit();
    expect(component.saleId).toMatch(/^#\d{6}$/);
  });

  it("should set activeTab from query param", () => {
    TestBed.inject(ActivatedRoute).snapshot.queryParamMap.get = jest
      .fn()
      .mockReturnValue("fast");
    component.ngOnInit();
    expect(component.activeTab).toBe("fast");
  });

  it("should default activeTab to pos", () => {
    component.ngOnInit();
    expect(component.activeTab).toBe("pos");
  });

  it("setTab() should update activeTab", () => {
    component.setTab("fast");
    expect(component.activeTab).toBe("fast");
  });

  it("should fetch active cart on init", fakeAsync(() => {
    component.ngOnInit();
    tick();
    expect(cartServiceSpy.getIncompleteCartForCashier).toHaveBeenCalledWith(
      "u1"
    );
    expect(component.currentCart().length).toBe(1);
  }));

  it("currentCartTotal getter should return subtotal - discount + tax", fakeAsync(() => {
    component.ngOnInit();
    tick();
    // subtotal = 2*10 = 20, discount = 0, tax = 0
    expect(component.currentCartTotal).toBe(component.currentCartSubtotal);
  }));

  it("total getter should delegate to cartService.getTotal()", () => {
    expect(component.total).toBe(100);
  });

  it("itemCount getter should delegate to cartService.getItemCount()", () => {
    expect(component.itemCount).toBe(3);
  });

  it("formatPrice() should format to 2 decimal places", () => {
    expect(component.formatPrice(9.5)).toBe("9.50");
  });

  it("formatPrice() handles undefined/null", () => {
    expect(component.formatPrice(undefined as any)).toBe("0.00");
  });

  it("ngOnDestroy() should clear timers without error", () => {
    component.ngOnInit();
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
