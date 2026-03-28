# @molecule/api-resource-order

Order resource for molecule.dev.

Provides order management with status tracking, lifecycle transitions,
cancellation, refunds, and event history.

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-order
```

## Usage

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-order'
```

## API

### Interfaces

#### `Address`

A physical or billing address.

```typescript
interface Address {
  /** Street address line 1. */
  line1: string
  /** Street address line 2. */
  line2?: string
  /** City name. */
  city: string
  /** State or province. */
  state?: string
  /** Postal/zip code. */
  postalCode: string
  /** ISO 3166-1 alpha-2 country code. */
  country: string
}
```

#### `CancelOrderInput`

Input for cancelling an order.

```typescript
interface CancelOrderInput {
  /** Reason for cancellation. */
  reason?: string
}
```

#### `CreateOrderInput`

Input for creating a new order.

```typescript
interface CreateOrderInput {
  /** Items to include in the order. */
  items: CreateOrderItemInput[]
  /** Shipping address. */
  shippingAddress?: Address
  /** Billing address. */
  billingAddress?: Address
  /** Associated payment identifier. */
  paymentId?: string
  /** Customer notes. */
  notes?: string
  /** Pre-computed discount amount. */
  discount?: number
  /** Pre-computed shipping cost. */
  shipping?: number
  /** Pre-computed tax amount. */
  tax?: number
}
```

#### `CreateOrderItemInput`

Input for a single order item during creation.

```typescript
interface CreateOrderItemInput {
  /** The product to order. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Display name. */
  name: string
  /** Unit price. */
  price: number
  /** Quantity to order. */
  quantity: number
  /** Optional product image URL. */
  image?: string
}
```

#### `Order`

A full order record.

```typescript
interface Order {
  /** Unique order identifier. */
  id: string
  /** The user who placed this order. */
  userId: string
  /** Current status of the order. */
  status: OrderStatus
  /** Items in this order. */
  items: OrderItem[]
  /** Sum of item prices × quantities before discounts. */
  subtotal: number
  /** Computed tax amount. */
  tax: number
  /** Shipping cost. */
  shipping: number
  /** Discount amount. */
  discount: number
  /** Final total: subtotal − discount + tax + shipping. */
  total: number
  /** Shipping address, if applicable. */
  shippingAddress?: Address
  /** Billing address, if applicable. */
  billingAddress?: Address
  /** Associated payment identifier. */
  paymentId?: string
  /** Order notes from the customer. */
  notes?: string
  /** When the order was created. */
  createdAt: string
  /** When the order was last updated. */
  updatedAt: string
}
```

#### `OrderEvent`

A historical event in an order's lifecycle.

```typescript
interface OrderEvent {
  /** Unique event identifier. */
  id: string
  /** The order this event belongs to. */
  orderId: string
  /** The status at the time of this event. */
  status: OrderStatus
  /** Optional metadata about the event. */
  metadata?: Record<string, unknown>
  /** When this event occurred. */
  createdAt: string
}
```

#### `OrderEventRow`

Internal database row for an order event.

```typescript
interface OrderEventRow {
  /** Unique event identifier. */
  id: string
  /** The order this event belongs to. */
  orderId: string
  /** The status at the time of this event. */
  status: OrderStatus
  /** JSON-serialized metadata. */
  metadata: string | null
  /** When this event occurred. */
  createdAt: string
}
```

#### `OrderItem`

A single item within an order.

```typescript
interface OrderItem {
  /** Unique identifier for this order line. */
  id: string
  /** The product being purchased. */
  productId: string
  /** Optional variant (size, color, etc.). */
  variantId?: string
  /** Display name of the product. */
  name: string
  /** Unit price at time of purchase. */
  price: number
  /** Quantity ordered. */
  quantity: number
  /** Optional product image URL. */
  image?: string
}
```

#### `OrderItemRow`

Internal database row for an order item.

```typescript
interface OrderItemRow {
  /** Unique order item identifier. */
  id: string
  /** Parent order identifier. */
  orderId: string
  /** The product being purchased. */
  productId: string
  /** Optional variant identifier. */
  variantId: string | null
  /** Display name. */
  name: string
  /** Unit price at time of purchase. */
  price: number
  /** Quantity ordered. */
  quantity: number
  /** Optional product image URL. */
  image: string | null
}
```

#### `OrderQuery`

Query options for listing orders.

```typescript
interface OrderQuery {
  /** Filter by status. */
  status?: OrderStatus
  /** Page number (1-based). */
  page?: number
  /** Number of items per page. */
  limit?: number
}
```

#### `OrderRow`

Internal database row for an order.

