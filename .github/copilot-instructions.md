# Copilot Instructions — POSDic POS System

## Project Overview

Angular 21 (standalone) + Node.js/Express + MongoDB retail POS system.
Features: barcode scanning, digital scale, thermal printing (QZ Tray), multi-user roles, register management.

**Stack:** Angular 21 standalone · RxJS/Signals · Node.js/Express · MongoDB/Mongoose · JWT · Web Serial API · QZ Tray

---

## Standard Development Workflow

Follow this sequence for **every** feature, fix, or change:

1. **Explore** — Read related components, services, models, and existing tests
2. **Baseline** — Run existing tests to confirm starting state
3. **RED** — Write failing tests first; cover happy path, edge cases, auth/permission failures, validation errors
4. **GREEN** — Write minimum code to make tests pass
5. **Verify** — Run tests; confirm all pass
6. **Production-ready** — Add error handling, both translations (en + es), theme styles, guards, cleanup
7. **Rerun tests** — Confirm still passing after additions
8. **Refactor** — Remove duplication, improve readability, no behavior changes
9. **Rerun tests** — Confirm nothing broke
10. **Build** — `ng build --configuration production` — must complete with zero errors

---

## Quick Start

```powershell
npm run dev                                          # Backend (3001) + Frontend (4200)
cd server && node seed.js                            # Seed: admin/admin123, cashier/cashier123

# Tests
npx jest --no-coverage                               # Frontend (all)
npx jest --testPathPatterns="auth" --no-coverage     # Frontend (specific)
cd server && npx jest --no-coverage --forceExit      # Backend

# Production build
ng build --configuration production
```

**MongoDB:** Docker container `product-db` on port 27017 (credentials in `server/.env`)

---

## Architecture

### Frontend (src/)

- **Standalone only** — `standalone: true` + explicit `imports: []` on every component; no NgModule
- **Routing** — lazy `loadComponent()` in `app.routes.ts`; guards: `authGuard`, `roleGuard(['admin'])`
- **HTTP** — `authInterceptor` auto-attaches JWT; `environment.apiUrl` = `https://localhost:3001/api`
- **State** — Services use `BehaviorSubject`; components use `signal()` / `computed()` for local UI only
- **Cleanup** — Always `takeUntil(destroy$)` on every RxJS subscription

### Backend (server/ · Port 3001)

HTTPS · JWT (7d) · MongoDB/Mongoose

**Middleware order:** CORS → body-parser (10mb) → request logging → static files → routes

**Per-route auth:** `protect` verifies JWT · `checkPermission(['permission'])` validates role

**Auth flow:** `POST /api/auth/login` → JWT → localStorage (`token`) → `authInterceptor` → `protect`

---

## Key Patterns

### Component

```typescript
@Component({ selector: 'app-x', standalone: true, imports: [CommonModule, FormsModule, TranslatePipe], ... })
export class XComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.service.getData().pipe(takeUntil(this.destroy$)).subscribe(data => { ... });
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
```

### Service

```typescript
@Injectable({ providedIn: "root" })
export class FeatureService {
  private apiUrl = `${environment.apiUrl}/resource`;
  getAll(): Observable<T[]> {
    return this.http.get<T[]>(this.apiUrl);
  }
}
```

### Backend Route

```javascript
router.post("/", protect, checkPermission(["inventory"]), async (req, res) => {
  try {
    const item = await Model.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
```

### Modal

Child emits `@Output() closed = new EventEmitter<void>()`.
Parent controls visibility: `showModal = signal(false)`.

```html
<div class="modal-overlay" (click)="close()">
  <div class="modal-content" (click)="$event.stopPropagation()">...</div>
</div>
```

### ViewChild Focus

```typescript
@ViewChild('barcodeInput') barcodeInput!: ElementRef;
focus() { setTimeout(() => this.barcodeInput?.nativeElement.focus(), 100); }
```

---

## Translations (Mandatory)

Every new UI string → add to **both** `src/assets/i18n/en.json` and `es.json`.
Template usage: `{{ 'SECTION.KEY' | translate }}`

---

## Styling

```scss
@use "../../../styles/theme" as *;
// Variables: $blue-primary · $success · $danger · $warning · $text-primary · $neumorphic-bg
// Mixins: @include card · @include button-primary · @include respond-to(md)
```

---

## Database Models (Key Fields)

| Model        | Key fields                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------ |
| **Product**  | `sku`, `barcode`, `price`, `stock`, `requiresScale`, `incompleteInfo`, `active`, `available`     |
| **Sale**     | `saleNumber`, `items[]`, `total`, `paymentMethod`, `cashier`, `register`, `status`, `isInternal` |
| **Cart**     | `user`, `items[]`, `register` (session-scoped)                                                   |
| **Register** | `name`, `status` (open/closed), `openedBy`, `deviceId`, `deviceName`                             |
| **User**     | `username`, `firstName`, `lastName`, `email`, `role`, `permissions[]`, `active`                  |

**Backend test required fields:**

- Product: `product_id` required
- Register: `registerNumber` + `openedBy` required
- Sale items: `quantity`, `unitPrice`, `subtotal`, `total` (not `price`)
- User: `firstName`, `lastName`, `email` (not `fullName`)

---

## Permissions

**Roles:** `admin` · `manager` · `cashier` · `employee`
**Permissions:** `sales` · `refunds` · `discounts` · `reports` · `inventory` · `users` · `settings`

Frontend guard: `roleGuard(['admin', 'manager'])` · Backend middleware: `checkPermission(['inventory'])`

---

## Hardware

| Device      | Details                                                                            |
| ----------- | ---------------------------------------------------------------------------------- |
| **Scale**   | Web Serial API · Chrome/Edge only · HTTPS required · `ScaleService.connectScale()` |
| **Printer** | QZ Tray · sign via `POST /api/sign` · cert: `src/assets/digital-certificate.txt`   |
| **Barcode** | Hardware scanner = keyboard input · Camera: `html5-qrcode`                         |

---

## Common Pitfalls

- Missing `standalone: true` on new components
- Signals in services — use `BehaviorSubject`
- Hardcoded API URLs — use `environment.apiUrl`
- Missing `takeUntil(destroy$)` on subscriptions
- Missing translation in `es.json`
- Backend port is **3001**, not 3000
- `TestBed.overrideProvider` after `inject()` — configure per test instead
- No NgModule — project is fully standalone

---

## TDD Reference

- Auto-applied instructions (spec files): `.github/instructions/tdd.instructions.md`
- Feature prompt: `.github/prompts/new-feature-tdd.prompt.md`
- TDD Agent: `.github/agents/tdd-agent.agent.md`
