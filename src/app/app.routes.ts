import { Routes } from "@angular/router";
import { authGuard, roleGuard } from "./guards/auth.guard";

export const routes: Routes = [
  { path: "", redirectTo: "/pos", pathMatch: "full" },
  {
    path: "login",
    loadComponent: () =>
      import("./components/login/login.component").then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: "client",
    loadComponent: () =>
      import("./components/client-screen/client-screen.component").then(
        (m) => m.ClientScreenComponent
      ),
  },
  {
    path: "",
    loadComponent: () =>
      import("./components/layout/layout.component").then(
        (m) => m.LayoutComponent
      ),
    canActivate: [authGuard],
    children: [
      {
        path: "pos",
        loadComponent: () =>
          import("./components/pos/pos.component").then((m) => m.PosComponent),
      },
      {
        path: "client",
        loadComponent: () =>
          import("./components/client-screen/client-screen.component").then(
            (m) => m.ClientScreenComponent
          ),
      },
      {
        path: "cashier",
        redirectTo: "/pos",
        pathMatch: "full",
      },

      {
        path: "inventory",
        loadComponent: () =>
          import("./components/inventory/inventory.component").then(
            (m) => m.InventoryComponent
          ),
        canActivate: [roleGuard(["admin", "manager"])],
      },
      {
        path: "inventory-session",
        loadComponent: () =>
          import("./components/inventory-session/inventory-session.component").then(
            (m) => m.InventorySessionComponent
          ),
        canActivate: [roleGuard(["admin", "manager"])],
      },
      {
        path: "dashboard",
        loadComponent: () =>
          import("./components/dashboard/dashboard.component").then(
            (m) => m.DashboardComponent
          ),
        canActivate: [roleGuard(["admin", "manager"])],
      },
      {
        path: "statistics",
        loadComponent: () =>
          import("./components/statistics/statistics.component").then(
            (m) => m.StatisticsComponent
          ),
        canActivate: [roleGuard(["admin", "manager"])],
      },
      {
        path: "categories",
        loadComponent: () =>
          import("./components/categories/categories.component").then(
            (m) => m.CategoriesComponent
          ),
        canActivate: [roleGuard(["admin", "manager"])],
      },
      {
        path: "sales",
        loadComponent: () =>
          import("./components/sales/sales.component").then(
            (m) => m.SalesComponent
          ),
      },
      {
        path: "registers",
        loadComponent: () =>
          import("./components/registers/registers.component").then(
            (m) => m.RegistersComponent
          ),
        canActivate: [roleGuard(["admin", "manager"])],
      },
      {
        path: "users",
        loadComponent: () =>
          import("./components/users/users.component").then(
            (m) => m.UsersComponent
          ),
        canActivate: [roleGuard(["admin", "manager"])],
      },
      {
        path: "providers",
        loadComponent: () =>
          import("./components/providers/providers.component").then(
            (m) => m.ProvidersComponent
          ),
      },
      {
        path: "providers/:id",
        loadComponent: () =>
          import("./components/providers/provider-detail.component").then(
            (m) => m.ProviderDetailComponent
          ),
      },
      {
        path: "templates",
        loadComponent: () =>
          import("./components/templates/templates.component").then(
            (m) => m.TemplatesComponent
          ),
        canActivate: [roleGuard(["admin", "manager"])],
      },
      {
        path: "settings",
        loadComponent: () =>
          import("./components/settings/settings.component").then(
            (m) => m.SettingsComponent
          ),
        canActivate: [roleGuard(["admin", "manager"])],
      },
      {
        path: "dispatcher",
        redirectTo: "/pos",
        pathMatch: "full",
      },
      {
        path: "checkout-desk",
        loadComponent: () =>
          import("./components/checkout-desk/checkout-desk.component").then(
            (m) => m.CheckoutDeskComponent
          ),
        canActivate: [roleGuard(["admin", "manager", "cashier"])],
      },
      {
        path: "shopping-lists",
        loadComponent: () =>
          import("./components/shopping-lists/shopping-lists.component").then(
            (m) => m.ShoppingListsComponent
          ),
        canActivate: [roleGuard(["admin", "manager"])],
      },
    ],
  },
  { path: "**", redirectTo: "/pos" },
];
