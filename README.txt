DECI.Project - Full-Stack Electronics E-Commerce Platform

GITHUB REPOSITORY
https://github.com/SSNABH/30903180103559-ShopSphere

PROJECT SUMMARY
DECI.Project is a complete bilingual electronics e-commerce platform. Customers can register, sign in, browse and search products, filter and sort the catalog, view product details and reviews, manage a persistent shopping cart, complete a simulated checkout, and review their orders. Administrators have protected tools for product, category, image, and inventory management, plus registered-user listing, review statistics, store statistics, and activity-log review.

The interface supports English and Arabic, left-to-right and right-to-left layouts, responsive screens, and persistent light and dark themes.

PROJECT STATUS
Task 1 - Project setup and architecture: COMPLETE
Task 2 - Authentication and user management: COMPLETE
Task 3 - Product and shopping features: COMPLETE
Task 4 - Frontend development: COMPLETE
Task 5 - Database and additional services: COMPLETE
Task 6 - Testing and project delivery preparation: COMPLETE

TECHNOLOGIES USED
Frontend:
- React 19 and Vite
- React Router
- Axios
- Context API
- TanStack React Query
- React Testing Library
- Vitest
- Mock Service Worker (MSW)

Backend:
- Node.js 22
- Express 5
- PostgreSQL
- Prisma ORM with the PostgreSQL driver adapter
- MongoDB and Mongoose
- JWT access and refresh authentication
- Nodemailer
- Multer
- Zod
- Jest
- Supertest

Delivery:
- Docker
- Docker Compose
- Nginx
- Mailpit
- Git and GitHub Actions

DOCKER QUICK START
Requirements:
- Docker Desktop, or Docker Engine with Docker Compose
- Ports 3000, 5000, 5432, 27017, and 8025 available, or overridden in .env

Steps:
1. Clone the repository.
2. In the repository root, copy .env.example to .env.
3. Replace the placeholder PostgreSQL password and JWT secrets in .env.
4. Run: docker compose up --build
5. Wait until the backend health check becomes healthy.
6. Open the Frontend URL listed below.

Docker Compose starts:
- React/Nginx frontend
- Express backend
- PostgreSQL
- MongoDB
- Mailpit email inbox

The backend automatically applies database migrations and runs the idempotent seed before starting the API.

PROJECT URLS
Frontend: http://localhost:3000
Backend: http://localhost:5000/api
Health Check: http://localhost:5000/api/health
Liveness Check: http://localhost:5000/api/health/live
Readiness Check: http://localhost:5000/api/health/ready
Mailpit Inbox: http://localhost:8025

TEST ACCOUNTS
These accounts are created by the included seed data.

Admin
Email: admin@deci-project.local
Password: Admin123!

Customer
Email: customer@deci-project.local
Password: Customer123!

LOCAL DEVELOPMENT WITHOUT DOCKER
Requirements:
- Node.js 22 or newer
- PostgreSQL
- MongoDB
- An SMTP server; Mailpit is recommended

Steps:
1. Copy backend/.env.example to backend/.env.
2. Copy frontend/.env.example to frontend/.env.
3. Update the database, MongoDB, JWT, SMTP, and frontend API values.
4. Run: npm run install:all
5. Generate Prisma Client: npm run prisma:generate --prefix backend
6. Run migrations: npm run db:migrate --prefix backend
7. Run seed data: npm run db:seed --prefix backend
8. Start the backend: npm run dev:backend
9. Start the frontend in another terminal: npm run dev:frontend

AUTOMATED TESTING
Run every automated check:
npm run verify

Backend Jest unit tests:
npm run test:unit --prefix backend

Backend Supertest integration tests:
npm run test:integration --prefix backend

Existing backend regression suite plus Jest and Supertest:
npm test --prefix backend

Frontend React Testing Library and MSW tests:
npm test --prefix frontend

Frontend production build:
npm run build --prefix frontend

Prisma schema validation:
npm run prisma:validate --prefix backend

Delivery structure verification:
npm run verify:delivery

TESTING COVERAGE
- Jest unit tests cover password hashing, JWT security, duration parsing, slug generation, cart totals, inventory validation, and order checkout behavior.
- Supertest integration tests execute authentication, Customer/Admin authorization, product listing and CRUD, cart totals and stock limits, and checkout inventory behavior through real Express routes, controllers, middleware, and services with injected test repositories.
- React Testing Library tests cover reusable loading/error/empty states, product cards, authentication-aware cart actions, expired-session synchronization, successful refresh retries, admin-user pagination, and Admin statistics cache refreshes.
- MSW intercepts authentication, user, catalog, category, and protected API requests for successful, failed, and partially available frontend states without requiring a live backend.
- The original backend integration and regression tests remain included for authentication, products, filters, images, carts, orders, MongoDB models, reviews, activity logs, welcome email contracts, statistics, seed data, and health endpoints.

KEY FEATURES
- Secure registration and login
- Salted scrypt password hashing
- JWT access tokens and HTTP-only refresh cookies
- Logout and password-change session invalidation
- Customer/Admin role-based access control
- User profile and password management
- Product and category CRUD
- Search, filtering, sorting, and pagination
- Multiple product image upload
- Persistent server-side cart
- Simulated atomic checkout and order history
- MongoDB product reviews and activity logs
- Nodemailer welcome email delivered to Mailpit
- Admin store statistics dashboard
- English/Arabic, LTR/RTL, light/dark, responsive frontend

ENVIRONMENT CONFIGURATION
Root .env controls Docker ports, PostgreSQL credentials, and JWT secrets.
backend/.env controls database connections, authentication, SMTP, CORS, and seed settings for local development.
frontend/.env controls VITE_API_BASE_URL.

Never commit a real .env file. Only .env.example files belong in Git.

IMPORTANT NOTES
- Checkout is intentionally simulated; no real payment provider or card data is used.
- Product images are stored in the backend uploads directory and persisted through a Docker volume.
- PostgreSQL stores relational commerce data. MongoDB stores reviews and activity logs.
- Mailpit is a development inbox used to verify welcome emails locally.
- Seed scripts are idempotent and can be run again safely.
- Test account passwords are development-only credentials and should be changed for a real deployment.
- The required GitHub repository name is: 30903180103559-ShopSphere
- The repository must be public and accessible without signing in.

REPOSITORY STRUCTURE
frontend/                 React application and component tests
backend/                  Express API, Prisma, MongoDB models, and backend tests
backend/prisma/           Schema, migrations, and seed
backend/uploads/          Runtime product images; contents are ignored except .gitkeep
.github/workflows/        Automated test, build, and Docker configuration checks
docker-compose.yml        One-command full-project orchestration
README.txt                Required plain-text reviewer documentation
README.md                 GitHub-formatted documentation
