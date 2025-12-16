import { Component, OnInit, OnDestroy, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { Subject, takeUntil, skip, debounceTime } from "rxjs";
import { ProductService } from "../../services/product.service";
import { CategoryService } from "../../services/category.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { SearchStateService } from "../../services/search-state.service";
import { Product, Category, User } from "../../models";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { TranslationService } from "../../services/translation.service";
import { environment } from "@environments/environment";
import { ModalComponent } from "../modal/modal.component";
import { ProductFormComponent } from "../product-form/product-form.component";

@Component({
  selector: "app-inventory",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalComponent,
    TranslatePipe,
    ProductFormComponent,
  ],
  templateUrl: "./inventory.component.html",
  styleUrls: ["./inventory.component.scss"],
})
export class InventoryComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private searchStateService = inject(SearchStateService);
  private translation = inject(TranslationService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  currentUser: User | null = null;
  activeTab: "products" | "categories" = "products";

  imgBaseUrl = environment.imageUrl;
  // Products
  products = signal<Product[]>([]);
  searchQuery = signal<string>("");
  totalRecords = signal<number>(0);
  selectedProduct: Product | null = null;
  showProductModal = false;
  isEditingProduct = false;

  // Pagination - server-side
  currentPage = signal<number>(1);
  pageSize = signal<number>(100);
  totalPages = signal<number>(0);

  private destroy$ = new Subject<void>();

  // Categories
  categories: Category[] = [];
  selectedCategory: Category | null = null;
  showCategoryModal = false;
  isEditingCategory = false;

  // Brand list for autocomplete
  allBrands = signal<string[]>([]);

  // Bulk import
  showImportModal = false;
  importProgress = 0;
  importResults: any = null;
  selectedFile: File | null = null;

  // Category form
  categoryForm: Partial<Category> = {
    name: "",
    description: "",
    icon: "fas fa-tag",
    active: true,
  };

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadProducts();
    this.loadCategories();
    this.loadBrands();

    // Subscribe to product edit requests from barcode scan
    this.searchStateService.productForEdit$
      .pipe(takeUntil(this.destroy$))
      .subscribe((product) => {
        console.log("Product for edit received:", product);
        this.openProductModal(product);
      });

    // Subscribe to header search bar with debounce
    this.searchStateService.searchQuery$
      .pipe(skip(1), debounceTime(500), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.currentPage.set(1);
        this.loadProducts();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Handle image load errors
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = "none";
    const placeholder = img.nextElementSibling as HTMLElement;
    if (placeholder) {
      placeholder.style.display = "flex";
    }
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.currentUser?.role === "admin";
  }

  // Navigate to inventory session
  startInventorySession(): void {
    this.router.navigate(["/inventory-session"]);
  }

  // ===== PRODUCTS =====
  loadProducts(): void {
    const filters: any = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    const query = this.searchQuery().trim();
    if (query) {
      filters.search = query;
    }

    this.productService.getProducts(filters).subscribe({
      next: (response) => {
        this.products.set(response.data);
        this.totalRecords.set(response.pagination.total);
        this.totalPages.set(response.pagination.totalPages);
      },
      error: (err) => console.error("Error loading products:", err),
    });
  }

  openProductModal(product?: Product): void {
    if (product) {
      this.isEditingProduct = true;
      this.selectedProduct = product;
    } else {
      this.isEditingProduct = false;
      this.selectedProduct = null;
    }
    this.showProductModal = true;
  }

  closeProductModal(): void {
    this.showProductModal = false;
    this.selectedProduct = null;
  }

  onProductSaved(product: Product): void {
    if (this.isEditingProduct && this.selectedProduct) {
      // Update existing product in list
      const index = this.products().findIndex(
        (p: Product) => p._id === this.selectedProduct!._id
      );
      if (index !== -1) {
        const updatedProducts = [...this.products()];
        updatedProducts[index] = product;
        this.products.set(updatedProducts);
      }
    } else {
      // Add new product to list
      this.products.set([product, ...this.products()]);
    }
    this.closeProductModal();
  }

  deleteProduct(productId: string): void {
    if (!this.isAdmin()) {
      this.toastService.show(
        this.translation.translate("INVENTORY.ALERTS.ADMIN_DELETE"),
        "error"
      );
      return;
    }

    const product = this.products().find((p: Product) => p._id === productId);
    if (!product) return;

    if (
      !confirm(
        this.translation.translate("INVENTORY.ALERTS.CONFIRM_DELETE", {
          name: product.name,
        })
      )
    ) {
      return;
    }

    this.productService.deleteProduct(productId).subscribe({
      next: () => {
        this.toastService.show(
          this.translation.translate("INVENTORY.ALERTS.PRODUCT_DELETED"),
          "success"
        );
        // Remove from local array instead of reloading
        this.products.set(
          this.products().filter((p: Product) => p._id !== productId)
        );
      },
      error: (err) => {
        console.error("Error deleting product:", err);
        this.toastService.show(
          this.translation.translate("INVENTORY.ALERTS.PRODUCT_DELETE_FAILED"),
          "error"
        );
      },
    });
  }

  addToQuickAccess(product: Product, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    if (!product._id) return;

    this.productService.addToQuickAccess(product._id).subscribe({
      next: () => {
        this.toastService.show(
          `${product.name} added to quick access`,
          "success"
        );
      },
      error: (err) => {
        this.toastService.show(
          err.error?.message || "Error adding to quick access",
          "error"
        );
      },
    });
  }

  // ===== CATEGORIES =====
  loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (err) => console.error("Error loading categories:", err),
    });
  }

  loadBrands(): void {
    // Extract unique brands from products
    this.productService.getProducts({ pageSize: 10000 }).subscribe({
      next: (response) => {
        const brands = new Set<string>();
        response.data.forEach((product: Product) => {
          if (product.brand && product.brand.trim()) {
            brands.add(product.brand.trim());
          }
        });
        const sortedBrands = Array.from(brands).sort();
        this.allBrands.set(sortedBrands);
      },
      error: (err) => console.error("Error loading brands:", err),
    });
  }

  openCategoryModal(category?: Category): void {
    if (category) {
      this.isEditingCategory = true;
      this.selectedCategory = category;
      this.categoryForm = { ...category };
    } else {
      this.isEditingCategory = false;
      this.selectedCategory = null;
      this.resetCategoryForm();
    }
    this.showCategoryModal = true;
  }

  closeCategoryModal(): void {
    this.showCategoryModal = false;
    this.resetCategoryForm();
  }

  saveCategory(): void {
    if (!this.categoryForm.name) {
      this.toastService.show(
        this.translation.translate("INVENTORY.CATEGORY_ALERTS.FILL_REQUIRED"),
        "info"
      );
      return;
    }

    if (this.isEditingCategory && this.selectedCategory) {
      // Update existing category
      this.categoryService
        .updateCategory(this.selectedCategory._id!, this.categoryForm)
        .subscribe({
          next: (updatedCategory) => {
            this.toastService.show(
              this.translation.translate(
                "INVENTORY.CATEGORY_ALERTS.CATEGORY_UPDATED"
              ),
              "success"
            );
            // Update local array instead of reloading
            const index = this.categories.findIndex(
              (c) => c._id === this.selectedCategory!._id
            );
            if (index !== -1) {
              this.categories[index] = updatedCategory;
            }
            this.closeCategoryModal();
          },
          error: (err) => {
            console.error("Error updating category:", err);
            this.toastService.show(
              this.translation.translate(
                "INVENTORY.CATEGORY_ALERTS.CATEGORY_UPDATE_FAILED"
              ),
              "error"
            );
          },
        });
    } else {
      // Create new category
      this.categoryService.createCategory(this.categoryForm).subscribe({
        next: (newCategory) => {
          this.toastService.show(
            this.translation.translate(
              "INVENTORY.CATEGORY_ALERTS.CATEGORY_CREATED"
            ),
            "success"
          );
          // Add to local array instead of reloading
          this.categories.unshift(newCategory);
          this.closeCategoryModal();
        },
        error: (err) => {
          console.error("Error creating category:", err);
          this.toastService.show(
            this.translation.translate(
              "INVENTORY.CATEGORY_ALERTS.CATEGORY_CREATE_FAILED"
            ),
            "error"
          );
        },
      });
    }
  }

  deleteCategory(categoryId: string): void {
    if (!this.isAdmin()) {
      this.toastService.show(
        this.translation.translate("INVENTORY.CATEGORY_ALERTS.ADMIN_DELETE"),
        "error"
      );
      return;
    }

    const category = this.categories.find((c) => c._id === categoryId);
    if (!category) return;

    if (
      !confirm(
        this.translation.translate("INVENTORY.CATEGORY_ALERTS.CONFIRM_DELETE", {
          name: category.name,
        })
      )
    ) {
      return;
    }

    this.categoryService.deleteCategory(categoryId).subscribe({
      next: () => {
        this.toastService.show(
          this.translation.translate(
            "INVENTORY.CATEGORY_ALERTS.CATEGORY_DELETED"
          ),
          "success"
        );
        // Remove from local array instead of reloading
        this.categories = this.categories.filter((c) => c._id !== categoryId);
      },
      error: (err) => {
        console.error("Error deleting category:", err);
        this.toastService.show(
          this.translation.translate(
            "INVENTORY.CATEGORY_ALERTS.CATEGORY_DELETE_FAILED"
          ),
          "error"
        );
      },
    });
  }

  resetCategoryForm(): void {
    this.categoryForm = {
      name: "",
      description: "",
      icon: "fas fa-tag",
      active: true,
    };
  }

  // ===== BULK IMPORT =====
  openImportModal(): void {
    this.showImportModal = true;
    this.selectedFile = null;
    this.importProgress = 0;
    this.importResults = null;
  }

  closeImportModal(): void {
    this.showImportModal = false;
    this.selectedFile = null;
    this.importProgress = 0;
    this.importResults = null;
  }

  importProducts(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedFile = file;
    const formData = new FormData();
    formData.append("file", file);

    this.importProgress = 50;

    this.productService.bulkImport(formData).subscribe({
      next: (result) => {
        this.importProgress = 100;
        this.importResults = result;
        this.toastService.show(
          this.translation.translate("INVENTORY.IMPORT.COMPLETED", {
            successful: result.successful,
            failed: result.failed,
          }),
          "success"
        );
        this.loadProducts();
      },
      error: (err) => {
        console.error("Error importing products:", err);
        this.importProgress = 0;
        this.toastService.show(
          this.translation.translate("INVENTORY.IMPORT.FAILED"),
          "error"
        );
      },
    });
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.loadProducts();
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.loadProducts();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadProducts();
    }
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadProducts();
  }

  getVisiblePages(): number[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const delta = 2; // Pages to show on each side of current
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > delta + 2) {
        pages.push(-1); // Ellipsis marker
      }

      // Show pages around current
      const start = Math.max(2, current - delta);
      const end = Math.min(total - 1, current + delta);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - delta - 1) {
        pages.push(-1); // Ellipsis marker
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  }

  downloadTemplate(): void {
    // Create CSV template
    const headers = [
      "name",
      "ean",
      "ean13",
      "upc",
      "brand",
      "category",
      "price",
      "cost",
      "stock",
      "minStock",
      "active",
    ];
    const template =
      headers.join(",") +
      "\n" +
      "Sample Product,1234567890123,1234567890123,123456789012,Sample Brand,Grocery,10.99,5.50,100,10,true";

    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  }

  switchTab(tab: "products" | "categories"): void {
    this.activeTab = tab;
  }
}
