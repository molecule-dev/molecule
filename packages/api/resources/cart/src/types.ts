/**
 * Cart types.
 *
 * @module
 */

/**
 * A shopping cart item.
 */
export interface CartItem {
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

/**
 * Input for adding an item to the cart.
 */
export interface AddCartItemInput {
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

/**
 * Input for updating an item's quantity.
 */
export interface UpdateCartItemInput {
  /** New quantity for the item. Must be >= 1. */
  quantity: number
}

/**
 * A coupon applied to a cart.
 */
export interface AppliedCoupon {
  /** The coupon code. */
  code: string
  /** The discount type. */
  type: 'percentage' | 'fixed'
  /** The discount value (percentage 0–100, or fixed amount). */
  value: number
}

/**
 * A shopping cart with items, totals, and optional coupon.
 */
export interface Cart {
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

/**
 * Summary snapshot of a cart.
 */
export interface CartSummary {
  /** Total number of items (sum of quantities). */
  itemCount: number
  /** Number of distinct products. */
  uniqueItems: number
  /** Subtotal before discounts. */
  subtotal: number
  /** Final total after discounts and tax. */
  total: number
}

/**
 * Input for applying a coupon.
 */
export interface ApplyCouponInput {
  /** The coupon code to apply. */
  code: string
}

/**
 * Internal database row for a cart.
 */
export interface CartRow {
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

/**
 * Internal database row for a cart item.
 */
export interface CartItemRow {
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
