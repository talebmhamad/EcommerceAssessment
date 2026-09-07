# Ecommerce Assessment

A TypeScript npm monorepo for a mini e-commerce assessment. The repository is split into an independently runnable Next.js frontend and Express backend, with PostgreSQL as the source of truth for users, products, cart, wishlist, and orders.

## Architecture

- `frontend`: Next.js App Router application. It owns pages, shared UI, TanStack Query state, protected-route behavior, and a typed API service layer.
- `backend`: Express API. It owns authentication, validation, business rules, Prisma database access, centralized logging, and safe error responses.
- `backend/src/modules`: feature modules for auth, products, cart, wishlist, checkout, orders, and health.
- `backend/prisma`: Prisma schema, committed migrations, deterministic seed data, and Prisma 7 config.

The frontend does not calculate authoritative prices, totals, stock, or user ownership. It sends only user choices such as selected IDs and quantities. The backend derives the authenticated user from the verified JWT, reads current database state, validates stock and ownership, and calculates all prices/totals.

## Prerequisites

- Node.js 20.19+, 22.12+, or 24+
- npm 11+
- PostgreSQL available locally or through a managed database

## Install Dependencies

```bash
npm install
```

## Environment Setup

Create a local root `.env` file from the tracked example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Update `.env` with local-only values:

```env
NODE_ENV=development
BACKEND_PORT=5000
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000
DATABASE_URL="postgresql://postgres:your_url_encoded_password@localhost:5432/ecommerce_assessment?schema=public&sslmode=disable"
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
JWT_EXPIRES_IN=1h
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

`.env` and other real environment files are ignored by Git. Keep `.env.example` fake and safe to commit.

## Database Setup

Create a PostgreSQL database named `ecommerce_assessment` or update `DATABASE_URL` to point at your chosen local database.

Generate Prisma Client:

```bash
npm run db:generate
```

Validate Prisma schema:

```bash
npm run db:validate
```

Apply committed migrations:

```bash
npm run db:migrate:deploy
```

For local development where you also want Prisma to check migration drift:

```bash
npm run db:migrate
```

Seed the demo user and deterministic catalog:

```bash
npm run db:seed
```

The seed is idempotent. It upserts one demo user and exactly 15 managed products with 25 variants, including 5 multi-variant products.

Demo credentials:

```text
Email: demo@ecommerce.local
Password: DemoUser@2026
```

## Run The Apps

Run frontend and backend together:

```bash
npm run dev
```

Run separately:

```bash
npm run dev:frontend
npm run dev:backend
```

Default local URLs:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:5000/api
```

If port `3000` is already in use, Next.js may offer another frontend port. Update `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` if you want the backend to accept that alternate origin.

## Application Features

- JWT login for the seeded demo user.
- Protected product listing and product detail pages.
- Product variants with stock-aware selection.
- PostgreSQL-backed cart with add, update quantity, change variant, remove, subtotals, and total.
- PostgreSQL-backed wishlist with add/list/remove and duplicate prevention.
- Checkout validation and transactional checkout.
- Order creation with order-item snapshots.
- Order confirmation page backed by secure user-owned order lookup.
- Shared navigation, loading states, error states, empty states, and responsive UI.

## API Shape

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

Errors are normalized by the global error middleware. Stack traces, Prisma internals, credentials, passwords, password hashes, tokens, and connection strings are not returned to clients.

## Quality Commands

Run everything:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Run by workspace:

```bash
npm run lint:frontend
npm run lint:backend
npm run typecheck:frontend
npm run typecheck:backend
npm run test:frontend
npm run test:backend
npm run build:frontend
npm run build:backend
```

Backend integration tests require a separate PostgreSQL test database. Set `TEST_DATABASE_URL` to a database whose name contains `test`; the test suite refuses to run against any other database name.

```bash
TEST_DATABASE_URL="postgresql://postgres:fake_password@localhost:5432/ecommerce_assessment_test?schema=public&sslmode=disable" npm run test:backend
```

On PowerShell:

```powershell
$env:TEST_DATABASE_URL="postgresql://postgres:fake_password@localhost:5432/ecommerce_assessment_test?schema=public&sslmode=disable"
npm run test:backend
Remove-Item Env:\TEST_DATABASE_URL
```

Frontend tests mock API requests and exercise user-visible behavior/state helpers without browser automation.

## Fresh Clone Checklist

From a clean clone:

1. Run `npm install`.
2. Create `.env` from `.env.example` and fill local database/JWT values.
3. Create the PostgreSQL database named in `DATABASE_URL`.
4. Run `npm run db:generate`.
5. Run `npm run db:validate`.
6. Run `npm run db:migrate:deploy`.
7. Run `npm run db:seed`.
8. Run `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.

No real secrets or local `.env` files are required in Git. The tracked lockfile, Prisma schema, migrations, migration lock file, and workspace package files are enough to reproduce install/build after local environment setup.
