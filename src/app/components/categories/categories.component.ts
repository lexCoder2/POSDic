import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-categories",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <h1>Category Management</h1>
      <p>Manage product categories here</p>
    </div>
  `,
  styles: [
    `
      .page-container {
        padding: 20px;
      }
    `,
  ],
})
export class CategoriesComponent implements OnInit {
  ngOnInit(): void {}
}
