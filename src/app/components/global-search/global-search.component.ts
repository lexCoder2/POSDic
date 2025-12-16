import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
  inject,
} from "@angular/core";

import { FormsModule } from "@angular/forms";
import { Router, NavigationEnd } from "@angular/router";
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from "rxjs";
import { CartService } from "../../services/cart.service";
import { SearchStateService } from "../../services/search-state.service";
import { ToastService } from "../../services/toast.service";
import { ProductService } from "../../services/product.service";
import { Product } from "@app/models";
import { TranslatePipe } from "@app/pipes/translate.pipe";

@Component({
  selector: "app-global-search",
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: "./global-search.component.html",
  styleUrls: ["./global-search.component.scss"],
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private searchStateService = inject(SearchStateService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  searchQuery = "";
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private lastEnterSearchTime = 0;
  private lastEnterSearchQuery = "";

  @ViewChild("globalSearchInput")
  globalSearchInput!: ElementRef<HTMLInputElement>;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  ngOnInit(): void {
    // Setup search debouncing
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.performSearch(query);
      });

    // Subscribe to search state to update the input field (for inventory-session EAN display)
    this.searchStateService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe((query) => {
        if (query !== this.searchQuery) {
          this.searchQuery = query;
        }
      });

    // Focus the global search input on every route change
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // small timeout to ensure the element is present
        setTimeout(() => {
          try {
            const input = this.globalSearchInput?.nativeElement;
            if (input) {
              input.focus();
              input.select();
            }
          } catch (e) {
            // ignore if element not available
          }
        }, 80);
      }
    });

    // Focus on initial load
    setTimeout(() => {
      try {
        const input = this.globalSearchInput?.nativeElement;
        if (input) {
          input.focus();
          input.select();
        }
      } catch (e) {
        // ignore
      }
    }, 80);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(query: string): void {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  onSearchKeyPress(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      const now = Date.now();
      const query = this.searchQuery.trim();

      // Prevent double search if same query within 500ms (barcode scanner sends Enter at end)
      if (
        query === this.lastEnterSearchQuery &&
        now - this.lastEnterSearchTime < 500
      ) {
        console.log("Duplicate Enter search prevented");
        event.preventDefault();
        return;
      }

      console.log("Enter key pressed in global search");
      this.lastEnterSearchTime = now;
      this.lastEnterSearchQuery = query;

      // Bypass debounce on Enter key
      event.preventDefault();
      this.handleEnterSearch(this.searchQuery);
      // Select the input text after processing
      setTimeout(() => {
        this.globalSearchInput?.nativeElement?.select();
      }, 50);
    }
  }

  handleEnterSearch(query: string): void {
    if (!query || query.trim().length === 0) {
      return;
    }

    console.log("Handling search for query:", query);
    const trimmedQuery = query.trim();

    // Check if it looks like a sale number (e.g., SALE-A0000000)
    const isSaleNumber = /^SALE(-|\/)[0-9A-F]{8}$/i.test(trimmedQuery);

    if (isSaleNumber) {
      // Navigate to sales page and set the search query
      this.router.navigate(["/sales"]).then(() => {
        this.searchStateService.setSearchQuery(trimmedQuery);
      });
      this.searchQuery = "";
      return;
    }

    // Check if it looks like a provider code (e.g., PROV-0000)
    const isProviderCode = /^PROV(-|\/)[0-9A-F]{4}$/i.test(trimmedQuery);

    if (isProviderCode) {
      // Navigate to providers page and set the search query
      this.router.navigate(["/providers"]).then(() => {
        this.searchStateService.setSearchQuery(trimmedQuery);
      });
      this.searchQuery = "";
      return;
    }

    // Check if it looks like a barcode (numeric, or alphanumeric with length suggesting barcode)
    const isLikelyBarcode =
      /^\d+$/.test(trimmedQuery) ||
      (trimmedQuery.length >= 8 && trimmedQuery.length <= 14);

    if (isLikelyBarcode) {
      console.log("Searching for product by barcode:", trimmedQuery);
      // Try to find product by barcode first
      this.productService.getProductByBarcode(trimmedQuery).subscribe({
        next: (product) => {
          // Product found - add to cart and clear search if on POS page
          if (this.router.url.startsWith("/pos")) {
            this.cartService.addItem(product);
            this.toastService.show(`${product.name} added to cart`, "success");
            this.searchQuery = "";
          } else if (this.router.url.startsWith("/inventory")) {
            // For inventory session, just propagate the search
            this.searchStateService.setSearchQuery(trimmedQuery);
            this.searchQuery = "";
          } else {
            // Navigate to POS with the product
            this.router.navigate(["/pos"], {
              state: { selectedProduct: product },
            });
            this.searchQuery = "";
          }
        },
        error: (err) => {
          // Product not found by barcode - perform regular search
          console.log("Barcode not found, performing regular search");
          this.performSearch(trimmedQuery);
        },
      });
    } else {
      // Not a barcode format - perform regular search
      this.performSearch(trimmedQuery);
    }
  }

  performSearch(query: string): void {
    // Prevent duplicate search if Enter key just triggered the same search
    const now = Date.now();
    if (
      query.trim() === this.lastEnterSearchQuery &&
      now - this.lastEnterSearchTime < 500
    ) {
      console.log("Debounced search skipped - already handled by Enter key");
      return;
    }

    // Update the search state service which will trigger search in consuming components
    this.searchStateService.setSearchQuery(query);
  }

  onProductSelected(product: Product): void {
    // Navigate to POS page and let it handle adding to cart
    this.router.navigate(["/pos"], { state: { selectedProduct: product } });
    this.searchQuery = "";
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
  }
}
