# Frontend Architecture

## Why did you use Next.js and the App Router?

Next.js provides a clean React structure, TypeScript support, and simple file-based routing with the App Router.

## How are the main pages organized?

/products lists products, /products/[id] shows details, /cart manages the cart, /wishlist shows saved products, and /checkout handles order review and placement.

## Why does TanStack Query manage API/server data?

It handles fetching, caching, loading, errors, and refreshing server data such as products, cart, and wishlist.

## How are queries refreshed after mutations?

After cart, wishlist, or checkout mutations, related queries are invalidated or refreshed so the UI stays synchronized with the backend.

## Did you use Zustand?

No. It was unnecessary because cart and wishlist are server-driven and stored in the database. Local React state handles temporary UI values.

## How do loading, errors, and empty states work?

The UI shows authentication/page loading, error messages, empty states, and disabled controls while mutations are running.

## Which components are reused?

Shared navigation and reusable loading, error, and state displays reduce duplication and keep the UI consistent.

## Why did you use both Tailwind CSS and custom CSS?

I used Tailwind CSS for component-specific styling, such as the cart layout, while keeping the existing global CSS for shared styles like navigation, forms, buttons, product pages, and checkout. This avoided unnecessary rewrites while allowing Tailwind to improve specific layouts.
