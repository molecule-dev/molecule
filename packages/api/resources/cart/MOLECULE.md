# @molecule/api-resource-cart

Shopping cart resource for molecule.dev.

Provides a user-scoped singleton cart with item management, coupon support,
and computed totals (subtotal, discount, tax, total).

## Quick Start

```typescript
import { routes, requestHandlerMap } from '@molecule/api-resource-cart'
```

## Type
`resource`

## Installation
```bash
npm install @molecule/api-resource-cart
```

## API

### Interfaces

#### `AddCartItemInput`

Input for adding an item to the cart.

```typescript
interface AddCartItemInput {
  /** The product to add. */
  productId: string
  /** Optional variant identifier. */
  variantId?: string
  /** Display name of the product. */
  name: string
  /** Unit price. */
  price: number
  /** Quantity to add. */
  quantity: number
  /** Optional product image URL. */
  image?: string
  /** Arbitrary metadata. */
  metadata?: Record<string, unknown>
}
```

#### `AppliedCoupon`

A coupon applied to a cart.

```typescript
interface AppliedCoupon {
  /** The coupon code. */
  code: string
  /** The discount type. */
  type: 'percentage' | 'fixed'
  /** The discount value (percentage 0–100, or fixed amount). */
  value: number
}
```

#### `ApplyCouponInput`

Input for applying a coupon.

```typescript
interface ApplyCouponInput {
  /** The coupon code to apply. */
  code: string
}
```

#### `Cart`

A shopping cart with items, totals, and optional coupon.

```typescript
interface Cart {
  /** Unique cart identifier. */
  id: string
  /** Owner of this cart. */
  userId: string
  /** Items in the cart. */
  items: CartItem[]
  /** Currently applied coupon, if any. */
  coupon?: AppliedCoupon
  /** Sum of item prices × quantities before discounts. */
  subtotal: number
  /** Discount amount from applied coupon. */
  discount: number
  /** Computed tax amount. */
  tax: number
  /** Final total: subtotal − discount + tax. */
  total: number
  /** Last modification timestamp. */
  updatedAt: string
}
```

#### `CartItem`

A shopping cart item.

```typescript
interface CartItem {
  /** Unique identifier for this cart item entry. */
  id: string
  /** The product being purchased. */
  productId: string
  /** Optional variant (size, color, etc.). */
  variantId?: string
  /** Display name of the product. */
  name: string
  /** Unit price of the item. */
  price: number
  /** Quantity in the cart. */
  quantity: number
  /** Optional product image URL. */
  image?: string
  /** Arbitrary metadata attached to this item. */
  metadata?: Record<string, unknown>
}
```

#### `CartItemRow`

Internal database row for a cart item.

```typescript
interface CartItemRow {
  /** Unique cart item identifier. */
  id: string
  /** Parent cart identifier. */
  cartId: string
  /** The product being purchased. */
  productId: string
  /** Optional variant identifier. */
  variantId: string | null
  /** Display name. */
  name: string
  /** Unit price. */
  price: number
  /** Quantity. */
  quantity: number
  /** Optional product image URL. */
  image: string | null
  /** JSON-serialized metadata. */
  metadata: string | null
  /** Creation timestamp. */
  createdAt: string
}
```

#### `CartRow`

Internal database row for a cart.

```typescript
interface CartRow {
  /** Unique cart identifier. */
  id: string
  /** Owner of this cart. */
  userId: string
  /** JSON-serialized coupon data, or null. */
  coupon: string | null
  /** Creation timestamp. */
  createdAt: string
  /** Last modification timestamp. */
  updatedAt: string
}
```

#### `CartSummary`

Summary snapshot of a cart.

```typescript
interface CartSummary {
  /** Total number of items (sum of quantities). */
  itemCount: number
  /** Number of distinct products. */
  uniqueItems: number
  /** Subtotal before discounts. */
  subtotal: number
  /** Final total after discounts and tax. */
  total: number
}
```

#### `UpdateCartItemInput`

Input for updating an item's quantity.

```typescript
interface UpdateCartItemInput {
  /** New quantity for the item. Must be >= 1. */
  quantity: number
}
```

### Functions

#### `addItem(req, res)`

Adds an item to the authenticated user's cart. If the same product+variant already
exists, increments the quantity instead of creating a duplicate entry.

