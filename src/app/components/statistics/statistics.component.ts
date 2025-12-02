import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";
import { SaleService } from "../../services/sale.service";
import { ProductService } from "../../services/product.service";
import { Sale, Product } from "../../models";
import { PageTitleComponent } from "../page-title/page-title.component";

interface ChartData {
  labels: string[];
  values: number[];
}

interface SalesAnalytics {
  dailySales: ChartData;
  monthlySales: ChartData;
  topCategories: ChartData;
  salesTrend: ChartData;
  paymentMethods: ChartData;
}

@Component({
  selector: "app-statistics",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    CurrencyPipe,
    PageTitleComponent,
  ],
  templateUrl: "./statistics.component.html",
  styleUrls: ["./statistics.component.scss"],
})
export class StatisticsComponent implements OnInit {
  sales = signal<Sale[]>([]);
  products = signal<Product[]>([]);
  isLoading = signal<boolean>(true);

  selectedPeriod = signal<"week" | "month" | "year">("month");
  selectedChart = signal<"sales" | "revenue" | "products">("sales");

  analytics = computed<SalesAnalytics>(() => {
    const allSales = this.sales();
    const completedSales = allSales.filter((s) => s.status === "completed");
    const period = this.selectedPeriod();

    // Calculate date range based on period
    const now = new Date();
    const startDate = new Date();
    if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const filteredSales = completedSales.filter(
      (sale) => new Date(sale.createdAt!) >= startDate
    );

    // Daily sales for the period
    const dailySalesMap: { [key: string]: number } = {};
    const dailyRevenueMap: { [key: string]: number } = {};

    filteredSales.forEach((sale) => {
      const date = new Date(sale.createdAt!).toLocaleDateString();
      dailySalesMap[date] = (dailySalesMap[date] || 0) + 1;
      dailyRevenueMap[date] = (dailyRevenueMap[date] || 0) + sale.total;
    });

    const dailySales: ChartData = {
      labels: Object.keys(dailySalesMap).slice(-14),
      values: Object.keys(dailySalesMap)
        .slice(-14)
        .map((key) => dailySalesMap[key]),
    };

    // Monthly sales for the year
    const monthlySalesMap: { [key: string]: number } = {};
    const monthlyRevenueMap: { [key: string]: number } = {};

    completedSales.forEach((sale) => {
      const date = new Date(sale.createdAt!);
      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      monthlySalesMap[monthKey] = (monthlySalesMap[monthKey] || 0) + 1;
      monthlyRevenueMap[monthKey] =
        (monthlyRevenueMap[monthKey] || 0) + sale.total;
    });

    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    });

    const monthlySales: ChartData = {
      labels: last12Months.map((m) => {
        const [year, month] = m.split("-");
        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
          "en-US",
          {
            month: "short",
            year: "numeric",
          }
        );
      }),
      values: last12Months.map((m) => monthlySalesMap[m] || 0),
    };

    // Top categories
    const categoryMap: { [key: string]: number } = {};

    completedSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const category = item.productName || "Unknown";
        categoryMap[category] = (categoryMap[category] || 0) + item.total;
      });
    });

    const sortedCategories = Object.entries(categoryMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const topCategories: ChartData = {
      labels: sortedCategories.map(([name]) => name),
      values: sortedCategories.map(([, value]) => value),
    };

    // Sales trend (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toLocaleDateString();
    });

    const trendMap: { [key: string]: number } = {};
    completedSales.forEach((sale) => {
      const date = new Date(sale.createdAt!).toLocaleDateString();
      trendMap[date] = (trendMap[date] || 0) + sale.total;
    });

    const salesTrend: ChartData = {
      labels: last30Days,
      values: last30Days.map((date) => trendMap[date] || 0),
    };

    // Payment methods
    const paymentMap: { [key: string]: number } = {};
    completedSales.forEach((sale) => {
      paymentMap[sale.paymentMethod] =
        (paymentMap[sale.paymentMethod] || 0) + 1;
    });

    const paymentMethods: ChartData = {
      labels: Object.keys(paymentMap),
      values: Object.values(paymentMap),
    };

    return {
      dailySales,
      monthlySales,
      topCategories,
      salesTrend,
      paymentMethods,
    };
  });

  // Computed statistics
  totalRevenue = computed(() => {
    return this.sales()
      .filter((s) => s.status === "completed")
      .reduce((sum, sale) => sum + sale.total, 0);
  });

  totalSales = computed(() => {
    return this.sales().filter((s) => s.status === "completed").length;
  });

  averageTransaction = computed(() => {
    const total = this.totalSales();
    return total > 0 ? this.totalRevenue() / total : 0;
  });

  // Revenue for selected period
  periodRevenue = computed(() => {
    const period = this.selectedPeriod();
    const now = new Date();
    const startDate = new Date();

    if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    return this.sales()
      .filter(
        (s) => s.status === "completed" && new Date(s.createdAt!) >= startDate
      )
      .reduce((sum, sale) => sum + sale.total, 0);
  });

  constructor(
    private saleService: SaleService,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    this.saleService.getSales({ pageSize: 10000 }).subscribe({
      next: (response) => {
        this.sales.set(response.data);

        this.productService.getProducts({ pageSize: 10000 }).subscribe({
          next: (prodResponse) => {
            this.products.set(prodResponse.data);
            this.isLoading.set(false);
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
  }

  setPeriod(period: "week" | "month" | "year"): void {
    this.selectedPeriod.set(period);
  }

  setChart(chart: "sales" | "revenue" | "products"): void {
    this.selectedChart.set(chart);
  }

  getMaxValue(values: number[]): number {
    return Math.max(...values, 0);
  }

  getBarHeight(value: number, max: number): number {
    return max > 0 ? (value / max) * 100 : 0;
  }
}
