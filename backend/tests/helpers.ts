/**
 * Module: Test Helpers & DB Harness
 * Responsibility: Provides utilities for testing MiniLedger endpoints:
 * - Deterministic database truncation between test suites
 * - Auth token generation for isolated test personas
 * - Database pool cleanup on test teardown
 */

import jwt from 'jsonwebtoken';
import { db } from '../src/db';
import { env } from '../src/config/env';

export async function resetDatabase(): Promise<void> {
  // Cascades clean loans, otps, and users
  await db.query('TRUNCATE TABLE loans, otps, users CASCADE;');
}

export async function createTestUser(phone: string): Promise<{ id: string; phone: string; token: string }> {
  const result = await db.query<{ id: string; phone: string }>(
    `INSERT INTO users (phone) VALUES ($1)
     ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
     RETURNING id, phone;`,
    [phone]
  );
  const user = result.rows[0]!;

  const token = jwt.sign(
    {
      sub: user.id,
      phone: user.phone,
    },
    env.JWT_SECRET,
    {
      expiresIn: '1h',
    }
  );

  return { id: user.id, phone: user.phone, token };
}

export async function teardownDatabase(): Promise<void> {
  await db.closePool();
}
