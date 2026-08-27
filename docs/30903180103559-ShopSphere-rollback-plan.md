# Rollback Plan — ShopSphere

**Student ID:** 30903180103559 · **Applies to:** production deployments on Vercel

## How a failed release is detected

**UptimeRobot** polls `https://shopsphere-store-api.vercel.app/api/health` every 5
minutes. That endpoint runs `SELECT 1` against Supabase and checks the MongoDB
connection, so it returns **503** whenever either database is unreachable and **200**
only when the whole stack is healthy. Status page: `https://stats.uptimerobot.com/LBmw2iOvH5`

Three signals, in the order they arrive:

1. **The pipeline's smoke job fails** — it checks every URL in the links document
   after deploying, catching most bad releases within a minute.
2. **UptimeRobot alerts** — the monitor flips to Down and emails. The safety net for
   a release that passed the smoke check and broke afterwards.
3. **Errors rise in the logs** — Vercel Dashboard → project → Logs, filtered on
   `"level":"error"`. Confirms the cause; does not detect it.

## Steps to restore the previous working version

1. **Confirm it is the release, not the dependencies** — 30 seconds.
   `curl -s https://shopsphere-store-api.vercel.app/api/health`. If `checks.postgresql`
   or `checks.mongodb` is `false`, check Supabase and Atlas status before rolling back.
2. **Roll the deployment back** — about 30 seconds, no rebuild. Vercel Dashboard → the
   affected project → **Deployments** → the last deployment marked **Ready** before the
   bad one → **⋯** → **Instant Rollback**.
3. **Re-point the published alias.** Instant Rollback moves only the project's own
   production domain; the URLs in the links document are separate aliases and must be
   moved too, or production keeps serving the broken build:
   `vercel alias set <restored-deployment-url> shopsphere-store-api.vercel.app`
4. **Confirm recovery** — 1 minute. Re-run the health check and load
   `https://shopsphere-storefront.vercel.app`. Allow up to 5 minutes for UptimeRobot
   to report Up again.
5. **Revert the commit** so the next merge does not redeploy the fault:
   `git revert <bad-commit-sha>` then `git push origin main`. A rollback changes what
   production serves, not what `main` holds.

The four services deploy independently, so only the one that broke is rolled back. If
the release contained a database migration, roll the code back first, then fix forward
with a corrective migration — never reverse one that has accepted writes.
