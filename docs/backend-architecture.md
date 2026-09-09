# Backend Architecture

## Why did you use Express?

I used Express because it is lightweight, simple, and suitable for building REST APIs with Node.js.

## What happens from an API request through Route → Validation → Controller → Service → Prisma?

The route receives the request, Zod validates the input, the controller handles HTTP, the service applies business rules, and Prisma communicates with PostgreSQL. Example: POST /api/cart/items → Route → Auth/Validation → Controller → Cart Service → Prisma → PostgreSQL.

## Why are controllers kept small?

Controllers mainly handle requests and responses. Business logic stays in services, making the code cleaner, easier to maintain, and easier to test.

## How are request bodies and parameters validated?

Zod validates request bodies and route parameters before they reach the business logic.

## How does login create a JWT, and how do protected APIs validate it?

The backend checks the password with bcrypt and creates a signed JWT after successful login. Protected APIs validate the Bearer token through authentication middleware.

## Why is checkout executed inside one database transaction?

Order creation, order items, stock updates, and cart clearing must succeed together. If one step fails, the transaction rolls everything back.

## Why are prices, totals, variants, and stock checked again on the server?

Frontend data can be changed or outdated. The backend validates variants and stock and calculates prices and totals itself.

## What backend decision are you most proud of?

I am most proud of keeping cart and checkout rules server-driven, with the backend as the source of truth.
