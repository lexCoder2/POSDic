import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ViewChild,
  ElementRef,
  signal,
  TemplateRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Router,
  NavigationEnd,
} from "@angular/router";
import { filter } from "rxjs/operators";
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { TranslationService } from "../../services/translation.service";
import { ToastService } from "../../services/toast.service";
import { RegisterService } from "../../services/register.service";
import { UserService } from "../../services/user.service";
import { ThemeService } from "../../services/theme.service";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";
import { ToastComponent } from "../toast/toast.component";
import { ModalComponent } from "../modal/modal.component";
import { GlobalSearchComponent } from "../global-search/global-search.component";
import { User, Register } from "../../models";
import { PageTitleComponent } from "../page-title/page-title.component";
@Component({
  selector: "app-layout",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TranslatePipe,
    ToastComponent,
    CurrencyPipe,
    ModalComponent,
    GlobalSearchComponent,
    PageTitleComponent,
  ],
  templateUrl: "./layout.component.html",
  styleUrls: ["./layout.component.scss"],
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  currentRegister: Register | null = null;
  showUserDropdown = false;
  showRegisterModal = false;
  showSwitchUserModal = false;
  showWithdrawModal = false;
  withdrawProcessing = false;
  private destroy$ = new Subject<void>();
  currentLang = "en";
  mobileSidebarOpen = false;
  isDarkMode = false;

  // Page title configuration
  pageTitle = "";
  pageIcon = "";
  pageActions: TemplateRef<any> | null = null;

  // Route to title/icon mapping
  private routeTitleMap: { [key: string]: { title: string; icon: string } } = {
    "/pos": { title: "GLOBAL.SIDEBAR.POS", icon: "fa-cash-register" },
    "/dashboard": {
      title: "GLOBAL.SIDEBAR.DASHBOARD",
      icon: "fa-tachometer-alt",
    },
    "/cashier": {
      title: "GLOBAL.SIDEBAR.QUICK_CASHIER",
      icon: "fa-calculator",
    },
    "/statistics": { title: "GLOBAL.SIDEBAR.STATISTICS", icon: "fa-chart-bar" },
    "/inventory": { title: "GLOBAL.SIDEBAR.INVENTORY", icon: "fa-boxes" },
    "/categories": { title: "GLOBAL.SIDEBAR.CATEGORIES", icon: "fa-tags" },
    "/providers": { title: "GLOBAL.SIDEBAR.SUPPLIERS", icon: "fa-truck" },
    "/sales": { title: "GLOBAL.SIDEBAR.SALES", icon: "fa-receipt" },
    "/registers": {
      title: "GLOBAL.SIDEBAR.REGISTERS",
      icon: "fa-cash-register",
    },
    "/users": { title: "GLOBAL.SIDEBAR.USERS", icon: "fa-users" },
    "/templates": {
      title: "GLOBAL.SIDEBAR.RECEIPT_TEMPLATES",
      icon: "fa-file-alt",
    },
    "/settings": { title: "SETTINGS.TITLE", icon: "fa-cog" },
    "/inventory-session": {
      title: "INVENTORY_SESSION.TITLE",
      icon: "fa-clipboard-list",
    },
  };

  // Expected cash data using signals
  expectedCashData = signal<{
    openingCash: number;
    totalCashSales: number;
    expectedCash: number;
    totalSales: number;
    totalTransactions: number;
    totalWithdrawals: number;
  } | null>(null);
  loadingExpectedCash = signal<boolean>(false);

  get isAdminOrManager(): boolean {
    return (
      this.currentUser?.role === "admin" || this.currentUser?.role === "manager"
    );
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === "admin";
  }

  constructor(
    private authService: AuthService,
    private router: Router,
    private translation: TranslationService,
    private toastService: ToastService,
    private registerService: RegisterService,
    private userService: UserService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.currentLang = this.translation.current || "en";
    this.translation.currentLanguage$
      .pipe(takeUntil(this.destroy$))
      .subscribe((l) => {
        this.currentLang = l;
        // Update page title when language changes
        this.updatePageTitle(this.router.url);
      });

    // Subscribe to theme changes
    this.themeService.isDarkMode$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isDark) => (this.isDarkMode = isDark));

    // Load current register and expected cash when register changes
    this.registerService.currentRegister$
      .pipe(takeUntil(this.destroy$))
      .subscribe((register) => {
        const wasOpen = !!this.currentRegister;
        const isNowOpen = !!register;
        this.currentRegister = register;

        // Load expected cash only when register opens (not on every update)
        if (!wasOpen && isNowOpen) {
          this.loadExpectedCash();
        } else if (!isNowOpen) {
          // Clear expected cash data when register closes
          this.expectedCashData.set(null);
        }
      });

    // Check for active register on load
    this.registerService.getActiveRegister().subscribe((register) => {
      // Load expected cash on initial load if register is open
      if (register) {
        this.loadExpectedCash();
      }
    });

    // Auto-refresh expected cash every 60 seconds when register is open
    setInterval(() => {
      if (this.currentRegister && !this.loadingExpectedCash()) {
        this.loadExpectedCash();
      }
    }, 60000);

    // Update page title on navigation and close mobile sidebar
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event) => {
        this.mobileSidebarOpen = false;
        this.updatePageTitle((event as NavigationEnd).urlAfterRedirects);
      });

    // Set initial page title
    this.updatePageTitle(this.router.url);
  }

  private updatePageTitle(url: string): void {
    // Find matching route (handle query params and fragments)
    const path = url.split("?")[0].split("#")[0];
    const routeConfig = this.routeTitleMap[path];

    if (routeConfig) {
      this.pageTitle = this.translation.translate(routeConfig.title);
      this.pageIcon = routeConfig.icon;
    } else {
      // Default fallback
      this.pageTitle = "";
      this.pageIcon = "";
    }
  }

  toggleSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeSidebar(): void {
    this.mobileSidebarOpen = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const userDropdown = target.closest(".user-info");
    const clickedSidebar = target.closest(".sidebar");
    const clickedToggle = target.closest(".mobile-sidebar-toggle");

    if (!userDropdown && this.showUserDropdown) {
      this.showUserDropdown = false;
    }

    // Close mobile sidebar when clicking outside of it (but ignore clicks on the toggle)
    if (!clickedSidebar && !clickedToggle && this.mobileSidebarOpen) {
      this.mobileSidebarOpen = false;
    }
  }

  toggleUserDropdown(): void {
    this.showUserDropdown = !this.showUserDropdown;
  }

  navigateToSettings(): void {
    this.showUserDropdown = false;
    this.router.navigate(["/settings"]);
  }

  setLanguage(lang: string): void {
    this.translation.setLanguage(lang);
    // Save language preference to database
    this.userService.updateUserSettings({ language: lang }).subscribe({
      next: () => {
        console.log("Language preference saved to database");
      },
      error: (err: any) => {
        console.error("Failed to save language preference:", err);
      },
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  switchUser(): void {
    this.showUserDropdown = false;
    this.showSwitchUserModal = true;
  }

  performSwitchUser(username: string, password: string): void {
    if (!username || !password) {
      this.toastService.show(
        this.translation.translate("GLOBAL.REGISTER.USERNAME") +
          " and " +
          this.translation.translate("GLOBAL.REGISTER.PASSWORD") +
          " required",
        "error"
      );
      return;
    }

    this.authService.login(username, password).subscribe({
      next: () => {
        this.currentUser = this.authService.getCurrentUser();
        this.showSwitchUserModal = false;
        const message = this.translation
          .translate("GLOBAL.REGISTER.SUCCESS.SWITCHED_USER")
          .replace("{{name}}", this.currentUser?.firstName || "");
        this.toastService.show(message, "success");
        // Check for active register for new user
        this.registerService.getActiveRegister().subscribe();
      },
      error: (err) => {
        this.toastService.show("Invalid credentials", "error");
      },
    });
  }

  manageRegister(): void {
    this.showUserDropdown = false;
    this.showRegisterModal = true;

    // If register is open, fetch expected cash
    if (this.currentRegister) {
      this.loadExpectedCash();
    }
  }

  loadExpectedCash(): void {
    if (!this.currentRegister) return;

    this.loadingExpectedCash.set(true);
    this.registerService.getExpectedCash().subscribe({
      next: (data) => {
        this.expectedCashData.set(data);
        this.loadingExpectedCash.set(false);
      },
      error: (err) => {
        console.error("Error loading expected cash:", err);
        this.loadingExpectedCash.set(false);
      },
    });
  }

  // Public method to refresh expected cash (can be called after sales)
  refreshExpectedCash(): void {
    this.loadExpectedCash();
  }

  openRegister(registerNumber: string, openingCash: string): void {
    const cash = parseFloat(openingCash) || 0;

    this.registerService.openRegister(cash, registerNumber).subscribe({
      next: (register) => {
        this.showRegisterModal = false;
        this.toastService.show(
          this.translation.translate("GLOBAL.REGISTER.SUCCESS.OPENED"),
          "success"
        );
      },
      error: (err) => {
        const message =
          err.error?.message ||
          this.translation.translate("GLOBAL.REGISTER.ERRORS.ALREADY_OPEN");
        this.toastService.show(message, "error");
      },
    });
  }

  closeRegister(closingCash: string, notes: string): void {
    if (!this.currentRegister) return;

    // Check if user is manager or admin
    if (
      this.currentUser?.role !== "admin" &&
      this.currentUser?.role !== "manager"
    ) {
      this.toastService.show(
        this.translation.translate("GLOBAL.REGISTER.ERRORS.PERMISSION_DENIED"),
        "error"
      );
      return;
    }

    // Clean the input: remove currency symbols and parse
    const cleanedValue = closingCash.replace(/[^0-9.-]/g, "");
    const cash = parseFloat(cleanedValue);

    if (isNaN(cash) || cash < 0) {
      this.toastService.show(
        this.translation.translate("GLOBAL.REGISTER.ERRORS.INVALID_AMOUNT"),
        "error"
      );
      return;
    }

    // Validate against expected cash if available
    const expectedCash = this.expectedCashData()?.expectedCash;
    if (expectedCash !== undefined && expectedCash !== null) {
      const difference = cash - expectedCash;
      const threshold = 0.01; // Allow 1 cent difference for rounding

      // Warn if difference is significant
      if (Math.abs(difference) > threshold) {
        const diffFormatted =
          difference > 0 ? `+${difference.toFixed(2)}` : difference.toFixed(2);
        const confirmMsg =
          this.translation.translate("GLOBAL.REGISTER.CONFIRM_DIFFERENCE") ||
          `Cash difference detected: ${diffFormatted}. Continue?`;

        if (!confirm(confirmMsg.replace("{difference}", diffFormatted))) {
          return;
        }
      }
    }

    this.registerService
      .closeRegister(this.currentRegister._id!, cash, notes)
      .subscribe({
        next: (register) => {
          this.showRegisterModal = false;
          const diff = register.cashDifference || 0;
          const diffMsg =
            diff !== 0
              ? ` (${diff > 0 ? "+" : ""}${diff.toFixed(2)} difference)`
              : "";
          const message =
            this.translation.translate("GLOBAL.REGISTER.SUCCESS.CLOSED") +
            diffMsg;
          this.toastService.show(message, diff === 0 ? "success" : "info");
        },
        error: (err) => {
          const message =
            err.error?.message ||
            this.translation.translate(
              "GLOBAL.REGISTER.ERRORS.PERMISSION_DENIED"
            );
          this.toastService.show(message, "error");
        },
      });
  }

  openWithdrawModal(): void {
    this.showUserDropdown = false;
    this.showWithdrawModal = true;
  }

  processWithdraw(amount: string, reason: string): void {
    if (!this.currentRegister) {
      this.toastService.show(
        this.translation.translate("WITHDRAW.ERRORS.NO_REGISTER"),
        "error"
      );
      return;
    }

    if (this.currentUser?.role !== "admin") {
      this.toastService.show(
        this.translation.translate("WITHDRAW.ERRORS.PERMISSION_DENIED"),
        "error"
      );
      return;
    }

    // Clean and validate amount
    const cleanedAmount = amount.replace(/[^0-9.-]/g, "");
    const withdrawAmount = parseFloat(cleanedAmount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      this.toastService.show(
        this.translation.translate("WITHDRAW.ERRORS.INVALID_AMOUNT"),
        "error"
      );
      return;
    }

    if (!reason || reason.trim().length === 0) {
      this.toastService.show(
        this.translation.translate("WITHDRAW.ERRORS.REASON_REQUIRED"),
        "error"
      );
      return;
    }

    // Check if withdraw amount exceeds expected cash
    const expectedCash = this.expectedCashData()?.expectedCash;
    if (expectedCash !== undefined && withdrawAmount > expectedCash) {
      const confirmMsg =
        this.translation.translate("WITHDRAW.CONFIRM_EXCEED") ||
        `Withdraw amount (${withdrawAmount}) exceeds expected cash (${expectedCash}). Continue?`;

      if (!confirm(confirmMsg)) {
        return;
      }
    }

    this.withdrawProcessing = true;

    // Create a withdrawal record via the register service
    this.registerService
      .recordWithdrawal(
        this.currentRegister._id!,
        withdrawAmount,
        reason.trim()
      )
      .subscribe({
        next: (response) => {
          this.showWithdrawModal = false;
          this.withdrawProcessing = false;
          this.toastService.show(
            this.translation.translate("WITHDRAW.SUCCESS"),
            "success"
          );
          // Refresh expected cash after withdrawal
          this.loadExpectedCash();
        },
        error: (err) => {
          this.withdrawProcessing = false;
          const message =
            err.error?.message ||
            this.translation.translate("WITHDRAW.ERRORS.FAILED");
          this.toastService.show(message, "error");
        },
      });
  }

  getRegisterDurationHours(): number {
    if (!this.currentRegister || !this.currentRegister.openedAt) return 0;
    const openedTime = new Date(this.currentRegister.openedAt).getTime();
    const now = Date.now();
    return (now - openedTime) / (1000 * 60 * 60);
  }

  isRegisterApproachingAutoClose(): boolean {
    const hours = this.getRegisterDurationHours();
    return hours >= 14; // Show warning at 14 hours
  }

  isRegisterOverdue(): boolean {
    const hours = this.getRegisterDurationHours();
    return hours >= 16;
  }

  logout(): void {
    this.showUserDropdown = false;
    this.authService.logout();
  }
}
