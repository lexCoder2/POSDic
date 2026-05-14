import { Component, OnInit, OnDestroy, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil } from "rxjs";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { TicketService } from "../../services/ticket.service";
import { ToastService } from "../../services/toast.service";
import { Ticket } from "../../models";

@Component({
  selector: "app-checkout-desk",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: "./checkout-desk.component.html",
  styleUrls: ["./checkout-desk.component.scss"],
})
export class CheckoutDeskComponent implements OnInit, OnDestroy {
  private ticketService = inject(TicketService);
  private toastService = inject(ToastService);
  private destroy$ = new Subject<void>();

  readonly paymentOptions = [
    {
      value: "cash",
      label: "CHECKOUT_DESK.PAYMENT_CASH",
      icon: "fas fa-money-bill-wave",
    },
    {
      value: "card",
      label: "CHECKOUT_DESK.PAYMENT_CARD",
      icon: "fas fa-credit-card",
    },
    {
      value: "transfer",
      label: "CHECKOUT_DESK.PAYMENT_TRANSFER",
      icon: "fas fa-building-columns",
    },
  ];

  tickets = signal<Ticket[]>([]);
  selectedTicket = signal<Ticket | null>(null);
  selectedPaymentMethod = signal<string>("cash");
  amountTendered = signal<number>(0);
  isLoading = signal(false);
  isProcessing = signal(false);

  // Polling interval reference for cleanup
  pollingInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.loadTickets();
    // Poll for new tickets every 5 seconds
    this.pollingInterval = setInterval(() => {
      if (!this.selectedTicket()) {
        this.loadTickets();
      }
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTickets(): void {
    this.isLoading.set(true);
    this.ticketService
      .getTickets("pending")
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tickets) => {
          this.tickets.set(tickets);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  selectTicket(ticket: Ticket): void {
    this.amountTendered.set(ticket.total);
    this.ticketService
      .claimTicket(ticket._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (claimed) => {
          this.selectedTicket.set(claimed);
          // Remove from pending list
          this.tickets.set(this.tickets().filter((t) => t._id !== ticket._id));
        },
        error: () => {
          this.toastService.show("CHECKOUT_DESK.CLAIM_ERROR", "error");
          this.loadTickets();
        },
      });
  }

  completeCheckout(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    if (!this.selectedPaymentMethod()) {
      this.toastService.show("CHECKOUT_DESK.PAYMENT_METHOD_REQUIRED", "error");
      return;
    }

    this.isProcessing.set(true);
    this.ticketService
      .completeTicket(
        ticket._id!,
        this.selectedPaymentMethod(),
        this.amountTendered()
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.show("CHECKOUT_DESK.COMPLETED_SUCCESS", "success");
          this.selectedTicket.set(null);
          this.isProcessing.set(false);
          this.loadTickets();
        },
        error: () => {
          this.toastService.show("CHECKOUT_DESK.COMPLETE_ERROR", "error");
          this.isProcessing.set(false);
        },
      });
  }

  cancelSelectedTicket(): void {
    const ticket = this.selectedTicket();
    if (!ticket) return;

    this.ticketService
      .cancelTicket(ticket._id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.show("CHECKOUT_DESK.CANCELLED", "success");
          this.selectedTicket.set(null);
          this.loadTickets();
        },
        error: () => {
          this.toastService.show("CHECKOUT_DESK.CANCEL_ERROR", "error");
        },
      });
  }

  setPaymentMethod(method: string): void {
    this.selectedPaymentMethod.set(method);

    if (method !== "cash") {
      const ticket = this.selectedTicket();
      if (ticket) {
        this.amountTendered.set(ticket.total);
      }
    }
  }

  get pendingTotal(): number {
    return this.tickets().reduce((sum, ticket) => sum + ticket.total, 0);
  }

  get selectedItemCount(): number {
    const ticket = this.selectedTicket();
    if (!ticket) return 0;

    return ticket.items.reduce((count, item) => count + item.quantity, 0);
  }

  get amountRemaining(): number {
    const ticket = this.selectedTicket();
    if (!ticket) return 0;

    return Math.max(0, ticket.total - this.amountTendered());
  }

  getTicketPreview(ticket: Ticket): string {
    const preview = ticket.items
      .slice(0, 2)
      .map((item) => `${item.productName} x${item.quantity}`)
      .join(", ");

    if (ticket.items.length <= 2) {
      return preview;
    }

    return `${preview} +${ticket.items.length - 2}`;
  }

  get change(): number {
    const ticket = this.selectedTicket();
    if (!ticket) return 0;
    return Math.max(0, this.amountTendered() - ticket.total);
  }
}
