/**
 * Cart route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Shopping cart routes. The cart is a user-scoped singleton resource
 * (one cart per authenticated user), so routes use `/cart` (singular).
 */
export const routes = [
  { method: 'get', path: '/cart', handler: 'getCart', middlewares: ['authenticate'] },
  { method: 'post', path: '/cart/items', handler: 'addItem', middlewares: ['authenticate'] },
  {
    method: 'put',
    path: '/cart/items/:itemId',
    handler: 'updateQuantity',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/cart/items/:itemId',
    handler: 'removeItem',
    middlewares: ['authenticate'],
  },
  { method: 'delete', path: '/cart', handler: 'clearCart', middlewares: ['authenticate'] },
  { method: 'post', path: '/cart/coupon', handler: 'applyCoupon', middlewares: ['authenticate'] },
  {
    method: 'delete',
    path: '/cart/coupon',
    handler: 'removeCoupon',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/cart/summary',
    handler: 'getCartSummary',
    middlewares: ['authenticate'],
  },
] as const
