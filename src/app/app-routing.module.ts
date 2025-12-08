import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { authGuard, roleGuard } from "./guards/auth.guard";

const routes: Routes = [
  { path: "", redirectTo: "/pos", pathMatch: "full" },
  {
    path: "login",
    loadComponent: () =>
      import("./components/login/login.component").then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: "pos",
    loadComponent: () =>
      import("./components/pos/pos.component").then((m) => m.PosComponent),
    canActivate: [authGuard],
  },

  {
    path: "categories",
    loadComponent: () =>
      import("./components/categories/categories.component").then(
        (m) => m.CategoriesComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: "sales",
    loadComponent: () =>
      import("./components/sales/sales.component").then(
        (m) => m.SalesComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: "users",
    loadComponent: () =>
      import("./components/users/users.component").then(
        (m) => m.UsersComponent
      ),
    canActivate: [authGuard, roleGuard(["admin", "manager"])],
  },
  {
    path: "providers",
    loadComponent: () =>
      import("./components/providers/providers.component").then(
        (m) => m.ProvidersComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: "templates",
    loadComponent: () =>
      import("./components/templates/templates.component").then(
        (m) => m.TemplatesComponent
      ),
    canActivate: [authGuard, roleGuard(["admin", "manager"])],
  },
  {
    path: "settings",
    loadComponent: () =>
      import("./components/settings/settings.component").then(
        (m) => m.SettingsComponent
      ),
    canActivate: [authGuard, roleGuard(["admin", "manager"])],
  },
  { path: "**", redirectTo: "/pos" },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
