import {
  Component,
  Input,
  Output,
  EventEmitter,
  input,
  signal,
  OnInit,
  OnDestroy,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { Product } from "../../models";
import { environment } from "@environments/environment";
import { SearchStateService } from "../../services/search-state.service";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-search-results",
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: "./search-results.component.html",
  styleUrls: ["./search-results.component.scss"],
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  // Accept products from parent
  products = input<Product[]>([]);

  // Internal signals for search state
  searchQuery = signal<string>("");
  isLoading = signal<boolean>(false);

  @Output() productSelected = new EventEmitter<Product>();

  private destroy$ = new Subject<void>();

  constructor(private searchStateService: SearchStateService) {
    // Debug effect to track changes
    effect(() => {
      console.log("SearchResults - Products:", this.products());
      console.log("SearchResults - SearchQuery:", this.searchQuery());
      console.log("SearchResults - Products length:", this.products().length);
    });
  }

  ngOnInit(): void {
    // Subscribe to search query from search state service
    this.searchStateService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe((query) => {
        console.log("SearchResults - Query from service:", query);
        this.searchQuery.set(query);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getProductImageUrl(product: Product): string {
    if (product.local_image) {
      return `${environment.imageUrl}/${product.local_image}`;
    }
    return "";
  }

  onProductClick(product: Product): void {
    this.productSelected.emit(product);
  }

  getProductCode(product: Product): string {
    return product.ean || product.ean13 || product.upc || "-";
  }
}
