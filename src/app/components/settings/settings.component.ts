import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-settings",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-container">
      <h1>Settings</h1>
      <p>Configure system settings</p>
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
export class SettingsComponent implements OnInit {
  ngOnInit(): void {}
}
