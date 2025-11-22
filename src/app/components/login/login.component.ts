import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./login.component.html",
  styleUrls: ["./login.component.scss"],
})
export class LoginComponent implements OnInit {
  username = "";
  password = "";
  error = "";
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(["/pos"]);
    }
  }

  onSubmit(): void {
    if (!this.username || !this.password) {
      this.error = "Please enter username and password";
      return;
    }

    this.loading = true;
    this.error = "";

    console.log("Attempting login with:", this.username);

    this.authService.login(this.username, this.password).subscribe({
      next: (response) => {
        console.log("Login successful:", response);
        this.router.navigate(["/pos"]);
      },
      error: (err) => {
        console.error("Login error:", err);
        console.error("Error status:", err.status);
        console.error("Error URL:", err.url);

        // Handle different error scenarios
        if (err.status === 0) {
          this.error =
            "Unable to connect to server. Please check your connection.";
        } else if (err.status === 401) {
          this.error = "Invalid username or password. Please try again.";
        } else if (err.status === 404) {
          this.error = "Server not found. Please contact support.";
        } else {
          this.error = err.error?.message || "Login failed. Please try again.";
        }

        this.loading = false;
      },
    });
  }
}
