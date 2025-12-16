# Copilot Instructions - Retail POS System

## Project Overview

A production-ready Point of Sale (POS) system built with **Angular 21** (standalone components) and **Node.js/Express/MongoDB**. Supports barcode scanning, digital scale integration, thermal receipt printing (QZ Tray), multi-user roles, register management, and device binding for retail environments.

**Key Tech Stack:**

- Frontend: Angular 21 standalone components, RxJS, Signals
- Backend: Node.js/Express, MongoDB/Mongoose, JWT auth
- Hardware: Web Serial API (scales), QZ Tray (printers), Html5Qrcode (camera scanning)
- Deployment: HTTPS (self-signed certs), Windows PowerShell scripts, Git-based deploy workflow

## Quick Start (Windows Development)

```powershell
# Start both servers with status display
.\start-pos.ps1

# Check system status (MongoDB, backend, frontend)
.\check-status.ps1

# Or manually:
npm run dev  # Starts both backend + frontend concurrently
# Backend: https://localhost:3001 | Frontend: http://localhost:4200

# Seed database with test users (admin/admin123, cashier/cashier123)
cd server && node seed.js
```

**MongoDB:** Runs in Docker container `product-db` on port 27017 (credentials in `server/.env`)

## Architecture Deep Dive

### Frontend (Angular 21 Standalone)

**No `NgModule` - Pure Standalone Architecture:**

- All components declare `standalone: true` with explicit `imports: [...]`
- Routes use `loadComponent()` in `app.routes.ts` for lazy loading
- Guards are functional: `authGuard` (no return type), `roleGuard(['admin', 'manager'])` (factory)
- HTTP interceptor `authInterceptor` auto-injects JWT from localStorage

**State Management Pattern:**

- **BehaviorSubject for cross-component state**: `CartStateService.cart$` (cart items), `SearchStateService.searchQuery$`, `AuthService.currentUser$`
- **Services use BehaviorSubject, NOT signals**: All state services expose observables (see `cart-state.service.ts`, `search-state.service.ts`, `register.service.ts`)
- **Local component state**: Use signals (`signal()`, `computed()`) ONLY for component UI state like `showModal = signal(false)`, `isLoading = signal(false)`
- **Memory cleanup**: ALWAYS use `takeUntil(destroy$)` pattern in components subscribing to observables

**Critical Services:**

- `AuthService`: JWT management, `isAuthenticated()`, `getCurrentUser()` from localStorage
- `RegisterService`: Active register tracking, device binding (cashiers must open register before POS)
- `DeviceService`: Generates unique device fingerprint for register binding (browser-based ID)
- `CartStateService`: Manages cart via backend API (`/api/carts`), not in-memory
- `QzTrayService`: Thermal printer integration, requires certificate override (`override.crt`)

### Backend (Node.js/Express)

**Port 3001** (not 3000) - Runs on HTTPS with self-signed certs in `server/certs/`

**Middleware Stack (order matters):**

1. CORS (development: allow all origins)
2. `body-parser` JSON/urlencoded (10mb limit)
3. Request logging (logs method, path, body for POST/PUT)
4. Static file serving (`/product_images`, `/assets`)
5. Route handlers with `protect` + `checkPermission(['permission'])`

**Authentication Flow:**

- POST `/api/auth/login` → Returns JWT + user object
- JWT stored in localStorage (`token` key)
- `authInterceptor` reads token and adds `Authorization: Bearer <token>` header
- `protect` middleware verifies JWT, attaches `req.user` (username, role, permissions)

**Database Models (Key Fields):**

- **Register**: `deviceId`, `deviceName` (auto-set when cashier opens register)
- **Product**: `incompleteInfo: true` for quick-add (used when barcode not found in POS)
- **Sale**: `isInternal: true` for internal transactions (not counted in revenue reports)
- **Cart**: `register` field links cart to specific register (session-based)

## Key Conventions & Patterns

### Component Structure (Mandatory Pattern)

