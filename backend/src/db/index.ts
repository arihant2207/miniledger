/**
 * Module: PostgreSQL Database Connection Pool
 * Responsibility: Manages the pg connection pool lifecycle, executes parameterized SQL queries,
 * provides transactional clients, and logs query execution timings in development mode.
 * Strictly adheres to raw SQL without any ORM.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err: Error) => {
  logger.error('Unexpected idle PostgreSQL client error', { error: err.message });
});

export const db = {
  /**
   * Executes a parameterized raw SQL query with performance telemetry.
   * Parameterized queries protect against SQL injection vulnerabilities.
   */
  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug('Executed query', { text, durationMs: duration, rows: result.rowCount });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query failed', { text, durationMs: duration, error: (error as Error).message });
      throw error;
    }
  },

  /**
   * Acquires a client connection for multi-step database transactions.
   */
  async getClient(): Promise<PoolClient> {
    return pool.connect();
  },

  /**
   * Gracefully drains and closes all active pool connections on server shutdown.
   */
  async closePool(): Promise<void> {
    await pool.end();
    logger.info('PostgreSQL pool has been cleanly closed.');
  },

  /**
   * Probes the database to verify active connectivity.
   */
  async testConnection(): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  },
};
