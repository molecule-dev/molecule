/**
 * Saved payment-method route definitions.
 *
 * Declarative routing — `mlcl inject` reads these to generate the Express
 * router. All routes are user-scoped under `/me/payment-methods`.
 *
 * @module
 */

/**
 * Saved payment-method routes.
 */
export const routes = [
  {
    method: 'post',
    path: '/me/payment-methods/setup-intent',
    handler: 'createSetupIntent',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/me/payment-methods',
    handler: 'listPaymentMethods',
    middlewares: ['authenticate'],
  },
  {
    method: 'put',
    path: '/me/payment-methods/:id/default',
    handler: 'setDefaultPaymentMethod',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/me/payment-methods/:id',
    handler: 'deletePaymentMethod',
    middlewares: ['authenticate'],
  },
] as const
