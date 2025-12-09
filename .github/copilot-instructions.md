# Copilot Instructions - Retail POS System

## Project Overview

A modern Point of Sale (POS) system built with **Angular 21** (standalone components) and **Node.js/Express** with **MongoDB**. Designed for retail stores with barcode scanning, digital scale integration, receipt printing, and multi-user support.

## Architecture

### Frontend (Angular 21)

- **Standalone Components**: No `NgModule`, use `imports: [...]` in `@Component` decorator
- **Signals & RxJS**: Prefer signals for local state, RxJS for async streams
- **Service Injection**: Use `providedIn: 'root'` for singleton services
- **Routing**: Configured in `app.routes.ts` with lazy-loaded components
- **HTTP Interceptor**: `authInterceptor` automatically adds JWT tokens to requests

### Backend (Node.js/Express)

- **RESTful API**: All routes prefixed with `/api/{resource}`
- **Mongoose Models**: Located in `server/models/`, use schema-based validation
- **Middleware**: `protect` for authentication, `checkPermission` for role-based access
- **HTTPS**: Server runs with SSL certs from `server/certs/`
- **CORS**: Configured to allow all origins in development

## Key Conventions

### Component Structure

```typescript
@Component({
  selector: 'app-example',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe, ...],
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss']
})
export class ExampleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Subscribe with takeUntil(destroy$) for cleanup
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### Styling (SCSS)

- **Theme System**: Import `@use "../../../styles/theme" as *;` for variables
- **Neumorphic Design**: Use mixins like `@include card`, `@include button-primary`
- **Color Palette**: Use `$blue-primary`, `$neumorphic-bg`, `$text-primary` (defined in `_theme.scss`)
- **Shadows**: `$shadow-neumorphic`, `$shadow-neumorphic-inset` for depth
- **Responsive**: Use `@include respond-to(md)` for breakpoints
- **Touch Targets**: Min height `$touch-target-md` (34px) for mobile

### Translation System (i18n)

- **Files**: `src/assets/i18n/en.json` and `es.json`
- **Structure**: Hierarchical JSON keys (`"POS.QUICK_PRODUCT.TITLE": "Quick Product"`)
- **Usage**: `{{ 'POS.SEARCH_PLACEHOLDER' | translate }}`
- **Always add both English and Spanish** when creating new UI text

### API Communication

- **Services**: Use typed interfaces from `src/app/models/index.ts`
- **Environment**: `environment.apiUrl` points to backend (http://localhost:3000/api in dev)
- **Error Handling**: Services return `Observable<T>`, components subscribe and handle errors
- **Pagination**: Use `PaginatedResponse<T>` for list endpoints

### State Management

- **Cart State**: Managed by `CartStateService` with signals (e.g., `cartCount()`, `cartTotal()`)
- **Search State**: `SearchStateService` shares search query across components
- **User State**: `AuthService.getCurrentUser()` returns current user or null
- **Register State**: `RegisterService` manages active register (cashiers must open register)

## Common Workflows

### Adding a New Feature to POS

1. **Create standalone component** in `src/app/components/{feature}/`
2. **Define model** in `src/app/models/index.ts` (TypeScript interface)
3. **Create service** in `src/app/services/{feature}.service.ts` with API calls
4. **Add translations** in `src/assets/i18n/en.json` and `es.json`
5. **Add route** in `src/app/app.routes.ts` if needed
6. **Apply theme styles** using mixins from `_theme.scss`

### Adding Backend API Endpoint

1. **Create/update Mongoose model** in `server/models/{Model}.js`
2. **Add route handler** in `server/routes/{resource}.js`
3. **Register route** in `server/index.js`: `app.use('/api/{resource}', {resource}Routes)`
4. **Use middleware**: `protect` for auth, `checkPermission(['permission'])` for roles
5. **Return consistent JSON**: `res.json({ data })` or `res.status(400).json({ message })`

### Creating Modals

- **Overlay pattern**: Use `<div class="modal-overlay" *ngIf="showModal" (click)="closeModal()">`
- **Modal content**: `<div class="modal-content" (click)="$event.stopPropagation()">`
- **Close behavior**: Click overlay or ESC key to close
- **Styling**: Use `$z-modal` (1050) for z-index, `$radius-2xl` for border-radius

### Product Quick Creation (Special Pattern)

- Products can be created with `incompleteInfo: true` flag for later completion
- Used in POS when barcode not found (`openQuickProductModal()`)
- Dashboard shows incomplete products card for follow-up editing
- Always set `active: true` and `available: true` for newly created products

### Scale Integration

- `ScaleService.connectScale()` uses Web Serial API (Chrome/Edge only)
- Products with `requiresScale: true` prompt for weight entry
- Weight modal displays current scale reading in real-time
- Manual weight entry fallback if scale not connected

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

The calculator component supports full keyboard input for faster data entry:

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

**Implementation Pattern:**

```typescript
// Add keyboard handler to container
<div #calculatorContainer class="calculator" tabindex="-1" (keydown)="onKeydown($event)">

