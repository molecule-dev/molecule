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
npm install @molecule/api-resource-inventory
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

#### `release(req, res)`

Releases a stock reservation, returning the reserved quantity to available stock.

```typescript
function release(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `reservationId` param.
- `res` — The response object.

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

#### `requestHandlerMap`

Handler map for the inventory resource routes.

```typescript
const requestHandlerMap: { readonly getStock: typeof getStock; readonly updateStock: typeof updateStock; readonly reserve: typeof reserve; readonly release: typeof release; readonly confirm: typeof confirm; readonly getAlerts: typeof getAlerts; readonly getMovements: typeof getMovements; readonly bulkUpdate: typeof bulkUpdate; }
```

#### `routes`

Inventory resource routes. All routes require authentication.

```typescript
const routes: readonly [{ readonly method: "get"; readonly path: "/inventory/:productId"; readonly handler: "getStock"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "put"; readonly path: "/inventory/:productId"; readonly handler: "updateStock"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/inventory/:productId/reserve"; readonly handler: "reserve"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/inventory/reservations/:reservationId"; readonly handler: "release"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/inventory/reservations/:reservationId/confirm"; readonly handler: "confirm"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/inventory/alerts"; readonly handler: "getAlerts"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/inventory/:productId/movements"; readonly handler: "getMovements"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/inventory/bulk"; readonly handler: "bulkUpdate"; readonly middlewares: readonly ["authenticate"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
