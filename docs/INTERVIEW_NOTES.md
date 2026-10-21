# MiniLedger — Technical Architecture & Interview Defense Guide

This document maintains architectural decisions, security rationales, and concise answers to likely interview questions for each module built in MiniLedger.

---

## 1. Monorepo Scaffolding & Database Setup (Phase 1)

### Module Overview
- **What it does**: Provides a clean monorepo layout (`backend/`, `app/`, `docs/`) with Docker Compose for PostgreSQL 16 Alpine, strict TypeScript configuration (`noImplicitAny`, `noUnusedLocals`, `exactOptionalPropertyTypes`), and a transactional raw SQL migration runner.
- **Why designed this way**: Minimizes external framework bloat. Instead of heavy ORMs (Prisma, TypeORM) that obscure query generation and introduce N+1 risks, raw `pg` ensures full control over query plans, indexes, and parameterized execution.

### Schema Decisions
1. **Financial Precision (`NUMERIC(12,2)`)**:
   - Stored with two fixed decimal places and a `CHECK (amount > 0)` constraint.
   - Prevents binary floating-point rounding errors inherent to JavaScript IEEE 754 numbers (`0.1 + 0.2 !== 0.3`).
2. **Date Storage (`DATE`)**:
   - `due_date` is stored as a Postgres `DATE`, completely detached from time components.
   - Eliminates timezone conversion shifts (e.g. UTC vs IST crossing midnight).
   - "Overdue" is strictly computed in SQL: `status = 'pending' AND due_date < CURRENT_DATE`.
3. **Compound Indexing**:
   - `CREATE INDEX idx_loans_user_status_due ON loans(user_id, status, due_date);`
   - Covers the exact composite query pattern used by user-scoped summary calculations and overdue lists, enabling Index-Only Scans.

### Likely Interview Questions & Answers
- **Q: Why avoid an ORM like Prisma or TypeORM?**
  - *A: ORMs add abstraction layers that can obscure SQL query efficiency, complicate zero-downtime migrations, and lead to accidental N+1 queries. Parameterized raw SQL with `pg` guarantees predictable query execution plans and aligns with high-throughput engineering standards.*
- **Q: How does the custom migration runner handle concurrent deployments?**
  - *A: It acquires a PostgreSQL advisory lock (`pg_advisory_lock(987654321)`) before reading or applying migrations. Each migration runs inside an isolated atomic transaction (`BEGIN ... COMMIT / ROLLBACK`), ensuring zero chance of race conditions across multiple replica containers.*

---

## 2. Configuration & Observability (Phase 1)

### Module Overview
- **What it does**: Synchronously validates environment variables on startup using Zod (`src/config/env.ts`) and provides a structured leveled logger (`src/utils/logger.ts`) and central error envelope (`src/middleware/errorHandler.ts`).
- **Why designed this way**: Guarantees "fail-fast" behavior—the application crashes immediately if critical secrets (`JWT_SECRET`, `DATABASE_URL`) are missing rather than failing silently mid-request. Centralized error handling standardizes API responses to `{ error: { code, message } }`.

### Likely Interview Questions & Answers
- **Q: Why fail-fast on environment variable validation?**
  - *A: Deferring configuration checks until runtime causes unpredictable outages in production (e.g. a worker thread failing only when a specific route is hit). Validating at import halts deployment instantly if credentials are misconfigured.*
- **Q: Why route logs directly to stdout/stderr instead of using console.log?**
  - *A: `console.log` is unformatted and writes to standard streams without structured level segregation. Using dedicated streams (`process.stdout` for info/debug, `process.stderr` for errors) allows log collectors (Prometheus/Grafana/Datadog) to parse severities reliably.*

---

## 3. Authentication & Mock OTP Module (Phase 2)

### Module Overview
- **What it does**: Implements a passwordless phone login system (`POST /auth/request-otp`, `POST /auth/verify-otp`) using cryptographically secure 6-digit OTPs, HMAC-SHA256 hashing, sliding-window rate limiting, hard attempt caps (5 attempts), single-use consumption, and short-lived JWT issuance.
- **Why designed this way**: Eliminates password fatigue and credential stuffing risks. The mock OTP is displayed prominently in server logs for evaluator testing while maintaining enterprise-grade production security invariants in the database.

