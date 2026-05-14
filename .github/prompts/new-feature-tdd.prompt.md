---
mode: "agent"
tools:
  [
    "read_file",
    "grep_search",
    "file_search",
    "semantic_search",
    "create_file",
    "replace_string_in_file",
    "run_in_terminal",
    "get_errors",
  ]
description: "Implement any POS feature using strict TDD — tests first, then code"
---

# New Feature — TDD Workflow

Implement the requested feature following this exact sequence. No shortcuts.

## Step 1 — Explore

Read related files before writing anything:

- Similar components/services for conventions
- `src/app/models/index.ts` — TypeScript interfaces
- `server/models/` — Mongoose schemas
- `src/assets/i18n/en.json` — existing translation keys
- An existing spec file for test patterns

## Step 2 — Run baseline tests

Confirm tests pass before any changes:

```bash
npx jest --no-coverage
cd server && npx jest --no-coverage --forceExit
```

## Step 3 — RED: Write failing tests

Write all test cases **before** any implementation. Confirm they fail.

**Frontend service** (`src/app/services/feature.service.spec.ts`):

- Service creates
- All public methods return expected data (mock HTTP)
- BehaviorSubject updates correctly
- Error responses handled

**Frontend component** (`src/app/components/feature/feature.component.spec.ts`):

- Component creates
- Initial state correct
- User interactions work
- `@Output` events emitted correctly
- Auth guard redirects work

**Backend** (`server/__tests__/integration/feature.test.js`):

```javascript
it("GET /api/feature - 200 authenticated list");
it("GET /api/feature - 401 no token");
it("POST /api/feature - 201 creates item");
it("POST /api/feature - 403 wrong role");
it("POST /api/feature - 400 missing required fields");
it("GET /api/feature/:id - 404 not found");
```

**Run to confirm RED:**

```bash
npx jest --testPathPatterns="feature" --no-coverage
cd server && npx jest --testPathPatterns="feature" --no-coverage --forceExit
```

## Step 4 — GREEN: Implement minimum code

Write only enough to pass the tests.

**Angular Service:**

```typescript
@Injectable({ providedIn: "root" })
export class FeatureService {
  private apiUrl = `${environment.apiUrl}/feature`;
  constructor(private http: HttpClient) {}
  getItems(): Observable<Feature[]> {
    return this.http.get<Feature[]>(this.apiUrl);
  }
}
```

**Angular Component:**

```typescript
@Component({ selector: 'app-feature', standalone: true, imports: [CommonModule, FormsModule, TranslatePipe], ... })
export class FeatureComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  ngOnInit() { this.service.getItems().pipe(takeUntil(this.destroy$)).subscribe(items => this.items = items); }
  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }
}
```

**Express Route:**

```javascript
router.get("/", protect, async (req, res) => {
  try {
    res.json(await Model.find());
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
```

**Run to confirm GREEN:**

```bash
npx jest --no-coverage
cd server && npx jest --no-coverage --forceExit
```

## Step 5 — Production-ready

- Add error handling and user feedback (toast notifications)
- Add translations to `src/assets/i18n/en.json` **and** `es.json`
- Apply theme SCSS (`@use "../../../styles/theme" as *;`, use variables/mixins)
- Add route guards if needed (`authGuard`, `roleGuard`)
- Validate at system boundaries only

**Rerun tests** — confirm still passing.

## Step 6 — Refactor

- Remove duplication
- Improve readability
- No behavior changes

**Rerun tests** — confirm nothing broke.

## Step 7 — Build

```bash
ng build --configuration production
```

Zero errors required. Fix any TypeScript or build issues.

---

## Completion Checklist

- [ ] All frontend tests pass: `npx jest --no-coverage`
- [ ] All backend tests pass: `cd server && npx jest --no-coverage --forceExit`
- [ ] Translations in both `en.json` and `es.json`
- [ ] SCSS uses theme variables (no hardcoded hex colors)
- [ ] `standalone: true` on all Angular components
- [ ] `takeUntil(destroy$)` on all RxJS subscriptions
- [ ] Route added to `app.routes.ts` if navigable
- [ ] Production build succeeds with zero errors
