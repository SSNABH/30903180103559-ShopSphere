import { Client } from 'pg';

// Public, read-only status for the abandoned-cart cleanup job.
//
// /api/cleanup-carts deletes rows, so it is guarded by a bearer secret and
// returns 401 to anyone without it. That is correct, but it leaves no way for
// somebody outside the Vercel account to confirm the function actually runs.
//
// This endpoint executes the same serverless runtime and the same database
// connection as the cleanup job, and answers the same question the cleanup
// asks — how many carts are abandoned right now — without deleting anything.
// It takes no secret because it exposes nothing but two counts.
const ABANDONED_AFTER_DAYS = 30;
const STATEMENT_TIMEOUT_MS = 20_000;

function log(level, message, fields = {}) {
  console.log(
    JSON.stringify({
      time: new Date().toISOString(),
      level,
      service: 'shopsphere-jobs',
      job: 'cleanup-carts-status',
      message,
      ...fields,
    }),
  );
}

export default async function handler(request, response) {
  const startedAt = Date.now();

  if (!process.env.DATABASE_URL) {
    log('error', 'DATABASE_URL is not configured');
    return response.status(500).json({ success: false, message: 'Database is not configured.' });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    statement_timeout: STATEMENT_TIMEOUT_MS,
  });

  try {
    await client.connect();

    const { rows } = await client.query(
      `SELECT
         COUNT(DISTINCT c.id)::int AS abandoned_carts,
         COUNT(ci.id)::int         AS abandoned_items,
         (SELECT COUNT(*)::int FROM "Cart") AS total_carts
       FROM "Cart" c
       LEFT JOIN "CartItem" ci ON ci."cartId" = c.id
       WHERE c."updatedAt" < NOW() - ($1 || ' days')::interval`,
      [ABANDONED_AFTER_DAYS],
    );

    const durationMs = Date.now() - startedAt;
    log('info', 'Cleanup status executed', { ...rows[0], durationMs });

    return response.status(200).json({
      success: true,
      job: 'cleanup-carts',
      mode: 'status',
      schedule: 'daily at 03:00 UTC',
      abandonedAfterDays: ABANDONED_AFTER_DAYS,
      totalCarts: rows[0]?.total_carts ?? 0,
      abandonedCarts: rows[0]?.abandoned_carts ?? 0,
      abandonedItems: rows[0]?.abandoned_items ?? 0,
      durationMs,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    log('error', 'Cleanup status failed', { error: error.message, durationMs: Date.now() - startedAt });
    return response.status(500).json({ success: false, message: 'The status check failed.' });
  } finally {
    await client.end().catch(() => {});
  }
}
