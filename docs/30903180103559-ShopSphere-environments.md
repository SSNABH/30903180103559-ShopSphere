# Environments — ShopSphere

**Student ID:** 30903180103559

ShopSphere is configured for three environments. Each one carries its own set of
environment variables, and no value is shared between them: the three databases,
the three CORS origins, and the three JWT signing secrets are all distinct.

| Environment | Where it runs | Vercel target | Serves |
|---|---|---|---|
| **development** | The developer's machine, via Docker Compose | `Development` | `localhost` |
| **staging** | Vercel preview deployments, one per pull request | `Preview` | `*-shady-79d4.vercel.app` |
| **production** | The deployment published in the links document | `Production` | `shopsphere-storefront.vercel.app` |

**Naming note.** Vercel calls its middle target *Preview*. That target is this
project's **staging** environment: every pull request is built and deployed into
it with its own variables before anything is allowed to reach production.

## Which variables each environment holds

Values are stored on the hosting platform and marked sensitive, so only the names
appear here. Nothing below is written into the repository.

**Vercel — `shopsphere-store-api` project (Settings → Environment Variables)**

| Variable | development | staging | production |
|---|:--:|:--:|:--:|
| `DATABASE_URL` | ✓ | ✓ | ✓ |
| `MONGODB_URI` | ✓ | ✓ | ✓ |
| `JWT_ACCESS_SECRET` | ✓ | ✓ | ✓ |
| `JWT_REFRESH_SECRET` | ✓ | ✓ | ✓ |
| `CORS_ORIGIN` | ✓ | ✓ | ✓ |
| `REVIEW_SERVICE_URL` | ✓ | ✓ | ✓ |
| `LOG_LEVEL` | ✓ | ✓ | ✓ |
| `DATABASE_CONNECTION_REQUIRED` | ✓ | ✓ | ✓ |
| `JWT_ACCESS_EXPIRES_IN` | | | ✓ |
| `JWT_REFRESH_EXPIRES_IN` | | | ✓ |

**GitHub — repository → Settings → Environments**

The same three environments exist on the repository, each with its own
variables, so the split is visible outside the hosting dashboard as well:

| Variable | development | staging | production |
|---|---|---|---|
| `APP_ENV` | `development` | `staging` | `production` |
| `LOG_LEVEL` | `debug` | `debug` | `info` |
| `API_BASE_URL` | `http://localhost:5000/api` | `https://shopsphere-store-api-shady-79d4.vercel.app/api` | `https://shopsphere-store-api.vercel.app/api` |
| `REVIEW_SERVICE_URL` | `http://localhost:5100/api` | `https://shopsphere-reviews-shady-79d4.vercel.app/api` | `https://shopsphere-reviews.vercel.app/api` |
| `WEB_BASE_URL` | `http://localhost:3000` | — | `https://shopsphere-storefront.vercel.app` |
| `VERCEL_TARGET` | — | `preview` | `production` |

Two of the cells are deliberately empty. `staging` carries no `WEB_BASE_URL`
because a preview storefront is given a fresh URL per deployment, so there is no
fixed address to record; the smoke job that reads `WEB_BASE_URL` runs only under
`production`. `development` carries no `VERCEL_TARGET` because it never deploys
to Vercel — it runs under Docker Compose on the developer's machine.

## Seeing it without signing in to anything

The deploy pipeline's smoke job runs under the `production` environment and reads
its URLs from that environment's variables rather than hard-coding them, so a
misconfigured environment fails the run. See `.github/workflows/deploy.yml`.

Each running instance also reports which environment answered:

```
$ curl -s https://shopsphere-store-api.vercel.app/api/health
{"success":true,"project":"DECI.Project","status":"healthy","environment":"production", ...}
```

A preview deployment of the same code answers `"environment":"staging"`, and a
local container answers `"environment":"development"`.

## One caution about sensitive variables

The storefront's `VITE_API_BASE_URL` and `VITE_REVIEW_SERVICE_URL` are stored as
**non-sensitive**, deliberately. They are compiled into public client JavaScript,
so they are not secrets — and a variable marked Sensitive cannot be read back by
`vercel pull`, which writes the literal string `[SENSITIVE]` in its place. Vite
then compiles that string in as the API address: the page still loads, but every
request it makes goes nowhere. The pipeline's smoke job now downloads the
deployed bundle and fails the release if that string appears in it, or if the
two URLs above do not.
