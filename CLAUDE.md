# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A production-ready Point of Sale (POS) system built with Angular 21 (standalone components) and Node.js/Express/MongoDB. Supports barcode scanning, digital scale integration, receipt printing, multi-user roles, and register management for retail environments.

## Development Commands

### Start Development

```bash
# Start both frontend and backend concurrently (recommended)
npm run dev

# Or start separately:
# Terminal 1 - Backend (runs on https://localhost:3001)
cd server
npm run dev

# Terminal 2 - Frontend (runs on https://localhost:4200)
npm start
```

### Build & Test

```bash
# Build for production
ng build --configuration production
# Output: dist/retail-pos/

# Run tests
ng test

# Install all dependencies (root + server)
npm run install-all
```

### Database Setup

```bash
# Seed initial data (users, sample products)
cd server
node seed.js
```

Default login: `admin` / `admin123`, `manager` / `manager123`, `cashier` / `cashier123`

### Deployment

See `deployment/README.md` for production deployment using Git-based workflow:

```bash
# On server: Initial deployment
sudo ./deployment/scripts/deploy.sh

# On server: Update from Git
sudo ./deployment/scripts/update.sh
```

## Architecture

### Frontend (Angular 21)

**Standalone Components** - No NgModule, all components use `standalone: true` with `imports: [...]` in decorator

**Key Architectural Patterns:**
- **Lazy Loading**: All routes use `loadComponent()` in `app.routes.ts`
- **Signals & RxJS**: Signals for local state (`signal()`, `computed()`), RxJS for async streams
- **Service Injection**: All services use `providedIn: 'root'` for singleton pattern
- **Route Guards**: `authGuard` protects authenticated routes, `roleGuard(['admin', 'manager'])` for role-based access
- **HTTP Interceptor**: `authInterceptor` automatically adds JWT tokens to API requests
- **State Services**: `CartStateService` (cart signals), `SearchStateService` (shared search), `RegisterService` (active register)

**Component Structure:**
```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ...],
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss']
})
export class ExampleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Use takeUntil for RxJS cleanup
    this.service.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(...);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

**Important Frontend Directories:**
- `src/app/components/` - All UI components (pos, cashier, dashboard, products, etc.)
- `src/app/services/` - Business logic services (auth, cart, product, sale, etc.)
- `src/app/guards/` - Route guards (authGuard, roleGuard)
- `src/app/interceptors/` - HTTP interceptors (authInterceptor)
- `src/app/models/` - TypeScript interfaces/types
- `src/assets/i18n/` - Translation files (en.json, es.json)
- `src/styles/` - Global styles and theme system

### Backend (Node.js/Express)

**RESTful API** - All routes prefixed with `/api/{resource}`

**Database:** MongoDB with Mongoose ORM

**Authentication:** JWT tokens, 7-day expiration

**Middleware Stack:**
- `protect` - Verifies JWT and attaches user to `req.user`
- `checkPermission(['permission'])` - Validates user has required permissions
- CORS configured to allow all origins (restrict in production)
- Body parser for JSON/urlencoded
- Request logging middleware (logs method, path, body)

**API Structure:**
```
server/
├── index.js              # Express app, middleware, route registration
├── config/database.js    # MongoDB connection
├── models/               # Mongoose schemas
│   ├── User.js          # username, role, permissions, active
│   ├── Product.js       # sku, barcode, price, stock, category, requiresScale, incompleteInfo
│   ├── Category.js      # name, color, icon, parent (hierarchical)
│   ├── Sale.js          # saleNumber, items[], total, paymentMethod, cashier, register, status
│   ├── Cart.js          # user, items[], register (session-specific)
│   ├── Register.js      # name, status, openedBy, openingBalance, currentBalance
│   ├── Provider.js      # name, contact info
│   └── PrintTemplate.js # receipt templates
├── routes/              # API endpoints
│   ├── auth.js          # POST /login, /register
│   ├── products.js      # CRUD + GET /barcode/:code
│   ├── categories.js    # CRUD
│   ├── sales.js         # CRUD + PUT /:id/cancel, GET /reports/summary
│   ├── carts.js         # Session cart management
│   ├── registers.js     # Open/close register operations
│   ├── users.js         # User management (admin/manager only)
│   ├── providers.js     # Supplier management
│   └── templates.js     # Print template management
└── middleware/
    └── auth.js          # protect, checkPermission
