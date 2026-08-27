# Serverless Function — Evidence

**Student ID:** 30903180103559
**Function:** abandoned-cart cleanup · **Project:** `shopsphere-jobs` on Vercel

Criterion 3.3 asks for a serverless function that is deployed on Vercel, executes
successfully, and performs work outside the main application. Each is shown below.

---

## 1. It is deployed on Vercel, as its own project

The function lives in its own repository directory and its own Vercel project,
separate from the API and the storefront:

| | |
|---|---|
| Source | [`jobs/api/cleanup-carts.js`](../jobs/api/cleanup-carts.js) |
| Schedule | [`jobs/vercel.json`](../jobs/vercel.json) — `"schedule": "0 3 * * *"` |
| Deployment | `https://shopsphere-jobs.vercel.app` |

```json
{ "crons": [ { "path": "/api/cleanup-carts", "schedule": "0 3 * * *" } ] }
```

---

## 2. It executes successfully

`/api/cleanup-carts` deletes rows, so it is guarded by a bearer secret that
Vercel supplies on scheduled invocations and returns `401` to anyone else. To
make the execution verifiable without access to this Vercel account,
`/api/status` runs the same function, in the same serverless runtime, over the
same Supabase connection, and answers the same question the cleanup asks —
without deleting anything.

**Anyone can run this:**

```
$ curl -s https://shopsphere-jobs.vercel.app/api/status
{"success":true,"job":"cleanup-carts","mode":"status","schedule":"daily at 03:00 UTC",
 "abandonedAfterDays":30,"totalCarts":2,"abandonedCarts":0,"abandonedItems":0,
 "durationMs":695,"ranAt":"2026-08-27T13:03:13.018Z"}
```

The function connected to PostgreSQL on Supabase, ran its query against the real
`Cart` and `CartItem` tables, and returned in 695 ms. `abandonedCarts: 0` is the
correct answer today: the store was seeded this month, so no cart is yet 30 days
old and the next scheduled run has nothing to delete.

The destructive endpoint stays protected:

```
$ curl -s -o /dev/null -w "%{http_code}\n" https://shopsphere-jobs.vercel.app/api/cleanup-carts
401
```

**The same execution in the logs** (Vercel Dashboard → `shopsphere-jobs` → Logs):

```
16:03:12.09  shopsphere-jobs.vercel.app  info   λ GET /api/status
{"time":"2026-08-27T13:03:13.018Z","level":"info","service":"shopsphere-jobs",
 "job":"cleanup-carts-status","message":"Cleanup status executed",
 "abandoned_carts":0,"abandoned_items":0,"total_carts":2,"durationMs":695}
```

---

## 3. The work runs outside the main application

The cleanup is not reachable from the API and shares nothing with it at runtime:

- It is a **separate Vercel project** with its own deployment and its own
  environment variables (`DATABASE_URL`, `CRON_SECRET`), not a route on
  `shopsphere-store-api`.
- It has its own `package.json` whose only dependency is `pg`. It does not import
  Express, Prisma, or any backend module.
- It talks to PostgreSQL **directly** rather than through the API, so deleting a
  cart does not consume a request slot on the user-facing service.
- It is invoked **by a clock, not by a user**. Nothing in the storefront or the
  API can trigger it.

Taking the API down would not stop this job, and running this job cannot slow a
checkout. That separation is the point of moving it to serverless, and the
reasoning is recorded in the
[architecture decision record](30903180103559-ShopSphere-architecture-decision-record.md).