```typescript
@Component({
  selector: 'app-example',
  standalone: true, // REQUIRED - no NgModule
  imports: [CommonModule, FormsModule, TranslatePipe, ...], // Explicit imports
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss']
})
export class ExampleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>(); // REQUIRED for cleanup

  ngOnInit(): void {
    // ALWAYS use takeUntil for RxJS cleanup
    this.service.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => { ... });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### Modal Component Pattern (OpenRegisterComponent Example)

**File structure:** `src/app/components/open-register/` (self-contained modal)

**Child component (modal):**

```typescript
@Output() registerOpened = new EventEmitter<void>();
@Output() cancelled = new EventEmitter<void>();

closeModal(): void {
  this.cancelled.emit(); // Parent controls visibility
}
```

**Parent component:**

```typescript
showOpenRegisterModal = signal<boolean>(false); // Signal for visibility

onRegisterOpened(): void {
  this.showOpenRegisterModal.set(false);
  this.focusBarcodeInput(); // Auto-focus after modal closes
}
```

**Template usage:**

```html
<app-open-register
  *ngIf="showOpenRegisterModal()"
  (registerOpened)="onRegisterOpened()"
  (cancelled)="showOpenRegisterModal.set(false)"
>
</app-open-register>
```

**Critical:** Modal components use overlay pattern with `(click)="closeModal()"` on overlay and `(click)="$event.stopPropagation()"` on modal content.

### ViewChild Focus Pattern (Barcode Input)

```typescript
@ViewChild('barcodeInput') barcodeInput!: ElementRef;

focusBarcode(): void {
  setTimeout(() => this.barcodeInput?.nativeElement.focus(), 100);
  // 100ms delay ensures DOM is ready after modal close
}
```

### Calculator Component (Keyboard Shortcuts)

Located in `src/app/components/calculator/` - Used for quick product entry in POS.

**Keyboard bindings:**

- `0-9`: Append digit
- `.` or `,`: Decimal point
- `Backspace`: Delete last digit
- `Escape` or `C`: Clear display
- `Enter` or `+`: Add to cart (or confirm multiply)
- `*`: Multiply mode (adds N items or updates last item quantity)

**Multiply button logic:**

- Empty display + `*` → Updates last cart item with new quantity
- Value in display + `*` → Adds N items of that value
- Button spans 2 columns, styled with `$warning` color

**Signals:**

```typescript
display = signal<string>("0");
isMultiplying = signal<boolean>(false);
multiplyMode = signal<"add" | "update" | null>(null);
pendingMultiplyValue = signal<number | null>(null);
```

### Styling System (SCSS Theme)

**Import pattern:** `@use "../../../styles/theme" as *;` (relative path from component)

**Neumorphic design system:**

- Theme file: `src/styles/_theme.scss` (549 lines of variables and mixins)
- Base color: `$neumorphic-bg: #ffffff`, `$blue-primary: #654483` (primary brand)
- Shadows: `$shadow-neumorphic` (raised), `$shadow-neumorphic-inset` (pressed)
- Mixins: `@include card`, `@include button-primary`, `@include respond-to(md)`

**Color usage rules:**

- Use `$blue-primary`, `$success`, `$danger`, `$warning`, `$info` for semantic colors
- Text: `$text-primary` (gray-700), `$text-secondary` (gray-500)
- Backgrounds: `$neumorphic-bg`, `$neumorphic-surface`

**Responsive breakpoints:**

```scss
@include respond-to(md) {
  /* 768px+ */
}
@include respond-to(lg) {
  /* 1024px+ */
}
```

**Touch targets:** Use `$touch-target-md` (34px min height) for mobile buttons

### Translation System (Mandatory for UI Text)

**Files:** `src/assets/i18n/en.json` (965 lines) and `es.json` (Spanish)

**Structure:** Hierarchical JSON keys using dot notation

```json
{
  "POS": {
    "SEARCH_PLACEHOLDER": "Search product...",
    "QUICK_PRODUCT": {
      "TITLE": "Quick Product",
      "BARCODE": "Barcode"
    }
  }
}
```

