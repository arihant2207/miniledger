# MiniLedger

MiniLedger is a production-grade personal lending tracker built to track money lent to friends with strict financial accuracy, bulletproof multi-tenant isolation, and a polished mobile user experience.

Designed with uncompromising software craftsmanship: raw parameterized SQL, strict zero-`any` TypeScript, layered architecture, cryptographic passwordless authentication, single-query SQL financial aggregations, and hardware-backed secure storage on mobile.

---

## Screenshots Placeholder

| Login & OTP Verification | Portfolio Dashboard | Add Loan & Calendar Picker |
|:---:|:---:|:---:|
| ![Login Screen](https://via.placeholder.com/300x650/0f172a/ffffff?text=Login+%26+OTP) | ![Home Dashboard](https://via.placeholder.com/300x650/0f172a/ffffff?text=Dashboard+%26+Overdue) | ![Add Loan Form](https://via.placeholder.com/300x650/0f172a/ffffff?text=Add+Loan+%26+Calendar) |

---

## Tech Stack

### Backend Service (`backend/`)
- **Runtime & Language**: Node.js 22 LTS, TypeScript 5 (Strict Mode, `noImplicitAny`, `noUnusedLocals`, `exactOptionalPropertyTypes`)
- **HTTP Framework**: Express 4 with modular layered routing
- **Database Engine**: PostgreSQL 16 (Raw SQL queries via `pg` connection pooling; **zero ORM**)
- **Data Validation**: Zod schema validation at the HTTP edge
- **Authentication & Cryptography**: Passwordless phone OTP with `HMAC-SHA256` digest storage, `crypto.timingSafeEqual`, sliding-window rate limiting, and short-lived stateless JWTs (`jsonwebtoken`)
- **Testing**: Jest 30 & Supertest 7 integration test suite executed against real PostgreSQL

### Mobile Client (`app/`)
- **Platform**: React Native (Expo SDK 58, TypeScript Strict Mode)
- **Target OS**: Native mobile only (**iOS & Android** via Expo Go, Emulator, Simulator, or Production APK/IPA)
- **Navigation**: React Navigation 7 (Native Stack Navigator with typed Auth/Main flows)
- **Secure Persistence**: `expo-secure-store` utilizing hardware-backed OS keychains (Apple Keychain / Android KeyStore; strictly avoids unencrypted `AsyncStorage`)
- **Design System**: Tailored light & dark theme tokens, responsive 4/8pt spacing, WCAG-compliant high-contrast colors, and minimum 44px touch targets

### Infrastructure & DevOps
- **Containerization**: Docker Compose (`docker-compose.yml`) running PostgreSQL 16 Alpine
- **Database Migrations**: Custom transactional migration runner with PostgreSQL advisory locking

---

## Architecture Overview

```
                            +-----------------------------------------------+
                            |             Mobile Client (Expo)              |
                            |   React Native + expo-secure-store (Native)   |
                            +-----------------------+-----------------------+
                                                    |  HTTPS / JSON
                                                    v
+---------------------------------------------------------------------------------------------------+
|                                     MiniLedger Backend Service                                    |
|                                                                                                   |
|   +-------------------------------------------------------------------------------------------+   |
|   | HTTP Edge Layer: CORS, Body Parser, Leveled Logger, Zod Request Validators, JWT Middleware |   |
|   +---------------------------------------------+---------------------------------------------+   |
|                                                 | Validated Request / Authenticated Context       |
|                                                 v                                                 |
|   +-------------------------------------------------------------------------------------------+   |
|   | Domain Service Layer: Business Logic, Domain Constraints, Financial Formatting             |   |
|   |   - AuthService: HMAC OTP generation, timing-safe compare, rate limits, JWT issuance     |   |
|   |   - LoansService: Loan creation, overdue calculation, idempotent repayments               |   |
|   |   - SummaryService: Portfolio metrics orchestration                                       |   |
|   +---------------------------------------------+---------------------------------------------+   |
|                                                 | Parameterized Arguments                         |
|                                                 v                                                 |
|   +-------------------------------------------------------------------------------------------+   |
|   | Data Repository Layer: Raw SQL Queries Scoped by Authenticated `user_id`                  |   |
|   |   - authRepository: Atomically upserts users, tracks OTP attempts & consumption           |   |
|   |   - loansRepository: Filtered & sorted queries, atomic repayment update                   |   |
|   |   - summaryRepository: Single-query aggregation via `SUM ... FILTER`                      |   |
|   +---------------------------------------------+---------------------------------------------+   |
|                                                 | Parameterized pg Pool Queries                   |
+-------------------------------------------------|-------------------------------------------------+
                                                  v
                            +-----------------------------------------------+
                            |                 PostgreSQL 16                 |
                            | - NUMERIC(12,2) Currency Precision            |
                            | - Calendar DATE Storage (No Timezone Drift)   |
                            | - Multi-Column Composite Indexing             |
                            | - Advisory Locks for Migrations               |
                            +-----------------------------------------------+
```

### Layered Architecture & Multi-Tenant Isolation
1. **Controllers**: Parse input, invoke domain services, and return normalized JSON envelopes.
2. **Services**: Enforce domain validation rules, rate limits, and cryptographic verification.
3. **Repositories**: Execute raw parameterized queries. **Every loan query unconditionally filters on `WHERE user_id = $1`**.
4. **404 Privacy Perimeter**: Querying or updating a loan belonging to another user returns `404 Not Found` (never `403 Forbidden`), completely eliminating resource enumeration and oracle probing vulnerabilities.

---

## Quick Demo (Under 2 Minutes)

Get up and running with realistic seed data in 5 commands:

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Run Migrations & Seed Demo Data
cd backend
npm install
npm run migrate
npm run seed

# 3. Start Backend Server
npm run dev
```

In a second terminal:
```bash
# 4. Start Expo App
cd app
npm install
npm start
```
- Press `a` for Android Emulator or `i` for iOS Simulator.
- Log in with phone: `+919999999999`.
- Look at the backend terminal to copy the 6-digit OTP printed in the log.
- View 6 pre-seeded loans: 2 overdue entries highlighted in warning red, 1 due today, 2 pending future loans, and 1 repaid.

---

## Step-by-Step Setup from a Fresh Clone

### Prerequisites
- [Node.js](https://nodejs.org/) v20.x or v22.x LTS
- [Docker](https://www.docker.com/) and Docker Compose (or a local PostgreSQL 16 instance)
- [Expo Go](https://expo.dev/go) app on your mobile device, or Android Studio / Xcode for emulators

### 1. Clone the Repository
```bash
git clone https://github.com/arihant2207/miniledger.git
cd miniledger
```

### 2. Start PostgreSQL via Docker Compose
```bash
docker compose up -d
```
Verify the container is healthy:
```bash
docker compose ps
```

### 3. Backend Setup & Database Migration
```bash
cd backend
cp .env.example .env
npm install
npm run migrate
```
*Note: The migration runner acquires an advisory lock, creates the `_migrations` tracking table, and applies SQL migrations inside atomic transactions.*

### 4. (Optional) Populate Realistic Demo Data
```bash
npm run seed
```
Seeds demo user `+919999999999` with 6 realistic Indian friend loan entries (overdue, due today, future, and repaid). Safe and idempotent (refuses to run when `NODE_ENV=production`).

### 5. Start the Backend API Server
```bash
npm run dev
```
The server starts at `http://localhost:3000`. Test health:
```bash
curl http://localhost:3000/health
```

---

## Running the Mobile App

### 1. Environment Setup & Laptop LAN IP Configuration
When testing on a physical mobile device via Expo Go, `localhost` refers to the mobile phone itself, **not** your laptop/development machine. You must point the app to your computer's Local Area Network (LAN) IP.

1. **Find your computer's LAN IP**:
   - **macOS / Linux**: Run `ifconfig` or `ip a` (look for `inet 192.168.x.x` or `10.x.x.x`).
   - **Windows**: Run `ipconfig` in PowerShell (look for `IPv4 Address` under your active Wi-Fi or Ethernet adapter, e.g., `192.168.1.45`).

2. **Configure `app/.env`**:
   ```bash
   cd ../app
   cp .env.example .env
   ```
   Edit `app/.env` and specify your LAN IP:
   ```env
   # Replace 192.168.1.45 with your actual laptop LAN IP
   EXPO_PUBLIC_API_URL=http://192.168.1.45:3000
   ```
   *(Note: If testing solely on the Android Emulator, you can use `http://10.0.2.2:3000`; if using the iOS Simulator on macOS, `http://localhost:3000` works).*

3. **Install Dependencies & Start Expo**:
   ```bash
   npm install
   npm start
   ```

### 2. Platform Options
- **Physical Device**: Scan the QR code displayed in your terminal using the Expo Go app (Android) or Camera app (iOS). Ensure your phone is connected to the same Wi-Fi network as your laptop.
- **Android Emulator**: Press `a` in the Expo CLI terminal.
- **iOS Simulator**: Press `i` in the Expo CLI terminal (macOS only).

---

## How to Find the OTP in the Server Log

When you enter your phone number and tap **"Send Verification Code"**, MiniLedger generates a cryptographically secure 6-digit OTP. Because physical SMS delivery is mocked for development, the OTP is printed directly to `stdout` in the backend terminal inside a clearly marked banner:

```text
======================================================================
🔐 [AUTH MOCK OTP] Phone: +919999999999 | OTP: 849201 | Expires in: 5 minutes
======================================================================
```

Copy the 6-digit number into the app's verification input to log in immediately.

---

## API Reference Table

All endpoints (except `/health` and `/auth/*`) require a valid Bearer token in the `Authorization` header: `Authorization: Bearer <JWT_TOKEN>`.

| Method | Endpoint | Auth Required | Request Body / Params | Success Status | Description |
|:---|:---|:---:|:---|:---:|:---|
| `GET` | `/health` | No | None | `200 OK` | Verifies service uptime and active PostgreSQL database pool connectivity. |
| `POST` | `/auth/request-otp` | No | `{"phone": "+919876543210"}` | `200 OK` | Generates 6-digit OTP, stores HMAC digest, logs mock code to console, applies 10m sliding rate limit. |
| `POST` | `/auth/verify-otp` | No | `{"phone": "+919876543210", "otp": "123456"}` | `200 OK` | Verifies OTP in constant time, marks consumed (single-use), upserts user, returns `{ token, user }`. |
| `GET` | `/loans` | **Yes** | None | `200 OK` | Lists loans for the authenticated user, sorted with overdue items first, then by due date. |
| `POST` | `/loans` | **Yes** | `{"friendName": "Aarav", "amount": 1500.50, "dueDate": "2026-11-15", "notes": "Dinner"}` | `201 Created` | Creates a new loan entry. Enforces positive amount, max 2 decimals, and future-or-today due date. |
| `PATCH` | `/loans/:id/repay` | **Yes** | URL Param: `id` (UUID) | `200 OK` | Idempotently marks a loan as repaid. Returns `404 Not Found` if loan does not belong to user. |
| `GET` | `/summary` | **Yes** | None | `200 OK` | Computes `totalLent`, `totalRepaid`, and `totalOverdue` in a single SQL query using `SUM ... FILTER`. |

### Standard Error Response Envelope
All error responses adhere to the unified envelope:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Due date must be today or a future date",
    "details": [
      {
        "path": "dueDate",
        "message": "Due date must be today or a future date"
      }
    ]
  }
}
```

---

## Automated Tests & Verification

### Running Integration Tests
The backend integration test suite executes 17 test cases against a real PostgreSQL database using Jest and Supertest.

```bash
cd backend
npm test
```

### What the Test Suite Validates
- **Authentication (`tests/auth.test.ts`)**:
  - Requesting an OTP with valid and invalid phone numbers (Zod validation).
  - Rate limiting enforcement after exceeding max requests in sliding window (HTTP 429).
  - Successful OTP verification, single-use consumption, and JWT generation.
  - Decrementing attempts on incorrect OTP, and lockout after 5 failed attempts.
  - Expiration validation (rejects codes older than 5 minutes).
  - Replay attack rejection (re-verifying an already consumed code fails).
- **Loans Lifecycle & Multi-Tenancy (`tests/loans.test.ts`)**:
  - Validates positive amounts, decimal precision, non-empty friend names, and future dates.
  - Verifies database sorting places overdue pending loans at the top of the feed.
  - Repayment idempotency (multiple repay calls succeed and preserve the original `repaid_at`).
  - **Ownership isolation**: User B cannot view User A's loans; User B attempting to repay User A's loan receives `404 Not Found`.
- **Single-Query Summary (`tests/summary.test.ts`)**:
  - Accurate aggregation of `total_lent`, `total_repaid`, and `total_overdue`.
  - Multi-user isolation verification (totals are strictly scoped to the requesting user).

### Running Static Typechecks
Both packages strictly enforce TypeScript with zero compiler errors:
```bash
# Backend Typecheck
cd backend
npm run typecheck

