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

## Getting Started

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

### 4. Start the Backend Server
```bash
npm run dev
```

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