```typescript
interface OrderRow {
  /** Unique order identifier. */
  id: string
  /** The user who placed this order. */
  userId: string
  /** Current status. */
  status: OrderStatus
  /** Sum of item prices × quantities. */
  subtotal: number
  /** Computed tax amount. */
  tax: number
  /** Shipping cost. */
  shipping: number
  /** Discount amount. */
  discount: number
  /** Final total. */
  total: number
  /** JSON-serialized shipping address. */
  shippingAddress: string | null
  /** JSON-serialized billing address. */
  billingAddress: string | null
  /** Associated payment identifier. */
  paymentId: string | null
  /** Customer notes. */
  notes: string | null
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
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

#### `RefundOrderInput`

Input for refunding an order.

```typescript
interface RefundOrderInput {
  /** Partial refund amount. If omitted, full refund is issued. */
  amount?: number
  /** Reason for the refund. */
  reason?: string
}
```

#### `RefundResult`

Result of a refund operation.

```typescript
interface RefundResult {
  /** The order that was refunded. */
  orderId: string
  /** Amount refunded. */
  amount: number
  /** New order status after refund. */
  status: OrderStatus
  /** When the refund was processed. */
  refundedAt: string
}
```

#### `UpdateOrderStatusInput`

Input for updating an order's status.

```typescript
interface UpdateOrderStatusInput {
  /** The new status. */
  status: OrderStatus
  /** Optional metadata about the status change. */
  metadata?: Record<string, unknown>
}
```

### Types

#### `OrderStatus`

Possible states of an order throughout its lifecycle.

```typescript
type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
```

### Functions

#### `assembleOrder(orderRow, itemRows)`

Assembles a full {@link Order} object from a database order row and item rows.

```typescript
function assembleOrder(orderRow: OrderRow, itemRows: OrderItemRow[]): Order
```

- `orderRow` — The order database row.
- `itemRows` — The order item database rows.

**Returns:** The assembled order.

#### `cancel(req, res)`

Cancels an order. Only the order owner can cancel, and only from valid states.

```typescript
function cancel(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id` and optional {@link CancelOrderInput} body.
- `res` — The response object.

#### `computeSubtotal(items)`

Computes the subtotal from a list of order items (price × quantity).

```typescript
function computeSubtotal(items: { price: number; quantity: number; }[]): number
```

- `items` — The order items.

**Returns:** The subtotal amount.

#### `create(req, res)`

Creates a new order from the request body.

```typescript
function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with {@link CreateOrderInput} body.
- `res` — The response object.

#### `getHistory(req, res)`

Returns the event history for an order. Only the order owner can view history.

```typescript
function getHistory(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id`.
- `res` — The response object.

#### `list(req, res)`

Lists orders for the authenticated user with pagination and optional status filter.

```typescript
function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with optional query params: status, page, limit.
- `res` — The response object.

#### `read(req, res)`

Retrieves a single order by ID. Only the order owner can read it.

```typescript
function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id`.
- `res` — The response object.

#### `refund(req, res)`

Issues a full or partial refund for an order.

```typescript
function refund(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id` and optional {@link RefundOrderInput} body.
- `res` — The response object.

#### `toOrderEvent(row)`

Converts a database order-event row into a typed {@link OrderEvent}.

```typescript
function toOrderEvent(row: OrderEventRow): OrderEvent
```

- `row` — The raw database row.

**Returns:** The deserialized order event.

#### `toOrderItem(row)`

Converts a database order-item row into a typed {@link OrderItem}.

```typescript
function toOrderItem(row: OrderItemRow): OrderItem
```

- `row` — The raw database row.

**Returns:** The deserialized order item.

#### `updateStatus(req, res)`

Updates an order's status with transition validation.

```typescript
function updateStatus(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `params.id` and {@link UpdateOrderStatusInput} body.
- `res` — The response object.

### Constants

#### `i18nRegistered`

Whether i18n registration has been attempted.

```typescript
const i18nRegistered: true
```

#### `ORDER_STATUSES`

Valid order statuses.

```typescript
const ORDER_STATUSES: readonly OrderStatus[]
```

#### `requestHandlerMap`

Handler map for the order resource routes.

```typescript
const requestHandlerMap: { readonly create: typeof create; readonly list: typeof list; readonly read: typeof read; readonly updateStatus: typeof updateStatus; readonly cancel: typeof cancel; readonly refund: typeof refund; readonly getHistory: typeof getHistory; }
```

#### `routes`

Order resource routes. All routes require authentication.

```typescript
const routes: readonly [{ readonly method: "post"; readonly path: "/orders"; readonly handler: "create"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/orders"; readonly handler: "list"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/orders/:id"; readonly handler: "read"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "put"; readonly path: "/orders/:id/status"; readonly handler: "updateStatus"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/orders/:id/cancel"; readonly handler: "cancel"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/orders/:id/refund"; readonly handler: "refund"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/orders/:id/history"; readonly handler: "getHistory"; readonly middlewares: readonly ["authenticate"]; }]
```

#### `STATUS_TRANSITIONS`

Status transitions: maps current status to the set of valid next statuses.

```typescript
const STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
