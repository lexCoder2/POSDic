import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  effect,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Subject, takeUntil, skip } from "rxjs";
import { UserService } from "../../services/user.service";
import { AuthService } from "../../services/auth.service";
import { SearchStateService } from "../../services/search-state.service";
import { ToastService } from "../../services/toast.service";
import { User } from "../../models";
import { HttpClient } from "@angular/common/http";
import { PageTitleComponent } from "../page-title/page-title.component";
import { ToggleSwitchComponent } from "../toggle-switch/toggle-switch.component";
import { environment } from "@environments/environment";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { TranslationService } from "../../services/translation.service";

@Component({
  selector: "app-users",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PageTitleComponent,
    TranslatePipe,
    ToggleSwitchComponent,
  ],
  templateUrl: "./users.component.html",
  styleUrls: ["./users.component.scss"],
})
export class UsersComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  users = signal<User[]>([]);
  searchQuery = signal<string>("");
  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.users();
    return this.users().filter(
      (u) =>
        u.username?.toLowerCase().includes(query) ||
        u.firstName?.toLowerCase().includes(query) ||
        u.lastName?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query) ||
        u.role?.toLowerCase().includes(query)
    );
  });
  showUserModal = false;
  isEditing = false;

  // Pagination
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  paginatedUsers = computed(() => {
    const filtered = this.filteredUsers();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return filtered.slice(start, end);
  });
  totalPages = computed(() =>
    Math.ceil(this.filteredUsers().length / this.pageSize())
  );

  userForm: Partial<User> = {
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "cashier",
    active: true,
  };

  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private searchStateService: SearchStateService,
    private http: HttpClient,
    private translation: TranslationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.searchStateService.clearSearch();
    this.loadUsers();

    // Subscribe to header search bar
    this.searchStateService.searchQuery$
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe((query) => this.searchQuery.set(query));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchStateService.clearSearch();
  }

  isAdmin(): boolean {
    return this.currentUser?.role === "admin";
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: (response) => {
        this.users.set(response.data);
      },
      error: (err) => console.error("Error loading users:", err),
    });
  }

  openUserModal(user?: User): void {
    if (user) {
      this.isEditing = true;
      this.userForm = {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        active: user.active,
      };
    } else {
      this.isEditing = false;
      this.userForm = {
        username: "",
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        role: "cashier",
        active: true,
      };
    }
    this.showUserModal = true;
  }

  saveUser(): void {
    if (
      !this.userForm.username ||
      !this.userForm.email ||
      !this.userForm.firstName ||
      !this.userForm.lastName ||
      !this.userForm.role
    ) {
      this.toastService.show(
        this.translation.translate("USERS.ALERTS.FILL_REQUIRED"),
        "info"
      );
      return;
    }

    if (!this.isEditing && !this.userForm.password) {
      this.toastService.show(
        this.translation.translate("USERS.ALERTS.PASSWORD_REQUIRED"),
        "info"
      );
      return;
    }

    if (this.isEditing && this.userForm.id) {
      // Update existing user
      this.userService.updateUser(this.userForm.id, this.userForm).subscribe({
        next: (updated) => {
          const index = this.users().findIndex((u) => u.id === updated.id);
          if (index !== -1) {
            const updatedUsers = [...this.users()];
            updatedUsers[index] = updated;
            this.users.set(updatedUsers);
          }
          this.showUserModal = false;
        },
        error: (err) => console.error("Error updating user:", err),
      });
    } else {
      // Create new user via register endpoint
      this.http
        .post<User>(`${environment.apiUrl}/auth/register`, this.userForm)
        .subscribe({
          next: (created) => {
            this.users.set([...this.users(), created]);
            this.showUserModal = false;
          },
          error: (err) => console.error("Error creating user:", err),
        });
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  getVisiblePages(): number[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const delta = 2;
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > delta + 2) pages.push(-1);
      const start = Math.max(2, current - delta);
      const end = Math.min(total - 1, current + delta);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (current < total - delta - 1) pages.push(-1);
      pages.push(total);
    }
    return pages;
  }

  deleteUser(id: string): void {
    if (!this.isAdmin()) {
      this.toastService.show("Only administrators can delete users", "error");
      return;
    }

    if (id === this.currentUser?.id) {
      this.toastService.show("You cannot delete your own account", "error");
      return;
    }

    if (confirm("Are you sure you want to delete this user?")) {
      this.userService.deleteUser(id).subscribe({
        next: () => {
          this.users.set(this.users().filter((u) => u.id !== id));
        },
        error: (err) => console.error("Error deleting user:", err),
      });
    }
  }
}
