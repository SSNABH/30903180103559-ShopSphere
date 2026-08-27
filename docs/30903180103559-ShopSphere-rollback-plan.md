# Rollback Plan — ShopSphere

**Student ID:** 30903180103559 · **Applies to:** production deployments on Vercel

## How a failed release is detected

**UptimeRobot** monitors `https://shopsphere-store-api.vercel.app/api/health`
every 5 minutes. That endpoint runs `SELECT 1` against Supabase and checks the
MongoDB connection, so it returns **503** when either database is unreachable
and **200** only when the whole stack is healthy. Status page:
`https://stats.uptimerobot.com/LBmw2iOvH5`

Three signals, in the order they usually arrive:

1. **The pipeline's smoke job fails.** After deploying, the workflow curls the
   API health, review service health, and storefront. A non-200 fails the run
   immediately — this catches most bad releases within a minute.
2. **UptimeRobot alerts.** The monitor flips to Down and emails. This is the
   safety net for a release that passed the smoke check but broke afterwards.
3. **Error rate rises in the logs.** Vercel Dashboard → project → Logs,
   filtered on `"level":"error"`. Use this to confirm the cause, not to detect.

## Steps to restore the previous working version

**1. Confirm it is the release, not the dependencies.** (30 seconds)

```bash
curl -s https://shopsphere-store-api.vercel.app/api/health
```

If `checks.postgresql` or `checks.mongodb` is `false`, the deployment is
probably innocent — check Supabase and Atlas status before rolling back.

**2. Roll back in the Vercel dashboard.** (about 30 seconds, no rebuild)

- Open the affected project → **Deployments**
- Find the last deployment marked **Ready** before the bad one
- Open its **⋯** menu → **Instant Rollback** → confirm

Vercel re-points the production alias at the previous build. Nothing is
rebuilt, so this takes effect in seconds.

Or from the command line:

```bash
vercel rollback <previous-deployment-url> --token=$VERCEL_TOKEN
```

**3. Roll back only the service that broke.** The API, storefront, review
service, and jobs deploy independently, so a bad API release does not require
rolling back the storefront.

**4. Confirm recovery.** (1 minute)

```bash
curl -s https://shopsphere-store-api.vercel.app/api/health
curl -s -o /dev/null -w "%{http_code}\n" https://shopsphere-storefront.vercel.app
```

Wait for UptimeRobot to report Up again, which takes up to 5 minutes.

**5. Revert the commit so the next deploy does not reintroduce the fault.**

```bash
git revert <bad-commit-sha>
git push origin main
```

A rollback changes what production serves; it does not change what `main`
holds. Without this step, the next merge redeploys the same broken code.

## If a database migration was part of the release

Instant Rollback restores code, not schema. If the release included a
migration, roll the code back first to stop the bleeding, then apply a
corrective migration forward. Do not attempt to reverse a migration that has
already accepted writes.