```typescript
function addItem(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with {@link AddCartItemInput} body.
- `res` — The response object.

#### `applyCoupon(req, res)`

Applies a coupon code to the user's cart. The coupon is validated by looking
it up in the `coupons` table. Replaces any previously applied coupon.

```typescript
function applyCoupon(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with {@link ApplyCouponInput} body.
- `res` — The response object.

#### `assembleCart(cartRow, itemRows)`

Assembles a full {@link Cart} object from a database cart row and item rows.

```typescript
function assembleCart(cartRow: CartRow, itemRows: CartItemRow[]): Cart
```

- `cartRow` — The cart database row.
- `itemRows` — The cart item database rows.

**Returns:** The assembled cart.

#### `clearCart(_req, res)`

Removes all items and the applied coupon from the user's cart.

```typescript
function clearCart(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request object (unused).
- `res` — The response object.

#### `computeDiscount(coupon, subtotal)`

Computes the discount from an applied coupon and a subtotal.

```typescript
function computeDiscount(coupon: AppliedCoupon | undefined, subtotal: number): number
```

- `coupon` — The applied coupon, if any.
- `subtotal` — The cart subtotal.

**Returns:** The discount amount (clamped to subtotal).

#### `computeSubtotal(items)`

Computes the subtotal from a list of cart items (price × quantity).

```typescript
function computeSubtotal(items: CartItem[]): number
```

- `items` — The cart items.

**Returns:** The subtotal amount.

#### `computeTax(taxableAmount)`

Computes tax from the taxable amount.

```typescript
function computeTax(taxableAmount: number): number
```

- `taxableAmount` — The amount to tax (subtotal − discount).

**Returns:** The tax amount.

#### `getCart(_req, res)`

Returns the authenticated user's cart. Creates an empty cart if none exists.

```typescript
function getCart(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request object (unused — cart is identified by session user).
- `res` — The response object.

#### `getCartSummary(_req, res)`

Returns a lightweight summary of the user's cart (item count, totals).

```typescript
function getCartSummary(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request object (unused).
- `res` — The response object.

#### `removeCoupon(_req, res)`

Removes the currently applied coupon from the user's cart.

```typescript
function removeCoupon(_req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `_req` — The request object (unused).
- `res` — The response object.

#### `removeItem(req, res)`

Removes an item from the user's cart by item ID.

```typescript
function removeItem(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `itemId` route parameter.
- `res` — The response object.

#### `toCartItem(row)`

Converts a database cart-item row into a typed {@link CartItem}.

```typescript
function toCartItem(row: CartItemRow): CartItem
```

- `row` — The raw database row.

**Returns:** The deserialized cart item.

#### `updateQuantity(req, res)`

Updates the quantity of a specific item in the user's cart.

```typescript
function updateQuantity(req: MoleculeRequest, res: MoleculeResponse): Promise<void>
```

- `req` — The request with `itemId` param and {@link UpdateCartItemInput} body.
- `res` — The response object.

### Constants

#### `i18nRegistered`

Whether i18n registration has been attempted.

```typescript
const i18nRegistered: true
```

#### `requestHandlerMap`

Handler map for the cart resource routes.

```typescript
const requestHandlerMap: { readonly getCart: typeof getCart; readonly addItem: typeof addItem; readonly updateQuantity: typeof updateQuantity; readonly removeItem: typeof removeItem; readonly clearCart: typeof clearCart; readonly applyCoupon: typeof applyCoupon; readonly removeCoupon: typeof removeCoupon; readonly getCartSummary: typeof getCartSummary; }
```

#### `routes`

Shopping cart routes. The cart is a user-scoped singleton resource
(one cart per authenticated user), so routes use `/cart` (singular).

```typescript
const routes: readonly [{ readonly method: "get"; readonly path: "/cart"; readonly handler: "getCart"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/cart/items"; readonly handler: "addItem"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "put"; readonly path: "/cart/items/:itemId"; readonly handler: "updateQuantity"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/cart/items/:itemId"; readonly handler: "removeItem"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/cart"; readonly handler: "clearCart"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "post"; readonly path: "/cart/coupon"; readonly handler: "applyCoupon"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "delete"; readonly path: "/cart/coupon"; readonly handler: "removeCoupon"; readonly middlewares: readonly ["authenticate"]; }, { readonly method: "get"; readonly path: "/cart/summary"; readonly handler: "getCartSummary"; readonly middlewares: readonly ["authenticate"]; }]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-database` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
- `@molecule/api-logger` ^1.0.0
- `@molecule/api-resource` ^1.0.0
