/**
 * Product catalog resource for molecule.dev.
 *
 * Provides CRUD handlers for products with soft-delete, pagination, status filtering,
 * and variant sub-resources. All user-facing text is i18n-ready via companion locale bonds.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-product'
 * ```
 *
 * @remarks
 * Tables: `src/__setup__/products.sql` creates `products` +
 * `product_variants`. An mlcl-scaffolded API replays `__setup__/*.sql`
 * automatically on migrate; anywhere else run it once.
 *
 * A product is a SHARED catalog entity — there is no per-user owner column.
 * Reads (`GET /products`, `GET /products/:id`, variant reads) are PUBLIC.
 * Mutations (`create`, `update`, `del`, `createVariant`) are admin-only and
 * DENY BY DEFAULT: the caller needs an admin session claim (`isAdmin`,
 * `role: 'admin'`, `permissions: ['product:manage']`) or an
 * `@molecule/api-permissions` grant (`manage product`). Out of the box NO ONE
 * can mutate the catalog — grant your merchant/catalog-manager role first; a
 * 403 here means "grant the permission", never "remove the gate". The gate is
 * enforced both as the `requireAdmin` route middleware and inside every
 * mutation handler (fail-closed), so it holds however the routes are wired.
 *
 * Deletes are SOFT (`deletedAt` timestamp) — deleted products drop out of
 * list/read automatically; don't add a hard `DELETE FROM products` path.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt each
 * item to this app's actual catalog/admin screens, and check every box off one by
 * one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Creating a product (admin UI or `POST /products`) persists its real fields
 *   — name, price, currency, sku, inventory, status — the auto-derived `slug` is
 *   set, and the new row appears in the catalog list (`GET /products`).
 * - [ ] Money and stock render correctly: `price` is stored in the smallest
 *   currency unit (cents), so the UI formats it with `currency` (1999 with 'USD'
 *   renders as "$19.99", never a raw 1999) and `inventory` shows the real count.
 * - [ ] The shopper catalog shows ONLY sellable products. The base list hides
 *   soft-deleted rows but NOT drafts/archived by default, so the shopper view must
 *   scope to active (`GET /products?status=active`, or filter in the UI): create a
 *   `draft` and an `active` product — the shopper list shows the active one and
 *   hides the draft; flipping status to `active` makes it appear.
 * - [ ] Every filter/search the app exposes narrows correctly: the real `?status=`
 *   filter and `page`/`perPage` pagination, plus any category/price/text search the
 *   app layers on — each returns only matching, non-deleted products.
 * - [ ] If variants are used, each variant (`POST /products/:id/variants`) carries
 *   its own `sku`, `price` override (null inherits the product price) and
 *   `inventory`, and those per-variant values render on the product.
 * - [ ] Updating price or stock (`PATCH /products/:id`) reflects immediately in the
 *   list and detail, and the app's purchase/decrement flow never drives `inventory`
 *   below zero — an oversell or negative-stock edit is rejected with a visible
 *   error, not silently stored.
 * - [ ] AUTHZ — reads are public but writes are admin-only and deny by default: a
 *   shopper (no session) and a normal authenticated NON-admin are both rejected
 *   (401/403) from create/update/delete/create-variant, while an admin (`isAdmin`,
 *   `role: 'admin'`, or a `product:manage` grant) succeeds; and no unpublished
 *   product leaks to the public by id — `GET /products/:id` on a draft must not
 *   expose it to a shopper.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