### Security Invariants & Defenses
1. **Hashed OTP Storage**:
   - Even though OTPs have a 5-minute lifespan, storing raw numbers in the database leaves a window of vulnerability during active sessions if DB snapshots or read-replicas are compromised. Storing `HMAC-SHA256(otp, secret)` ensures raw OTPs are never stored at rest.
2. **Timing-Safe Comparison (`crypto.timingSafeEqual`)**:
   - Standard string equality (`a === b`) short-circuits on the first mismatched character, allowing attackers to deduce characters via statistical latency analysis. `crypto.timingSafeEqual` executes in constant time.
3. **Brute Force & Rate Limiting Defense**:
   - Generation: Max 3 requests per 10-minute sliding window per phone number.
   - Verification: Max 5 failed attempts per OTP before the code is permanently invalidated.
4. **Single-Use Replay Protection**:
   - The OTP is marked `consumed_at = CURRENT_TIMESTAMP` immediately upon successful verification. Subsequent attempts with the same code are rejected.

### Likely Interview Questions & Answers
- **Q: Why hash the OTP if it expires in 5 minutes anyway?**
  - *A: Defense in depth. If database query logs, backups, or read-replicas are exposed, active OTPs cannot be extracted to hijack sessions. Hashing ensures secrets are never readable at rest.*
- **Q: Why use `crypto.randomInt` over `Math.random`?**
  - *A: `Math.random()` uses a pseudo-random number generator (PRNG) that is predictable and cryptographically insecure. `crypto.randomInt` relies on operating system entropy (`/dev/urandom` or Windows CryptoAPI) to prevent token prediction.*
- **Q: How does `ON CONFLICT (phone) DO UPDATE` in `findOrCreateUser` prevent race conditions?**
  - *A: In high-concurrency scenarios, two requests verifying an OTP simultaneously could both attempt to insert a user. A Postgres unique constraint on `phone` combined with `ON CONFLICT` atomic upsert guarantees exactly one user row exists without throwing unhandled duplicate key errors.*

---

## 4. Loans & Summary Modules (Phase 3)

### Module Overview
- **What it does**: Provides endpoints to create loans (`POST /loans`), list user-scoped loans sorted with overdue items first (`GET /loans`), mark loans as repaid idempotently (`PATCH /loans/:id/repay`), and compute portfolio totals (`GET /summary`) using a single SQL query.
- **Why designed this way**: Minimizes round-trips and database locks. Offloads aggregation to Postgres via `SUM ... FILTER` across the composite index `(user_id, status, due_date)`, preventing floating-point inaccuracies and client-side arithmetic drift.

### Core Architectural Invariants
1. **Single-Query Summary Aggregation**:
   ```sql
   SELECT
     COALESCE(SUM(amount), 0)::numeric(12,2) AS total_lent,
     COALESCE(SUM(amount) FILTER (WHERE status = 'repaid'), 0)::numeric(12,2) AS total_repaid,
     COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE), 0)::numeric(12,2) AS total_overdue
   FROM loans
   WHERE user_id = $1;
   ```
   - Evaluated in a single pass over the table/index.
   - Eliminates N+1 query patterns and multiple network round-trips.
2. **Deterministic Overdue Sorting**:
   - `ORDER BY CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN 0 ELSE 1 END, due_date ASC, created_at DESC;`
   - Surfaces urgent, overdue actionable rows at the top of the feed without requiring client-side re-sorting.
3. **Ownership Isolation (404 instead of 403)**:
   - When updating or reading a loan, queries include `WHERE id = $1 AND user_id = $2`.
   - If zero rows match, the API returns `404 Not Found`. Returning `403 Forbidden` would leak the existence of other users' loans, opening the system to enumeration attacks.
4. **Repayment Idempotency**:
   - `UPDATE loans SET status = 'repaid', repaid_at = COALESCE(repaid_at, CURRENT_TIMESTAMP) WHERE id = $1 AND user_id = $2;`
   - Repeated requests safely succeed without altering the historical repayment timestamp.

### Likely Interview Questions & Answers
- **Q: Why use `SUM ... FILTER (WHERE ...)` instead of separate queries or JS filtering?**
  - *A: Executing multiple queries triples database connection overhead and network latency. Computing totals in JavaScript requires pulling all user rows into memory (scaling O(N) in memory and bandwidth). PostgreSQL evaluates `FILTER` directly on disk/cache using compiled C code, returning the exact 3 summary numbers in sub-millisecond time.*
