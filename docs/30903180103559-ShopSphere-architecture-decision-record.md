# Architecture Decision Record — ShopSphere Modernization

**Student ID:** 30903180103559 · **Date:** 27 August 2026 · **Status:** Implemented

## Decision 1 — Reviews become an independently deployed service

**What moved.** The reviews feature left the monolith and now runs as the
ShopSphere Review Service at `shopsphere-reviews.vercel.app`, with its own
codebase, its own deployment, and sole ownership of the reviews collection. The
review controller, service, repository, and Mongo model were deleted from the
main API, whose review routes now return 404.

**Why reviews were the right candidate.** The seam was already there. Reviews
were the only feature whose data lived in a different database — MongoDB, while
every commerce entity sits in PostgreSQL — so no foreign key, join, or shared
transaction bound reviews to orders, carts, or products. The boundary did not
have to be invented, only recognised. Three properties made the split worth
doing: reviews are supporting content rather than the purchase path, so a review
outage can no longer stop a customer checking out; review reads are frequent and
cacheable while writes are rare, a profile that no longer shares checkout's
ceiling; and reviews need only two facts from the rest of the system — does this
product exist, and who is calling — both small enough to express as REST calls.

**The cost accepted.** Two in-process calls became network calls, and caller
identity is resolved by forwarding the user's own token to the main API. That
keeps the main application the single authority on sessions, so the review
service holds no JWT signing secret and no database credential of its own.

## Decision 2 — Abandoned-cart cleanup moves to a serverless function

**What moved.** A scheduled Vercel function at `shopsphere-jobs.vercel.app`
deletes carts untouched for 30 days, cascading to their items. It runs daily at
03:00 UTC, deployed as its own project, separate from the API.

**Why serverless suits this workload.** No user waits on it, so it never belongs
in a request path. It runs for under a second, once a day, where an always-on
process would spend effectively all of its life idle. And it is stateless and
idempotent, so running it twice deletes nothing extra, which is what makes
retries harmless. The alternative — a cron inside the API container — would tie
a maintenance task to the uptime of a user-facing service and duplicate the work
on every replica.

**The cost accepted.** The endpoint is reachable over HTTP, so it is guarded by a
bearer secret that Vercel supplies on scheduled invocations; an unauthenticated
request is rejected before any query runs.
