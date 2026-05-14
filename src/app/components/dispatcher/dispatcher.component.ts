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
import { TranslatePipe } from "../../pipes/translate.pipe";
import { TicketService } from "../../services/ticket.service";
import { ToastService } from "../../services/toast.service";
import { TicketItem } from "../../models";

@Component({
  selector: "app-dispatcher",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: "./dispatcher.component.html",
  styleUrls: ["./dispatcher.component.scss"],
})
export class DispatcherComponent implements OnInit, OnDestroy {
  private ticketService = inject(TicketService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  items = signal<TicketItem[]>([]);
  isDispatching = signal(false);
  lastDispatchedTicketNumber = signal<number | null>(null);
  notes = signal("");

  subtotal = computed(() =>
    this.items().reduce((sum, item) => sum + item.subtotal, 0)
  );
  total = computed(() => this.subtotal());

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addItem(item: TicketItem): void {
    const current = this.items();
    const existing = current.find(
      (i) =>
        i.productName === item.productName && i.unitPrice === item.unitPrice
    );
    if (existing) {
      const updated = current.map((i) =>
        i === existing
          ? {
              ...i,
              quantity: i.quantity + item.quantity,
              subtotal: (i.quantity + item.quantity) * i.unitPrice,
            }
          : i
      );
      this.items.set(updated);
    } else {
      this.items.set([...current, item]);
    }
  }

  removeItem(index: number): void {
    const current = [...this.items()];
    current.splice(index, 1);
    this.items.set(current);
  }

  clearCart(): void {
    this.items.set([]);
    this.notes.set("");
  }

  dispatchTicket(): void {
    if (this.items().length === 0) {
      this.toastService.show("DISPATCHER.EMPTY_CART_ERROR", "error");
      return;
    }
    this.isDispatching.set(true);
    this.ticketService
      .createTicket(
        this.items(),
        this.subtotal(),
        this.total(),
        0,
        this.notes()
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ticket) => {
          this.lastDispatchedTicketNumber.set(ticket.ticketNumber ?? null);
          this.toastService.show("DISPATCHER.DISPATCHED_SUCCESS", "success");
          this.clearCart();
          this.isDispatching.set(false);
        },
        error: () => {
          this.toastService.show("DISPATCHER.DISPATCH_ERROR", "error");
          this.isDispatching.set(false);
        },
      });
  }
}
