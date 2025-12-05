import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  ChangeDetectorRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil } from "rxjs";
import { RegisterService } from "../../services/register.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";
import { PageTitleComponent } from "../page-title/page-title.component";
import { Register, User } from "../../models";

@Component({
  selector: "app-registers",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    CurrencyPipe,
    PageTitleComponent,
  ],
  templateUrl: "./registers.component.html",
  styleUrls: ["./registers.component.scss"],
})
export class RegistersComponent implements OnInit, OnDestroy {
  registers: Register[] = [];
  filteredRegisters: Register[] = [];
  currentUser: User | null = null;
  loading = false;

  // Filters
  filterStatus: "all" | "open" | "closed" = "all";
  filterStartDate = "";
  filterEndDate = "";
  searchQuery = "";

  // Modal states
  showDetailModal = signal(false);
  showDeleteConfirm = signal(false);
  selectedRegister: Register | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;

  private destroy$ = new Subject<void>();

  constructor(
    private registerService: RegisterService,
    private authService: AuthService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadRegisters();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRegisters(): void {
    this.loading = true;
    const startDate = this.filterStartDate
      ? new Date(this.filterStartDate)
      : undefined;
    const endDate = this.filterEndDate
      ? new Date(this.filterEndDate)
      : undefined;

    this.registerService.getRegisterHistory(startDate, endDate).subscribe({
      next: (registers) => {
        this.registers = registers;
        this.applyFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error("Error loading registers:", err);
        this.toastService.show("Error loading registers", "error");
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  applyFilters(): void {
    let filtered = [...this.registers];

    // Status filter
    if (this.filterStatus !== "all") {
      filtered = filtered.filter((r) => r.status === this.filterStatus);
    }

    // Search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.registerNumber.toLowerCase().includes(query) ||
          (typeof r.openedBy !== "string" &&
            r.openedBy?.firstName?.toLowerCase().includes(query)) ||
          (typeof r.openedBy !== "string" &&
            r.openedBy?.lastName?.toLowerCase().includes(query)) ||
          (typeof r.closedBy !== "string" &&
            r.closedBy?.firstName?.toLowerCase().includes(query))
      );
    }

    this.filteredRegisters = filtered;
    this.totalPages = Math.ceil(this.filteredRegisters.length / this.pageSize);
    this.currentPage = 1;
    this.cdr.markForCheck();
  }

  get paginatedRegisters(): Register[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredRegisters.slice(start, end);
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onDateFilterChange(): void {
    this.loadRegisters();
  }

  clearFilters(): void {
    this.filterStatus = "all";
    this.filterStartDate = "";
    this.filterEndDate = "";
    this.searchQuery = "";
    this.loadRegisters();
  }

  viewDetails(register: Register): void {
    this.selectedRegister = register;
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedRegister = null;
  }

  confirmDelete(register: Register): void {
    this.selectedRegister = register;
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.selectedRegister = null;
  }

  deleteRegister(): void {
    if (!this.selectedRegister?._id) return;

    const registerId = this.selectedRegister._id;

    this.registerService.deleteRegister(registerId).subscribe({
      next: (response) => {
        this.toastService.show(
          response.message || "Register deleted successfully",
          "success"
        );
        this.showDeleteConfirm.set(false);
        this.selectedRegister = null;
        this.loadRegisters();
      },
      error: (err) => {
        console.error("Error deleting register:", err);
        const errorMsg = err.error?.message || "Error deleting register";
        this.toastService.show(errorMsg, "error");
        this.showDeleteConfirm.set(false);
      },
    });
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getOpenedByName(register: Register): string {
    if (typeof register.openedBy === "string") {
      return register.openedBy;
    }
    const user = register.openedBy as User;
    return user.firstName
      ? `${user.firstName} ${user.lastName || ""}`
      : user.username;
  }

  getClosedByName(register: Register): string {
    if (!register.closedBy) return "-";
    if (typeof register.closedBy === "string") {
      return register.closedBy;
    }
    const user = register.closedBy as User;
    return user.firstName
      ? `${user.firstName} ${user.lastName || ""}`
      : user.username;
  }

  calculateDuration(register: Register): string {
    if (!register.closedAt) return "Still open";

    const opened = new Date(register.openedAt);
    const closed = new Date(register.closedAt);
    const diffMs = closed.getTime() - opened.getTime();

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  exportToCSV(): void {
    const headers = [
      "Register Number",
      "Opened By",
      "Opened At",
      "Closed By",
      "Closed At",
      "Opening Cash",
      "Closing Cash",
      "Expected Cash",
      "Cash Difference",
      "Total Sales",
      "Transactions",
      "Status",
    ];

    const rows = this.filteredRegisters.map((r) => [
      r.registerNumber,
      this.getOpenedByName(r),
      new Date(r.openedAt).toLocaleString(),
      this.getClosedByName(r),
      r.closedAt ? new Date(r.closedAt).toLocaleString() : "",
      r.openingCash.toFixed(2),
      r.closingCash?.toFixed(2) || "",
      r.expectedCash?.toFixed(2) || "",
      r.cashDifference?.toFixed(2) || "",
      r.totalSales?.toFixed(2) || "",
      r.totalTransactions || "",
      r.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registers_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
