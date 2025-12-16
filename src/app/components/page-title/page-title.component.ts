import { Component, Input } from "@angular/core";

@Component({
  selector: "app-page-title",
  standalone: true,
  imports: [],
  templateUrl: "./page-title.component.html",
  styleUrls: ["./page-title.component.scss"],
})
export class PageTitleComponent {
  @Input() title = "";
  @Input() description?: string;
  @Input() icon?: string;
}
