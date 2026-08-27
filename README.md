# 30903180103559-ShopSphere

**ShopSphere Enterprise Production and Cloud Modernization**
Digital Egypt Cubs Initiative — Level 5 final project · Student ID 30903180103559

ShopSphere is a bilingual electronics e-commerce platform: a React storefront and
Admin Dashboard over an Express API, with commerce data in PostgreSQL on Supabase
and reviews in MongoDB. This repository holds that platform prepared for
production — deployed, secured, monitored, split into an independently deployed
review service and a serverless job, and released through a CI/CD pipeline.

> **Start here:** [**30903180103559-ShopSphere.md**](30903180103559-ShopSphere.md)
> is the project links document. It carries the application, review service, and
> repository URLs, the reviewer accounts, and a map of where each task is
> evidenced.

The storefront was built in the first semester under the working name
*DECI.Project*. Some seeded product data, order numbers, and e-mail templates
still carry that name; the platform, this repository, and every submitted
document are ShopSphere.

## Where production logs are read

Requests and errors are emitted as structured JSON carrying a timestamp and a
severity level. In production they are read in the **Vercel Dashboard, in the
project's Logs tab** — `shopsphere-store-api` for the main API,
`shopsphere-reviews` for the review service, and `shopsphere-jobs` for the
scheduled cleanup. Because each line is one JSON object, the search box filters
on any field: `"level":"error"` for failures, a `url` for one endpoint.

Full detail, including the severity levels and what is redacted, is in
[docs/30903180103559-ShopSphere-logging-and-operations.md](docs/30903180103559-ShopSphere-logging-and-operations.md).

## Project status

All four tasks of the Level 5 project are complete.

| Task | Deliverable | Evidence |
|---|---|---|
| **1 — Production Deployment** | Frontend, API, Supabase PostgreSQL, HTTPS/CORS/Helmet/rate limiting, health check on UptimeRobot | [links document](30903180103559-ShopSphere.md) |
| **2 — Cloud Preparation** | Architecture diagram, service classification, two-namespace Kubernetes simulation | [diagram](docs/30903180103559-ShopSphere-architecture.svg) · [classification](docs/30903180103559-ShopSphere-cloud-service-classification.md) · [namespace evidence](docs/30903180103559-ShopSphere-namespace-simulation-evidence.md) · [`k8s/`](k8s/) |
| **3 — Application Modernization** | Reviews extracted into their own deployed service, serverless cleanup job, ADR | [ADR](docs/30903180103559-ShopSphere-architecture-decision-record.md) · [job evidence](docs/30903180103559-ShopSphere-serverless-job-evidence.md) · [`review-service/`](review-service/) · [`jobs/`](jobs/) |
| **4 — Production Operations** | GitHub Actions pipeline, three environments, structured logging, rollback plan | [pipeline](.github/workflows/deploy.yml) · [environments](docs/30903180103559-ShopSphere-environments.md) · [logging](docs/30903180103559-ShopSphere-logging-and-operations.md) · [rollback plan](docs/30903180103559-ShopSphere-rollback-plan.md) |

The first-semester implementation phases this platform grew out of — setup,
authentication, catalog and cart, frontend, database services, and testing — are
all complete and still covered by the test suite below.

## Main capabilities

### Customer experience

- Registration, login, logout, profile editing, and password changes
- JWT access sessions with HTTP-only refresh cookies
- Product search, filters, sorting, pagination, and dynamic details
- Product galleries and customer reviews
- Persistent server-side shopping cart
- Simulated atomic checkout and order history
- English/Arabic, LTR/RTL, light/dark, responsive interface

### Admin experience

- Protected Admin Dashboard
- Category and product CRUD
- Product image and inventory management
- Registered-user review
- PostgreSQL/MongoDB store statistics
- MongoDB activity-log review

### Supporting services

- PostgreSQL and Prisma for relational commerce data
- MongoDB and Mongoose for product reviews and activity logs
- Idempotent seed data with reviewer accounts and sample catalog data
- Nodemailer welcome messages delivered to Mailpit
- Persistent Docker volumes for databases and uploaded images

