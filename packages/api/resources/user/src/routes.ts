/**
 * Route definitions for the User resource.
 * Routes marked optional require additional packages to be installed.
 *
 * Declarative route definitions used by the injection engine.
 */
export const routes = [
  // Auth
  { method: 'post' as const, path: '/users', middlewares: [], handler: 'create' },
  {
    method: 'post' as const,
    path: '/users/log-in',
    middlewares: ['rateLimitAuth'],
    handler: 'logIn',
  },
  {
    method: 'post' as const,
    path: '/users/log-in/oauth',
    middlewares: ['rateLimitAuth'],
    handler: 'logInOAuth',
    optional: 'oauth',
  },
  // Logout — revoke the device + clear the credential cookies (token, sessionId,
  // mol_auth hint). Cookie-authed (`auth`) — the session identifies the user; no
  // `:id`. [M1-1] under the in-memory-token model logout MUST clear the httpOnly
  // cookie, else cookie-restore re-logs-in on the next load.
  { method: 'post' as const, path: '/users/logout', middlewares: ['auth'], handler: 'logout' },
  {
    method: 'post' as const,
    path: '/users/forgot-password',
    middlewares: ['rateLimitAuth'],
    handler: 'forgotPassword',
  },
  {
    method: 'post' as const,
    path: '/users/reset-password',
    middlewares: ['rateLimitAuth'],
    handler: 'resetPassword',
  },

  // Current user — session restore. MUST precede `/users/:id` so `me` isn't
  // matched as an `:id`. Cookie-authed (`auth`, not `authSelf` — there is no
  // `:id` to match); the app calls this on init to restore the session from the
  // httpOnly cookie after a full page load ([M1-1] the bearer token is in-memory
  // and lost on reload).
  { method: 'get' as const, path: '/users/me', middlewares: ['auth'], handler: 'readSelf' },

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
    middlewares: ['authSelf', 'rateLimitTwoFactor'],
    handler: 'verifyTwoFactor',
  },

  // Plans
  {
    method: 'patch' as const,
    path: '/users/:id/plan',
    middlewares: ['authSelf'],
    handler: 'updatePlan',
  },

  // Payment verification — GET (redirect callbacks, e.g. Stripe Checkout). [M3-1]
  // authSelf like the POST + molecule-dev's router: the plan is granted to `:id` and the
  // handler echoes the user row, so an unauthenticated/cross-user GET must not reach it.
  // The Stripe success_url is a top-level browser navigation carrying the session cookie,
  // so authSelf does not break the legitimate redirect callback.
  {
    method: 'get' as const,
    path: '/users/:id/verify-payment/:provider',
    middlewares: ['authSelf'],
    handler: 'verifyPayment',
    optional: 'payments',
  },
  // Payment verification — POST (mobile receipt verification). Requires the
  // caller to be the user being credited (authSelf): the plan is granted to
  // `:id`, so an unauthenticated/cross-user POST must never reach the handler.
  {
    method: 'post' as const,
    path: '/users/:id/verify-payment/:provider',
    middlewares: ['authSelf'],
    handler: 'verifyPayment',
    optional: 'payments',
  },
  // Payment notifications (webhooks, S2S). The authenticity guard lets
  // signature-verifying webhook providers (Stripe) through and requires a shared
  // secret for unsigned server-to-server providers (Apple/Google) so the public
  // endpoint is not open by default.
  {
    method: 'post' as const,
    path: '/users/payment-notification/:provider',
    middlewares: ['requireWebhookAuthenticity'],
    handler: 'handlePaymentNotification',
    optional: 'payments',
  },
]
