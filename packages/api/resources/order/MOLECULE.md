# @molecule/api-resource-order

Order resource for molecule.dev.

Provides order management with status tracking, lifecycle transitions,
cancellation, refunds, and event history.

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-order'
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-order @molecule/api-database @molecule/api-i18n @molecule/api-logger @molecule/api-resource
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

#### `OrderMerchantAuthorizer`

Merchant-ownership predicate: returns `true` when `userId` is a merchant /
seller / admin entitled to drive the given order's lifecycle (confirm,
process, ship, deliver, refund, or cancel an already-progressed order). It is
deliberately distinct from the buyer ownership check (`orderRow.userId ===
userId`): the order row records only the BUYER, so it has no inherent
knowledge of who the seller is — only the consuming app does.

```typescript
type OrderMerchantAuthorizer = (
  orderRow: OrderRow,
  userId: string,
  req?: MoleculeRequest,
) => Promise<boolean> | boolean
```

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

#### `canDriveOrderLifecycle(orderRow, userId, req)`

Default-DENY merchant gate. Returns `true` only when an authorizer has been
registered via {@link setOrderMerchantAuthorizer} AND that authorizer allows
`userId` to drive this order's lifecycle. When no authorizer is registered,
this returns `false` — the merchant-only handlers respond 403.

```typescript
function canDriveOrderLifecycle(orderRow: OrderRow, userId: string, req?: MoleculeRequest): Promise<boolean>
```

- `orderRow` — The order being acted on.
- `userId` — The authenticated user ID.
- `req` — The originating request (optional).

**Returns:** `true` if the merchant op is allowed, otherwise `false`.

#### `computeSubtotal(items)`

Computes the subtotal from a list of order items (price × quantity).

```typescript
function computeSubtotal(items: { price: number; quantity: number; }[]): number
```

- `items` — The order items.

**Returns:** The subtotal amount.

#### `create(req, res)`

Creates a new order from the request body.

⚠️ CLIENT-PRICE TRUST BOUNDARY — READ BEFORE WIRING TO PAYMENTS ⚠️

This handler TRUSTS the client-supplied money fields verbatim:
`items[].price`, `items[].quantity`, `discount`, `tax`, and `shipping` all
come straight from the request body, and the order `total` is computed from
them (`subtotal − discount + tax + shipping`). This resource is GENERIC — it
owns no product/catalog table — so it CANNOT and DOES NOT verify a client
price against a real unit price. The validation below only rejects malformed
money (negative amounts, non-integer/zero quantities); it does NOT establish
that the prices are correct.

Therefore `create()` MUST NOT be wired directly to a payment-charging path.
A caller that charges off this order's `total` lets a malicious client set
their own prices (e.g. `price: 0` or a negative `discount` that zeroes the
total). Charging code MUST resolve each unit price SERVER-SIDE from the
product/menu table (keyed by `productId`/`variantId`), ignore the client's
`price`, and recompute `subtotal`/`tax`/`shipping`/`total` from those
trusted values — exactly as every flagship checkout flow does. Use this
handler only for non-charging flows (drafts, internal/admin order entry,
an already-server-priced order), or replace it with an app-specific create
that does the server-side price lookup.

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

#### `getOrderMerchantAuthorizer()`

Returns the currently-registered merchant authorizer, or `null` when none
has been registered.

```typescript
function getOrderMerchantAuthorizer(): OrderMerchantAuthorizer | null
```

**Returns:** The registered authorizer, or `null`.

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

#### `setOrderMerchantAuthorizer(authorizer)`

Registers the merchant authorizer consulted by the order lifecycle handlers
(`refund`, a merchant-state `updateStatus`, and cancellation of an
already-progressed order) before any mutation. **Until an app registers one,
every merchant op is DENIED (secure by default)** — the order row records
only the buyer, so the consuming app MUST supply who is entitled to act as
the seller/merchant on an order.

Pass `null` to clear a previously-registered authorizer (restores default
deny).

```typescript
function setOrderMerchantAuthorizer(authorizer: OrderMerchantAuthorizer | null): void
```

- `authorizer` — The merchant predicate, or `null` to clear.

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

#### `BUYER_ALLOWED_TRANSITIONS`

Buyer-reachable status transitions: maps current status to the set of next
statuses an ORDER OWNER (buyer) may drive themselves. A buyer may only cancel
an order while it is still `pending`; every other lifecycle transition is
merchant-only. Any transition NOT listed here requires the merchant
authorizer (see `setOrderMerchantAuthorizer`).

```typescript
const BUYER_ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]>
```

#### `i18nRegistered`

Whether i18n registration has been attempted.

```typescript
const i18nRegistered: true
```

#### `MERCHANT_STATES`

Statuses that represent a MERCHANT-driven lifecycle stage. Transitioning an
order INTO any of these is a merchant-only operation: it requires the
merchant authorizer (see `setOrderMerchantAuthorizer`) and is never something
the buyer (order owner) may self-service.

```typescript
const MERCHANT_STATES: readonly OrderStatus[]
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

Order resource routes. All routes require authentication. The lifecycle
mutations (updateStatus/refund/cancel) additionally gate merchant-only
operations behind `setOrderMerchantAuthorizer` (see the module SECURITY note).

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

### Runtime Dependencies

- `@molecule/api-database`
- `@molecule/api-i18n`
- `@molecule/api-logger`
- `@molecule/api-resource`

**SECURITY — `create()` TRUSTS client-supplied prices; do NOT wire it to a
payment-charging path.** This resource is GENERIC: it owns no product/catalog
table, so it CANNOT verify a price. `create()` builds the order — and its
`total` (`subtotal − discount + tax + shipping`) — from the request body's
`items[].price`, `quantity`, `discount`, `tax`, and `shipping`. Input
validation rejects malformed money (negative `price`/`discount`/`tax`/
`shipping`, non-integer or `< 1` `quantity`) but does NOT establish that the
prices are CORRECT. A client can therefore submit `price: 0` (or otherwise
understate the total). Any code that CHARGES off an order MUST resolve each
unit price SERVER-SIDE from the product/menu table (keyed by `productId`/
`variantId`), ignore the client's `price`, and recompute the totals from
those trusted values — as every flagship checkout flow does. Use the stock
`create()` only for non-charging flows (drafts, internal/admin order entry,
an order that was already server-priced upstream).

Lifecycle ops (confirm/process/ship/deliver/refund, and cancelling an
already-progressed order) are MERCHANT-ONLY and DENY by default until an app
registers a merchant authorizer via `setOrderMerchantAuthorizer` — the order
row records only the BUYER (`userId`), so it cannot know who the seller is.

Tables: `src/__setup__/orders.sql` creates `orders`, `order_items`, and
`order_events`. An mlcl-scaffolded API replays `__setup__/*.sql`
automatically on migrate; anywhere else run it once — nothing at runtime
creates them.
