# Logging and Operations — ShopSphere

**Student ID:** 30903180103559

## Where the logs are read in production

**Vercel Dashboard → the project → the Logs tab.**

Each service writes to its own project's log stream:

| Service | Vercel project |
|---|---|
| Main API | `shopsphere-store-api` |
| Review service | `shopsphere-reviews` |
| Scheduled jobs | `shopsphere-jobs` |

Every line is a single JSON object, so the Logs tab's search box filters on any
field in it — `"level":"error"` for failures, a `url` for one endpoint, a
`statusCode` for a class of response.

## What an entry looks like

Requests and errors both carry a `time` and a `level`. A successful request:

```json
{
  "level": "info",
  "time": "2026-08-27T05:43:10.135Z",
  "service": "shopsphere-api",
  "env": "production",
  "msg": "GET /api 200",
  "req": { "id": 1, "method": "GET", "url": "/api", "remoteAddress": "::1" },
  "res": { "statusCode": 200 }
}
```

An error:

```json
{
  "level": "error",
  "time": "2026-08-27T05:43:10.277Z",
  "service": "shopsphere-api",
  "code": "P1001",
  "statusCode": 500,
  "method": "GET",
  "url": "/api/products",
  "msg": "Unhandled error: Can't reach database server"
}
```

## Severity levels and what they mean here

| Level | Used for |
|---|---|
| `error` | 5xx responses and unhandled exceptions — a fault on our side |
| `warn` | 4xx responses — the request was refused, which is the system working |
| `info` | Successful requests |
| `debug` | Health checks, which run every five minutes and would otherwise bury real traffic |

The distinction matters when a release goes wrong: a rise in `error` means the
deployment broke something, while a rise in `warn` usually means a client is
misbehaving. Filtering on `"level":"error"` is the first thing to do when the
monitor reports the service down.

## What is never written to a log

Authorization headers, cookies, and any `password`, `currentPassword`, or
`newPassword` field are replaced with `[redacted]` before the entry is
serialised. A log that leaks a session token is worse than no log at all, and
criterion 4.1 requires that no credential appears in the pipeline run logs
either.

Verified: a login attempt with a known password string produced zero
occurrences of that string anywhere in the log output.

## Reading logs from the command line

```bash
npx vercel logs shopsphere-store-api.vercel.app
```

Add `--follow` to stream them live while reproducing a problem.
