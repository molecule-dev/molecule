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
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './types.js'
