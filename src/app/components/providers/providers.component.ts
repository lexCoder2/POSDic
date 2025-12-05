import { Component, OnInit, OnDestroy, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil, skip } from "rxjs";
import { ProviderService } from "../../services/provider.service";
import { AuthService } from "../../services/auth.service";
import { SearchStateService } from "../../services/search-state.service";
import { ToastService } from "../../services/toast.service";
import { Provider, User } from "../../models";
import { PageTitleComponent } from "../page-title/page-title.component";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { TranslationService } from "../../services/translation.service";
import { ToggleSwitchComponent } from "../toggle-switch/toggle-switch.component";

@Component({
  selector: "app-providers",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageTitleComponent,
    TranslatePipe,
    ToggleSwitchComponent,
  ],
  templateUrl: "./providers.component.html",
  styleUrls: ["./providers.component.scss"],
})
export class ProvidersComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  providers = signal<Provider[]>([]);
  searchQuery = signal<string>("");
  filteredProviders = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.providers();
    return this.providers().filter(
      (p) =>
        p.name?.toLowerCase().includes(query) ||
        p.code?.toLowerCase().includes(query) ||
        p.contactName?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.phone?.toLowerCase().includes(query)
    );
  });
  showProviderModal = false;
  isEditing = false;

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  paginatedProviders = computed(() => {
    const filtered = this.filteredProviders();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });
  totalPages = computed(() =>
    Math.ceil(this.filteredProviders().length / this.pageSize())
  );

  providerForm: Partial<Provider> = {
    name: "",
    contactName: "",
    email: "",
    phone: "",
    taxId: "",
    paymentTerms: "30days",
    notes: "",
    active: true,
  };

  private destroy$ = new Subject<void>();

  constructor(
    private providerService: ProviderService,
    private authService: AuthService,
    private searchStateService: SearchStateService,
    private translation: TranslationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.searchStateService.clearSearch();
    this.loadProviders();

    // Subscribe to header search bar
    this.searchStateService.searchQuery$
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchStateService.clearSearch();
  }

  isAdmin(): boolean {
    return this.currentUser?.role === "admin";
  }

  loadProviders(): void {
    this.providerService.getProviders().subscribe({
      next: (response) => {
        this.providers.set(response.data);
      },
      error: (err) => console.error("Error loading providers:", err),
    });
  }

  openProviderModal(provider?: Provider): void {
    if (provider) {
      this.isEditing = true;
      this.providerForm = { ...provider };
    } else {
      this.isEditing = false;
      this.providerForm = {
        name: "",
        contactName: "",
        email: "",
        phone: "",
        taxId: "",
        paymentTerms: "30days",
        notes: "",
        active: true,
      };
    }
    this.showProviderModal = true;
  }

  saveProvider(): void {
    if (!this.providerForm.name) {
      this.toastService.show(
        this.translation.translate("PROVIDERS.ALERTS.FILL_REQUIRED"),
        "info"
      );
      return;
    }

    if (this.isEditing && this.providerForm._id) {
      this.providerService
        .updateProvider(this.providerForm._id, this.providerForm)
        .subscribe({
          next: (updated) => {
            const index = this.providers().findIndex(
              (p) => p._id === updated._id
            );
            if (index !== -1) {
              const updatedProviders = [...this.providers()];
              updatedProviders[index] = updated;
              this.providers.set(updatedProviders);
            }
            this.showProviderModal = false;
          },
          error: (err) => console.error("Error updating provider:", err),
        });
    } else {
      this.providerService.createProvider(this.providerForm).subscribe({
        next: (created) => {
          this.providers.set([...this.providers(), created]);
          this.showProviderModal = false;
        },
        error: (err) => console.error("Error creating provider:", err),
      });
    }
  }

  deleteProvider(id: string): void {
    if (!this.isAdmin()) {
      this.toastService.show(
        this.translation.translate("PROVIDERS.ALERTS.ADMIN_DELETE"),
        "error"
      );
      return;
    }

    if (
      confirm(this.translation.translate("PROVIDERS.ALERTS.CONFIRM_DELETE"))
    ) {
      this.providerService.deleteProvider(id).subscribe({
        next: () => {
          this.providers.set(this.providers().filter((p) => p._id !== id));
        },
        error: (err) => console.error("Error deleting provider:", err),
      });
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  getVisiblePages(): number[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const delta = 2;
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > delta + 2) pages.push(-1);
      const start = Math.max(2, current - delta);
      const end = Math.min(total - 1, current + delta);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (current < total - delta - 1) pages.push(-1);
      pages.push(total);
    }
    return pages;
  }

  paymentTermKey(terms?: string): string {
    const map: Record<string, string> = {
      immediate: "PROVIDERS.PAYMENT.IMMEDIATE",
      "15days": "PROVIDERS.PAYMENT.15DAYS",
      "30days": "PROVIDERS.PAYMENT.30DAYS",
      "60days": "PROVIDERS.PAYMENT.60DAYS",
      "90days": "PROVIDERS.PAYMENT.90DAYS",
    };
    return terms ? map[terms] || terms : "-";
  }
}