## Technologies

| Area | Technologies |
|---|---|
| Frontend | React 19, Vite, React Router, Axios, Context API, TanStack React Query |
| Backend | Node.js 22, Express 5, Zod, Multer, JWT, Nodemailer |
| Data | PostgreSQL, Prisma, MongoDB, Mongoose |
| Backend testing | Jest, Supertest, Node regression tests |
| Frontend testing | Vitest, React Testing Library, jest-dom, MSW |
| Delivery | Docker, Docker Compose, Nginx, Mailpit, GitHub Actions |

## Docker quick start

```bash
cp .env.example .env
# Replace the placeholder PostgreSQL password and JWT secrets.
docker compose up --build
```

The backend applies migrations and runs the idempotent seed before starting.

### Project URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000/api |
| Health check | http://localhost:5000/api/health |
| Liveness check | http://localhost:5000/api/health/live |
| Readiness check | http://localhost:5000/api/health/ready |
| Mailpit inbox | http://localhost:8025 |

## Seeded reviewer accounts

These are the defaults created by the seed for a **local** run:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@deci-project.local` | `Admin123!` |
| Customer | `customer@deci-project.local` | `Customer123!` |

The **production** reviewer accounts are different and are listed in the
[links document](30903180103559-ShopSphere.md). Both sets are evaluation
accounts and would be removed before a real launch.

## Automated verification

Run the complete project gate:

```bash
npm run install:all
npm run prisma:generate --prefix backend
npm run verify
```

Individual checks:

```bash
# Jest unit tests
npm run test:unit --prefix backend

# Supertest integration tests
npm run test:integration --prefix backend

# Complete backend regression suite
npm test --prefix backend

# React Testing Library + MSW
npm test --prefix frontend

# Production build
npm run build --prefix frontend

# Prisma validation
npm run prisma:validate --prefix backend

# Required delivery files and tracked-file hygiene
npm run verify:delivery
```

### Test design

- **Jest unit tests:** password hashing, JWT security, durations, slugs, cart calculations, stock validation, and checkout behavior.
- **Supertest integration tests:** authentication, Customer/Admin authorization, product CRUD, catalog discovery, server-side carts, stock validation, and checkout behavior through real Express layers with injected repositories.
- **React Testing Library:** accessible asynchronous states, product rendering, authentication-aware cart actions, expired-session synchronization, refresh retry behavior, user pagination, and Admin cache synchronization.
- **MSW:** successful, failed, and partially available authentication, user, category, and product API responses without a running backend.
- **Regression tests:** authentication, product CRUD, discovery, uploads, cart, checkout, data models, reviews, logs, email, statistics, seed data, and health behavior.

GitHub Actions repeats tests, linting, Prisma validation, the production build, Docker Compose validation, and image builds after the repository is published.

## Local development without Docker

1. Copy `backend/.env.example` to `backend/.env`.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Configure PostgreSQL, MongoDB, JWT secrets, SMTP, CORS, and `VITE_API_BASE_URL`.
4. Run:

```bash
npm run install:all
npm run prisma:generate --prefix backend
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
npm run dev:backend
```

5. In another terminal:

```bash
npm run dev:frontend
```

## Repository structure

```text
30903180103559-ShopSphere.md   Project links document — the submission entry point
frontend/                 React application and frontend tests
backend/                  Express API and backend tests
backend/prisma/           PostgreSQL schema, migrations, and seed
backend/src/models/       MongoDB activity-log model
backend/src/clients/      REST client for the extracted review service
backend/uploads/          Runtime images; Docker volume mount
review-service/           Independently deployed review service
jobs/                     Serverless scheduled jobs (abandoned-cart cleanup)
k8s/                      Namespace simulation manifests and deploy script
docs/                     Diagram, classification, ADR, rollback, logging, environments
.github/workflows/        Continuous integration and the production pipeline
docker-compose.yml        Full application orchestration
README.txt                Required plain-text submission guide
README.md                 GitHub documentation
```
