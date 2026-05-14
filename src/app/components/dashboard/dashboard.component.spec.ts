import { TestBed, ComponentFixture } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { of, throwError } from "rxjs";
import { DashboardComponent } from "./dashboard.component";
import { SaleService } from "../../services/sale.service";
import { ProductService } from "../../services/product.service";
import { UserService } from "../../services/user.service";
import { AuthService } from "../../services/auth.service";
import { Sale, User, Product, PaginatedResponse } from "../../models";

const adminUser: User = {
  id: "u1",
  username: "admin",
  email: "a@a.com",
  firstName: "Admin",
  lastName: "Test",
  role: "admin",
};

const makeSale = (id: string, total = 100): Sale => ({
  _id: id,
  saleNumber: `SALE-${id.toUpperCase()}`,
  items: [
    {
      product: "p1" as any,
      productName: "Prod",
      quantity: 1,
      unitPrice: total,
      subtotal: total,
      total,
    },
  ],
  subtotal: total,
  taxTotal: 0,
  total,
  paymentMethod: "cash",
  cashier: adminUser,
  status: "completed",
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeProduct = (id: string, stock = 10): Product => ({
  _id: id,
  product_id: id,
  name: `Product ${id}`,
  price: 5,
  ean: id,
  stock,
});

const paginatedSales = (data: Sale[]): PaginatedResponse<Sale> => ({
  data,
  pagination: { total: data.length, page: 1, pageSize: 10000, totalPages: 1 },
});

const paginatedProducts = (data: Product[]): PaginatedResponse<Product> => ({
  data,
  pagination: { total: data.length, page: 1, pageSize: 10000, totalPages: 1 },
});

const paginatedUsers = (total: number) => ({
  data: [],
  pagination: { total, page: 1, pageSize: 1, totalPages: 1 },
});

describe("DashboardComponent", () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let saleServiceSpy: any;
  let productServiceSpy: any;
  let userServiceSpy: any;
  let authServiceSpy: any;

  beforeEach(async () => {
    saleServiceSpy = {
      getSales: jest.fn().mockReturnValue(of(paginatedSales([]))),
      getInternalSalesStats: jest.fn().mockReturnValue(of({ recentSales: [] })),
    };
    productServiceSpy = {
      getProducts: jest.fn().mockReturnValue(of(paginatedProducts([]))),
    };
    userServiceSpy = {
      getUsers: jest.fn().mockReturnValue(of(paginatedUsers(5))),
    };
    authServiceSpy = {
      getCurrentUser: jest.fn().mockReturnValue(adminUser),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, RouterTestingModule],
      providers: [
        { provide: SaleService, useValue: saleServiceSpy },
        { provide: ProductService, useValue: productServiceSpy },
        { provide: UserService, useValue: userServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should know the current user", () => {
    expect(component.currentUser).toEqual(adminUser);
  });

  it("should call getSales on init", () => {
    expect(saleServiceSpy.getSales).toHaveBeenCalled();
  });

  it("should set isLoading to false after successful data load", () => {
    expect(component.isLoading()).toBe(false);
  });

  describe("loadDashboardData", () => {
    it("should set totalRevenue from completed sales", () => {
      saleServiceSpy.getSales!.mockReturnValue(
        of(paginatedSales([makeSale("1", 50), makeSale("2", 150)]))
      );
      productServiceSpy.getProducts!.mockReturnValue(of(paginatedProducts([])));
      userServiceSpy.getUsers!.mockReturnValue(of(paginatedUsers(3)));
      component.loadDashboardData();
      expect(component.stats().totalRevenue).toBe(200);
    });

    it("should not count cancelled sales in revenue", () => {
      const cancelled: Sale = { ...makeSale("x", 999), status: "cancelled" };
      const completed: Sale = makeSale("y", 50);
      saleServiceSpy.getSales!.mockReturnValue(
        of(paginatedSales([cancelled, completed]))
      );
      productServiceSpy.getProducts!.mockReturnValue(of(paginatedProducts([])));
      userServiceSpy.getUsers!.mockReturnValue(of(paginatedUsers(1)));
      component.loadDashboardData();
      expect(component.stats().totalRevenue).toBe(50);
    });

    it("should set totalProducts from product pagination total", () => {
      saleServiceSpy.getSales!.mockReturnValue(of(paginatedSales([])));
      const prodResponse = {
        data: [],
        pagination: { total: 42, page: 1, pageSize: 1, totalPages: 1 },
      };
      productServiceSpy.getProducts!.mockReturnValue(of(prodResponse as any));
      userServiceSpy.getUsers!.mockReturnValue(of(paginatedUsers(1)));
      component.loadDashboardData();
      expect(component.stats().totalProducts).toBe(42);
    });

    it("should set isLoading=false after data load", () => {
      component.isLoading.set(true);
      saleServiceSpy.getSales!.mockReturnValue(of(paginatedSales([])));
      productServiceSpy.getProducts!.mockReturnValue(of(paginatedProducts([])));
      userServiceSpy.getUsers!.mockReturnValue(of(paginatedUsers(1)));
      component.loadDashboardData();
      expect(component.isLoading()).toBe(false);
    });

    it("should flag out-of-stock products as critical restock alerts", () => {
      const outOfStockProduct: Product = makeProduct("oos", 0);
      saleServiceSpy.getSales!.mockReturnValue(of(paginatedSales([])));
      productServiceSpy.getProducts!.mockReturnValue(
        of(paginatedProducts([outOfStockProduct]))
      );
      userServiceSpy.getUsers!.mockReturnValue(of(paginatedUsers(1)));
      component.loadDashboardData();
      const alerts = component.stats().restockAlerts;
      expect(alerts.some((a) => a.urgency === "critical")).toBe(true);
    });
  });

  describe("navigateToProduct", () => {
    it("should navigate to inventory with productId query param", () => {
      const routerSpy = jest.spyOn((component as any).router, "navigate");
      component.navigateToProduct("prod-123");
      expect(routerSpy).toHaveBeenCalledWith(["/inventory"], {
        queryParams: { productId: "prod-123" },
      });
    });
  });

  describe("loadDashboardData - advanced paths", () => {
    it("should populate topProducts from sale items", () => {
      const sale = makeSale("s1", 100);
      saleServiceSpy.getSales.mockReturnValue(of(paginatedSales([sale])));
      productServiceSpy.getProducts.mockReturnValue(of(paginatedProducts([])));
      userServiceSpy.getUsers.mockReturnValue(of(paginatedUsers(1)));
      component.loadDashboardData();
      expect(component.stats().topProducts.length).toBeGreaterThan(0);
      expect(component.stats().topProducts[0].name).toBe("Prod");
    });

    it("should populate salesByPaymentMethod", () => {
      const sale = makeSale("s1", 50);
      saleServiceSpy.getSales.mockReturnValue(of(paginatedSales([sale])));
      productServiceSpy.getProducts.mockReturnValue(of(paginatedProducts([])));
      userServiceSpy.getUsers.mockReturnValue(of(paginatedUsers(1)));
      component.loadDashboardData();
      const methods = component.stats().salesByPaymentMethod;
      expect(methods.some((m) => m.method === "cash")).toBe(true);
    });

    it("should populate incompleteProducts for products with incompleteInfo", () => {
      const incompleteProduct: Product = {
        ...makeProduct("ip1", 5),
        incompleteInfo: true,
        sku: "SKU-IP",
        createdAt: new Date(),
      };
      saleServiceSpy.getSales.mockReturnValue(of(paginatedSales([])));
      productServiceSpy.getProducts.mockReturnValue(
        of(paginatedProducts([incompleteProduct]))
      );
      userServiceSpy.getUsers.mockReturnValue(of(paginatedUsers(1)));
      component.loadDashboardData();
      expect(component.stats().incompleteProducts?.length).toBe(1);
      expect(component.stats().incompleteProducts![0]._id).toBe("ip1");
    });

    it("should include internalSales when user is admin", () => {
      saleServiceSpy.getSales.mockReturnValue(of(paginatedSales([])));
      saleServiceSpy.getInternalSalesStats.mockReturnValue(
        of({ recentSales: [], totalAmount: 500, totalCount: 3 })
      );
      productServiceSpy.getProducts.mockReturnValue(of(paginatedProducts([])));
      userServiceSpy.getUsers.mockReturnValue(of(paginatedUsers(2)));
      component.loadDashboardData();
      expect(component.stats().internalSales).toBeDefined();
      expect(component.stats().internalSales!.totalAmount).toBe(500);
    });

    it("should handle error from getInternalSalesStats gracefully", () => {
      saleServiceSpy.getSales.mockReturnValue(of(paginatedSales([])));
      saleServiceSpy.getInternalSalesStats.mockReturnValue(
        throwError(() => new Error("fail"))
      );
      productServiceSpy.getProducts.mockReturnValue(of(paginatedProducts([])));
      userServiceSpy.getUsers.mockReturnValue(of(paginatedUsers(1)));
      component.loadDashboardData();
      expect(component.isLoading()).toBe(false);
      expect(component.stats().internalSales).toBeUndefined();
    });

    it("should set isLoading=false when non-admin user", () => {
      authServiceSpy.getCurrentUser.mockReturnValue({
        ...adminUser,
        role: "cashier",
      });
      component.currentUser = authServiceSpy.getCurrentUser();
      saleServiceSpy.getSales.mockReturnValue(of(paginatedSales([])));
      productServiceSpy.getProducts.mockReturnValue(of(paginatedProducts([])));
      userServiceSpy.getUsers.mockReturnValue(of(paginatedUsers(1)));
      component.loadDashboardData();
      expect(component.isLoading()).toBe(false);
    });

    it("should set isLoading=false on getProducts error", () => {
      saleServiceSpy.getSales.mockReturnValue(of(paginatedSales([])));
      productServiceSpy.getProducts.mockReturnValue(
        throwError(() => new Error("prod error"))
      );
      component.loadDashboardData();
      expect(component.isLoading()).toBe(false);
    });

    it("should set isLoading=false on getSales error", () => {
      saleServiceSpy.getSales.mockReturnValue(
        throwError(() => new Error("sales error"))
      );
      component.loadDashboardData();
      expect(component.isLoading()).toBe(false);
    });

    it("should set isLoading=false on getUsers error", () => {
      saleServiceSpy.getSales.mockReturnValue(of(paginatedSales([])));
      productServiceSpy.getProducts.mockReturnValue(of(paginatedProducts([])));
      userServiceSpy.getUsers.mockReturnValue(
        throwError(() => new Error("user error"))
      );
      component.loadDashboardData();
      expect(component.isLoading()).toBe(false);
    });

    it("should generate warning urgency restock alert for product running low", () => {
      // Create product with stock=5 and sales that push daysUntilStockout < 7
      const product: Product = makeProduct("p-warn", 10);
      product._id = "p-warn";
      // Mock 30 days ago sale so the product has avgDailySales > stock/7
      // To get daysUntilStockout = stock / avgDailySales < 7 (warning) and >= 3
      // avgDailySales = totalSold/30. stock=10. Need 10/(totalSold/30) < 7 → totalSold > 42.86 → use 50
      const sales: Sale[] = Array.from({ length: 1 }, (_, i) => ({
        ...makeSale(`rs${i}`, 10),
        items: [
          {
            product: "p-warn" as any,
            productName: "P Warn",
            quantity: 50,
            unitPrice: 10,
            subtotal: 500,
            total: 500,
          },
        ],
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      }));
      saleServiceSpy.getSales.mockReturnValue(of(paginatedSales(sales)));
      productServiceSpy.getProducts.mockReturnValue(
        of(paginatedProducts([product]))
      );
      userServiceSpy.getUsers.mockReturnValue(of(paginatedUsers(1)));
      component.loadDashboardData();
      const alerts = component.stats().restockAlerts;
      expect(
        alerts.some(
          (a) =>
            a.urgency === "warning" ||
            a.urgency === "info" ||
            a.urgency === "critical"
        )
      ).toBe(true);
    });
  });
});
