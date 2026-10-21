/**
 * Module: Summary Data Repository
 * Responsibility: Computes portfolio financial totals for the authenticated user in a
 * single SQL query using PostgreSQL aggregate FILTER clauses. Prevents multiple database round-trips
 * and guarantees zero floating-point arithmetic in JavaScript.
 */

import { db } from '../../db';

export interface SummaryRecord {
  total_lent: string;
  total_repaid: string;
  total_overdue: string;
}

export const summaryRepository = {
  /**
   * Aggregates total lent, total repaid, and total overdue in a single query:
   * - total_lent: sum of all loans created by user
   * - total_repaid: sum of loans with status = 'repaid'
   * - total_overdue: sum of loans with status = 'pending' AND due_date < CURRENT_DATE
   */
  async getSummary(userId: string): Promise<SummaryRecord> {
    const sql = `
      SELECT
        COALESCE(SUM(amount), 0)::numeric(12,2) AS total_lent,
        COALESCE(SUM(amount) FILTER (WHERE status = 'repaid'), 0)::numeric(12,2) AS total_repaid,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending' AND due_date < CURRENT_DATE), 0)::numeric(12,2) AS total_overdue
      FROM loans
      WHERE user_id = $1;
    `;
    const result = await db.query<SummaryRecord>(sql, [userId]);
    return result.rows[0]!;
  },
};
