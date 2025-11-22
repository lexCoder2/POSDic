import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from "rxjs";
import { ProductService } from "../../services/product.service";
import { CategoryService } from "../../services/category.service";
import { CartService } from "../../services/cart.service";
import { Product, Category, CartItem } from "../../models";

@Component({
  selector: "app-search",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./search.component.html",
  styleUrls: ["./search.component.scss"],
})
export class SearchComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild("searchInput") searchInput!: ElementRef<HTMLInputElement>;

  products: Product[] = [];
  categories: Category[] = [];
  filteredProducts: Product[] = [];
  searchQuery: string = "";
  selectedCategory: string = "";
  loading: boolean = false;
  cartItemCount: number = 0;
  cartTotal: number = 0;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    public cartService: CartService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();

    // Subscribe to cart changes
    this.cartService.cartItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.cartItemCount = items.reduce(
          (sum: number, item: CartItem) => sum + item.quantity,
          0
        );
        this.cartTotal = items.reduce(
          (sum: number, item: CartItem) =>
            sum + (item.product.price * item.quantity - item.discount),
          0
        );
      });

    // Debounce search input
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.performSearch();
      });
  }

  ngAfterViewInit() {
    // Auto-focus the search input when component loads
    if (this.searchInput) {
      setTimeout(() => {
        this.searchInput.nativeElement.focus();
      }, 100);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories() {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => console.error("Error loading categories:", error),
    });
  }

  loadProducts() {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (response) => {
        this.products = response.data;
        this.filteredProducts = response.data;
        this.loading = false;
      },
      error: (error) => {
        console.error("Error loading products:", error);
        this.loading = false;
      },
    });
  }

  onSearchChange() {
    this.searchSubject.next(this.searchQuery);
  }

  performSearch() {
    this.filteredProducts = this.products.filter((product) => {
      const matchesSearch =
        !this.searchQuery ||
        product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        product.brand?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        product.product_id?.includes(this.searchQuery) ||
        product.sku?.includes(this.searchQuery) ||
        product.ean?.includes(this.searchQuery) ||
        product.ean13?.includes(this.searchQuery);

      const matchesCategory =
        !this.selectedCategory || product.category === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }

  selectCategory(category: string) {
    this.selectedCategory = category === this.selectedCategory ? "" : category;
    this.performSearch();
  }

  addToCart(product: Product) {
    this.cartService.addItem(product, 1);
  }

  goToCart() {
    this.router.navigate(["/pos"]);
  }

  getCartItemCount(): number {
    let count = 0;
    this.cartService.cartItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (items) =>
          (count = items.reduce(
            (sum: number, item: CartItem) => sum + item.quantity,
            0
          ))
      );
    return count;
  }

  getCartTotal(): number {
    let total = 0;
    this.cartService.cartItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (items) =>
          (total = items.reduce(
            (sum: number, item: CartItem) =>
              sum + (item.product.price * item.quantity - item.discount),
            0
          ))
      );
    return total;
  }
}