**Usage in templates:** `{{ 'POS.SEARCH_PLACEHOLDER' | translate }}`

**CRITICAL RULE:** When adding new UI text, ALWAYS add both English and Spanish translations. No hardcoded strings in templates.

### API Communication Pattern

**Environment config:** `src/environments/environment.ts`

```typescript
apiUrl: "https://localhost:3001/api"; // Note: 3001, not 3000
```

**Service pattern:**

```typescript
@Injectable({ providedIn: "root" })
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }
}
```

**Error handling:** Services return `Observable<T>`, components handle errors in subscribe block.

**Pagination:** Use `PaginatedResponse<T>` interface for list endpoints (includes `data`, `total`, `page`, `pageSize`).

### State Management

- **Cart State**: Managed by `CartStateService` with `cart$: Observable<Cart>` (BehaviorSubject-backed)
- **Search State**: `SearchStateService.searchQuery$` shares search query across components via BehaviorSubject
- **User State**: `AuthService.currentUser$` observable + `getCurrentUser()` method for sync access
- **Register State**: `RegisterService.currentRegister$` manages active register with device binding (cashiers must open register)
- **Device Identification**: `DeviceService` generates unique device fingerprints for register binding
- **Component Signals**: Use signals ONLY for local component UI state (`showModal = signal(false)`), NOT for service state

## Common Workflows

### Adding a New Feature to POS

1. **Create standalone component** in `src/app/components/{feature}/`
2. **Define model** in `src/app/models/index.ts` (TypeScript interface)
3. **Create service** in `src/app/services/{feature}.service.ts` with API calls
4. **Add translations** in `src/assets/i18n/en.json` and `es.json`
5. **Add route** in `src/app/app.routes.ts` if needed (use `loadComponent()`)
6. **Apply theme styles** using mixins from `_theme.scss`

### Creating Reusable Modal Components

**Pattern Example: OpenRegisterComponent**

1. **Create component** with `@Output()` events for parent communication:

```typescript
@Output() registerOpened = new EventEmitter<void>();
@Output() cancelled = new EventEmitter<void>();
```

2. **Add to parent component imports**:

```typescript
imports: [OpenRegisterComponent, ...]
```

3. **Use signals for modal state**:

```typescript
showOpenRegisterModal = signal<boolean>(false);
```

4. **Template usage**:

```html
<app-open-register
  *ngIf="showOpenRegisterModal()"
  (registerOpened)="onRegisterOpened()"
  (cancelled)="closeRegisterModal()"
>
</app-open-register>
```

5. **Handle events in parent**:

```typescript
onRegisterOpened(): void {
  this.showOpenRegisterModal.set(false);
  // Additional logic after register opens
}
```

### Adding Backend API Endpoint

1. **Create/update Mongoose model** in `server/models/{Model}.js`
2. **Add route handler** in `server/routes/{resource}.js`
3. **Register route** in `server/index.js`: `app.use('/api/{resource}', {resource}Routes)`
4. **Use middleware**: `protect` for auth, `checkPermission(['permission'])` for roles
5. **Return consistent JSON**: `res.json({ data })` or `res.status(400).json({ message })`

### Product Quick Creation (Special Pattern)

- Products can be created with `incompleteInfo: true` flag for later completion
- Used in POS when barcode not found (`openQuickProductModal()`)
- Dashboard shows incomplete products card for follow-up editing
- Always set `active: true` and `available: true` for newly created products

### QR Code Generation & Thermal Printing

- **QR Badge Generation**: `settings.component.ts` handles employee QR badge creation
- **Display Size**: 150x150 pixels for on-screen preview (`generateQrCode()`)
- **Print Size**: 120x120 pixels optimized for 58mm/80mm thermal printers (`printQrBadge()`)
- **Badge Layout**: Simplified HTML/CSS with monospace fonts, minimal padding, no shadows for thermal printing
- **QZ Tray Integration**: Uses QZ Tray service for direct thermal printer communication

### Scale Integration

