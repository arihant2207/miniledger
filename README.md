# MiniLedger

MiniLedger is a personal lending tracker application to record and manage money lent to friends.

The application is built with raw parameterized SQL, strict TypeScript, a layered backend architecture, passwordless phone OTP authentication, single-query SQL financial aggregations, and hardware-backed secure storage on mobile.

---

## Tech Stack

### Backend Service (`backend/`)
- **Runtime & Language**: Node.js (20.x or 22.x LTS), TypeScript 5.7.2 (Strict Mode: `noImplicitAny`, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`)
- **HTTP Framework**: Express 4.21.2 with layered routing
- **Database Engine**: PostgreSQL 16 (`postgres:16-alpine`), connection pooling via `pg` 8.13.1 (zero ORM)
- **Data Validation**: Zod 3.24.1 at the HTTP edge
- **Authentication & Cryptography**: Passwordless phone OTP with `HMAC-SHA256` digest storage, `crypto.timingSafeEqual`, sliding-window rate limiting, and stateless JWTs via `jsonwebtoken` 9.0.2
- **Testing**: Jest 30.5.2 & Supertest 7.3.1 integration test suite executed against PostgreSQL

### Mobile Client (`app/`)
- **Platform**: React Native 0.88.0, React 19.3.0, Expo SDK 58 (expo 58.0.16)
- **Target OS**: Native mobile (iOS and Android via Expo Go, Emulator, Simulator, or standalone builds)
- **Navigation**: React Navigation 7 (`@react-navigation/native` 7.0.14, `@react-navigation/native-stack` 7.2.0)
- **Secure Persistence**: `expo-secure-store` 58.0.2 backed by OS keychains (Apple Keychain / Android KeyStore)
- **Design Tokens**: Light and dark theme tokens, 4/8pt spacing scale, 44px minimum touch targets

### Infrastructure & DevOps
- **Containerization**: Docker Compose (`docker-compose.yml`) running PostgreSQL 16 Alpine (`postgres:16-alpine`)
- **Database Migrations**: Transactional migration runner with PostgreSQL advisory locking

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
|   |   - authRepository: Upserts users, tracks OTP attempts and consumption                    |   |
|   |   - loansRepository: Filtered and sorted queries, atomic repayment update                 |   |
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
1. **Controllers**: Parse input, invoke domain services, and return JSON envelopes.
2. **Services**: Enforce domain validation rules, rate limits, and cryptographic verification.
3. **Repositories**: Execute raw parameterized queries. Every loan query filters by `WHERE user_id = $1`.
4. **404 Privacy Perimeter**: Querying or updating a loan belonging to another user returns `404 Not Found` (rather than `403 Forbidden`) to avoid disclosing whether a given loan ID exists.

---

## Quick Demo

Start with seed data in 5 commands:

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
- View 6 pre-seeded loans: 2 overdue entries, 1 due today, 2 pending future loans, and 1 repaid.

---

## Step-by-Step Setup from a Fresh Clone

### Prerequisites
- Node.js (20.x or 22.x LTS)
- Docker and Docker Compose (or a local PostgreSQL 16 instance)
- Expo Go app on a mobile device, or Android Studio / Xcode for emulators

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
*The migration runner acquires an advisory lock, creates the `_migrations` tracking table, and applies SQL migrations inside atomic transactions.*

### 4. Populate Demo Data
```bash
npm run seed
```
Seeds demo user `+919999999999` with 6 loan entries (overdue, due today, future, and repaid). The script is idempotent and refuses to run when `NODE_ENV=production`.

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
When testing on a physical mobile device via Expo Go, `localhost` refers to the mobile phone itself, not the host machine. The app must be pointed to your computer's Local Area Network (LAN) IP.

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
   *(Note: For the Android Emulator, use `http://10.0.2.2:3000`; for the iOS Simulator on macOS, `http://localhost:3000` works).*

3. **Install Dependencies & Start Expo**:
   ```bash
   npm install
   npm start
   ```

### 2. Platform Options
- **Physical Device**: Scan the QR code displayed in the terminal using the Expo Go app (Android) or Camera app (iOS). The phone must be on the same local network as the laptop.
- **Android Emulator**: Press `a` in the Expo CLI terminal.
- **iOS Simulator**: Press `i` in the Expo CLI terminal (macOS only).

---

## How to Find the OTP in the Server Log

When you enter a phone number and tap **"Send Verification Code"**, the backend generates a 6-digit OTP. Because physical SMS delivery is mocked for development, the OTP is printed directly to `stdout` in the backend terminal:

```text
======================================================================
🔐 [AUTH MOCK OTP] Phone: +919999999999 | OTP: 849201 | Expires in: 5 minutes
======================================================================
```

Enter the 6-digit number into the app's verification input to log in.

---

## API Reference Table

All endpoints (except `/health` and `/auth/*`) require a Bearer token in the `Authorization` header: `Authorization: Bearer <JWT_TOKEN>`.

| Method | Endpoint | Auth Required | Request Body / Params | Success Status | Description |
|:---|:---|:---:|:---|:---:|:---|
| `GET` | `/health` | No | None | `200 OK` | Reports service uptime and database pool connectivity. |
| `POST` | `/auth/request-otp` | No | `{"phone": "+919876543210"}` | `200 OK` | Generates 6-digit OTP, stores HMAC digest, logs mock code to console, applies rate limit. |
| `POST` | `/auth/verify-otp` | No | `{"phone": "+919876543210", "otp": "123456"}` | `200 OK` | Verifies OTP in constant time, marks consumed, upserts user, returns `{ token, user }`. |
| `GET` | `/loans` | **Yes** | None | `200 OK` | Lists loans for the authenticated user, sorted with overdue items first, then by due date. |
| `POST` | `/loans` | **Yes** | `{"friendName": "Aarav", "amount": 1500.50, "dueDate": "2026-11-15", "notes": "Dinner"}` | `201 Created` | Creates a loan entry. Enforces positive amount, max 2 decimals, and future-or-today due date. |
| `PATCH` | `/loans/:id/repay` | **Yes** | URL Param: `id` (UUID) | `200 OK` | Marks a loan as repaid. Returns `404 Not Found` if loan does not belong to user. |
| `GET` | `/summary` | **Yes** | None | `200 OK` | Computes `totalLent`, `totalRepaid`, and `totalOverdue` in a single SQL query via `SUM ... FILTER`. |

### Standard Error Response Envelope
Error responses adhere to the unified envelope:
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
The backend integration test suite executes 17 test cases against PostgreSQL using Jest and Supertest.

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
  - Repayment idempotency (repeated repay calls succeed and preserve the original `repaid_at`).
  - **Ownership isolation**: User B cannot view User A's loans; User B attempting to repay User A's loan receives `404 Not Found`.
- **Single-Query Summary (`tests/summary.test.ts`)**:
  - Aggregation of `total_lent`, `total_repaid`, and `total_overdue`.
  - Multi-user isolation verification (totals are scoped to the requesting user).

### Running Static Typechecks
Both packages enforce TypeScript in strict mode:
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
   - Avoids ORM abstraction overhead and unexpected query generation.
   - Parameterized queries (`$1, $2`) prevent SQL injection while allowing direct use of PostgreSQL features such as `SUM ... FILTER` and advisory locks.

2. **Financial Precision (`NUMERIC(12,2)`)**:
   - Currency is stored as PostgreSQL `NUMERIC(12,2)` with a `CHECK (amount > 0)` constraint.
   - Eliminates JavaScript IEEE 754 floating-point rounding issues. `pg` returns `NUMERIC` values as strings, and SQL handles aggregation before serialization.

3. **Calendar Date Representation (`DATE`)**:
   - `due_date` is stored as an ISO `DATE` (`YYYY-MM-DD`) without time or timezone components.
   - Avoids timezone shifts across day boundaries. Overdue status is computed in SQL: `status = 'pending' AND due_date < CURRENT_DATE`.

4. **HMAC-SHA256 Hashed OTPs & Timing-Safe Equality**:
   - Plaintext OTPs are not stored in the database.
   - Comparison uses `crypto.timingSafeEqual` to eliminate timing differences.

5. **Resource Privacy via 404 Not Found**:
   - If an authenticated user queries or attempts to repay a loan belonging to another user, the API responds with `404 Not Found` rather than `403 Forbidden`. This avoids disclosing whether a given loan ID exists for another user.

6. **Hardware Keystore Protection**:
   - Authentication tokens are stored using `expo-secure-store`, backed by the iOS Keychain and Android KeyStore. Plain `AsyncStorage` is excluded.

7. **Native-Only Target**:
   - MiniLedger targets native iOS and Android. Web support is not enabled because browser storage lacks hardware-backed cryptographic keychains.

---

## Known Limitations

1. **Mock OTP Delivery**:
   - OTPs are logged to `stdout` rather than dispatched via an SMS provider (e.g., Twilio, AWS SNS). An SMS transport adapter can be plugged into `AuthService.requestOtp`.
2. **Single Currency**:
   - All transactions and summaries assume Indian Rupees (`₹` / INR). Multi-currency support is not included.
3. **Unpaginated Loan Feed**:
   - The `/loans` endpoint returns all loans for the authenticated user in a single request. Keyset pagination can be added for higher volume requirements.
4. **Offline Sync**:
   - The app requires an active network connection to interact with the backend API. Offline mutation queues are not implemented.

---

## Architecture Defense & Interview Guide

For explanations of trade-offs, database indexing strategies, threat modeling, and anticipated interview questions for each module, see the [Architecture Defense Guide](file:///d:/miniledger/docs/INTERVIEW_NOTES.md).
