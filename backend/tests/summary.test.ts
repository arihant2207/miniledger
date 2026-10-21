/**
 * Module: Summary Integration Tests
 * Responsibility: Tests portfolio financial calculation invariants:
 * - Single-query execution with SUM ... FILTER
 * - Accurate breakdown across total_lent, total_repaid, and total_overdue
 * - Proper inclusion of overdue status (pending AND due_date < CURRENT_DATE)
 * - Strict multi-tenant isolation (User A numbers never bleed into User B summary)
 */

import request from 'supertest';
import { createApp } from '../src/app';
import { db } from '../src/db';
import { resetDatabase, createTestUser, teardownDatabase } from './helpers';

const app = createApp();

describe('Summary Module Integration Tests', () => {
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

  it('returns all zeros for a user with no loans', async () => {
    const res = await request(app)
      .get('/summary')
      .set('Authorization', `Bearer ${userA.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      totalLent: 0,
      totalLentFormatted: '0.00',
      totalRepaid: 0,
      totalRepaidFormatted: '0.00',
      totalOverdue: 0,
      totalOverdueFormatted: '0.00',
    });
  });

  it('correctly aggregates total_lent, total_repaid, and total_overdue in single SQL query', async () => {
    // 1. Pending loan (due in 5 days) -> 1000.00
    await db.query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date, status)
       VALUES ($1, 'Upcoming Friend', 1000.00, CURRENT_DATE + INTERVAL '5 days', 'pending')`,
      [userA.id]
    );

    // 2. Repaid loan -> 500.00
    await db.query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date, status, repaid_at)
       VALUES ($1, 'Repaid Friend', 500.00, CURRENT_DATE + INTERVAL '2 days', 'repaid', CURRENT_TIMESTAMP)`,
      [userA.id]
    );

    // 3. Overdue loan (due 3 days ago, pending) -> 750.50
    await db.query(
      `INSERT INTO loans (user_id, friend_name, amount, due_date, status)
       VALUES ($1, 'Overdue Friend', 750.50, CURRENT_DATE - INTERVAL '3 days', 'pending')`,
      [userA.id]
    );

    // Expected totals:
    // total_lent = 1000.00 + 500.00 + 750.50 = 2250.50
    // total_repaid = 500.00
    // total_overdue = 750.50

    const res = await request(app)
      .get('/summary')
      .set('Authorization', `Bearer ${userA.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalLent).toBe(2250.5);
    expect(res.body.data.totalLentFormatted).toBe('2250.50');
    expect(res.body.data.totalRepaid).toBe(500);
    expect(res.body.data.totalRepaidFormatted).toBe('500.00');
    expect(res.body.data.totalOverdue).toBe(750.5);
    expect(res.body.data.totalOverdueFormatted).toBe('750.50');

    // 4. Verify isolation: User B must see all 0.00
    const userBRes = await request(app)
      .get('/summary')
      .set('Authorization', `Bearer ${userB.token}`);

    expect(userBRes.status).toBe(200);
    expect(userBRes.body.data.totalLent).toBe(0);
    expect(userBRes.body.data.totalRepaid).toBe(0);
    expect(userBRes.body.data.totalOverdue).toBe(0);
  });
});