- `ScaleService.connectScale()` uses Web Serial API (Chrome/Edge only)
- Products with `requiresScale: true` prompt for weight entry
- Weight modal displays current scale reading in real-time
- Manual weight entry fallback if scale not connected

### Register Management & Device Binding

**OpenRegisterComponent** (`open-register/`) - Dedicated component for opening registers with smart device binding:

- **Device Auto-Selection**: Automatically selects register bound to current device using `DeviceService`
- **Role-Based Access**:
  - Admins/Managers: Can select any register, create new registers, manage all devices
  - Cashiers/Employees: Can only open registers bound to their device or unbound registers
- **Device Binding**: Registers are automatically bound to devices when opened (stored in `deviceId` and `deviceName`)
- **Visual Indicators**: Shows which registers are linked to current device (⭐) or other devices (🔒)
- **Used in**: POS component and Cashier component
- **Backend API**: `/api/registers/available`, `/api/registers/device/:deviceId`

**Implementation Pattern:**

```typescript
// In parent component
showOpenRegisterModal = signal<boolean>(false);

openRegisterModal(): void {
  this.showOpenRegisterModal.set(true);
}

onRegisterOpened(): void {
  this.showOpenRegisterModal.set(false);
  // Register opened successfully, component auto-focuses input
}

// In template
<app-open-register
  (registerOpened)="onRegisterOpened()"
  (cancelled)="closeRegisterModal()"
></app-open-register>
```

## Important Patterns

### ViewChild References

```typescript
@ViewChild('barcodeInput') barcodeInput!: ElementRef;

focusBarcode(): void {
  setTimeout(() => this.barcodeInput?.nativeElement.focus(), 100);
}
```

### Event Emitters (Component Communication)

```typescript
// Child component
@Output() addItem = new EventEmitter<{ value: number }>();

confirmAdd(): void {
  this.addItem.emit({ value: this.currentValue });
}

// Parent template
<app-calculator (addItem)="onCalculatorAdd($event)"></app-calculator>
```

### Calculator Component (Keyboard Support)

The calculator component (`calculator/`) supports full keyboard input for faster data entry with signals:

**Keyboard Shortcuts:**

- **Numbers (0-9)**: Direct entry to display
- **Decimal point (. or ,)**: Add decimal separator
- **Backspace**: Remove last digit
- **Escape/C**: Clear display
- **Enter or +**: Add item to cart or confirm multiply operation
- **\* (asterisk)**: Trigger multiply mode for quantity entry

**Multiply Functionality:**

- With empty display + `*`: Multiplies the last item (prompts for new quantity)
- With value in display + `*`: Adds multiple items of that value (prompts for quantity)
- The multiply button replaces the "AC" (clear all) button in the grid layout
- Multiply button spans 2 columns, styled with `$warning` color
- Add button spans 2 columns, styled with `$success` color

**Signals Usage:**

```typescript
display = signal<string>("0");
isMultiplying = signal<boolean>(false);
multiplyMode = signal<"add" | "update" | null>(null);
pendingMultiplyValue = signal<number | null>(null);
```

### RxJS Cleanup

```typescript
private destroy$ = new Subject<void>();

this.service.getData()
  .pipe(takeUntil(this.destroy$))
  .subscribe(data => { ... });

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### Toast Notifications

```typescript
this.toastService.show("Success message", "success");
this.toastService.show("Error occurred", "error");
this.toastService.show("Warning", "warning");
```

## Database Models

### Key Fields

- **Product**: `sku`, `name`, `barcode`, `price`, `stock`, `category`, `provider`, `requiresScale`, `incompleteInfo`, `active`, `available`
- **Sale**: `saleNumber`, `items[]`, `subtotal`, `discount`, `tax`, `total`, `paymentMethod`, `cashier`, `register`, `status`, `isInternal`
- **Cart**: `user`, `items[]`, `register` (carts are session-specific)
- **User**: `username`, `fullName`, `role`, `permissions[]`, `active`
- **Register**: `name`, `location`, `status` ('open', 'closed'), `openedBy`, `openingBalance`, `currentBalance`, `deviceId`, `deviceName` (device binding)

## Security & Permissions

- **Roles**: `admin`, `manager`, `cashier`, `employee`
- **Permissions**: `sales`, `refunds`, `discounts`, `reports`, `inventory`, `users`, `settings`
- **Route Guards**: `authGuard` checks if user is logged in
- **API Middleware**: `protect` verifies JWT, `checkPermission` validates permissions

## Development Commands

```powershell
# Start both servers (Windows)
.\start-pos.ps1

