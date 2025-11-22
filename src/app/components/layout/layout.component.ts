import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ViewChild,
  ElementRef,
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
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { ProductService } from "../../services/product.service";
import { SearchStateService } from "../../services/search-state.service";
import { TranslationService } from "../../services/translation.service";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { User, Product } from "../../models";
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
  ],
  templateUrl: "./layout.component.html",
  styleUrls: ["./layout.component.scss"],
})
export class LayoutComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  searchQuery = "";
  searchResults: Product[] = [];
  isSearching = false;
  showUserDropdown = false;
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  @ViewChild("globalSearchInput")
  globalSearchInput!: ElementRef<HTMLInputElement>;
  currentLang = "en";

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
    private productService: ProductService,
    private searchStateService: SearchStateService,
    private router: Router,
    private translation: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();

    this.currentLang = this.translation.current || "en";
    this.translation.currentLanguage$
      .pipe(takeUntil(this.destroy$))
      .subscribe((l) => (this.currentLang = l));

    // Setup search debouncing
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.performSearch(query);
      });

    // Focus the global search input when navigating to /pos
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const url =
          (event as NavigationEnd).urlAfterRedirects || (event as any).url;
        if (url && (url === "/pos" || url.startsWith("/pos"))) {
          // small timeout to ensure the element is present
          setTimeout(() => {
            try {
              this.globalSearchInput?.nativeElement?.focus();
            } catch (e) {
              // ignore if element not available
            }
          }, 80);
        }
      }
    });

    // If page loaded already at /pos, focus immediately
    try {
      if (
        this.router.url &&
        (this.router.url === "/pos" || this.router.url.startsWith("/pos"))
      ) {
        setTimeout(() => this.globalSearchInput?.nativeElement?.focus(), 80);
      }
    } catch (e) {
      // ignore
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchStateService.setSearchQuery(query);
    this.searchSubject.next(query);
  }

  performSearch(query: string): void {
    if (!query || query.trim().length === 0) {
      this.searchResults = [];
      this.isSearching = false;
      return;
    }

    this.isSearching = true;
    this.productService.searchProducts(query).subscribe({
      next: (products) => {
        this.searchResults = products;
        this.isSearching = false;
      },
      error: (err) => {
        console.error("Error searching products:", err);
        this.isSearching = false;
      },
    });
  }

  onProductSelected(product: Product): void {
    // Navigate to POS page and let it handle adding to cart
    this.router.navigate(["/pos"], { state: { selectedProduct: product } });
    this.searchQuery = "";
    this.searchResults = [];
  }

  @HostListener("document:keydown.escape")
  onEscapePress(): void {
    this.hideSearchResults();
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const searchContainer = target.closest(".global-search");
    const userDropdown = target.closest(".user-info");

    if (!searchContainer && this.searchResults.length > 0) {
      this.hideSearchResults();
    }

    if (!userDropdown && this.showUserDropdown) {
      this.showUserDropdown = false;
    }
  }

  hideSearchResults(): void {
    this.searchResults = [];
    this.isSearching = false;
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
  }

  logout(): void {
    this.showUserDropdown = false;
    this.authService.logout();
  }
}
