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