# Check system status
.\check-status.ps1

# Manual start
npm run dev          # Start both backend + frontend concurrently
cd server && npm run dev  # Backend only (nodemon on port 3001)
npm start            # Frontend only (ng serve on port 4200)

# Database operations
cd server && node seed.js  # Seed test users and products

# Build & Deploy
ng build --configuration production  # Output: dist/retail-pos/
npm run format       # Format code with Prettier
npm run format:check # Check formatting (runs before build)

# LAN Access (0.0.0.0 binding configured by default)
# Frontend: http://<local-ip>:4200
# Backend: http://<local-ip>:3001/api
```

**MongoDB Container:**

```powershell
docker ps --filter "name=product-db"  # Check if running
docker start product-db               # Start container
```

## Testing & Debugging

- **Backend Logs**: Request logging middleware prints all API calls with body
- **MongoDB Queries**: Use `console.log()` in route handlers to debug queries
- **Angular DevTools**: Use browser extension for signals and component inspection
- **Network Tab**: Check API responses, JWT tokens in Authorization header
- **QZ Tray**: Check `server/private-key.pem` exists, override with `.qz/override.crt` if needed

## Hardware Integration

### QZ Tray (Thermal Printing)

- **Certificate**: Self-signed RSA key pair (`server/private-key.pem`, `server/public-key.pem`)
- **Override**: Copy public key to `~/.qz/override.crt` to suppress warnings
- **Signing Endpoint**: POST `/api/sign` signs requests with SHA512
- **Service**: `QzTrayService` loads certificate from `src/assets/digital-certificate.txt`
- **Setup Scripts**: `setup-qz-override.ps1`, `verify-qz-signing.ps1`

### Digital Scale (Web Serial API)

- **Browser Support**: Chrome/Edge 89+ only (requires HTTPS)
- **Connection**: `ScaleService.connectScale()` prompts for serial port selection
- **Weight Reading**: Real-time weight in modal, manual fallback if not connected
- **Product Flag**: `requiresScale: true` triggers weight prompt

### Barcode Scanner

- **Camera Scanning**: `Html5Qrcode` library (`html5-qrcode` npm package)
- **Manual Input**: Barcode input field with auto-submit on Enter
- **Hardware Scanners**: Act as keyboard input, work with barcode input field

## Common Pitfalls

- ❌ Don't forget `standalone: true` in new components
- ❌ Don't use `NgModule` - project uses standalone architecture
- ❌ Don't hardcode API URLs - use `environment.apiUrl`
- ❌ Don't skip translations - always add both English and Spanish
- ❌ Don't forget `takeUntil(destroy$)` for RxJS subscriptions
- ❌ Don't mutate state directly - use signals or create new objects
- ❌ Don't use `var` - use `const` or `let` in TypeScript
- ❌ Don't skip error handling in API calls
- ❌ Backend runs on port **3001**, not 3000
- ❌ State services use **BehaviorSubject**, not signals

## Integration Points

- **QZ Tray**: Receipt printing service (requires signing endpoint `/api/sign`)
- **MongoDB**: Connection string in `server/.env` (`MONGODB_URI`)
- **JWT**: Secret in `server/.env` (`JWT_SECRET`), 7-day expiration
- **SSL Certs**: Located in `server/certs/` and root `certs/`
- **Product Images**: Served from `server/product_images/` via static middleware

---

**When in doubt**: Check existing components like `pos.component.ts`, `cashier.component.ts`, or `dashboard.component.ts` for patterns and conventions.
