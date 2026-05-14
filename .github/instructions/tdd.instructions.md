---
applyTo: "src/**/*.spec.ts,server/__tests__/**/*.test.js"
---

# TDD Instructions — POSDic POS System

## Workflow (apply to every change)

1. **Explore** — Read the feature's related components, services, and existing tests
2. **Baseline** — Run tests to confirm current state passes
3. **RED** — Write failing tests covering all cases (happy path, edge cases, auth failures, validation)
4. **GREEN** — Write minimum code to pass tests
5. **Verify** — Run tests; confirm all green
6. **Production-ready** — Add error handling, translations (en + es), theme styles, guards
7. **Rerun tests** — Confirm still passing
8. **Refactor** — Remove duplication, improve readability; no behavior changes
9. **Rerun tests** — Final confirmation
10. **Build** — `ng build --configuration production` — zero errors required

---

## Frontend Test Standards (Jest + jest-preset-angular)

### File location

Co-located with source: `feature.component.spec.ts`, `feature.service.spec.ts`

### Component setup

```typescript
import { TestBed } from "@angular/core/testing";
import { Subject } from "rxjs";
import { MyComponent } from "./my.component";
import { TranslationService } from "../../services/translation.service";

const mockTranslationService = {
  translate: (key: string) => key,
  translationsChanged$: new Subject<void>(),
};

beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [MyComponent],
    providers: [
      { provide: TranslationService, useValue: mockTranslationService },
    ],
  }).compileComponents();
});

afterEach(() => TestBed.resetTestingModule());
```

### Service setup

```typescript
import { TestBed } from "@angular/core/testing";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { MyService } from "./my.service";

describe("MyService", () => {
  let service: MyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(MyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });
});
```

### Required test cases (per component/service)

- Component/service creates (smoke test)
- Happy path — correct data returned/displayed
- Error path — API errors handled, toast shown
- Auth — unauthenticated users redirected
- Roles — wrong role is blocked
- RxJS — `destroy$` unsubscribes on destroy

### Notes

- Signals: test directly — `expect(component.display()).toBe('0')`
- Private members: `(service as any).privateProperty`
- Guards: use per-test `TestBed.configureTestingModule`; never `overrideProvider` after `inject()`
- Mock `translationsChanged$` as `new Subject<void>()`, not `{ subscribe: jest.fn() }`

---

## Backend Test Standards (Jest + Supertest + MongoMemoryServer)

### File location

- Integration: `server/__tests__/integration/*.test.js`
- Unit: `server/__tests__/unit/*.test.js`

### Integration test pattern

```javascript
const request = require("supertest");
const app = require("../../index");
const { createAdminUser, authHeader } = require("../helpers/auth");

let admin;
beforeEach(async () => {
  admin = await createAdminUser();
});

describe("POST /api/resource", () => {
  it("should create resource (201)", async () => {
    const res = await request(app)
      .post("/api/resource")
      .set(authHeader(admin))
      .send({ name: "Test" });
    expect(res.status).toBe(201);
  });

  it("should return 401 without auth", async () => {
    const res = await request(app).post("/api/resource").send({ name: "Test" });
    expect(res.status).toBe(401);
  });
});
```

### Required test cases per API endpoint

1. Happy path (200/201)
2. No auth token (401)
3. Wrong role/permission (403)
4. Missing required fields (400)
5. Resource not found (404)

---

## What to Test

### Frontend

- Services: all public methods, HTTP URL/method, BehaviorSubject updates
- Components: initial state, user interactions, `@Output` emissions, guard redirects
- Guards: allow/deny by auth state and role
- Pipes: typical values and edge cases

### Backend

- Auth: login valid/invalid creds, token validation, deactivated user
- CRUD routes: create/read/update/delete with proper auth
- Permissions: admin bypasses, cashier denied inventory
- Business logic: stock deduction, status transitions

---

## Anti-patterns

- `TestBed.overrideProvider` after `inject()` — causes "module already instantiated" error
- Hardcoded `http://localhost:3001` — use `environment.apiUrl`
- Tests without auth assertions — always test authenticated and unauthenticated paths
