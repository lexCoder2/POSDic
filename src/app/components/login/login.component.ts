import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { finalize, catchError, of } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { TranslatePipe } from "../../pipes/translate.pipe";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent implements OnInit {
  username = "";
  password = "";
  error = "";
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(["/pos"]);
    }
  }

  onSubmit(): void {
    if (!this.username || !this.password) {
      this.error = "Please enter username and password";
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = "";
    this.cdr.detectChanges();

    console.log("=== LOGIN ATTEMPT ===");
    console.log("Username:", this.username);
    console.log("Loading state:", this.loading);

    this.authService
      .login(this.username, this.password)
      .pipe(
        catchError((err) => {
          console.error("=== CAUGHT ERROR ===");
          console.error("Error status:", err.status);
          console.error("Error statusText:", err.statusText);
          console.error("Error message:", err.message);
          console.error("Full error:", err);

          // Force update UI state
          this.loading = false;

          // Handle different error scenarios
          if (err.status === 0) {
            this.error =
              "Unable to connect to server. Please check your connection.";
          } else if (err.status === 401) {
            this.error = "Invalid username or password. Please try again.";
          } else if (err.status === 404) {
            this.error = "Server not found. Please contact support.";
          } else if (err.error?.message) {
            this.error = err.error.message;
          } else if (err.message) {
            this.error = err.message;
          } else {
            this.error = "Login failed. Please try again.";
          }

          console.log("=== ERROR SET ===");
          console.log("Error message:", this.error);
          console.log("Loading state:", this.loading);

          // Force Angular to detect changes
          this.cdr.detectChanges();

          // Return empty observable to complete the stream
          return of(null);
        }),
        finalize(() => {
          console.log("=== FINALIZE ===");
          console.log("Final loading state before reset:", this.loading);
          this.loading = false;
          this.cdr.detectChanges();
          console.log("Final loading state after reset:", this.loading);
        })
      )
      .subscribe({
        next: (response) => {
          if (response) {
            console.log("=== LOGIN SUCCESS ===");
            console.log("Response:", response);
            this.router.navigate(["/pos"]);
          }
        },
        error: (err) => {
          // This should not be reached due to catchError
          console.error("=== UNEXPECTED ERROR IN SUBSCRIBE ===");
          console.error(err);
          this.loading = false;
          this.error = "An unexpected error occurred. Please try again.";
          this.cdr.detectChanges();
        },
      });
  }

  // Clear error when user starts typing
  onInputChange(): void {
    if (this.error) {
      this.error = "";
      this.cdr.detectChanges();
    }
  }
}