// Handle keyboard events
onKeydown(event: KeyboardEvent): void {
  if (event.key >= '0' && event.key <= '9') {
    event.preventDefault();
    this.appendNumber(event.key);
  }
  else if (event.key === 'Enter' || event.key === '+') {
    event.preventDefault();
    this.handleEnter(); // Adds item or confirms multiply
  }
  else if (event.key === '*') {
    event.preventDefault();
    this.multiplyItem();
  }
  // ... other key handlers
}
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
- **Register**: `name`, `location`, `status` ('open', 'closed'), `openedBy`, `openingBalance`, `currentBalance`

## Security & Permissions

- **Roles**: `admin`, `manager`, `cashier`, `employee`
- **Permissions**: `sales`, `refunds`, `discounts`, `reports`, `inventory`, `users`, `settings`
- **Route Guards**: `authGuard` checks if user is logged in
- **API Middleware**: `protect` verifies JWT, `checkPermission` validates permissions

## Development Commands

```bash
# Start backend only
cd server && npm run dev

# Start frontend only
npm start

# Start both concurrently
npm run dev

# Build production
ng build --configuration production

# Database seed (creates test users/data)
cd server && node seed.js
```

## Testing & Debugging

- **Backend Logs**: Request logging middleware prints all API calls with body
- **MongoDB Queries**: Use `console.log()` in route handlers to debug queries
- **Angular DevTools**: Use browser extension for signals and component inspection
- **Network Tab**: Check API responses, JWT tokens in Authorization header

## Mobile & Hardware

- **Camera Scanner**: `Html5Qrcode` library for barcode scanning via device camera
- **Digital Scale**: Web Serial API (requires HTTPS, Chrome/Edge 89+)
- **Touch Targets**: Minimum 34px height for buttons on mobile
- **Responsive**: Sidebar collapses on mobile (`$breakpoint-md: 768px`)

## Common Pitfalls

- ❌ Don't forget `standalone: true` in new components
- ❌ Don't use `NgModule` - project uses standalone architecture
- ❌ Don't hardcode API URLs - use `environment.apiUrl`
- ❌ Don't skip translations - always add both English and Spanish
- ❌ Don't forget `takeUntil(destroy$)` for RxJS subscriptions
- ❌ Don't mutate state directly - use signals or create new objects
- ❌ Don't use `var` - use `const` or `let` in TypeScript
- ❌ Don't skip error handling in API calls

## Integration Points

- **QZ Tray**: Receipt printing service (requires signing endpoint `/api/sign`)
- **MongoDB**: Connection string in `server/.env` (`MONGODB_URI`)
- **JWT**: Secret in `server/.env` (`JWT_SECRET`), 7-day expiration
- **SSL Certs**: Located in `server/certs/` and root `certs/`

---

**When in doubt**: Check existing components like `pos.component.ts`, `cashier.component.ts`, or `dashboard.component.ts` for patterns and conventions.