# Mobile App Typecheck
cd ../app
npm run typecheck
```

---

## Key Design Decisions

1. **Raw SQL with `pg` Connection Pool (Zero ORM)**:
   - ORMs introduce abstraction overhead, obscure query execution plans, and risk N+1 roundtrips.
   - Using parameterized raw SQL (`$1, $2`) guarantees maximum throughput, immunity to SQL injection, and full access to advanced PostgreSQL features like `SUM ... FILTER` and advisory locks.

2. **Strict Financial Precision (`NUMERIC(12,2)`)**:
   - Currency is stored as PostgreSQL `NUMERIC(12,2)` with a `CHECK (amount > 0)` constraint.
   - Floating-point calculations in JavaScript (`0.1 + 0.2 === 0.30000000000000004`) are strictly prevented. The `node-pg` driver reads `NUMERIC` values as strings, and SQL handles aggregation before serialization.

3. **Calendar Date Representation (`DATE`)**:
   - `due_date` is stored as an ISO `DATE` (`YYYY-MM-DD`) without time or timezone components.
   - Prevents timezone bugs (e.g. UTC vs IST shifts crossing midnight). Overdue status is computed deterministically in SQL: `status = 'pending' AND due_date < CURRENT_DATE`.

4. **HMAC-SHA256 Hashed OTPs & Timing-Safe Equality**:
   - Plaintext OTPs are never stored at rest. Even if a database backup is compromised, active OTPs cannot be recovered.
   - Comparison uses `crypto.timingSafeEqual` to eliminate timing side-channel attacks.

5. **Resource Privacy via 404 Not Found**:
   - If an authenticated user queries or attempts to repay a loan belonging to another user, the API responds with `404 Not Found` rather than `403 Forbidden`. This conceals the existence of other users' loans, mitigating ID enumeration attacks.

6. **Hardware Keystore Protection**:
   - Authentication tokens are stored using `expo-secure-store`, backed by the iOS Keychain and Android KeyStore. Plain `AsyncStorage` is completely excluded to prevent token theft on rooted/compromised devices.

7. **Native-Only Target**:
   - MiniLedger targets native iOS and Android environments. Web support is deliberately unsupported because browser storage lacks hardware-backed cryptographic keychains.

---

## Known Limitations

1. **Mock OTP Delivery**:
   - OTPs are logged to `stdout` rather than dispatched via SMS providers (e.g., Twilio, AWS SNS, Msg91). In a commercial deployment, an SMS transport adapter would plug into `AuthService.requestOtp`.
2. **Single Currency Focus**:
   - All transactions and summaries assume Indian Rupees (`₹` / INR). Multi-currency support with dynamic FX conversion rates is out of scope for this version.
3. **Unpaginated Loan Feed**:
   - The `/loans` endpoint returns all loans for the authenticated user in a single request. For enterprise scale with thousands of loans per user, cursor-based keyset pagination would be added.
4. **Offline Sync**:
   - The app requires an active network connection to interact with the backend API. Offline queued mutations (e.g. via WatermelonDB or SQLite local cache) are not implemented.

---

## Comprehensive Architecture Defense & Interview Guide

For in-depth explanations of trade-offs, database indexing strategies, threat modeling, and anticipated interview questions for each module, see the [Architecture Defense Guide](file:///d:/miniledger/docs/INTERVIEW_NOTES.md).
