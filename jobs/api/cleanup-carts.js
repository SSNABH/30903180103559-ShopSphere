import { Client } from 'pg';

// Abandoned-cart cleanup.
//
// A shopper who adds items and never checks out leaves a cart row and its items
// behind. Nothing in the storefront ever removes them, so the table grows
// without limit and admin statistics slowly drift away from reality.
//
// The work belongs outside the main application for two reasons: no user is
// waiting on it, and it should run on a clock rather than on a request. It is
// deployed as its own Vercel project, invoked by a scheduled cron, and touches
// the database directly rather than going through the API.
const ABANDONED_AFTER_DAYS = 30;
const STATEMENT_TIMEOUT_MS = 20_000;

function log(level, message, fields = {}) {
  // One JSON object per line, with a timestamp and a level, so the output is
  // readable in the Vercel dashboard and greppable.
  console.log(
    JSON.stringify({
      time: new Date().toISOString(),
      level,
      service: 'shopsphere-jobs',
      job: 'cleanup-carts',
      message,
      ...fields,
    }),
  );
}

/**
 * Vercel signs scheduled invocations with CRON_SECRET as a bearer token.
 * Without this check the endpoint would let anyone on the internet delete
 * carts, so a missing or wrong secret is rejected before any work happens.
 */
function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(request, response) {
  const startedAt = Date.now();

  if (!isAuthorized(request)) {
    log('warn', 'Rejected an unauthorised invocation');
    return response.status(401).json({ success: false, message: 'Unauthorized.' });
  }

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

    // CartItem has ON DELETE CASCADE against Cart, so removing the cart takes
    // its items with it. Counting them first makes the log line meaningful.
    const { rows: before } = await client.query(
      `SELECT
         COUNT(DISTINCT c.id)::int AS carts,
         COUNT(ci.id)::int         AS items
       FROM "Cart" c
       LEFT JOIN "CartItem" ci ON ci."cartId" = c.id
       WHERE c."updatedAt" < NOW() - ($1 || ' days')::interval`,
      [ABANDONED_AFTER_DAYS],
    );

    const { rowCount: cartsDeleted } = await client.query(
      `DELETE FROM "Cart"
       WHERE "updatedAt" < NOW() - ($1 || ' days')::interval`,
      [ABANDONED_AFTER_DAYS],
    );

    const durationMs = Date.now() - startedAt;
    log('info', 'Abandoned cart cleanup finished', {
      abandonedAfterDays: ABANDONED_AFTER_DAYS,
      cartsDeleted,
      itemsRemoved: before[0]?.items ?? 0,
      durationMs,
    });

    return response.status(200).json({
      success: true,
      job: 'cleanup-carts',
      abandonedAfterDays: ABANDONED_AFTER_DAYS,
      cartsDeleted,
      itemsRemoved: before[0]?.items ?? 0,
      durationMs,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    log('error', 'Abandoned cart cleanup failed', {
      error: error.message,
      durationMs: Date.now() - startedAt,
    });
    return response.status(500).json({ success: false, message: 'The cleanup job failed.' });
  } finally {
    await client.end().catch(() => {});
  }
}
