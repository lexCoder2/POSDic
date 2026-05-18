import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil } from "rxjs";
import { CategoryService } from "../../services/category.service";
import { AuthService } from "../../services/auth.service";
import { ToastService } from "../../services/toast.service";
import { TranslationService } from "../../services/translation.service";
import { Category, User } from "../../models";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { ModalComponent } from "../modal/modal.component";

const PRESET_ICONS = [
  "fas fa-tag",
  "fas fa-shopping-cart",
  "fas fa-box",
  "fas fa-utensils",
  "fas fa-apple-alt",
  "fas fa-coffee",
  "fas fa-bread-slice",
  "fas fa-fish",
  "fas fa-wine-bottle",
  "fas fa-beer",
  "fas fa-ice-cream",
  "fas fa-cheese",
  "fas fa-carrot",
  "fas fa-leaf",
  "fas fa-seedling",
  "fas fa-candy-cane",
  "fas fa-tshirt",
  "fas fa-shoe-prints",
  "fas fa-glasses",
  "fas fa-home",
  "fas fa-couch",
  "fas fa-tools",
  "fas fa-mobile-alt",
  "fas fa-laptop",
  "fas fa-headphones",
  "fas fa-camera",
  "fas fa-car",
  "fas fa-bicycle",
  "fas fa-baby",
  "fas fa-paw",
  "fas fa-pills",
  "fas fa-dumbbell",
  "fas fa-book",
  "fas fa-paint-brush",
  "fas fa-music",
  "fas fa-gamepad",
  "fas fa-gift",
  "fas fa-spa",
  "fas fa-dog",
  "fas fa-cat",
];

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
  "#1e293b",
  "#84cc16",
  "#14b8a6",
];

@Component({
  selector: "app-categories",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ModalComponent],
  templateUrl: "./categories.component.html",
  styleUrls: ["./categories.component.scss"],
})
export class CategoriesComponent implements OnInit, OnDestroy {
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private translation = inject(TranslationService);

  private destroy$ = new Subject<void>();

  currentUser: User | null = null;

  // State
  categories = signal<Category[]>([]);
  isLoading = signal(false);
  hasError = signal(false);
  searchQuery = signal("");

  // Modal
  showModal = signal(false);
  isEditing = signal(false);
  selectedCategory: Category | null = null;
  isSaving = signal(false);

  // Form
  categoryForm: Partial<Category> = this.defaultForm();

  // Picker options
  presetIcons = PRESET_ICONS;
  presetColors = PRESET_COLORS;

  filteredCategories = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.categories();
    return this.categories().filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false)
    );
  });

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private defaultForm(): Partial<Category> {
    return {
      name: "",
      description: "",
      icon: "fas fa-tag",
      color: "#3b82f6",
      active: true,
    };
  }

  isAdmin(): boolean {
    return this.currentUser?.role === "admin";
  }

  loadCategories(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    this.categoryService
      .getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cats) => {
          this.categories.set(cats);
          this.isLoading.set(false);
        },
        error: () => {
          this.hasError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  openModal(category?: Category): void {
    if (category) {
      this.isEditing.set(true);
      this.selectedCategory = category;
      this.categoryForm = { ...category };
    } else {
      this.isEditing.set(false);
      this.selectedCategory = null;
      this.categoryForm = this.defaultForm();
    }
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedCategory = null;
    this.isSaving.set(false);
  }

  selectIcon(icon: string): void {
    this.categoryForm = { ...this.categoryForm, icon };
  }

  selectColor(color: string): void {
    this.categoryForm = { ...this.categoryForm, color };
  }

  saveCategory(): void {
    if (!this.categoryForm.name?.trim()) {
      this.toastService.show(
        this.translation.translate("CATEGORIES_PAGE.ALERTS.REQUIRED_NAME"),
        "info"
      );
      return;
    }

    this.isSaving.set(true);

    if (this.isEditing() && this.selectedCategory) {
      this.categoryService
        .updateCategory(this.selectedCategory._id!, this.categoryForm)
        .subscribe({
          next: (updated) => {
            this.categories.update((cats) =>
              cats.map((c) =>
                c._id === this.selectedCategory!._id ? updated : c
              )
            );
            this.toastService.show(
              this.translation.translate("CATEGORIES_PAGE.ALERTS.UPDATED"),
              "success"
            );
            this.closeModal();
          },
          error: () => {
            this.toastService.show(
              this.translation.translate(
                "CATEGORIES_PAGE.ALERTS.UPDATE_FAILED"
              ),
              "error"
            );
            this.isSaving.set(false);
          },
        });
    } else {
      this.categoryService.createCategory(this.categoryForm).subscribe({
        next: (newCat) => {
          this.categories.update((cats) => [newCat, ...cats]);
          this.toastService.show(
            this.translation.translate("CATEGORIES_PAGE.ALERTS.CREATED"),
            "success"
          );
          this.closeModal();
        },
        error: () => {
          this.toastService.show(
            this.translation.translate("CATEGORIES_PAGE.ALERTS.CREATE_FAILED"),
            "error"
          );
          this.isSaving.set(false);
        },
      });
    }
  }

  deleteCategory(category: Category): void {
    if (!this.isAdmin()) {
      this.toastService.show(
        this.translation.translate("CATEGORIES_PAGE.ALERTS.ADMIN_DELETE"),
        "error"
      );
      return;
    }

    if (
      !confirm(
        this.translation.translate("CATEGORIES_PAGE.ALERTS.CONFIRM_DELETE", {
          name: category.name,
        })
      )
    ) {
      return;
    }

    this.categoryService.deleteCategory(category._id!).subscribe({
      next: () => {
        this.categories.update((cats) =>
          cats.filter((c) => c._id !== category._id)
        );
        this.toastService.show(
          this.translation.translate("CATEGORIES_PAGE.ALERTS.DELETED"),
          "success"
        );
      },
      error: () => {
        this.toastService.show(
          this.translation.translate("CATEGORIES_PAGE.ALERTS.DELETE_FAILED"),
          "error"
        );
      },
    });
  }
}
