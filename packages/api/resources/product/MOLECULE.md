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
npm install @molecule/api-resource-product
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

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The incoming request with {@link CreateProductInput} body.
- `res` — The response object.

#### `createVariant(req, res)`

Creates a variant for a given product.

```typescript
function createVariant(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param (product ID) and {@link CreateVariantInput} body.
- `res` — The response object.

#### `del(req, res)`

Soft-deletes a product by setting its `deletedAt` timestamp.

```typescript
function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request object with `id` param.
- `res` — The response object.

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

#### `update(req, res)`

Updates a product by ID. Only provided fields are modified.

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

#### `requestHandlerMap`

Handler map keyed by route handler name.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly createVariant: typeof createVariant; readonly list: typeof list; readonly listVariants: typeof listVariants; readonly read: typeof read; readonly update: typeof update; readonly del: typeof del; }
```

#### `routes`

Route array for product CRUD plus variant sub-resource.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/products"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/products"; readonly handler: "list"; }, { readonly method: "get"; readonly path: "/products/:id"; readonly handler: "read"; }, { readonly method: "patch"; readonly path: "/products/:id"; readonly handler: "update"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/products/:id"; readonly handler: "del"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/products/:id/variants"; readonly handler: "listVariants"; }, { readonly method: "post"; readonly path: "/products/:id/variants"; readonly handler: "createVariant"; readonly middlewares: readonly ["authenticate"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-locales-product` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
