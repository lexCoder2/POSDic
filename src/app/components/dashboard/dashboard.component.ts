import { Component, OnInit, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router } from "@angular/router";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";
import { SaleService } from "../../services/sale.service";
import { ProductService } from "../../services/product.service";
import { UserService } from "../../services/user.service";
import { AuthService } from "../../services/auth.service";
import { PageTitleComponent } from "../page-title/page-title.component";

interface DashboardStats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  todaySales: number;
  todayRevenue: number;
  topProducts: { name: string; quantity: number; revenue: number }[];
  salesByPaymentMethod: { method: string; count: number; total: number }[];
  restockAlerts: {
    productId: string;
    name: string;
    stock: number;
    avgDailySales: number;
    daysUntilStockout: number;
    urgency: "critical" | "warning" | "info";
  }[];
  incompleteProducts?: {
    _id: string;
    name: string;
    price: number;
    sku: string;
    createdAt: Date;
  }[];
  internalSales?: {
    totalAmount: number;
    totalCount: number;
    todayAmount: number;
    todayCount: number;
  };
}

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, TranslatePipe, CurrencyPipe, PageTitleComponent],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit {
  private saleService = inject(SaleService);
  private productService = inject(ProductService);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private router = inject(Router);

  stats = signal<DashboardStats>({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalUsers: 0,
    todaySales: 0,
    todayRevenue: 0,
    topProducts: [],
    salesByPaymentMethod: [],
    restockAlerts: [],
  });

  isLoading = signal<boolean>(true);
  currentUser = this.authService.getCurrentUser();

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  navigateToProduct(productId: string): void {
    this.router.navigate(["/inventory"], {
      queryParams: { productId },
    });
  }

  loadDashboardData(): void {
    this.isLoading.set(true);

    // Get date range for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Load all sales
    this.saleService.getSales({ pageSize: 10000 }).subscribe({
      next: (response) => {
        const sales = response.data;
        const completedSales = sales.filter((s) => s.status === "completed");

        // Calculate total sales and revenue
        const totalRevenue = completedSales.reduce(
          (sum, sale) => sum + sale.total,
          0
        );

        // Calculate today's sales
        const todaySales = completedSales.filter(
          (sale) =>
            new Date(sale.createdAt!) >= today &&
            new Date(sale.createdAt!) < tomorrow
        );
        const todayRevenue = todaySales.reduce(
          (sum, sale) => sum + sale.total,
          0
        );

        // Calculate top products
        const productSales: Record<
          string,
          { name: string; quantity: number; revenue: number }
        > = {};
        completedSales.forEach((sale) => {
          sale.items.forEach((item) => {
            const key = item.productName || "Unknown";
            if (!productSales[key]) {
              productSales[key] = { name: key, quantity: 0, revenue: 0 };
            }
            productSales[key].quantity += item.quantity;
            productSales[key].revenue += item.total;
          });
        });

        const topProducts = Object.values(productSales)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10);

        // Calculate sales by payment method
        const paymentMethods: Record<string, { count: number; total: number }> =
          {};
        completedSales.forEach((sale) => {
          const method = sale.paymentMethod;
          if (!paymentMethods[method]) {
            paymentMethods[method] = { count: 0, total: 0 };
          }
          paymentMethods[method].count++;
          paymentMethods[method].total += sale.total;
        });

        const salesByPaymentMethod = Object.entries(paymentMethods).map(
          ([method, data]) => ({
            method,
            count: data.count,
            total: data.total,
          })
        );

        // Calculate restock alerts based on sales trend
        // Get last 30 days of sales
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSales = completedSales.filter(
          (sale) => new Date(sale.createdAt!) >= thirtyDaysAgo
        );

        // Calculate average daily sales per product
        const productDailySales: Record<
          string,
          { productId: string; name: string; totalSold: number }
        > = {};

        recentSales.forEach((sale) => {
          sale.items.forEach((item) => {
            const productId =
              item.product?.toString() || item.productName || "Unknown";
            const productName = item.productName || "Unknown";
            if (!productDailySales[productId]) {
              productDailySales[productId] = {
                productId,
                name: productName,
                totalSold: 0,
              };
            }
            productDailySales[productId].totalSold += item.quantity;
          });
        });

        // Load all products to check stock levels
        this.productService.getProducts({ pageSize: 10000 }).subscribe({
          next: (prodResponse) => {
            const allProducts = prodResponse.data;
            const restockAlerts: {
              productId: string;
              name: string;
              stock: number;
              avgDailySales: number;
              daysUntilStockout: number;
              urgency: "critical" | "warning" | "info";
            }[] = [];

            allProducts.forEach((product) => {
              const productId = product._id || "";
              const salesData = productDailySales[productId];

              if (salesData && salesData.totalSold > 0) {
                const avgDailySales = salesData.totalSold / 30;
                const currentStock = product.stock || 0;
                const daysUntilStockout =
                  avgDailySales > 0 ? currentStock / avgDailySales : 999;

                // Alert if stock will run out in less than 14 days
                if (daysUntilStockout < 14 && currentStock > 0) {
                  let urgency: "critical" | "warning" | "info" = "info";
                  if (daysUntilStockout < 3) {
                    urgency = "critical";
                  } else if (daysUntilStockout < 7) {
                    urgency = "warning";
                  }

                  restockAlerts.push({
                    productId,
                    name: product.name,
                    stock: currentStock,
                    avgDailySales: parseFloat(avgDailySales.toFixed(2)),
                    daysUntilStockout: parseFloat(daysUntilStockout.toFixed(1)),
                    urgency,
                  });
                }
              } else if ((product.stock || 0) === 0) {
                // Out of stock products
                restockAlerts.push({
                  productId,
                  name: product.name,
                  stock: 0,
                  avgDailySales: 0,
                  daysUntilStockout: 0,
                  urgency: "critical",
                });
              }
            });

            // Sort by urgency and days until stockout
            restockAlerts.sort((a, b) => {
              const urgencyOrder = { critical: 0, warning: 1, info: 2 };
              const urgencyDiff =
                urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
              if (urgencyDiff !== 0) return urgencyDiff;
              return a.daysUntilStockout - b.daysUntilStockout;
            });

            // Get incomplete products
            const incompleteProducts = allProducts
              .filter((p) => p.incompleteInfo)
              .map((p) => ({
                _id: p._id!,
                name: p.name,
                price: p.price,
                sku: p.sku || p.ean || p.product_id,
                createdAt: p.createdAt!,
              }))
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              );

            // Load users count
            this.userService.getUsers({ pageSize: 1 }).subscribe({
              next: (userResponse) => {
                // Load internal sales if user is admin or manager
                if (
                  this.currentUser?.role === "admin" ||
                  this.currentUser?.role === "manager"
                ) {
                  this.saleService.getInternalSalesStats().subscribe({
                    next: (internalStats) => {
                      // Calculate today's internal sales
                      const todayInternalSales =
                        internalStats.recentSales.filter(
                          (sale) =>
                            new Date(sale.createdAt!) >= today &&
                            new Date(sale.createdAt!) < tomorrow
                        );
                      const todayInternalAmount = todayInternalSales.reduce(
                        (sum, sale) => sum + sale.total,
                        0
                      );

                      this.stats.set({
                        totalSales: completedSales.length,
                        totalRevenue,
                        totalProducts: prodResponse.pagination.total,
                        totalUsers: userResponse.pagination.total,
                        todaySales: todaySales.length,
                        todayRevenue,
                        topProducts,
                        salesByPaymentMethod,
                        restockAlerts: restockAlerts.slice(0, 15),
                        incompleteProducts,
                        internalSales: {
                          totalAmount: internalStats.totalAmount,
                          totalCount: internalStats.totalCount,
                          todayAmount: todayInternalAmount,
                          todayCount: todayInternalSales.length,
                        },
                      });
                      this.isLoading.set(false);
                    },
                    error: () => {
                      // If error, just set stats without internal sales
                      this.stats.set({
                        totalSales: completedSales.length,
                        totalRevenue,
                        totalProducts: prodResponse.pagination.total,
                        totalUsers: userResponse.pagination.total,
                        todaySales: todaySales.length,
                        todayRevenue,
                        topProducts,
                        salesByPaymentMethod,
                        restockAlerts: restockAlerts.slice(0, 15),
                        incompleteProducts,
                      });
                      this.isLoading.set(false);
                    },
                  });
                } else {
                  this.stats.set({
                    totalSales: completedSales.length,
                    totalRevenue,
                    totalProducts: prodResponse.pagination.total,
                    totalUsers: userResponse.pagination.total,
                    todaySales: todaySales.length,
                    todayRevenue,
                    topProducts,
                    salesByPaymentMethod,
                    restockAlerts: restockAlerts.slice(0, 15),
                    incompleteProducts,
                  });
                  this.isLoading.set(false);
                }
              },
              error: () => {
                this.isLoading.set(false);
              },
            });
          },
          error: () => {
            this.isLoading.set(false);
          },
        });
      },
      error: (err) => {
        console.error("Error loading dashboard data:", err);
        this.isLoading.set(false);
      },
    });
  }
}