```

**Environment Variables** (`server/.env`):
- `PORT=3001`
- `MONGODB_URI=mongodb://admin:productdb2025@localhost:27017/products?authSource=admin`
- `JWT_SECRET=your_jwt_secret` (min 32 chars in production)
- `JWT_EXPIRE=7d`
- `NODE_ENV=development` or `production`

### Key Data Models

**Product** - Core inventory item
- `sku`: Unique product code
- `barcode`: Barcode for scanning (indexed)
- `name`, `description`, `category`, `provider`
- `price`, `cost`, `stock`
- `requiresScale`: Boolean - prompts for weight entry
- `incompleteInfo`: Boolean - flagged for later completion (used in quick product creation)
- `active`, `available`: Boolean - control visibility

**Sale** - Transaction record
- `saleNumber`: Auto-incremented unique identifier
- `items[]`: Array of `{ product, quantity, price, subtotal }`
- `subtotal`, `discount`, `tax`, `total`
- `paymentMethod`: 'cash', 'card', 'transfer', 'mixed'
- `cashier`, `register`: References
- `status`: 'completed', 'cancelled'
- `isInternal`: Boolean - internal transfer flag

**Cart** - Session-based cart (per user per register)
- Linked to `user` and `register`
- `items[]`: Same structure as Sale items
- Temporary storage before sale completion

**Register** - Cash register/POS terminal
- `name`, `location`
- `status`: 'open' or 'closed'
- `openedBy`: User reference
- `openingBalance`, `currentBalance`
- Cashiers must open a register before processing sales

**User** - Authentication and authorization
- `username`, `fullName`, `email`
- `role`: 'admin', 'manager', 'cashier', 'employee'
- `permissions[]`: Array of permission strings
- `active`: Boolean - can be disabled without deletion

### Permissions System

**Roles:**
- `admin` - Full system access
- `manager` - Management, reports, inventory
- `cashier` - POS, sales processing
- `employee` - Limited access

**Permissions:**
- `sales` - Process transactions
- `refunds` - Cancel/refund sales
- `discounts` - Apply discounts
- `reports` - View sales reports
- `inventory` - Manage products/categories
- `users` - User management
- `settings` - System configuration

**Implementation:**
- Frontend: `roleGuard(['admin', 'manager'])` in routes
- Backend: `checkPermission(['inventory', 'settings'])` middleware

## Styling & Theme System

**SCSS with Neumorphic Design**

Import theme variables: `@use "../../../styles/theme" as *;`

**Key Variables:**
- Colors: `$blue-primary`, `$green-success`, `$red-danger`, `$neumorphic-bg`, `$text-primary`
- Shadows: `$shadow-neumorphic`, `$shadow-neumorphic-inset`
- Sizing: `$touch-target-sm: 30px`, `$touch-target-md: 34px`
- Breakpoints: `$breakpoint-sm: 480px`, `$breakpoint-md: 768px`, `$breakpoint-lg: 1024px`

**Mixins:**
- `@include card` - Neumorphic card style
- `@include button-primary` - Primary button style
- `@include respond-to(md)` - Responsive media queries

**Example:**
```scss
@use "../../../styles/theme" as *;

.my-component {
  @include card;
  padding: $spacing-4;

  button {
    @include button-primary;
    min-height: $touch-target-md;
  }

  @include respond-to(md) {
    padding: $spacing-2;
  }
}
```

## Translation System (i18n)

**Files:** `src/assets/i18n/en.json`, `es.json`

**Structure:** Hierarchical JSON keys
```json
{
  "POS": {
    "TITLE": "Point of Sale",
    "SEARCH_PLACEHOLDER": "Search products..."
  }
}
```

