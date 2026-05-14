import { ComponentFixture, TestBed } from "@angular/core/testing";
import { NO_ERRORS_SCHEMA } from "@angular/core";
import { of, throwError } from "rxjs";
import { StatisticsComponent } from "./statistics.component";
import { SaleService } from "../../services/sale.service";
import { ProductService } from "../../services/product.service";
import { TranslationService } from "../../services/translation.service";
import { EMPTY } from "rxjs";

const mockSales = [
  {
    _id: "s1",
    status: "completed",
    total: 100,
    paymentMethod: "cash",
    createdAt: new Date().toISOString(),
    items: [],
  },
  {
    _id: "s2",
    status: "completed",
    total: 200,
    paymentMethod: "card",
    createdAt: new Date().toISOString(),
    items: [],
  },
  {
    _id: "s3",
    status: "cancelled",
    total: 50,
    paymentMethod: "cash",
    createdAt: new Date().toISOString(),
    items: [],
  },
];

const mockProducts = [
  { _id: "p1", name: "Product 1", category: "Drinks", price: 10 },
  { _id: "p2", name: "Product 2", category: "Food", price: 20 },
  { _id: "p3", name: "Product 3", category: "Drinks", price: 15 },
];

describe("StatisticsComponent", () => {
  let component: StatisticsComponent;
  let fixture: ComponentFixture<StatisticsComponent>;
  let saleServiceSpy: any;
  let productServiceSpy: any;

  beforeEach(async () => {
    saleServiceSpy = {
      getSales: jest.fn().mockReturnValue(of({ data: mockSales, total: 3 })),
    };
    productServiceSpy = {
      getProducts: jest
        .fn()
        .mockReturnValue(of({ data: mockProducts, total: 3 })),
    };

    await TestBed.configureTestingModule({
      imports: [StatisticsComponent],
      providers: [
        { provide: SaleService, useValue: saleServiceSpy },
        { provide: ProductService, useValue: productServiceSpy },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn().mockReturnValue(""),
            translationsChanged$: EMPTY,
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StatisticsComponent);
    component = fixture.componentInstance;
    // Trigger ngOnInit without rendering the template (avoids Angular NG0955
    // duplicate-track-key warnings caused by all-zero chart bar values in jsdom)
    component.ngOnInit();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load sales and products on init", () => {
    expect(saleServiceSpy.getSales).toHaveBeenCalled();
    expect(productServiceSpy.getProducts).toHaveBeenCalled();
    expect(component.sales()).toHaveLength(3);
    expect(component.products()).toHaveLength(3);
  });

  it("should set isLoading to false after data loads", () => {
    expect(component.isLoading()).toBe(false);
  });

  it("should compute totalRevenue from completed sales only", () => {
    // 100 + 200 = 300 (excluded cancelled 50)
    expect(component.totalRevenue()).toBe(300);
  });

  it("should compute totalSales count from completed sales", () => {
    expect(component.totalSales()).toBe(2);
  });

  it("should compute averageTransaction", () => {
    expect(component.averageTransaction()).toBe(150);
  });

  it("should compute unique categories from products", () => {
    const cats = component.categories();
    expect(cats).toContain("Drinks");
    expect(cats).toContain("Food");
  });

  describe("setTab()", () => {
    it("should switch to reports tab", () => {
      component.setTab("reports");
      expect(component.selectedTab()).toBe("reports");
    });
  });

  describe("setPeriod()", () => {
    it("should update selectedPeriod signal", () => {
      component.setPeriod("week");
      expect(component.selectedPeriod()).toBe("week");
    });
  });

  describe("setChart()", () => {
    it("should update selectedChart signal", () => {
      component.setChart("revenue");
      expect(component.selectedChart()).toBe("revenue");
    });
  });

  describe("getMaxValue()", () => {
    it("should return the max of an array", () => {
      expect(component.getMaxValue([10, 50, 30])).toBe(50);
    });

    it("should return 0 for empty array", () => {
      expect(component.getMaxValue([])).toBe(0);
    });
  });

  describe("getBarHeight()", () => {
    it("should return percentage height", () => {
      expect(component.getBarHeight(50, 100)).toBe(50);
    });

    it("should return 0 when max is 0", () => {
      expect(component.getBarHeight(50, 0)).toBe(0);
    });
  });

  describe("error handling", () => {
    it("should set isLoading to false on sales error", async () => {
      saleServiceSpy.getSales.mockReturnValue(
        throwError(() => new Error("API error"))
      );
      component.loadData();
      expect(component.isLoading()).toBe(false);
    });

    it("should set isLoading to false on products error", async () => {
      productServiceSpy.getProducts.mockReturnValue(
        throwError(() => new Error("API error"))
      );
      component.loadData();
      expect(component.isLoading()).toBe(false);
    });
  });

  // ──────────────────────────────────────────────
  // analytics computed property (covers lines 44–163)
  // ──────────────────────────────────────────────

  describe("analytics computed", () => {
    const salesWithItems = [
      {
        _id: "s1",
        status: "completed",
        total: 100,
        paymentMethod: "cash",
        createdAt: new Date().toISOString(),
        items: [
          {
            productName: "Apples",
            quantity: 2,
            unitPrice: 5,
            total: 10,
            subtotal: 10,
          },
        ],
      },
      {
        _id: "s2",
        status: "completed",
        total: 200,
        paymentMethod: "card",
        createdAt: new Date().toISOString(),
        items: [
          {
            productName: "Bananas",
            quantity: 1,
            unitPrice: 20,
            total: 20,
            subtotal: 20,
          },
        ],
      },
      {
        _id: "s3",
        status: "cancelled",
        total: 50,
        paymentMethod: "cash",
        createdAt: new Date().toISOString(),
        items: [],
      },
    ];

    beforeEach(() => {
      component.sales.set(salesWithItems as any);
    });

    it("returns dailySales with labels and values", () => {
      const a = component.analytics();
      expect(a.dailySales.labels).toBeDefined();
      expect(a.dailySales.values).toBeDefined();
    });

    it("returns monthlySales with 12 months", () => {
      const a = component.analytics();
      expect(a.monthlySales.labels.length).toBe(12);
      expect(a.monthlySales.values.length).toBe(12);
    });

    it("returns topCategories from item names", () => {
      const a = component.analytics();
      expect(a.topCategories.labels).toContain("Apples");
    });

    it("returns salesTrend with 30 entries", () => {
      const a = component.analytics();
      expect(a.salesTrend.labels.length).toBe(30);
    });

    it("returns paymentMethods distribution", () => {
      const a = component.analytics();
      expect(a.paymentMethods.labels).toContain("cash");
      expect(a.paymentMethods.labels).toContain("card");
    });

    it("handles week period", () => {
      component.setPeriod("week");
      const a = component.analytics();
      expect(a.dailySales).toBeDefined();
    });

    it("handles year period", () => {
      component.setPeriod("year");
      const a = component.analytics();
      expect(a.monthlySales.values.length).toBe(12);
    });
  });

  // ──────────────────────────────────────────────
  // periodRevenue (covers lines 190–206)
  // ──────────────────────────────────────────────

  describe("periodRevenue computed", () => {
    const recentSale: any = {
      _id: "pr1",
      status: "completed",
      total: 150,
      paymentMethod: "cash",
      createdAt: new Date().toISOString(),
      items: [],
    };

    beforeEach(() => {
      component.sales.set([recentSale]);
    });

    it("includes recent sales in week period", () => {
      component.setPeriod("week");
      expect(component.periodRevenue()).toBe(150);
    });

    it("includes recent sales in month period", () => {
      component.setPeriod("month");
      expect(component.periodRevenue()).toBe(150);
    });

    it("includes recent sales in year period", () => {
      component.setPeriod("year");
      expect(component.periodRevenue()).toBe(150);
    });

    it("excludes old sales", () => {
      const oldDate = new Date("2000-01-01").toISOString();
      component.sales.set([{ ...recentSale, createdAt: oldDate }]);
      component.setPeriod("week");
      expect(component.periodRevenue()).toBe(0);
    });
  });
});
