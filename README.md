# Ecommerce Assessment

A TypeScript npm monorepo for a small e-commerce assessment. The app is split into a Next.js frontend and an Express backend. PostgreSQL is the source of truth for users, products, variants, cart items, wishlist items, orders, and order items.

## Technology Stack

- Frontend: Next.js App Router, React, TypeScript, TanStack Query, Tailwind CSS, and a typed API service layer.
- Backend: Node.js, Express, TypeScript, Zod validation, JWT authentication, bcrypt password hashing, Pino logging, and Prisma.
- Database: PostgreSQL with committed Prisma migrations and deterministic seed data.
- Package management: npm workspaces from the repository root.

## Repository Structure

- `frontend`: Next.js application, protected pages, shared UI, auth provider, query keys, and frontend API client.
- `backend`: Express API, feature modules, validation, business services, Prisma database access, and centralized error handling.
- `backend/src/modules`: auth, products, cart, wishlist, checkout, orders, and health modules.
- `backend/prisma`: Prisma schema, Prisma 7 config, migrations, seed script, and seed catalog data.
- `docs`: supporting project documentation, including [database architecture](docs/database-architecture.md).

The frontend sends user choices such as selected IDs and quantities. The backend derives the user from the verified JWT, enforces ownership and stock rules, reads current database prices, and calculates all totals.

## Prerequisites

- Node.js 20.19+, 22.12+, or 24+.
- npm 11.x. The root `package.json` declares `npm@11.9.0`.
- PostgreSQL 14+ available locally or through a managed database.

## Install Dependencies

From the repository root, install all workspace dependencies:

```bash
npm install
```

The root install covers both workspaces. To install only one workspace after changing dependencies, use:

```bash
npm install --workspace frontend
npm install --workspace backend
```

## Environment Setup

Create the backend and Prisma environment file from the tracked example:

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

The backend and Prisma commands read the root `.env`. Next.js reads frontend-local environment files or inherited shell variables. If the frontend API URL differs from the default, create `frontend/.env.local` with only the public frontend value:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

Keep `.env`, `frontend/.env.local`, and other real environment files local. They are ignored by Git.

### Environment Variables

Backend and Prisma variables:

- `NODE_ENV`: `development`, `test`, or `production`. Defaults to development behavior when not overridden.
- `BACKEND_PORT`: port used by the Express server. The default is `5000`.
- `FRONTEND_URL`: primary frontend origin used for CORS defaults, such as `http://localhost:3000`.
- `CORS_ALLOWED_ORIGINS`: optional comma-separated list of allowed frontend origins. Use this when Next.js runs on an alternate port.
- `DATABASE_URL`: PostgreSQL connection URL for Prisma and the backend. Use a local database URL, not a committed secret.
- `JWT_SECRET`: private signing secret for JWTs. Use a long random value of at least 32 characters.
- `JWT_EXPIRES_IN`: JWT lifetime such as `15m`, `1h`, or `7d`.

Frontend variable:

- `NEXT_PUBLIC_API_BASE_URL`: browser-visible API base URL. The app defaults to `http://localhost:5000/api` if it is not set.

The tracked `.env.example` uses fake local assessment values only.

## Database Setup

Create a PostgreSQL database named `ecommerce_assessment`. From `psql`, one simple local setup is:

```sql
CREATE DATABASE ecommerce_assessment;
```

Then update `DATABASE_URL` in `.env` to point to that database.

Generate Prisma Client:

```bash
npm run db:generate
```

Validate the Prisma schema:

```bash
npm run db:validate
```

Apply committed migrations in a fresh local database:

```bash
npm run db:migrate:deploy
```

For local development, Prisma can also create and apply a new migration:

```bash
npm run db:migrate -- --name your_migration_name
```

Format the Prisma schema:

```bash
npm run db:format
```

Seed the demo user and deterministic catalog:

```bash
npm run db:seed
```

Open Prisma Studio:

```bash
npm run db:studio
```

The seed is idempotent. It upserts one public assessment demo user and exactly 15 managed products with 25 variants, including 5 multi-variant products.

Demo login credentials defined in `backend/prisma/seed.ts`:

```text
Email: demo@ecommerce.local
Password: DemoUser@2026
```

## Run The Apps

Run frontend and backend together from the root:

```bash
npm run dev
```

Run only the frontend:

```bash
npm run dev:frontend
```

Run only the backend:

```bash
npm run dev:backend
```

Default local URLs:

```text
Frontend: http://localhost:3000
Backend API: http://localhost:5000/api
```

If port `3000` is already in use, Next.js may use another frontend port. Add that origin to `CORS_ALLOWED_ORIGINS` so the backend accepts browser requests from the alternate port.

## Health Endpoints

The backend exposes unauthenticated health checks:

- `GET /api/health`: process health, service name, environment, and timestamp.
- `GET /api/health/ready`: database readiness. Returns `200` when PostgreSQL is reachable and `503` when it is not.

## Quality Commands

Run both workspaces from the root:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Run frontend only:

```bash
npm run lint:frontend
npm run typecheck:frontend
npm run test:frontend
npm run build:frontend
```

Run backend only:

```bash
npm run lint:backend
npm run typecheck:backend
npm run test:backend
npm run build:backend
```

Backend integration tests require a separate migrated PostgreSQL test database. The test runner refuses to run unless `TEST_DATABASE_URL` contains `test`.

Bash:

```bash
TEST_DATABASE_URL="postgresql://postgres:fake_password@localhost:5432/ecommerce_assessment_test?schema=public&sslmode=disable" npm run test:backend
```

PowerShell:

```powershell
$env:TEST_DATABASE_URL="postgresql://postgres:fake_password@localhost:5432/ecommerce_assessment_test?schema=public&sslmode=disable"
npm run test:backend
Remove-Item Env:\TEST_DATABASE_URL
```

Frontend tests mock API requests and check user-visible behavior without browser automation.

## Application Features

- JWT login for the seeded demo user.
- Protected product listing and product detail pages.
- Product variants with stock-aware selection.
- PostgreSQL-backed cart with add, quantity update, variant change, removal, subtotals, and total.
- PostgreSQL-backed wishlist with add, list, remove, and duplicate prevention.
- Checkout validation and transactional checkout.
- Order creation with checkout-time order item snapshots.
- Secure order confirmation page.
- Shared navigation, loading states, error states, empty states, and responsive UI.

## API Response Shape

Successful responses:

```json
{
  "success": true,
  "data": {}
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [{ "field": "email", "message": "A valid email is required." }],
    "requestId": "correlation-id"
  }
}
```

Errors are normalized by the global error middleware. Stack traces, Prisma internals, credentials, password hashes, tokens, and connection strings are not returned to clients.

## Fresh Clone Checklist

1. Run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set local `DATABASE_URL` and `JWT_SECRET`.
4. Create the PostgreSQL database named in `DATABASE_URL`.
5. Run `npm run db:generate`.
6. Run `npm run db:validate`.
7. Run `npm run db:migrate:deploy`.
8. Run `npm run db:seed`.
9. Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.

No real secrets or local environment files are required in Git. The tracked lockfile, package files, Prisma schema, migrations, migration lock file, and configuration files are enough to reproduce the project after local environment setup.
