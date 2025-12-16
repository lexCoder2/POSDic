import { Component, OnInit, inject } from "@angular/core";

import { ToastService, ToastMessage } from "../../services/toast.service";

@Component({
  selector: "app-toast",
  standalone: true,
  imports: [],
  templateUrl: "./toast.component.html",
  styleUrls: ["./toast.component.scss"],
})
export class ToastComponent implements OnInit {
  private toastService = inject(ToastService);

  toasts: ToastMessage[] = [];

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  ngOnInit(): void {
    this.toastService.onToast().subscribe((t) => {
      this.toasts.push(t);
      const dur = t.duration ?? 2000;
      setTimeout(() => this.remove(t.id), dur);
    });
  }

  remove(id: number) {
    this.toasts = this.toasts.filter((x) => x.id !== id);
  }
}
