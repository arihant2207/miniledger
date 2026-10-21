/**
 * Module: Environment Configuration
 * Responsibility: Parses, validates, and freezes runtime configuration using Zod.
 * Enforces fail-fast behavior at startup if any critical variable is missing or malformed,
 * preventing subtle runtime failures during database connections or JWT operations.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load variables from .env file into process.env
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('*'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(5),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(3),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  process.stderr.write('❌ [FATAL] Environment validation failed:\n');
  for (const issue of parsed.error.issues) {
    process.stderr.write(`  - ${issue.path.join('.')}: ${issue.message}\n`);
  }
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
export type Env = typeof env;