- **Q: Why return 404 instead of 403 when a user accesses someone else's loan?**
  - *A: Returning 403 informs an attacker that a specific resource ID exists in the system (resource enumeration / oracle vulnerability). 404 treats foreign resources identically to non-existent resources, maintaining total privacy between users.*
- **Q: How are monetary values handled across the network boundary?**
  - *A: In PostgreSQL, `NUMERIC(12,2)` is used. The Node `pg` driver parses `NUMERIC` columns as strings (e.g. `"1500.50"`) to avoid JavaScript floating point errors. We format and expose both numeric numbers and fixed string representations (`amountFormatted: "1500.50"`) so clients render exact currency without rounding glitches.*

---

## 5. Automated Integration Testing (Phase 4)

### Module Overview
- **What it does**: Provides end-to-end integration tests using Jest and supertest against a real PostgreSQL instance, validating all domain rules, auth state transitions, and cross-user data isolation.
- **Why designed this way**: Mocks can introduce false confidence by masking subtle SQL syntax differences, constraint triggers, or transaction isolation quirks. Testing against real PostgreSQL guarantees the exact queries, indexes, and constraints behave properly in production.

### Test Coverage Highlights
1. **Authentication Suite (`tests/auth.test.ts`)**:
   - OTP request generation, phone validation, and rate limiting (429).
   - Valid OTP verification & JWT payload issuance.
   - Wrong OTP rejection & remaining attempts decrement.
   - 5-attempt limit lockout.
   - Time-based expiration rejection.
   - Single-use replay protection.
2. **Loans Suite (`tests/loans.test.ts`)**:
   - Validation edge checks (amount > 0, max 2 decimals, future-or-today dates, non-empty friend name).
   - Database-level sorting verification (overdue pending items placed first).
   - Repayment idempotency (preserves original `repaid_at`).
   - Cross-user data isolation (User B attempting to repay User A's loan receives 404; User B `GET /loans` cannot see User A's records).
3. **Summary Suite (`tests/summary.test.ts`)**:
   - Zero-loan baseline validation.
   - Multi-loan portfolio calculations (total lent, total repaid, total overdue) in a single query.
   - Multi-tenant isolation verification.

### Likely Interview Questions & Answers
- **Q: Why test against a real PostgreSQL database instead of an in-memory mock?**
  - *A: PostgreSQL-specific SQL syntax like `FILTER (WHERE ...)`, `CURRENT_DATE`, `COALESCE`, `INTERVAL`, and transactional advisory locks are rarely supported accurately by in-memory SQLite or mock drivers. Testing against real Postgres ensures zero divergence between test and production environments.*
- **Q: How is test isolation maintained across tests?**
  - *A: A `resetDatabase()` helper executes `TRUNCATE TABLE loans, otps, users CASCADE;` before each test, ensuring zero state leakage across test cases while executing in a fraction of a millisecond.*

---

## 6. Client Architecture & Secure Token Persistence (Phase 5)

### Module Overview
- **What it does**: Establishes the Expo TypeScript client application (`app/`), centralized theme token system (`src/theme/`), hardware-backed token storage via `expo-secure-store`, and a typed API client (`src/api/client.ts`) with a single error handling pipeline and automatic Bearer injection.
- **Why designed this way**: Prevents credential theft by using OS hardware keychains (iOS Keychain / Android KeyStore) rather than unencrypted AsyncStorage. Centralizing API requests eliminates boilerplate and guarantees that 401 Unauthorized responses automatically expire the local session.

### Security & Architectural Invariants
1. **expo-secure-store vs AsyncStorage**:
   - `AsyncStorage` persists keys unencrypted in SQLite or plist files on disk, vulnerable to root access or backup extraction.
   - `expo-secure-store` encrypts data using AES-256 with keys stored in the Android KeyStore or iOS Keychain (accessible only when device is unlocked).
2. **Unified Network Error Pipeline**:
   - All network responses pass through `apiClient`. If the status is non-2xx or includes an `error` envelope, it converts it to a typed `ApiClientError(status, { code, message })`.
   - On HTTP 401, a global listener triggers `logout()`, transitioning the UI back to the Auth stack.

### Likely Interview Questions & Answers
- **Q: Why is `expo-secure-store` strictly preferred over `AsyncStorage` for JWT tokens?**
  - *A: `AsyncStorage` stores data in plain text without hardware encryption. On compromised or rooted devices, any third-party app or backup tool can read the JWT. `expo-secure-store` uses hardware security modules (Apple Secure Enclave and Android KeyStore) to encrypt secrets at rest.*
