# Database Architecture

This project uses PostgreSQL with Prisma for a small e-commerce data model. The schema lives in `backend/prisma/schema.prisma`, and the committed SQL migrations live in `backend/prisma/migrations`.

## Why PostgreSQL

PostgreSQL was selected because the application needs relational integrity across users, products, variants, carts, wishlists, and orders. Foreign keys, transactions, decimal money columns, unique constraints, check constraints, and conditional stock updates are all important for this assessment. PostgreSQL handles those rules in one durable database instead of leaving them to frontend state.

## Why Prisma

Prisma was selected to keep database access typed and explicit in the TypeScript backend. The service layer can select only the fields needed for DTOs, use `Decimal` for money values, run transactions for checkout, and keep migrations versioned with the application code.

## Tables

### users

`users` stores authenticated accounts.

- Primary key: `id`.
- Important fields: `email`, `password_hash`, `created_at`.
- Unique rules: `email` is unique.
- Security note: only password hashes are stored. Passwords are never returned by API DTOs.

Relations:

- One user has many `cart_items`.
- One user has many `wishlist_items`.
- One user has many `orders`.

Deleting a user cascades cart and wishlist rows. Orders use restricted deletion so order history is not silently removed.

### products

`products` stores catalog-level product data.

- Primary key: `id`.
- Important fields: `slug`, `title`, `description`, `price`, `type`, `created_at`, `updated_at`.
- `price` is `Decimal(12, 2)`.
- `type` is `SIMPLE` or `CONFIGURABLE`.
- Unique rules: `slug` is unique.

Relations:

- One product has many `product_variants`.
- One product can appear in many cart, wishlist, and order item rows.

Product deletion cascades to variants, carts, and wishlists, but order items restrict product deletion so historical orders remain valid.

### product_variants

`product_variants` stores the purchasable SKU and stock unit for each product.

- Primary key: `id`.
- Important fields: `product_id`, `sku`, `label`, `option_type`, `option_value`, `stock_quantity`, `is_default`, `created_at`, `updated_at`.
- `option_type` is nullable and uses `SIZE` or `COLOR` for configurable variants.
- `stock_quantity` defaults to `0`.
- Unique rules: `sku` is unique, `(product_id, id)` is unique, and `(product_id, option_type, option_value)` is unique.
- Migration constraints: only one default variant is allowed per product, and default variants must not expose an option type or option value.

Simple products use one default variant. Configurable products use multiple non-default variants with an option type and option value, such as size or color. Stock is stored at the variant level because the chosen variant is what is actually purchased.

### cart_items

`cart_items` stores the current cart for each user.

- Primary key: `id`.
- Important fields: `user_id`, `product_id`, `variant_id`, `quantity`.
- Unique rules: `(user_id, product_id, variant_id)` is unique.
- Check constraints: `quantity >= 1`.
- Foreign keys: user, product, and the composite `(product_id, variant_id)` relation to `product_variants`.
- Migration trigger: simple products must use their default variant in cart rows.

The composite variant relation ensures the selected variant belongs to the selected product. Different variants of the same product create separate cart lines because each variant has its own stock and SKU. Re-adding the same product and variant increments the existing line instead of creating a duplicate row.

Cart rows are deleted when their user, product, or variant is deleted, which prevents orphaned active carts.

### wishlist_items

`wishlist_items` stores saved products for each user.

- Primary key: `id`.
- Important fields: `user_id`, `product_id`, `created_at`.
- Unique rules: `(user_id, product_id)` is unique.
- Foreign keys: user and product.

The wishlist is product-level, so it does not store a variant. The unique constraint prevents duplicates for the same user and product.

### orders

`orders` stores completed checkout headers.

- Primary key: `id`.
- Important fields: `user_id`, `final_total`, `created_at`.
- `final_total` is `Decimal(12, 2)`.
- Indexes: `user_id`.

The order ID is the order number shown to users. `final_total` is stored so the completed order remains stable even if product prices change later.

Orders restrict user deletion to preserve order history. Deleting an order cascades to its order items because the items belong to that order record.

### order_items

`order_items` stores the purchased lines for an order.

- Primary key: `id`.
- Important fields: `order_id`, `product_id`, `variant_id`, `quantity`, `unit_price`, `product_title_snapshot`, `variant_label_snapshot`.
- `unit_price` is `Decimal(12, 2)`.
- Check constraints: `quantity >= 1`.
- Foreign keys: order, product, and the composite `(product_id, variant_id)` relation to `product_variants`.
- Indexes: `order_id`, `product_id`, and `(product_id, variant_id)`.

The table does not store subtotal because subtotal is `quantity * unit_price`. It does store checkout-time snapshots for product title, variant label, and unit price. Those snapshots keep order history stable if the live product title, variant label, or price changes later.

Product and variant deletion is restricted when order items reference them. That prevents historical order rows from being removed by catalog cleanup.

## Product And Variant Modeling

Every purchasable item goes through a variant:

- Simple products have one default variant with no option type or option value.
- Configurable products have multiple variants with option type and option value.
- The frontend may require a variant selection for configurable products.
- Backend validation always checks that the selected variant belongs to the selected product.

This keeps cart, stock, and order logic consistent. A cart line always has a product ID, variant ID, and quantity.

## Stock Handling

Stock is stored on `product_variants.stock_quantity`. Product-level stock in API responses is calculated from the variants. Out-of-stock variants remain in product detail responses so the frontend can show them disabled.

The backend validates stock when:

- adding a cart item,
- updating cart quantity,
- changing a cart item variant,
- validating checkout,
- completing checkout.

Checkout reloads the current cart, products, variants, and prices inside one transaction. Stock is deducted with conditional updates so a variant is only decremented when enough stock is still available.

## Carts Becoming Orders

Checkout is transactional:

1. Reload the authenticated user's cart.
2. Validate that every product and variant still exists.
3. Confirm each variant belongs to its product.
4. Recheck quantities against current stock.
5. Read current product prices.
6. Calculate line subtotals and the final total on the backend.
7. Create the order.
8. Create order items with snapshots.
9. Deduct variant stock.
10. Clear the user's cart.

All of those steps commit together or roll back together. A failed checkout must not leave a partial order, partial stock deduction, or partially cleared cart.

## Backend Totals

The frontend never sends trusted prices, subtotals, totals, stock, or user IDs. Prices are read from `products.price`, subtotals are calculated from quantity and current unit price, and completed order totals are stored in `orders.final_total`. This protects against tampered browser requests and keeps checkout behavior consistent.

## Migrations And Seeding

Prisma migrations are committed in `backend/prisma/migrations` and applied with:

```bash
npm run db:migrate:deploy
```

Local schema changes are created with:

```bash
npm run db:migrate -- --name your_migration_name
```

The Prisma schema is validated with:

```bash
npm run db:validate
```

Seed data is managed by `backend/prisma/seed.ts` and catalog entries live under `backend/prisma/seed-data`. The seed is deterministic and idempotent: it upserts the public demo user and the managed product catalog, then verifies the expected product and variant counts before committing.
