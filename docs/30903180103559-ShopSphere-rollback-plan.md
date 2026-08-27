# Rollback Plan — ShopSphere

**Student ID:** 30903180103559 · **Applies to:** production deployments on Vercel

## How a failed release is detected

**UptimeRobot** polls `https://shopsphere-store-api.vercel.app/api/health` every
5 minutes. That endpoint runs `SELECT 1` against Supabase and checks the MongoDB
connection, so it returns **503** whenever either database is unreachable and
**200** only when the whole stack is healthy. Public status page:
`https://stats.uptimerobot.com/LBmw2iOvH5`

Three signals, in the order they arrive:

1. **The pipeline's smoke job fails.** After deploying, it checks every URL
   published in the links document. A non-200 fails the run within a minute, so
   most bad releases are caught before anyone else sees them.
2. **UptimeRobot alerts.** The monitor flips to Down and emails. This is the
   safety net for a release that passed the smoke check and broke afterwards.
3. **Errors rise in the logs.** Vercel Dashboard → project → Logs, filtered on
   `"level":"error"`. Use this to confirm the cause, not to detect it.

## Steps to restore the previous working version

1. **Confirm it is the release, not the dependencies** — 30 seconds.
   `curl -s https://shopsphere-store-api.vercel.app/api/health`. If
   `checks.postgresql` or `checks.mongodb` is `false`, the deployment is probably
   innocent; check Supabase and Atlas status before rolling back.

2. **Roll the deployment back** — about 30 seconds, no rebuild. Vercel Dashboard
   → the affected project → **Deployments** → the last deployment marked **Ready**
   before the bad one → **⋯** → **Instant Rollback**.

3. **Re-point the published alias.** Instant Rollback moves the project's own
   production domain. The URLs in the links document are separate aliases, so
   they have to be moved onto the restored deployment too, or production keeps
   serving the broken build:
   `vercel alias set <restored-deployment-url> shopsphere-store-api.vercel.app`

4. **Confirm recovery** — 1 minute. Re-run the health check above and load
   `https://shopsphere-storefront.vercel.app`. Allow up to 5 minutes for
   UptimeRobot to report Up again.

5. **Revert the commit**, so the next merge does not redeploy the fault:
   `git revert <bad-commit-sha>` then `git push origin main`. A rollback changes
   what production serves; it does not change what `main` holds.

The API, storefront, review service, and jobs deploy independently, so only the
service that broke is rolled back. If the release contained a database migration,
roll the code back first, then fix forward with a corrective migration — do not
reverse a migration that has already accepted writes.