**Usage in Templates:**
```html
<h1>{{ 'POS.TITLE' | translate }}</h1>
<input [placeholder]="'POS.SEARCH_PLACEHOLDER' | translate">
```

**Always add both English and Spanish** when creating new UI text.

## Special Features & Integrations

### Barcode Scanning
- **Manual input**: Text field in POS
- **Camera scanning**: `html5-qrcode` library (mobile-friendly)
- **Hardware scanners**: Work as keyboard input
- Product lookup: `GET /api/products/barcode/:barcode`

### Digital Scale Integration
- **Web Serial API** (Chrome/Edge 89+ only, requires HTTPS)
- `ScaleService.connectScale()` to pair device
- Products with `requiresScale: true` trigger weight entry modal
- Real-time weight display, manual fallback

### Receipt Printing
- **QZ Tray** integration for physical printers
- Customizable print templates (stored in `PrintTemplate` model)
- Signing endpoint: `POST /api/sign` (uses `server/private-key.pem`)
- Template variables: `{{storeName}}`, `{{items}}`, `{{total}}`, etc.

### Quick Product Creation
- When barcode not found in POS, prompt for quick creation
- Creates product with `incompleteInfo: true` flag
- Dashboard shows incomplete products card for follow-up editing
- Allows uninterrupted cashier workflow

### Register Management
- Cashiers must open register before processing sales
- Opening balance recorded
- Tracks all transactions on that register
- Auto-close at midnight option (systemd service: `posdic-auto-close.service`)

## Common Workflows

### Adding a New Component

1. Generate: `ng generate component components/my-feature --standalone`
2. Add route in `app.routes.ts` with lazy loading
3. Create service if needed: `ng generate service services/my-feature`
4. Define TypeScript interfaces in `src/app/models/`
5. Add translations in `en.json` and `es.json`
6. Import theme: `@use "../../../styles/theme" as *;`

### Adding a Backend API Endpoint

1. Create/update Mongoose model in `server/models/MyModel.js`
2. Create route handler in `server/routes/myresource.js`
3. Register route in `server/index.js`: `app.use('/api/myresource', myresourceRoutes)`
4. Use middleware: `router.get('/', protect, async (req, res) => { ... })`
5. Return consistent JSON: `res.json({ data })` or `res.status(400).json({ message })`

### Modifying a Sale Workflow

Sales involve: Cart → Sale → Register → Receipt

1. **Cart State**: `CartStateService` manages cart items (signals)
2. **Sale Creation**: `SaleService.createSale(saleData)`
3. **Register Update**: Backend updates register balance
4. **Receipt**: `ReceiptGeneratorService.generateReceipt(sale)` + QZ Tray print

### Environment Configuration

**Development:**
- Frontend: `src/environments/environment.ts` (or `environment.development.ts`)
  - `apiUrl: "https://localhost:3001/api"`
- Backend: `server/.env`
  - `MONGODB_URI=mongodb://admin:...@localhost:27017/products`

**Production:**
- Frontend: `src/environments/environment.prod.ts`
  - `apiUrl: "/api"` (relative, nginx proxy)
  - Set via file replacement in `angular.json`
- Backend: `/var/www/posdic/backend/.env` on server
  - Update `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`

## Common Patterns

### ViewChild for Focus Management
```typescript
@ViewChild('barcodeInput') barcodeInput!: ElementRef;

focusBarcode(): void {
  setTimeout(() => this.barcodeInput?.nativeElement.focus(), 100);
}
```

### Component Communication (Parent/Child)
```typescript
// Child
@Output() addItem = new EventEmitter<{ value: number }>();
confirmAdd(): void {
  this.addItem.emit({ value: this.currentValue });
}

// Parent template
<app-calculator (addItem)="onCalculatorAdd($event)"></app-calculator>
```

### Modal Pattern
```html
<div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">
  <div class="modal-content" (click)="$event.stopPropagation()">
    <!-- Modal content -->
  </div>
</div>
```

