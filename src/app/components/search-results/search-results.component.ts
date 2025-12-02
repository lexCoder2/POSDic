import {
  Component,
  Input,
  Output,
  EventEmitter,
  input,
  signal,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { CurrencyPipe } from "../../pipes/currency.pipe";
import { Product } from "../../models";
import { environment } from "@environments/environment";
import { SearchStateService } from "../../services/search-state.service";
import { AuthService } from "../../services/auth.service";
import { ProductService } from "../../services/product.service";
import { ToastService } from "../../services/toast.service";
import { Subject, takeUntil } from "rxjs";

@Component({
  selector: "app-search-results",
  standalone: true,
  imports: [CommonModule, TranslatePipe, CurrencyPipe],
  templateUrl: "./search-results.component.html",
  styleUrls: ["./search-results.component.scss"],
})
export class SearchResultsComponent implements OnInit, OnDestroy {
  // Accept products from parent
  products = input<Product[]>([]);

  // Accept loading state from parent
  @Input() isLoading: boolean = false;

  // Internal signals for search state
  searchQuery = signal<string>("");

  @Output() productSelected = new EventEmitter<Product>();
  @Output() productDeleted = new EventEmitter<Product>();

  showDeleteModal = false;
  productToDelete: Product | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private searchStateService: SearchStateService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private productService: ProductService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Subscribe to search query from search state service
    this.searchStateService.searchQuery$
      .pipe(takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.cdr.markForCheck();
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

  isAdmin(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === "admin";
  }

  openDeleteModal(event: MouseEvent, product: Product): void {
    event.stopPropagation();
    this.productToDelete = product;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.productToDelete = null;
  }

  confirmDelete(): void {
    if (!this.productToDelete || !this.productToDelete._id) return;

    this.productService.deleteProduct(this.productToDelete._id).subscribe({
      next: () => {
        this.toastService.show(
          `Product "${this.productToDelete!.name}" deleted successfully`,
          "success"
        );
        this.productDeleted.emit(this.productToDelete!);
        this.closeDeleteModal();
      },
      error: (err) => {
        console.error("Error deleting product:", err);
        this.toastService.show("Failed to delete product", "error");
        this.closeDeleteModal();
      },
    });
  }

  onDeleteKeyDown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.confirmDelete();
    } else if (event.key === "Escape") {
      event.preventDefault();
      this.closeDeleteModal();
    }
  }
}
