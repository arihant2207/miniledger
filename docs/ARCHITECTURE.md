# MiniLedger — Technical Architecture Guide

This document maintains architectural decisions, security rationales, and design details for each module built in MiniLedger.

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

---

## 2. Configuration & Observability (Phase 1)

### Module Overview
- **What it does**: Synchronously validates environment variables on startup using Zod (`src/config/env.ts`) and provides a structured leveled logger (`src/utils/logger.ts`) and central error envelope (`src/middleware/errorHandler.ts`).
- **Why designed this way**: Guarantees "fail-fast" behavior—the application crashes immediately if critical secrets (`JWT_SECRET`, `DATABASE_URL`) are missing rather than failing silently mid-request. Centralized error handling standardizes API responses to `{ error: { code, message } }`.

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

---

## 8. Demo Database Seeding & Production Safeguards (Phase 6 Polish)

### Module Overview
- **What it does**: Provides `npm run seed` (`backend/src/db/seed.ts`), an idempotent script creating demo user `+919999999999` and 6 realistic loan entries (2 overdue backdated 8 and 3 days, 1 due today, 2 future pending loans, and 1 repaid).
- **Why designed this way**: Allows evaluators and reviewers to experience all UI states (overdue alerts, relative dates, repayment actions) within seconds of cloning. The script asserts `NODE_ENV !== 'production'` to prevent accidental data destruction in live deployments.

---

## 9. Comprehensive Documentation & Quality Audit (Phase 8)

### Module Overview
- **What it does**: Establishes complete self-contained documentation ([README.md](file:///d:/miniledger/README.md)), explicit step-by-step fresh clone instructions, mobile LAN networking setup, complete API reference table, and a static quality audit across backend and mobile client.
- **Why designed this way**: Production software must be effortlessly reproducible by any engineer. Providing concrete networking instructions for mobile Expo testing eliminates common LAN binding friction.