```scss
.modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: $z-modal; // 1050
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Toast Notifications
```typescript
this.toastService.show("Success message", "success");
this.toastService.show("Error occurred", "error");
this.toastService.show("Warning", "warning");
```

## Security Considerations

- **JWT tokens** stored in localStorage, sent via Authorization header
- **Password hashing** with bcryptjs (backend)
- **CORS** configured permissively in dev, restrict in production
- **Change default passwords** after seeding database
- **Strong JWT_SECRET** (min 32 random characters)
- **MongoDB authentication** enabled
- **HTTPS required** for camera/scale features (Web APIs requirement)
- **Route guards** prevent unauthorized access on frontend
- **Middleware** enforces permissions on backend

## SSL/HTTPS Setup

**Development:**
- Self-signed certificates in `certs/` and `server/certs/`
- Angular serves on HTTPS: `ng serve --ssl --ssl-key certs/localhost-key.pem --ssl-cert certs/localhost-cert.pem`
- Configured in `angular.json` serve options
- Backend uses HTTPS in `server/index.js` (reads certs)

**Production:**
- Use Let's Encrypt via `certbot --nginx -d yourdomain.com`
- Nginx config in `deployment/nginx/posdic.conf`
- HTTP redirects to HTTPS
- Backend runs on HTTP (nginx handles SSL termination)

## Troubleshooting Tips

**MongoDB Connection Issues:**
- Verify MongoDB running: `mongosh` or `mongo`
- Check credentials in `server/.env`
- Ensure database exists and auth enabled

**Build Errors:**
- Clear Angular cache: `rm -rf .angular/cache`
- Delete and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check Angular CLI version: `ng version`

**Camera Scanner Not Working:**
- Requires HTTPS (browser security)
- Check browser permissions (camera access)
- `html5-qrcode` library must be installed

**Scale Not Connecting:**
- Chrome/Edge only (Web Serial API)
- HTTPS required
- Check USB connection and permissions

**API 401 Unauthorized:**
- Token expired (7 days default)
- Re-login to get new token
- Check `authInterceptor` is applied

## Project-Specific Notes

### Database Population
- Initial seed includes ~16,994 grocery products (mentioned in README)
- `server/seed.js` creates users, sample categories, products
- Run once after fresh database setup

### LAN Access / Multi-Device
- Frontend configured with `--host 0.0.0.0 --disable-host-check` in `package.json` start script
- Allows access from network devices (tablets, phones)
- Update `environment.ts` with server IP for LAN clients
- Windows firewall rules: `setup-firewall.ps1` (Administrator)

### Fuzzy Search
- Backend implements fuzzy search with Levenshtein distance
- Tolerates misspellings in product search
- 300ms debounce on search input (prevents excessive API calls)

### Auto-Focus Search Bar
- POS component auto-focuses barcode input for scanner compatibility
- Uses `@ViewChild` + `setTimeout` pattern

### Internal Transfers
- Sales can be marked `isInternal: true` for inventory transfers
- Does not affect revenue reports (filtered out in analytics)

### Product States
- `active: false` - Product exists but hidden (soft delete)
- `available: false` - Out of stock or temporarily unavailable
- `incompleteInfo: true` - Needs additional details (quick creation)

## File Reference

**Critical Configuration Files:**
- `angular.json` - Angular build config, output path is `dist/retail-pos`
- `package.json` - Frontend scripts (`start`, `dev`, `build`)
- `server/package.json` - Backend dependencies and scripts
- `server/.env` - Backend environment variables (not in Git)
- `src/environments/` - Frontend API URLs (different per environment)
- `src/app/app.routes.ts` - All application routes with guards
- `server/index.js` - Express app entry point, middleware, routes

**Deployment:**
- `deployment/` - All deployment scripts, nginx configs, systemd services
- `deployment/scripts/deploy.sh` - Initial Git-based deployment
- `deployment/scripts/update.sh` - Update from Git repo
- See `deployment/README.md` for complete deployment guide
