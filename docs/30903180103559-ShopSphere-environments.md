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
| `API_BASE_URL` | `http://localhost:5000/api` | preview alias | `https://shopsphere-store-api.vercel.app/api` |
| `REVIEW_SERVICE_URL` | `http://localhost:5100/api` | preview alias | `https://shopsphere-reviews.vercel.app/api` |
| `WEB_BASE_URL` | `http://localhost:3000` | per deployment | `https://shopsphere-storefront.vercel.app` |

## Seeing it without signing in to anything

The deploy pipeline's smoke job runs under the `production` environment and reads
its URLs from that environment's variables rather than hard-coding them, so a
misconfigured environment fails the run. See `.github/workflows/deploy.yml`.

Each running instance also reports which environment answered:

```
$ curl -s https://shopsphere-store-api.vercel.app/api/health
{"success":true,"project":"ShopSphere","status":"healthy","environment":"production", ...}
```

A preview deployment of the same code answers `"environment":"staging"`, and a
local container answers `"environment":"development"`.
