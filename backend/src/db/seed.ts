/**
 * Module: Database Demo Seeder
 * Responsibility: Idempotently seeds realistic loan records for the demo user (+919999999999).
 * Strictly refuses to run when NODE_ENV=production to safeguard live databases.
 * Guarantees that running multiple times produces identical, non-duplicated states.
 */

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

if (process.env.NODE_ENV === 'production') {
  process.stderr.write('❌ [SEED ERROR] Database seeding is strictly forbidden in production (NODE_ENV=production).\n');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  process.stderr.write('❌ [SEED ERROR] DATABASE_URL is not set.\n');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

const DEMO_PHONE = '+919999999999';

async function seed(): Promise<void> {
  const client = await pool.connect();

  try {
    process.stdout.write(`🌱 [SEED] Starting demo database seed for user ${DEMO_PHONE}...\n`);
    await client.query('BEGIN');

    // 1. Upsert Demo User
    const userRes = await client.query<{ id: string }>(
      `INSERT INTO users (phone)
       VALUES ($1)
       ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id;`,
      [DEMO_PHONE]
    );
    const userId = userRes.rows[0]!.id;

    // 2. Remove any prior demo loans to guarantee strict idempotency
    await client.query('DELETE FROM loans WHERE user_id = $1;', [userId]);

    // 3. Insert 6 realistic loans:
    // - 2 overdue (backdated 8 days and 3 days)
    // - 1 due today
    // - 2 pending in future (due in 4 days and 12 days)
    // - 1 already repaid
    const seedQueries = [
      {
        friendName: 'Aarav Sharma',
        amount: 4500.0,
        dueSql: "CURRENT_DATE - INTERVAL '8 days'",
        status: 'pending',
        repaidSql: 'NULL',
        notes: 'Goa trip villa booking split',
      },
      {
        friendName: 'Priya Patel',
        amount: 1200.0,
        dueSql: "CURRENT_DATE - INTERVAL '3 days'",
        status: 'pending',
        repaidSql: 'NULL',
        notes: 'Dinner at Farzi Cafe',
      },
      {
        friendName: 'Rohan Verma',
        amount: 2000.0,
        dueSql: 'CURRENT_DATE',
        status: 'pending',
        repaidSql: 'NULL',
        notes: 'Standup comedy concert tickets',
      },
      {
        friendName: 'Ananya Iyer',
        amount: 3500.0,
        dueSql: "CURRENT_DATE + INTERVAL '4 days'",
        status: 'pending',
        repaidSql: 'NULL',
        notes: 'Weekend road trip fuel & toll expenses',
      },
      {
        friendName: 'Vikram Malhotra',
        amount: 8000.0,
        dueSql: "CURRENT_DATE + INTERVAL '12 days'",
        status: 'pending',
        repaidSql: 'NULL',
        notes: 'Advance for electronics purchase',
      },
      {
        friendName: 'Neha Gupta',
        amount: 1500.0,
        dueSql: "CURRENT_DATE - INTERVAL '5 days'",
        status: 'repaid',
        repaidSql: 'CURRENT_TIMESTAMP',
        notes: 'Group birthday gift contribution',
      },
    ];

    for (const loan of seedQueries) {
      await client.query(
        `INSERT INTO loans (user_id, friend_name, amount, due_date, status, repaid_at, notes)
         VALUES ($1, $2, $3, ${loan.dueSql}, $4, ${loan.repaidSql}, $5);`,
        [userId, loan.friendName, loan.amount, loan.status, loan.notes]
      );
    }

    await client.query('COMMIT');
    process.stdout.write(`✅ [SEED] Successfully seeded demo user and 6 loans:\n`);
    process.stdout.write(`   - 2 Overdue loans (8 days & 3 days ago)\n`);
    process.stdout.write(`   - 1 Due Today\n`);
    process.stdout.write(`   - 2 Future Pending loans (in 4 days & 12 days)\n`);
    process.stdout.write(`   - 1 Already Repaid loan\n`);
  } catch (error) {
    await client.query('ROLLBACK');
    process.stderr.write(`❌ [SEED FATAL] Seeding failed: ${(error as Error).message}\n`);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

void seed();
