import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { InventoryComponent } from "../inventory/inventory.component";
import { ModalComponent } from "../modal/modal.component";
import { ProductFormComponent } from "../product-form/product-form.component";

@Component({
  selector: "app-categories",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalComponent,
    TranslatePipe,
    ProductFormComponent,
  ],
  templateUrl: "../inventory/inventory.component.html",
  styleUrls: ["../inventory/inventory.component.scss"],
})
export class CategoriesComponent extends InventoryComponent {
  override categoryPageMode = true;
}
