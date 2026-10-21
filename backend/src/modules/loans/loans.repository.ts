/**
 * Module: Loans Data Repository
 * Responsibility: Executes raw SQL queries against PostgreSQL for loan operations.
 * Strictly scopes every query by the authenticated user_id. Enforces database-level sorting
 * (overdue pending items first, followed by due_date ascending) and atomic idempotent repayment.
 */

import { db } from '../../db';

export interface LoanRecord {
  id: string;
  user_id: string;
  friend_name: string;
  amount: string; // NUMERIC is parsed as string by node-pg to preserve financial precision
  due_date: string; // DATE format 'YYYY-MM-DD'
  status: 'pending' | 'repaid';
  repaid_at: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  is_overdue: boolean;
}

export const loansRepository = {
  /**
   * Inserts a new loan record scoped to the authenticated user.
   */
  async create(
    userId: string,
    friendName: string,
    amount: number,
    dueDate: string,
    notes?: string
  ): Promise<LoanRecord> {
    const sql = `
      INSERT INTO loans (user_id, friend_name, amount, due_date, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        user_id,
        friend_name,
        amount,
        due_date::text,
        status,
        repaid_at,
        notes,
        created_at,
        updated_at,
        (status = 'pending' AND due_date < CURRENT_DATE) AS is_overdue;
    `;
    const result = await db.query<LoanRecord>(sql, [userId, friendName, amount, dueDate, notes ?? null]);
    return result.rows[0]!;
  },

  /**
   * Retrieves all loans for a specific user.
   * Sorted with overdue pending loans first, then chronologically by due date.
   */
  async findByUserId(userId: string): Promise<LoanRecord[]> {
    const sql = `
      SELECT
        id,
        user_id,
        friend_name,
        amount,
        due_date::text,
        status,
        repaid_at,
        notes,
        created_at,
        updated_at,
        (status = 'pending' AND due_date < CURRENT_DATE) AS is_overdue
      FROM loans
      WHERE user_id = $1
      ORDER BY
        CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN 0 ELSE 1 END,
        due_date ASC,
        created_at DESC;
    `;
    const result = await db.query<LoanRecord>(sql, [userId]);
    return result.rows;
  },

  /**
   * Atomically marks a loan as repaid if owned by the requesting user.
   * Idempotent: if already repaid, preserves original repaid_at timestamp.
   * Returns null if the loan does not exist or belongs to another user.
   */
  async markRepaid(userId: string, loanId: string): Promise<LoanRecord | null> {
    const sql = `
      UPDATE loans
      SET
        status = 'repaid',
        repaid_at = COALESCE(repaid_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING
        id,
        user_id,
        friend_name,
        amount,
        due_date::text,
        status,
        repaid_at,
        notes,
        created_at,
        updated_at,
        false AS is_overdue;
    `;
    const result = await db.query<LoanRecord>(sql, [loanId, userId]);
    return result.rows[0] ?? null;
  },
};
