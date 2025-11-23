import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToastService, ToastMessage } from "../../services/toast.service";

@Component({
  selector: "app-toast",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./toast.component.html",
  styleUrls: ["./toast.component.scss"],
})
export class ToastComponent implements OnInit {
  toasts: ToastMessage[] = [];

  constructor(private toastService: ToastService) {}

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
