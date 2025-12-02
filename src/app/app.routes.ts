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
        loadComponent: () =>
          import("./components/cashier/cashier.component").then(
            (m) => m.CashierComponent
          ),
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
          import(
            "./components/inventory-session/inventory-session.component"
          ).then((m) => m.InventorySessionComponent),
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
    ],
  },
  { path: "**", redirectTo: "/pos" },
];
