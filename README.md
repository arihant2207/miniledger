# MiniLedger

MiniLedger is a personal lending tracker designed with strict software craftsmanship principles: raw parameterized SQL, zero `any` strict TypeScript, layered architecture, and secure mock-OTP phone authentication.

---

## Architecture Stack

- **Backend**: Node.js 22 + TypeScript (strict mode) + Express
- **Database**: PostgreSQL 16 (Raw SQL with `pg` connection pool, zero ORM)
- **Validation**: Zod schema validation at the HTTP edge
- **Authentication**: Passwordless phone login with single-use hashed OTP (HMAC-SHA256), rate limiting, and JWT tokens
- **Monorepo**:
  - `docker-compose.yml`: Local PostgreSQL container setup
  - `backend/`: API services, database migrations, authentication, loans
  - `app/`: React Native (Expo) frontend
  - `docs/INTERVIEW_NOTES.md`: Architectural rationale and interview defense notes

---

## Quick Demo (Under 2 Minutes)

Follow these steps to explore the full application with pre-seeded data:

1. **Start PostgreSQL**:
   ```bash
   docker compose up -d
   ```

2. **Migrate, Seed & Start Backend**:
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run migrate
   npm run seed
   npm run dev
   ```

3. **Start Mobile App**:
   ```bash
   cd ../app
   cp .env.example .env
   npm install
   npm start
   ```
   *Press `a` for Android Emulator, `i` for iOS Simulator, or scan the QR code with Expo Go on a physical phone.*

4. **Log In with the Demo Phone Number**:
   - Phone Number: `+919999999999`
   - Tap **"Send Verification Code"**
   - The 6-digit mock OTP is printed directly in the backend terminal logs:
     ```text
     ======================================================================
     🔐 [AUTH MOCK OTP] Phone: +919999999999 | OTP: 123456 | Expires in: 5 minutes
     ======================================================================
     ```
   - Enter the code to access the portfolio dashboard.

5. **Observe the Pre-Seeded Dashboard**:
   - The summary card displays aggregated totals (Total Lent, Repaid, Overdue) in INR format.
   - The feed displays 6 realistic entries: 2 overdue entries highlighted in warning red (backdated 8 and 3 days), 1 due today, 2 future pending loans, and 1 already repaid.
   - *Note on Overdue Entries*: Overdue loans are seeded directly in the database because the app and backend intentionally block backdated loans during creation to enforce domain integrity.

---

## Detailed Setup

### 1. Start PostgreSQL
```bash
docker compose up -d
```

### 2. Configure Backend Environment
```bash
cd backend
cp .env.example .env
npm install
```

### 3. Run Database Migrations
```bash
npm run migrate
```

### 4. Run Automated Test Suite
```bash
npm test
```

### 5. Start the Backend Server
```bash
npm run dev
```

---

## Running the Mobile App (Expo)

> **Platform Target**: Native mobile only (iOS / Android via Expo Go, Emulator, or physical device). Web execution is intentionally unsupported as `expo-secure-store` requires hardware-backed OS keychains (Apple Keychain / Android KeyStore).

```bash
cd app
cp .env.example .env
npm install
npm start
```
- Press `a` for Android Emulator.
- Press `i` for iOS Simulator.
- Scan QR code with Expo Go on a physical device.

---

## Verifying Authentication (curl)

### 1. Request an OTP
```bash
curl -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210"}'
```
*Observe the mock OTP printed prominently in the server terminal logs.*

### 2. Verify OTP & Receive JWT
```bash
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "<OTP_FROM_LOGS>"}'
```