- **Q: How does the app handle token expiration without throwing uncaught crashes in screens?**
  - *A: `client.ts` registers a global unauthorized handler. When any request encounters an HTTP 401, the client notifies `AuthProvider`, which clears local secure storage and resets the state to unauthenticated, returning the user to the login screen.*

---

## 7. Screens & UI/UX Design System (Phase 6)

### Module Overview
- **What it does**: Implements the user-facing application:
  - `LoginScreen`: progressive 2-stage login with inline phone validation, OTP verification, and a 30s resend cooldown timer.
  - `HomeScreen`: real-time `SummaryCard` (Lent, Repaid, Overdue in INR), loan entries feed sorted overdue-first, status chips, idempotent mark-repaid action with confirmation dialog, pull-to-refresh, loading skeleton, and empty/error states.
  - `AddLoanScreen`: form with inline validation, decimal numeric keypad, custom calendar date picker modal, and double-submit prevention.
- **Why designed this way**: Follows a cohesive, restrained design system (4/8pt spacing, curated Indigo accent, high-contrast dark/light modes) meeting strict accessibility benchmarks (minimum 44px touch targets).

### Core UI/UX Invariants
1. **High-Visibility Overdue Highlighting**:
   - Overdue pending entries are rendered with high-contrast alert borders and tinted backgrounds (`overdueBg` / `overdueBorder`), drawing immediate user attention.
2. **Calendar Date Modal**:
   - Prevents past-date selection on creation. Renders month navigation and outputs clean `YYYY-MM-DD` strings, eliminating timezone offsets and daylight saving quirks.
3. **Double-Submit Prevention**:
   - Form buttons disable immediately and display active activity spinners while requests are in-flight, preventing duplicate loan creations or simultaneous repayments.

### Likely Interview Questions & Answers
- **Q: How do you format currency without losing precision or dealing with floating-point bugs on mobile?**
  - *A: The backend does calculations in SQL with `NUMERIC(12,2)`. The mobile app parses the exact string and applies Indian number grouping (last 3 digits, then every 2 digits) via a deterministic regex helper (`formatINR`), prepending `₹` without using lossy float arithmetic.*
- **Q: How is accessibility (a11y) ensured in custom components?**
  - *A: All pressable buttons and inputs enforce minimum touch dimensions of 44x44px. Custom elements declare explicit `accessibilityRole` (e.g. `"button"`, `"listitem"`), `accessibilityLabel`, and `aria-invalid` states for screen readers.*

---

## 8. Demo Database Seeding & Production Safeguards (Phase 6 Polish)

### Module Overview
- **What it does**: Provides `npm run seed` (`backend/src/db/seed.ts`), an idempotent script creating demo user `+919999999999` and 6 realistic loan entries (2 overdue backdated 8 and 3 days, 1 due today, 2 future pending loans, and 1 repaid).
- **Why designed this way**: Allows evaluators and reviewers to experience all UI states (overdue alerts, relative dates, repayment actions) within seconds of cloning. The script asserts `NODE_ENV !== 'production'` to prevent accidental data destruction in live deployments.

### Likely Interview Questions & Answers
- **Q: Why does the seed script explicitly check `NODE_ENV === 'production'`?**
  - *A: Accidental execution of development seed scripts in production can wipe live customer ledgers or pollute analytics. Halting synchronously if `NODE_ENV === 'production'` prevents human error during deployment scripts or CI/CD pipelines.*
- **Q: Why are overdue entries injected via seed data rather than the mobile app?**
  - *A: Domain integrity requires that users cannot create retroactively backdated loans (`dueDate >= CURRENT_DATE`). However, testing and verifying the overdue alert UI requires existing overdue loans. The seed script bypasses the user entry form to set realistic past dates directly in SQL.*

---

## 9. Comprehensive Documentation & Quality Audit (Phase 8)

### Module Overview
- **What it does**: Establishes complete self-contained documentation ([README.md](file:///d:/miniledger/README.md)), explicit step-by-step fresh clone instructions, mobile LAN networking setup, complete API reference table, and a static quality audit across backend and mobile client.
- **Why designed this way**: Production software must be effortlessly reproducible by any engineer. Providing concrete networking instructions for mobile Expo testing eliminates common LAN binding friction.



