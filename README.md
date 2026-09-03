# Ecommerce Assessment

Phase 1 foundation for a mini e-commerce platform. This repository is a TypeScript npm monorepo with an independently runnable Next.js frontend and Express backend.

Authentication, product APIs, cart APIs, wishlist APIs, checkout, and business seed data are intentionally deferred to later tasks.

## Architecture

The project uses a modular monolith structure. That keeps the current assessment simple to operate while giving future ERP-style modules clear boundaries.

- `frontend`: Next.js App Router application with centralized public config and a small API service layer.
- `backend`: Express application with separated app creation and server startup, centralized configuration, request middleware, and isolated modules.
- `backend/src/modules`: feature modules own routes, controllers, services, and types.
- `backend/src/infrastructure`: technical integrations such as the Prisma database layer.
- `backend/prisma`: Prisma schema, migration directory, and seed entry point.

## Folder Structure

```text
.
|-- frontend/
|   `-- src/
|       |-- app/
|       |-- components/
|       |-- config/
|       |-- features/
|       |-- hooks/
|       |-- lib/
|       |-- services/
|       `-- types/
|-- backend/
|   |-- prisma/
|   |   |-- migrations/
|   |   |-- schema.prisma
|   |   `-- seed.ts
|   |-- prisma7.config.ts
|   `-- src/
|       |-- app.ts
|       |-- server.ts
|       |-- config/
|       |-- infrastructure/
|       |   `-- database/
|       |-- middleware/
|       |-- modules/
|       |   `-- health/
|       |-- shared/
|       `-- validation/
|-- .env.example
|-- .gitignore
|-- package-lock.json
|-- package.json
`-- README.md
```

## Prerequisites

- Node.js 20.19+, 22.12+, or 24+
- npm 11+
- PostgreSQL installed locally or available through a managed PostgreSQL database

Prisma ORM 7.10.0 is used. Prisma supports PostgreSQL 9.6 through 18 according to the Prisma supported databases documentation, but a currently maintained PostgreSQL version such as 16+ is recommended for local assessment work.

## Installation

```bash
npm install
```

## Environment Setup

Create a local `.env` file at the repository root. It is ignored by Git.

```bash
cp .env.example .env
```

Local values:

