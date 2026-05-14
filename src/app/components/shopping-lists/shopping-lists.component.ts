import { Component, OnInit, OnDestroy, inject, signal } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ShoppingListService } from "../../services/shopping-list.service";
import { ToastService } from "../../services/toast.service";
import { TranslatePipe } from "../../pipes/translate.pipe";
import {
  ShoppingList,
  ShoppingItem,
  ShoppingRecommendation,
} from "../../models";

@Component({
  selector: "app-shopping-lists",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: "./shopping-lists.component.html",
  styleUrls: ["./shopping-lists.component.scss"],
})
export class ShoppingListsComponent implements OnInit, OnDestroy {
  private service = inject(ShoppingListService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  lists = signal<ShoppingList[]>([]);
  selectedList = signal<ShoppingList | null>(null);
  recommendations = signal<ShoppingRecommendation[]>([]);
  isLoading = signal<boolean>(false);
  newListName = signal<string>("");
  newItems = signal<ShoppingItem[]>([]);

  ngOnInit(): void {
    this.loadLists();
    this.loadRecommendations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLists(): void {
    this.isLoading.set(true);
    this.service
      .getLists()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ lists }) => {
          this.lists.set(lists);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  loadRecommendations(): void {
    this.service
      .getRecommendations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ recommendations }) =>
          this.recommendations.set(recommendations),
      });
  }

  createList(): void {
    const name = this.newListName().trim();
    if (!name) return;
    this.service
      .createList(name, this.newItems())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ list }) => {
          this.lists.set([list, ...this.lists()]);
          this.newListName.set("");
          this.newItems.set([]);
        },
        error: () => this.toastService.show("SHOPPING.CREATE_ERROR", "error"),
      });
  }

  selectList(list: ShoppingList): void {
    this.selectedList.set(list);
  }

  toggleItem(itemIndex: number): void {
    const list = this.selectedList();
    if (!list?._id) return;
    this.service
      .toggleItem(list._id, itemIndex)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ list: updated }) => {
          this.selectedList.set(updated);
          this.lists.set(
            this.lists().map((l) => (l._id === updated._id ? updated : l))
          );
        },
      });
  }

  deleteList(id: string): void {
    this.service
      .deleteList(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.lists.set(this.lists().filter((l) => l._id !== id));
          if (this.selectedList()?._id === id) this.selectedList.set(null);
        },
        error: () => this.toastService.show("SHOPPING.DELETE_ERROR", "error"),
      });
  }

  addRecommendedItem(rec: ShoppingRecommendation): void {
    const existing = this.newItems().find(
      (i) => i.productName === rec.productName
    );
    if (!existing) {
      this.newItems.set([
        ...this.newItems(),
        { productName: rec.productName, quantity: 1 },
      ]);
    }
  }
}
