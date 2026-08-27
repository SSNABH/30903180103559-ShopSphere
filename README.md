# DECI.Project

A complete bilingual electronics e-commerce platform built against the graduation-project rubric. It combines a React storefront and Admin Dashboard with an Express API, PostgreSQL/Prisma commerce data, MongoDB reviews and activity logs, automated email, comprehensive testing, and one-command Docker delivery.

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

All six implementation phases are complete and re-verified:

1. Project setup and architecture
2. Authentication and user management
3. Product and shopping features
4. Complete frontend and Admin Dashboard
5. Database and additional services
6. Testing and delivery preparation

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

| Role | Email | Password |
|---|---|---|
| Admin | `admin@deci-project.local` | `Admin123!` |
| Customer | `customer@deci-project.local` | `Customer123!` |

These are development/reviewer accounts created by the seed. They must be changed for a real deployment.

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
frontend/                 React application and frontend tests
backend/                  Express API and backend tests
backend/prisma/           PostgreSQL schema, migrations, and seed
backend/src/models/       MongoDB review and activity-log models
backend/uploads/          Runtime images; Docker volume mount
.github/workflows/        Continuous integration checks
docker-compose.yml        Full application orchestration
README.txt                Required plain-text submission guide
README.md                 GitHub documentation
```
