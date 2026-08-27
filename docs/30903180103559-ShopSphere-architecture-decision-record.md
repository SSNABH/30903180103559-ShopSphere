# Architecture Decision Record — ShopSphere Modernization

**Student ID:** 30903180103559 · **Date:** 27 August 2026 · **Status:** Implemented

## Decision 1 — Reviews become an independently deployed service

**What moved.** The reviews feature left the monolith and now runs as the
ShopSphere Review Service at `shopsphere-reviews.vercel.app`, with its own
codebase, its own deployment, and sole ownership of the reviews collection. The
review controller, service, repository, and Mongo model were deleted from the
main API; its review routes now return 404.

**Why reviews were the right candidate.** The seam was already there. Reviews
were the only feature whose data lived in a different database — MongoDB, while
every commerce entity sits in PostgreSQL — so there were no foreign keys, no
joins, and no shared transactions binding reviews to orders, carts, or
products. The boundary did not have to be invented; it had to be recognised.

Three properties made the split worth doing:

- **Independent failure.** Reviews are supporting content, not the purchase
  path. A review outage should never stop a customer checking out, and now it
  cannot: admin statistics degrade to a null review count rather than failing.
- **Different load shape.** Review reads are frequent and cacheable; review
  writes are rare. That profile scales differently from checkout and no longer
  has to share its ceiling.
- **A narrow contract.** Reviews needed only two facts from the rest of the
  system — does this product exist, and who is calling — both small enough to
  express as REST calls rather than shared tables.

**The cost we accepted.** Two in-process function calls became network calls.
Product lookups now hit `GET /api/products/:identifier`, and caller identity is
resolved by forwarding the user's own token to `GET /api/users/me`. The second
choice is deliberate: the main application stays the single authority on
sessions, so the review service holds no JWT signing secret and no database
credential of its own. A deactivated account stops working in both services at
the same moment.

## Decision 2 — Abandoned-cart cleanup moves to a serverless function

**What moved.** A scheduled Vercel function at `shopsphere-jobs.vercel.app`
deletes carts untouched for 30 days, cascading to their items. It runs daily at
03:00 UTC and is deployed as its own project, separate from the API.

**Why serverless suits this workload specifically.** Three characteristics
point the same way. No user is waiting on it, so latency does not matter and it
never belongs in a request path. It runs for under a second, once a day —
roughly 0.001% of the time an always-on process would spend idle waiting for
it. And it is stateless and idempotent: running it twice deletes nothing extra,
which is exactly the safety property that makes retries harmless.

The alternative — a cron inside the API container — would have tied a
maintenance task to the uptime of a user-facing service and duplicated the work
on every replica.

**The cost we accepted.** The endpoint is reachable over HTTP, so it is guarded
by a bearer secret that Vercel supplies on scheduled invocations; an
unauthenticated request is rejected before any query runs.
