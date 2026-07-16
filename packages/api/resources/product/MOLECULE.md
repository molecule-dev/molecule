# @molecule/api-resource-product

Product catalog resource for molecule.dev.

Provides CRUD handlers for products with soft-delete, pagination, status filtering,
and variant sub-resources. All user-facing text is i18n-ready via companion locale bonds.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-product'
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-product @molecule/api-database @molecule/api-i18n @molecule/api-locales-product @molecule/api-logger @molecule/api-permissions @molecule/api-resource
```

## API

### Interfaces

#### `CreateProductInput`

Input for creating a new product.

```typescript
interface CreateProductInput {
  /** Display name. */
  name: string
  /** Optional description. */
  description?: string | null
  /** Base price in smallest currency unit. */
  price: number
  /** ISO 4217 currency code. Defaults to 'USD'. */
  currency?: string
  /** Product status. Defaults to 'draft'. */
  status?: ProductStatus
  /** Optional image URL. */
  imageUrl?: string | null
  /** Optional SKU. */
  sku?: string | null
  /** Optional inventory count. */
  inventory?: number | null
}
```

#### `CreateVariantInput`

Input for creating a product variant.

```typescript
interface CreateVariantInput {
  /** Variant display name. */
  name: string
  /** Optional SKU. */
  sku?: string | null
  /** Optional price override. */
  price?: number | null
  /** Optional inventory count. */
  inventory?: number | null
}
```

#### `Product`

A product record in the catalog.

```typescript
interface Product {
  /** Unique identifier. */
  id: string
  /** Display name. */
  name: string
  /** URL-friendly slug derived from name. */
  slug: string
  /** Optional long-form description. */
  description: string | null
  /** Base price in the smallest currency unit (e.g. cents). */
  price: number
  /** ISO 4217 currency code (e.g. 'USD'). */
  currency: string
  /** Product status controlling visibility. */
  status: ProductStatus
  /** Optional URL to the primary product image. */
  imageUrl: string | null
  /** Optional stock-keeping unit identifier. */
  sku: string | null
  /** Available inventory count, or null if untracked. */
  inventory: number | null
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string
  /** ISO 8601 soft-delete timestamp, or null if active. */
  deletedAt: string | null
}
```

#### `ProductVariant`

A product variant representing a specific option (size, color, etc.).

```typescript
interface ProductVariant {
  /** Unique identifier. */
  id: string
  /** Foreign key to the parent product. */
  productId: string
  /** Variant display name (e.g. 'Large', 'Red'). */
  name: string
  /** Optional SKU for this variant. */
  sku: string | null
  /** Price override in the smallest currency unit, or null to use product price. */
  price: number | null
  /** Available inventory count, or null if untracked. */
  inventory: number | null
  /** ISO 8601 creation timestamp. */
  createdAt: string
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string
}
```

### Types

#### `ProductStatus`

Product status indicating visibility and availability.

```typescript
type ProductStatus = 'draft' | 'active' | 'archived'
```

#### `UpdateProductInput`

Input for updating an existing product.

```typescript
type UpdateProductInput = Partial<CreateProductInput>
```

### Functions

#### `create(req, res)`

Creates a new product with a unique slug derived from the name.

Admin-only and enforced here (not merely via route middleware): a product is a
shared catalog entity with no per-user owner, so a non-admin caller is rejected
(401 when unauthenticated, 403 otherwise) before any catalog row is inserted —
defense-in-depth that does not depend on the `requireAdmin` route middleware
being wired.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The incoming request with {@link CreateProductInput} body.
- `res` — The response object.

#### `createVariant(req, res)`

Creates a variant for a given product.

Admin-only and enforced here (not merely via route middleware): a product is a
shared catalog entity with no per-user owner, so a non-admin caller is rejected
(401 when unauthenticated, 403 otherwise) before a variant (price/stock) is
added — defense-in-depth that does not depend on the `requireAdmin` route
middleware being wired.

```typescript
function createVariant(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param (product ID) and {@link CreateVariantInput} body.
- `res` — The response object.

#### `del(req, res)`

Soft-deletes a product by setting its `deletedAt` timestamp.

Admin-only and enforced here (not merely via route middleware): a product is a
shared catalog entity with no per-user owner, so a non-admin caller is rejected
(401 when unauthenticated, 403 otherwise) before anything is deleted —
defense-in-depth that does not depend on the `requireAdmin` route middleware
being wired.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param.
- `res` — The response object.

#### `isProductAdmin(res)`

Resolves whether the current request's session belongs to an actor authorized
to administer products (create/update/delete/create variants). Fail-closed: returns
`false` when there is no authenticated session, and otherwise only `true` when
the session carries an admin claim or a bonded permissions provider grants the
`manage product` permission.

Use this for in-handler defense-in-depth (it does not depend on the route
middleware being preserved by the injector).

```typescript
function isProductAdmin(res: MoleculeResponse): Promise<boolean>
```

- `res` — The response whose `locals.session` is inspected.

**Returns:** `true` when the session is an authorized product admin.

#### `list(req, res)`

Lists products with pagination and optional status filter. Excludes soft-deleted products.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with optional `page`, `perPage`, and `status` query params.
- `res` — The response object.

#### `listVariants(req, res)`

Lists all variants for a given product.

```typescript
function listVariants(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param (product ID).
- `res` — The response object.

#### `read(req, res)`

Reads a single product by ID. Returns 404 if not found or soft-deleted.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param.
- `res` — The response object.

#### `requireAdmin()`

Route middleware that gates the admin-only product mutation routes (`create`,
`update`, `del`, `createVariant`). Calls `next()` only for an authenticated admin;
otherwise forwards an error to the framework error handler — `Unauthorized`
when no session is present, `Forbidden` when the session is authenticated but
not an admin.

Exposed as a `requestHandlerMap` key so the injector's route scanner keeps it
(unlike the inert global `'authenticate'` string, which is dropped).

```typescript
function requireAdmin(): MoleculeRequestHandler
```

**Returns:** An Express-compatible middleware function.

#### `update(req, res)`

Updates a product by ID. Only provided fields are modified.

Admin-only and enforced here (not merely via route middleware): a product is a
shared catalog entity with no per-user owner, so a non-admin caller is rejected
(401 when unauthenticated, 403 otherwise) before any price/stock change —
defense-in-depth that does not depend on the `requireAdmin` route middleware
being wired.

```typescript
function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param and {@link UpdateProductInput} body.
- `res` — The response object.

### Constants

#### `i18nRegistered`

Whether i18n registration has completed.

```typescript
const i18nRegistered: true
```

#### `PRODUCT_ADMIN_PERMISSION`

Session-claim permission string (`'product:manage'`) that, when present in a
session's `permissions` array, grants product administration without a bonded
permissions provider.

```typescript
const PRODUCT_ADMIN_PERMISSION: "product:manage"
```

#### `PRODUCT_PERMISSION_ACTION`

Permission action checked against `@molecule/api-permissions` for product
administration.

```typescript
const PRODUCT_PERMISSION_ACTION: "manage"
```

#### `PRODUCT_PERMISSION_RESOURCE`

Permission resource checked against `@molecule/api-permissions` for product
administration.

```typescript
const PRODUCT_PERMISSION_RESOURCE: "product"
```

#### `requestHandlerMap`

Handler map keyed by route handler name.

`requireAdmin` is the admin authorizer middleware referenced by the
`update`/`del`/`createVariant` routes. It must live here (as a real handler-map
key) so the mlcl injector's route scanner preserves it — a bare middleware
string that isn't a handler-map key is silently dropped.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly createVariant: typeof createVariant; readonly list: typeof list; readonly listVariants: typeof listVariants; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; readonly requireAdmin: MoleculeRequestHandler; }
```

#### `routes`

Route array for product CRUD plus variant sub-resource.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/products"; readonly handler: "create"; readonly middlewares: readonly ["requireAdmin"]; }, { readonly method: "get"; readonly path: "/products"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/products/:id"; readonly handler: "read"; }, { readonly method: "patch"; readonly path: "/products/:id"; readonly handler: "update"; readonly middlewares: readonly ["requireAdmin"]; }, { readonly method: "delete"; readonly path: "/products/:id"; readonly handler: "del"; readonly middlewares: readonly ["requireAdmin"]; }, { readonly method: "get"; readonly path: "/products/:id/variants"; readonly handler: "listVariants"; }, { readonly method: "post"; readonly path: "/products/:id/variants"; readonly handler: "createVariant"; readonly middlewares: readonly ["requireAdmin"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-product` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-permissions` ^1.0.0
- `@molecule/api-resource` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-locales-product`
- `@molecule/api-logger`
- `@molecule/api-permissions`
- `@molecule/api-resource`

Tables: `src/__setup__/products.sql` creates `products` +
`product_variants`. An mlcl-scaffolded API replays `__setup__/*.sql`
automatically on migrate; anywhere else run it once.

A product is a SHARED catalog entity — there is no per-user owner column.
Reads (`GET /products`, `GET /products/:id`, variant reads) are PUBLIC.
Mutations (`create`, `update`, `del`, `createVariant`) are admin-only and
DENY BY DEFAULT: the caller needs an admin session claim (`isAdmin`,
`role: 'admin'`, `permissions: ['product:manage']`) or an
`@molecule/api-permissions` grant (`manage product`). Out of the box NO ONE
can mutate the catalog — grant your merchant/catalog-manager role first; a
403 here means "grant the permission", never "remove the gate". The gate is
enforced both as the `requireAdmin` route middleware and inside every
mutation handler (fail-closed), so it holds however the routes are wired.

Deletes are SOFT (`deletedAt` timestamp) — deleted products drop out of
list/read automatically; don't add a hard `DELETE FROM products` path.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt each
item to this app's actual catalog/admin screens, and check every box off one by
one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Creating a product (admin UI or `POST /products`) persists its real fields
  — name, price, currency, sku, inventory, status — the auto-derived `slug` is
  set, and the new row appears in the catalog list (`GET /products`).
- [ ] Money and stock render correctly: `price` is stored in the smallest
  currency unit (cents), so the UI formats it with `currency` (1999 with 'USD'
  renders as "$19.99", never a raw 1999) and `inventory` shows the real count.
- [ ] The shopper catalog shows ONLY sellable products. The base list hides
  soft-deleted rows but NOT drafts/archived by default, so the shopper view must
  scope to active (`GET /products?status=active`, or filter in the UI): create a
  `draft` and an `active` product — the shopper list shows the active one and
  hides the draft; flipping status to `active` makes it appear.
- [ ] Every filter/search the app exposes narrows correctly: the real `?status=`
  filter and `page`/`perPage` pagination, plus any category/price/text search the
  app layers on — each returns only matching, non-deleted products.
- [ ] If variants are used, each variant (`POST /products/:id/variants`) carries
  its own `sku`, `price` override (null inherits the product price) and
  `inventory`, and those per-variant values render on the product.
- [ ] Updating price or stock (`PATCH /products/:id`) reflects immediately in the
  list and detail, and the app's purchase/decrement flow never drives `inventory`
  below zero — an oversell or negative-stock edit is rejected with a visible
  error, not silently stored.
- [ ] AUTHZ — reads are public but writes are admin-only and deny by default: a
  shopper (no session) and a normal authenticated NON-admin are both rejected
  (401/403) from create/update/delete/create-variant, while an admin (`isAdmin`,
  `role: 'admin'`, or a `product:manage` grant) succeeds; and no unpublished
  product leaks to the public by id — `GET /products/:id` on a draft must not
  expose it to a shopper.