```env
NODE_ENV=development
BACKEND_PORT=5000
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000
DATABASE_URL="postgresql://postgres:your_url_encoded_password@localhost:5432/ecommerce_assessment?schema=public&sslmode=disable"
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

The backend validates `DATABASE_URL` at startup and requires a PostgreSQL URL. Do not commit a real `.env` file or real credentials.

## PostgreSQL Setup

Recommended local database:

```text
Database: ecommerce_assessment
Schema: public
```

Create the database with `psql`:

```sql
CREATE DATABASE ecommerce_assessment;
```

Or create the same database in pgAdmin. For local assessment development, an existing local PostgreSQL account may be used. Do not use the PostgreSQL superuser as a production recommendation.

## Prisma Workflow

Prisma 7 keeps datasource URL configuration in `backend/prisma7.config.ts` and the PostgreSQL provider in `backend/prisma/schema.prisma`.

Generate Prisma Client:

```bash
npm run db:generate
```

Validate the schema:

```bash
npm run db:validate
```

Format the schema:

```bash
npm run db:format
```

Create and apply a development migration after real models are added:

```bash
npm run db:migrate -- --name add_users
```

Apply committed migrations in production:

```bash
npm run db:migrate:deploy
```

Run seed support:

```bash
npm run db:seed
```

Open Prisma Studio:

```bash
npm run db:studio
```

The first migration, `add_user`, creates the `users` table for authentication data. The `add_product_catalog_foundation` migration adds the product catalog tables. Future migrations should add cart, wishlist, and order tables when those tasks are implemented. Migrations should be committed to Git because they document and reproduce database changes across environments. `prisma db push` is not the primary workflow because it bypasses versioned migration history.

## User Data

The first database entity is `User`, stored in the `users` table. It supports future login by storing only the fields required for credential lookup:

- `id`: integer auto-incrementing primary key.
- `email`: required normalized email address with a database-level unique constraint.
- `password_hash`: required bcrypt password hash.
- `created_at`: required timestamp with timezone and a database default.

Email is unique because future login will identify users by email. Demo seed emails are normalized with `email.trim().toLowerCase()` before saving. Passwords are stored as bcrypt hashes so plaintext credentials are never saved in PostgreSQL. The current bcrypt work factor is 12 rounds.

Local assessment demo credentials:

```text
Email: demo@ecommerce.local
Password: DemoUser@2026
```

Apply migrations and run the seed:

```bash
npm run db:migrate -- --name add_user
npm run db:seed
```

Inspect local data with Prisma Studio:

```bash
npm run db:studio
```

Registration is intentionally not included. The login endpoint and JWT authentication will be implemented later.

## Product Catalog Data

Products are stored in the `products` table. Each product has an integer `id`, required `title`, required full `description`, required `price`, `type`, `created_at`, and `updated_at`. `type` is `SIMPLE` by default and may also be `CONFIGURABLE`.

Prices use PostgreSQL `DECIMAL(12,2)` through Prisma `Decimal` so money is stored exactly instead of as floating-point values. The backend reads authoritative prices from PostgreSQL. The frontend must not provide authoritative prices, and future cart and checkout totals will be calculated by the backend. API serialization for Prisma Decimal values will be handled when product APIs are added.

Stock is stored only in `product_variants.stock_quantity`; `products` intentionally has no stock column. This gives every sellable item one inventory source of truth and avoids reconciling competing `Product.stock` and `ProductVariant.stock` values. Each variant has independent inventory, so future stock validation can check the exact selected sellable record.

Product variants support one customer-selectable option dimension for this assessment. `option_type` is either `SIZE` or `COLOR`, while `option_value` remains a string so future products are not limited to a hard-coded enum of values. A shirt can use values such as `Small`, `Medium`, and `Large`; headphones can use values such as `Black`, `White`, and `Blue`. This avoids JSON blobs, comma-separated values, and a heavier option engine that the assessment does not require.

Simple products use exactly one internal default variant, typically with `label` set to `Default`, `is_default` set to true, and both `option_type` and `option_value` set to null. That default variant is not meant to appear as a required storefront choice. Configurable products use selectable variants where `is_default` is false and both `option_type` and `option_value` are required. All variants for a configurable product should normally use the same option type; that cross-row rule is deferred to Task 6 seed validation, the future product service, and automated tests instead of database triggers.

`product_variants` belongs to `products` through `product_id`. Variants cannot exist without a product, and deleting a product cascades to its variants. Each variant has a globally unique `sku`, a per-product unique `(product_id, option_type, option_value)` combination, a partial unique index that allows only one default variant per product, and database defaults for stock and timestamps.

PostgreSQL blocks invalid catalog data at the database level: product prices cannot be negative, variant stock quantities cannot be negative, required fields are `NOT NULL`, SKUs are unique, variants must reference an existing product, default variants cannot carry option values, and selectable variants must carry both an option type and value.

Future cart items must reference `ProductVariant` by ID with `productVariantId Int` and a foreign-key relation. The cart should not identify selected stock by label, size text, color text, unvalidated SKU, or product ID alone. When the same product has different variants, each selected variant can become a separate cart line.

The final product catalog seed is deferred to Task 6, where exactly 15 products will be added, including at least three products with multiple variants. No permanent product records are seeded by the variant model task.

Create and apply the product catalog migration with:

```bash
npm run db:migrate -- --name add_product_catalog_foundation
```

Complete the variant model with:

```bash
npm run db:migrate -- --name complete_product_variant_model
```

## Running The Applications

Run both applications:

```bash
npm run dev
```

Run each application independently:

```bash
npm run dev:frontend
npm run dev:backend
```

## Health Checks

Liveness endpoint:

```text
GET http://localhost:5000/api/health
```

Readiness endpoint:

```text
GET http://localhost:5000/api/health/ready
```

`/api/health` confirms the backend process is running. `/api/health/ready` runs a lightweight `SELECT 1` through Prisma and returns `200` when PostgreSQL is reachable or `503` when the database is unavailable.

The frontend home page still calls `/api/health` through `frontend/src/services/api.ts`.

## Quality Commands

```bash
npm run lint
npm run typecheck
npm run build
```

Project-specific commands are also available:

```bash
npm run lint:frontend
npm run lint:backend
npm run typecheck:frontend
npm run typecheck:backend
npm run build:frontend
npm run build:backend
```
