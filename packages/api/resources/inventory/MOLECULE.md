# @molecule/api-resource-inventory

Inventory resource for molecule.dev.

Provides stock tracking with reservations, low-stock alerts,
movement history, and bulk update support.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-inventory'
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-inventory @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-resource
```

## API

### Interfaces

#### `BulkStockAdjustment`

Input for a single item in a bulk stock update.

```typescript
interface BulkStockAdjustment {
  /** The product to adjust. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Quantity to adjust. */
  quantity: number
  /** Type of adjustment. */
  type: StockAdjustmentType
  /** Reason for the adjustment. */
  reason?: string
}
```

#### `BulkUpdateItemResult`

Result of a single item in a bulk update.

```typescript
interface BulkUpdateItemResult {
  /** The product that was adjusted. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Whether this individual adjustment succeeded. */
  success: boolean
  /** Error message if the adjustment failed. */
  error?: string
  /** Updated stock info if successful. */
  stock?: StockInfo
}
```

#### `BulkUpdateResult`

Result of a bulk stock update operation.

```typescript
interface BulkUpdateResult {
  /** Total number of adjustments attempted. */
  total: number
  /** Number of successful adjustments. */
  succeeded: number
  /** Number of failed adjustments. */
  failed: number
  /** Per-item results. */
  results: BulkUpdateItemResult[]
}
```

#### `InventorySession`

Structural view of the fields on `res.locals.session` this resource inspects to
decide authorization. All fields are optional — a standard molecule session
carries only `userId`; apps that model roles may also set `isAdmin`/`role`/
`roles`/`permissions` claims, which are honored here.

```typescript
interface InventorySession {
  /** Authenticated user id (set by the global auth middleware). */
  userId?: string
  /** Optional boolean admin claim. */
  isAdmin?: boolean
  /** Optional single-role claim. */
  role?: string
  /** Optional multi-role claim. */
  roles?: string[]
  /** Optional permission strings claim. */
  permissions?: string[]
}
```

#### `LowStockAlert`

A low-stock alert entry.

```typescript
interface LowStockAlert {
  /** The product that is low on stock. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Current available quantity. */
  available: number
  /** The low-stock threshold. */
  threshold: number
}
```

#### `PaginatedResult`

A paginated result set.

```typescript
interface PaginatedResult<T> {
  /** The items in this page. */
  data: T[]
  /** Total number of items matching the query. */
  total: number
  /** Current page number (1-based). */
  page: number
  /** Number of items per page. */
  limit: number
}
```

#### `PaginationOptions`

Pagination options for list queries.

```typescript
interface PaginationOptions {
  /** Page number (1-based). */
  page?: number
  /** Number of items per page. */
  limit?: number
}
```

#### `Reservation`

A stock reservation tied to an order.

```typescript
interface Reservation {
  /** Unique reservation identifier. */
  id: string
  /** The product being reserved. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Quantity reserved. */
  quantity: number
  /** The order this reservation belongs to. */
  orderId: string
  /** The authenticated user who created this reservation, if known. */
  userId?: string
  /** When the reservation was created. */
  createdAt: string
}
```

#### `ReservationRow`

Internal database row for a stock reservation.

```typescript
interface ReservationRow {
  /** Unique reservation identifier. */
  id: string
  /** The product being reserved. */
  productId: string
  /** Optional variant identifier. */
  variantId: string | null
  /** Quantity reserved. */
  quantity: number
  /** The order this reservation belongs to. */
  orderId: string
  /** The authenticated user who created this reservation (null for legacy rows). */
  userId: string | null
  /** Creation timestamp. */
  createdAt: string
}
```

#### `ReserveStockInput`

Input for creating a stock reservation.

```typescript
interface ReserveStockInput {
  /** Quantity to reserve. */
  quantity: number
  /** The order to associate this reservation with. */
  orderId: string
}
```

#### `StockAdjustment`

Input for adjusting stock levels.

```typescript
interface StockAdjustment {
  /** Optional variant identifier. */
  variantId?: string
  /** Quantity to adjust by (or absolute value for 'set'). */
  quantity: number
  /** Type of adjustment: add, remove, or set to absolute value. */
  type: StockAdjustmentType
  /** Human-readable reason for the adjustment. */
  reason?: string
}
```

#### `StockInfo`

Current stock information for a product or variant.

```typescript
interface StockInfo {
  /** The product this stock belongs to. */
  productId: string
  /** Optional variant identifier (size, color, etc.). */
  variantId?: string
  /** Quantity available for purchase (total − reserved). */
  available: number
  /** Quantity currently reserved by pending orders. */
  reserved: number
  /** Total quantity in stock (available + reserved). */
  total: number
  /** Threshold below which the product is considered low-stock. */
  lowStockThreshold: number
  /** Whether current available stock is at or below the threshold. */
  isLowStock: boolean
}
```

#### `StockMovement`

A record of a stock movement (adjustment, reservation, release, or confirmation).

```typescript
interface StockMovement {
  /** Unique movement identifier. */
  id: string
  /** The product affected. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Type of movement. */
  type: StockMovementType
  /** Quantity change (positive for additions, negative for removals). */
  quantity: number
  /** Reason or description for this movement. */
  reason?: string
  /** Associated order or reservation identifier. */
  referenceId?: string
  /** When this movement occurred. */
  createdAt: string
}
```

#### `StockMovementRow`

Internal database row for a stock movement.

```typescript
interface StockMovementRow {
  /** Unique movement identifier. */
  id: string
  /** The product affected. */
  productId: string
  /** Optional variant identifier. */
  variantId: string | null
  /** Type of movement. */
  type: StockMovementType
  /** Quantity change. */
  quantity: number
  /** Reason for this movement. */
  reason: string | null
  /** Associated reference identifier. */
  referenceId: string | null
  /** Creation timestamp. */
  createdAt: string
}
```

#### `StockRow`

Internal database row for an inventory stock record.

```typescript
interface StockRow {
  /** Unique stock record identifier. */
  id: string
  /** The product this stock belongs to. */
  productId: string
  /** Optional variant identifier. */
  variantId: string | null
  /** Total quantity in stock. */
  total: number
  /** Quantity currently reserved. */
  reserved: number
  /** Low-stock threshold. */
  lowStockThreshold: number
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
```

### Types

#### `StockAdjustmentType`

Types of stock adjustment operations.

```typescript
type StockAdjustmentType = 'add' | 'remove' | 'set'
```

#### `StockMovementType`

Types of stock movements recorded in the movement history.

```typescript
type StockMovementType = 'adjustment' | 'reservation' | 'release' | 'confirmation'
```

### Functions

#### `assertInventoryAdmin(res)`

In-handler admin guard for the admin-only inventory mutations. Writes the
appropriate JSON error and returns `false` when the caller is not an
authorized admin — `401` when unauthenticated, `403` when authenticated but
not an admin. Returns `true` (and writes nothing) when the caller is an admin.

Call this at the top of every admin handler so protection holds independently
of the route middleware (defense-in-depth, fail-closed).

```typescript
function assertInventoryAdmin(res: MoleculeResponse): boolean
```

- `res` — The response, whose `locals.session` is inspected and onto which

**Returns:** `true` when the caller is an authorized admin, otherwise `false`.

#### `assertReservationActor(res, reservationUserId)`

In-handler guard for reservation-lifecycle mutations (`release`, `confirm`).
A reservation is owned by the user who created it; only that owner — or an
inventory admin — may release or confirm it. Writes the appropriate JSON
error and returns `false` when access is denied (`401` when unauthenticated,
`403` when authenticated but neither the owner nor an admin); returns `true`
(writing nothing) when the caller may act.

Fail-closed: a reservation with no recorded owner (`null` — e.g. a legacy row
created before ownership binding) is accessible only to admins.

```typescript
function assertReservationActor(res: MoleculeResponse, reservationUserId: string | null): boolean
```

- `res` — The response, whose `locals.session` is inspected and onto which
- `reservationUserId` — The `userId` recorded on the reservation, or `null`.

**Returns:** `true` when the caller is the owner or an admin, otherwise `false`.

#### `bulkUpdate(req, res)`

Processes multiple stock adjustments in a single request.

```typescript
function bulkUpdate(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `adjustments` array body.
- `res` — The response object.

#### `confirm(req, res)`

Confirms a reservation, permanently removing the reserved quantity from total stock.

```typescript
function confirm(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `reservationId` param.
- `res` — The response object.

#### `getAlerts(req, res)`

Returns all products whose available stock is at or below their low-stock threshold.
Accepts an optional `threshold` query parameter to override the per-product threshold.

```typescript
function getAlerts(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with optional `threshold` query parameter.
- `res` — The response object.

#### `getInventorySession(res)`

Reads the structural session off `res.locals`.

```typescript
function getInventorySession(res: MoleculeResponse): InventorySession | undefined
```

- `res` — The response whose `locals.session` is inspected.

**Returns:** The session, or `undefined` when unauthenticated.

#### `getMovements(req, res)`

Returns paginated stock movement history for the given product.

```typescript
function getMovements(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `productId` param and optional pagination query params.
- `res` — The response object.

#### `getStock(req, res)`

Returns stock information for the given product (and optional variant).

```typescript
function getStock(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `productId` param and optional `variantId` query.
- `res` — The response object.

#### `isInventoryAdmin(res)`

Resolves whether the current request's session belongs to an actor authorized
to administer inventory (rewrite/bulk-update stock, release/confirm any
reservation). Fail-closed: returns `false` when there is no authenticated
session, and otherwise only `true` when the session carries an admin claim —
`isAdmin === true`, `role === 'admin'`, `roles` containing `'admin'`, or
`permissions` containing `'admin'` / `'inventory:manage'`.

Use this for in-handler defense-in-depth (it does not depend on the route
middleware being preserved by the injector).

```typescript
function isInventoryAdmin(res: MoleculeResponse): boolean
```

- `res` — The response whose `locals.session` is inspected.

**Returns:** `true` when the session is an authorized inventory admin.

#### `release(req, res)`

Releases a stock reservation, returning the reserved quantity to available stock.

```typescript
function release(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `reservationId` param.
- `res` — The response object.

#### `requireInventoryAdmin()`

Route middleware that gates the admin-only inventory routes (`updateStock`,
`bulkUpdate`). Calls `next()` only for an authenticated admin; otherwise
forwards an error to the framework error handler — `Unauthorized` when no
session is present, `Forbidden` when the session is authenticated but not an
admin.

Exposed as a `requestHandlerMap` key so the injector's route scanner keeps it
(unlike the inert global `'authenticate'` string, which is dropped).

```typescript
function requireInventoryAdmin(): MoleculeRequestHandler
```

**Returns:** An Express-compatible middleware function.

#### `reserve(req, res)`

Reserves stock for the given product and order.

```typescript
function reserve(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `productId` param and {@link ReserveStockInput} body.
- `res` — The response object.

#### `toLowStockAlert(row)`

Converts a database stock row into a typed {@link LowStockAlert}.

```typescript
function toLowStockAlert(row: StockRow): LowStockAlert
```

- `row` — The raw database row.

**Returns:** The low-stock alert.

#### `toReservation(row)`

Converts a database reservation row into a typed {@link Reservation}.

```typescript
function toReservation(row: ReservationRow): Reservation
```

- `row` — The raw database row.

**Returns:** The deserialized reservation.

#### `toStockInfo(row)`

Converts a database stock row into a typed {@link StockInfo}.

```typescript
function toStockInfo(row: StockRow): StockInfo
```

- `row` — The raw database row.

**Returns:** The deserialized stock info.

#### `toStockMovement(row)`

Converts a database stock movement row into a typed {@link StockMovement}.

```typescript
function toStockMovement(row: StockMovementRow): StockMovement
```

- `row` — The raw database row.

**Returns:** The deserialized stock movement.

#### `updateStock(req, res)`

Updates stock for the given product. Creates the stock record if it doesn't exist.

```typescript
function updateStock(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `productId` param and {@link StockAdjustment} body.
- `res` — The response object.

### Constants

#### `i18nRegistered`

Whether i18n registration has been attempted.

```typescript
const i18nRegistered: true
```

#### `INVENTORY_ADMIN_PERMISSION`

Session-claim permission string (`'inventory:manage'`) that, when present in a
session's `permissions` array, grants inventory administration.

```typescript
const INVENTORY_ADMIN_PERMISSION: "inventory:manage"
```

#### `INVENTORY_PERMISSION_ACTION`

Permission action describing inventory administration, e.g. for an app's own
`@molecule/api-permissions` wiring.

```typescript
const INVENTORY_PERMISSION_ACTION: "manage"
```

#### `INVENTORY_PERMISSION_RESOURCE`

Permission resource describing inventory administration, e.g. for an app's own
`@molecule/api-permissions` wiring.

```typescript
const INVENTORY_PERMISSION_RESOURCE: "inventory"
```

#### `requestHandlerMap`

Handler map for the inventory resource routes.

`requireInventoryAdmin` is the admin authorizer middleware referenced by the
`updateStock`/`bulkUpdate` routes. It must live here (as a real handler-map
key) so the mlcl injector's route scanner preserves it — a bare middleware
string that isn't a handler-map key is silently dropped, which is exactly how
the previous bare `'authenticate'` gate became inert.

```typescript
const requestHandlerMap: { readonly getStock: typeof getStock; readonly updateStock: typeof updateStock; readonly reserve: typeof reserve; readonly release: typeof release; readonly confirm: typeof confirm; readonly getAlerts: typeof getAlerts; readonly getMovements: typeof getMovements; readonly bulkUpdate: typeof bulkUpdate; readonly requireInventoryAdmin: MoleculeRequestHandler; }
```

#### `routes`

Inventory resource routes.

All routes require authentication. The destructive admin-side mutations
(`updateStock`, `bulkUpdate`) are additionally gated by the
`requireInventoryAdmin` middleware — a real `requestHandlerMap` key (see
{@link requireInventoryAdmin}) so the injector preserves it; the previously
declared bare `'authenticate'` string was silently dropped by the route
scanner, leaving stock open to rewrite by any authenticated user. Each
admin/reservation handler additionally re-checks authorization internally, so
the gate holds even if a consumer wires the routes without these middlewares.

```typescript
const routes: readonly [{ readonly method: "get"; readonly path: "/inventory/:productId"; readonly handler: "getStock"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "put"; readonly path: "/inventory/:productId"; readonly handler: "updateStock"; readonly middlewares: readonly ["requireInventoryAdmin"]; }, { readonly method: "post"; readonly path: "/inventory/:productId/reserve"; readonly handler: "reserve"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/inventory/reservations/:reservationId"; readonly handler: "release"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/inventory/reservations/:reservationId/confirm"; readonly handler: "confirm"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/inventory/alerts"; readonly handler: "getAlerts"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/inventory/:productId/movements"; readonly handler: "getMovements"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/inventory/bulk"; readonly handler: "bulkUpdate"; readonly middlewares: readonly ["requireInventoryAdmin"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-logger`
- `@molecule/api-resource`

Tables: `src/__setup__/inventory.sql` creates `inventory_stock`,
`inventory_reservations`, and `inventory_movements`. An mlcl-scaffolded API
replays `__setup__/*.sql` automatically on migrate; anywhere else run it
once — nothing at runtime creates them.

Stock rows are keyed by `productId` — SHARED app-wide state, not per-user
rows. Writing stock (`PUT /inventory/:productId`) and
`POST /inventory/bulk` are role-gated and DENY BY DEFAULT (admin session
claim or an `@molecule/api-permissions` grant), enforced both as the
`requireInventoryAdmin` route middleware and inside the handlers
(fail-closed). Out of the box no one can mutate stock — grant the role
first; never "fix" the 403 by removing the gate.

Reservation flow: `POST /inventory/:productId/reserve` holds quantity →
`POST /inventory/reservations/:id/confirm` deducts it,
`DELETE /inventory/reservations/:id` releases the hold. All handlers read
the authenticated user from `res.locals.session` (mount behind your global
auth middleware; 401 otherwise).
