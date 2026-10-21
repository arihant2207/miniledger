/**
 * Module: Loans Integration Tests
 * Responsibility: Validates loan domain rules and data isolation:
 * - Edge validation (amounts, calendar dates, non-empty friend names)
 * - Sorting invariant: overdue items sorted first, followed by chronological due date
 * - Repayment idempotency (preserves original repaid_at timestamp)
 * - Strict multi-tenant data isolation: User A cannot read or repay User B's loans (returns 404)
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/db';
import { resetDatabase, createTestUser, teardownDatabase } from './helpers';

const app = createApp();

describe('Loans Module Integration Tests', () => {
  let userA: { id: string; phone: string; token: string };
  let userB: { id: string; phone: string; token: string };

  beforeEach(async () => {
    await resetDatabase();
    userA = await createTestUser('+919876543210');
    userB = await createTestUser('+919876543211');
  });

  afterAll(async () => {
    await teardownDatabase();
  });

  describe('POST /loans (Creation & Validation)', () => {
    it('creates a new loan with valid data', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friendName: 'Alex Mercer',
          amount: 2500.5,
          dueDate: todayStr,
          notes: 'Dinner expenses',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.userId).toBe(userA.id);
      expect(res.body.data.friendName).toBe('Alex Mercer');
      expect(res.body.data.amount).toBe(2500.5);
      expect(res.body.data.amountFormatted).toBe('2500.50');
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.repaidAt).toBeNull();
      expect(res.body.data.notes).toBe('Dinner expenses');
    });

    it('rejects loan with zero or negative amount', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friendName: 'Alex',
          amount: 0,
          dueDate: todayStr,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Amount must be a positive number greater than 0');
    });

    it('rejects loan with a past due date', async () => {
      const res = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friendName: 'Alex',
          amount: 100,
          dueDate: '2020-01-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Due date must be today or a future date');
    });

    it('rejects loan with an empty friend name', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friendName: '   ',
          amount: 100,
          dueDate: todayStr,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Friend name cannot be empty');
    });
  });

  describe('GET /loans (List & Overdue Sorting)', () => {
    it('returns loans with overdue pending items sorted first, then by due date', async () => {
      // Insert upcoming loan (due tomorrow)
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      await db.query(
        `INSERT INTO loans (user_id, friend_name, amount, due_date, status)
         VALUES ($1, 'Upcoming Friend', 1000, $2, 'pending')`,
        [userA.id, tomorrow]
      );

      // Insert overdue loan (due 5 days ago) directly into DB to test overdue sorting
      await db.query(
        `INSERT INTO loans (user_id, friend_name, amount, due_date, status)
         VALUES ($1, 'Overdue Friend', 500, CURRENT_DATE - INTERVAL '5 days', 'pending')`,
        [userA.id]
      );

      const res = await request(app)
        .get('/loans')
        .set('Authorization', `Bearer ${userA.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);

      // Overdue loan must be first
      expect(res.body.data[0].friendName).toBe('Overdue Friend');
      expect(res.body.data[0].isOverdue).toBe(true);

      // Upcoming loan must be second
      expect(res.body.data[1].friendName).toBe('Upcoming Friend');
      expect(res.body.data[1].isOverdue).toBe(false);
    });
  });

  describe('PATCH /loans/:id/repay (Idempotency & Ownership Isolation)', () => {
    it('marks a loan as repaid and behaves idempotently on repeated requests', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const createRes = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friendName: 'Sarah',
          amount: 1500,
          dueDate: todayStr,
        });

      const loanId = createRes.body.data.id;

      // 1. First repayment marks as repaid
      const firstRepay = await request(app)
        .patch(`/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(firstRepay.status).toBe(200);
      expect(firstRepay.body.data.status).toBe('repaid');
      expect(firstRepay.body.data.repaidAt).not.toBeNull();
      const initialRepaidAt = firstRepay.body.data.repaidAt;

      // 2. Second repayment is idempotent and preserves the original repaidAt timestamp
      const secondRepay = await request(app)
        .patch(`/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${userA.token}`);

      expect(secondRepay.status).toBe(200);
      expect(secondRepay.body.data.status).toBe('repaid');
      expect(secondRepay.body.data.repaidAt).toBe(initialRepaidAt);
    });

    it('enforces ownership isolation: User B cannot repay or see User A loan (returns 404)', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      // User A creates loan
      const createRes = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          friendName: 'Private Loan',
          amount: 5000,
          dueDate: todayStr,
        });

      const loanId = createRes.body.data.id;

      // User B attempts to repay User A's loan
      const maliciousRepay = await request(app)
        .patch(`/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${userB.token}`);

      // Must return 404 (not 403) to prevent ID enumeration
      expect(maliciousRepay.status).toBe(404);
      expect(maliciousRepay.body.error.code).toBe('NOT_FOUND');
      expect(maliciousRepay.body.error.message).toBe('Loan not found');

      // User B listing loans returns empty array
      const userBList = await request(app)
        .get('/loans')
        .set('Authorization', `Bearer ${userB.token}`);

      expect(userBList.status).toBe(200);
      expect(userBList.body.data).toHaveLength(0);
    });
  });
});
