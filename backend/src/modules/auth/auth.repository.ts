/**
 * Module: Auth Data Repository
 * Responsibility: Executes raw SQL queries against PostgreSQL for OTP life-cycle operations
 * (creation, attempt increments, consumption) and user identity resolution (upsert by phone).
 * All queries are strictly parameterized to prevent SQL injection.
 */

import { db } from '../../db';

export interface OtpRecord {
  id: string;
  phone: string;
  code_hash: string;
  attempts: number;
  expires_at: Date;
  consumed_at: Date | null;
  created_at: Date;
}

export interface UserRecord {
  id: string;
  phone: string;
  created_at: Date;
}

export const authRepository = {
  /**
   * Counts OTP generation requests for a given phone since a cutoff timestamp.
   * Used for rolling window rate limiting to prevent SMS flooding and brute force initiation.
   */
  async countRecentOtps(phone: string, since: Date): Promise<number> {
    const sql = `
      SELECT COUNT(*)::int AS count
      FROM otps
      WHERE phone = $1 AND created_at >= $2;
    `;
    const result = await db.query<{ count: number }>(sql, [phone, since]);
    return result.rows[0]?.count ?? 0;
  },

  /**
   * Persists a newly generated, cryptographically hashed OTP.
   */
  async createOtp(phone: string, codeHash: string, expiresAt: Date): Promise<OtpRecord> {
    const sql = `
      INSERT INTO otps (phone, code_hash, expires_at)
      VALUES ($1, $2, $3)
      RETURNING id, phone, code_hash, attempts, expires_at, consumed_at, created_at;
    `;
    const result = await db.query<OtpRecord>(sql, [phone, codeHash, expiresAt]);
    return result.rows[0]!;
  },

  /**
   * Fetches the most recent unconsumed OTP record for verification.
   */
  async findLatestUnconsumedOtp(phone: string): Promise<OtpRecord | null> {
    const sql = `
      SELECT id, phone, code_hash, attempts, expires_at, consumed_at, created_at
      FROM otps
      WHERE phone = $1 AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const result = await db.query<OtpRecord>(sql, [phone]);
    return result.rows[0] ?? null;
  },

  /**
   * Increments the verification attempt counter by 1.
   */
  async incrementAttempts(id: string): Promise<number> {
    const sql = `
      UPDATE otps
      SET attempts = attempts + 1
      WHERE id = $1
      RETURNING attempts;
    `;
    const result = await db.query<{ attempts: number }>(sql, [id]);
    return result.rows[0]?.attempts ?? 0;
  },

  /**
   * Marks an OTP as consumed to prevent replay attacks.
   */
  async markConsumed(id: string): Promise<void> {
    const sql = `
      UPDATE otps
      SET consumed_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `;
    await db.query(sql, [id]);
  },

  /**
   * Finds an existing user by phone or creates a new user record.
   * Implements frictionless passwordless on-the-fly registration.
   */
  async findOrCreateUser(phone: string): Promise<UserRecord> {
    const upsertSql = `
      INSERT INTO users (phone)
      VALUES ($1)
      ON CONFLICT (phone) DO UPDATE
      SET phone = EXCLUDED.phone
      RETURNING id, phone, created_at;
    `;
    const result = await db.query<UserRecord>(upsertSql, [phone]);
    return result.rows[0]!;
  },
};
