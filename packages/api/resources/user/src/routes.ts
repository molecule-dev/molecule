/**
 * Route definitions for the User resource.
 * Routes marked optional require additional packages to be installed.
 *
 * Declarative route definitions used by the injection engine.
 */
export const routes = [
  // Auth
  { method: 'post' as const, path: '/users', middlewares: [], handler: 'create' },
  { method: 'post' as const, path: '/users/log-in', middlewares: [], handler: 'logIn' },
  {
    method: 'post' as const,
    path: '/users/log-in/oauth',
    middlewares: [],
    handler: 'logInOAuth',
    optional: 'oauth',
  },
  {
    method: 'post' as const,
    path: '/users/forgot-password',
    middlewares: [],
    handler: 'forgotPassword',
  },

  // User CRUD (requires auth)
  { method: 'get' as const, path: '/users/:id', middlewares: ['authSelf'], handler: 'read' },
  { method: 'patch' as const, path: '/users/:id', middlewares: ['authSelf'], handler: 'update' },
  { method: 'delete' as const, path: '/users/:id', middlewares: ['authSelf'], handler: 'del' },

  // Password & 2FA
  {
    method: 'patch' as const,
    path: '/users/:id/password',
    middlewares: ['authSelf'],
    handler: 'updatePassword',
  },
  {
    method: 'post' as const,
    path: '/users/:id/verify-two-factor',
    middlewares: ['authSelf'],
    handler: 'verifyTwoFactor',
  },

  // Plans
  {
    method: 'patch' as const,
    path: '/users/:id/plan',
    middlewares: ['authSelf'],
    handler: 'updatePlan',
  },

  // Payment verification — GET (redirect callbacks, e.g. Stripe Checkout)
  {
    method: 'get' as const,
    path: '/users/:id/verify-payment/:provider',
    middlewares: [],
    handler: 'verifyPayment',
    optional: 'payments',
  },
  // Payment verification — POST (mobile receipt verification)
  {
    method: 'post' as const,
    path: '/users/:id/verify-payment/:provider',
    middlewares: [],
    handler: 'verifyPayment',
    optional: 'payments',
  },
  // Payment notifications (webhooks, S2S)
  {
    method: 'post' as const,
    path: '/users/payment-notification/:provider',
    middlewares: [],
    handler: 'handlePaymentNotification',
    optional: 'payments',
  },
]
