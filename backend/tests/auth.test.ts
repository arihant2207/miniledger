/**
 * Module: Authentication Integration Tests
 * Responsibility: Tests all authentication security invariants using supertest:
 * - OTP generation and prominent logging
 * - Verification happy path & JWT token issuance
 * - Wrong OTP rejection & attempt counter decrement
 * - Hard attempt cap enforcement (5 attempts)
 * - Time-based expiry rejection
 * - Single-use consumption (replay protection)
 * - Edge validation on international phone formatting
 * - Sliding window rate limiting
 */

import request from 'supertest';
import crypto from 'node:crypto';
import { createApp } from '../src/app';
import { db } from '../src/db';
import { env } from '../src/config/env';
import { resetDatabase, teardownDatabase } from './helpers';

const app = createApp();

describe('Auth Module Integration Tests', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  describe('POST /auth/request-otp', () => {
    it('generates an OTP successfully for a valid international phone number', async () => {
      const res = await request(app)
        .post('/auth/request-otp')
        .send({ phone: '+919876543210' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('OTP sent successfully');
      expect(res.body.data.expiresInSeconds).toBe(300);

      // Verify OTP is hashed in the database
      const dbCheck = await db.query<{ code_hash: string; attempts: number }>(
        'SELECT code_hash, attempts FROM otps WHERE phone = $1',
        ['+919876543210']
      );
      expect(dbCheck.rows).toHaveLength(1);
      expect(dbCheck.rows[0]?.attempts).toBe(0);
      expect(dbCheck.rows[0]?.code_hash).toHaveLength(64); // 64 hex chars for SHA-256
    });

    it('rejects malformed phone numbers with a 400 validation error', async () => {
      const res = await request(app)
        .post('/auth/request-otp')
        .send({ phone: '1234' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Must be between 10 and 15 digits');
    });

    it('enforces rate limiting when exceeding max requests within window', async () => {
      const phone = '+919999999999';

      // First 3 requests succeed
      for (let i = 0; i < 3; i++) {
        const res = await request(app).post('/auth/request-otp').send({ phone });
        expect(res.status).toBe(200);
      }

      // 4th request within window must be rejected
      const rateLimitedRes = await request(app).post('/auth/request-otp').send({ phone });
      expect(rateLimitedRes.status).toBe(429);
      expect(rateLimitedRes.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(rateLimitedRes.body.error.message).toContain('Too many OTP requests');
    });
  });

  describe('POST /auth/verify-otp', () => {
    const testPhone = '+919876543210';
    const testRawOtp = '123456';

    beforeEach(async () => {
      // Seed a known hashed OTP directly
      const hash = crypto.createHmac('sha256', env.JWT_SECRET).update(testRawOtp).digest('hex');
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      await db.query(
        'INSERT INTO otps (phone, code_hash, expires_at) VALUES ($1, $2, $3)',
        [testPhone, hash, expiresAt]
      );
    });

    it('verifies the correct OTP, marks it consumed, and returns a signed JWT', async () => {
      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: testPhone, otp: testRawOtp });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.phone).toBe(testPhone);
      expect(res.body.data.user.id).toBeDefined();

      // Verify OTP is marked consumed
      const dbCheck = await db.query<{ consumed_at: Date | null }>(
        'SELECT consumed_at FROM otps WHERE phone = $1',
        [testPhone]
      );
      expect(dbCheck.rows[0]?.consumed_at).not.toBeNull();
    });

    it('rejects an incorrect OTP and decrements remaining attempts', async () => {
      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: testPhone, otp: '999999' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('Invalid OTP. 4 attempt(s) remaining.');

      // Check attempts in DB
      const dbCheck = await db.query<{ attempts: number }>(
        'SELECT attempts FROM otps WHERE phone = $1',
        [testPhone]
      );
      expect(dbCheck.rows[0]?.attempts).toBe(1);
    });

    it('locks out verification when maximum 5 attempts are exceeded', async () => {
      // Simulate 5 prior failed attempts
      await db.query('UPDATE otps SET attempts = 5 WHERE phone = $1', [testPhone]);

      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: testPhone, otp: testRawOtp });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('Maximum verification attempts exceeded');
    });

    it('rejects an expired OTP', async () => {
      // Backdate expires_at into the past
      await db.query(
        "UPDATE otps SET expires_at = NOW() - interval '1 minute' WHERE phone = $1",
        [testPhone]
      );

      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: testPhone, otp: testRawOtp });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('OTP has expired');
    });

    it('rejects reuse of an already consumed OTP (single-use replay protection)', async () => {
      // First verification succeeds
      const firstRes = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: testPhone, otp: testRawOtp });
      expect(firstRes.status).toBe(200);

      // Replay attempt with same code fails
      const replayRes = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: testPhone, otp: testRawOtp });

      expect(replayRes.status).toBe(400);
      expect(replayRes.body.error.code).toBe('BAD_REQUEST');
      expect(replayRes.body.error.message).toContain('No pending OTP request found');
    });
  });
});
