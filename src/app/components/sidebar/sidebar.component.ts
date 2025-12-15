import { Component, Input, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { TranslatePipe } from "../../pipes/translate.pipe";

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.scss"],
})
export class SidebarComponent implements OnInit {
  @Input() mobileSidebarOpen = false;
  @Input() isAdminOrManager = false;
  @Input() isAdmin = false;

  private readonly STORAGE_KEY = "sidebar_extended";
  isExtended = false;

  ngOnInit(): void {
    // Load saved state from localStorage, default to false (collapsed)
    const savedState = localStorage.getItem(this.STORAGE_KEY);
    this.isExtended = savedState === "true";
  }

  toggleSidebar(): void {
    this.isExtended = !this.isExtended;
    // Save state to localStorage
    localStorage.setItem(this.STORAGE_KEY, this.isExtended.toString());
  }
}
