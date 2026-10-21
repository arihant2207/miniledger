/**
 * Module: Database Migration Runner
 * Responsibility: Executes unapplied SQL migration files in alphabetical order within
 * isolated transactions, tracking applied migrations in the `_migrations` table and
 * acquiring an advisory lock to prevent race conditions during concurrent container boots.
 */

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

// Ensure environment variables are loaded if invoked directly
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  process.stderr.write('[MIGRATE ERROR] DATABASE_URL is not set.\n');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
});

const ADVISORY_LOCK_ID = 987654321;

async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    process.stdout.write('[MIGRATE] Acquiring advisory lock...\n');
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_ID]);

    // Ensure migrations ledger exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Fetch already applied migrations
    const result = await client.query<{ name: string }>('SELECT name FROM _migrations ORDER BY id ASC');
    const appliedMigrations = new Set(result.rows.map((row) => row.name));

    // Read and sort SQL migration files
    const migrationsDir = path.resolve(__dirname);
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let executedCount = 0;

    for (const file of files) {
      if (appliedMigrations.has(file)) {
        continue;
      }

      process.stdout.write(`[MIGRATE] Applying migration: ${file}...\n`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      // Execute each migration inside an atomic transaction
      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        executedCount++;
        process.stdout.write(`[MIGRATE] Successfully applied: ${file}\n`);
      } catch (migrationError) {
        await client.query('ROLLBACK');
        throw migrationError;
      }
    }

    if (executedCount === 0) {
      process.stdout.write('[MIGRATE] Database is already up to date. No new migrations.\n');
    } else {
      process.stdout.write(`[MIGRATE] Migration complete. Applied ${executedCount} file(s).\n`);
    }
  } catch (error) {
    process.stderr.write(`[MIGRATE FATAL] Migration failed: ${(error as Error).message}\n`);
    process.exit(1);
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID]);
    } catch {
      // Ignore unlock failure if client disconnected
    }
    client.release();
    await pool.end();
  }
}

void runMigrations();
