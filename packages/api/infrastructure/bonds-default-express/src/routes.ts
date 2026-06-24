import type { Router } from 'express'

import type { DeviceRequestHandlerMap } from '@molecule/api-resource-device'
import type { UserRequestHandlerMap } from '@molecule/api-resource-user'

/**
 * Composable route-mount helpers for the molecule fleet's default
 * `api/src/App/router.ts`. Apps assemble their router by calling the
 * mount* functions they need — `mountDefaultDeviceRoutes`,
 * `mountDefaultUserAuthRoutes`, etc. — instead of writing 80 lines of
 * `router.METHOD(path, ...handlers)` calls.
 *
 * Each helper takes the router + the corresponding resource handler
 * map (e.g. `mountDefaultDeviceRoutes(router, Device)`). Helpers are
 * additive and can be combined freely.
 *
 * @module
 */

type DeviceMap = DeviceRequestHandlerMap

type UserMap = UserRequestHandlerMap

/**
 * Mounts the standard 4-method device CRUD routes:
 *
 * - `GET /devices` (auth+query)
 * - `GET /devices/:id` (authUser+read)
 * - `PATCH /devices/:id` (authUser+update)
 * - `DELETE /devices/:id` (authUser+del)
 */
export function mountDefaultDeviceRoutes(router: Router, device: DeviceMap): void {
  router.get('/devices', device.auth, device.query)
  router.get('/devices/:id', device.authUser, device.read)
  router.patch('/devices/:id', device.authUser, device.update)
  router.delete('/devices/:id', device.authUser, device.del)
}

/**
 * Mounts the public auth endpoints:
 *
 * - `POST /users` (create)
 * - `POST /users/log-in` (rateLimitAuth + logIn)
 * - `POST /users/forgot-password` (rateLimitAuth + forgotPassword)
 *
 * The credential-bearing routes are fronted by `user.rateLimitAuth` — the
 * default IP+account brute-force throttle from `@molecule/api-resource-user` —
 * so generated apps are not left with unthrottled password / TOTP-via-login
 * guessing. The limiter degrades open (logs a warning) when no rate-limit
 * provider is bonded, so apps that opt out still boot.
 */
export function mountDefaultUserAuthRoutes(router: Router, user: UserMap): void {
  router.post('/users', user.create)
  router.post('/users/log-in', user.rateLimitAuth, user.logIn)
  // Logout — cookie-authed device revocation + credential-cookie clearing.
  // [M1-1] required so logout clears the httpOnly cookie (else the cookie-based
  // session restore re-logs-in on the next load).
  if (user.logout) {
    router.post('/users/logout', user.auth, user.logout)
  }
  router.post('/users/forgot-password', user.rateLimitAuth, user.forgotPassword)
}

/**
 * Optional OAuth login route: `POST /users/log-in/oauth` (rateLimitAuth +
 * logInOAuth). Only mount when the app uses the pkg's logInOAuth handler.
 */
export function mountDefaultUserOAuthLoginRoute(router: Router, user: UserMap): void {
  if (!user.logInOAuth) return
  router.post('/users/log-in/oauth', user.rateLimitAuth, user.logInOAuth)
}

/**
 * Optional reset-password route: `POST /users/reset-password` (rateLimitAuth +
 * resetPassword). Only mount when the app uses the pkg's resetPassword handler
 * rather than a custom local handler.
 */
export function mountDefaultUserResetPasswordRoute(router: Router, user: UserMap): void {
  if (!user.resetPassword) return
  router.post('/users/reset-password', user.rateLimitAuth, user.resetPassword)
}

/**
 * Mounts the authed-self user CRUD routes:
 *
 * - `GET /users/me` (auth+readSelf) — session restore; MUST precede `/users/:id`
 * - `GET /users/:id` (authSelf+read)
 * - `PATCH /users/:id` (authSelf+update)
 * - `DELETE /users/:id` (authSelf+del)
 */
export function mountDefaultUserCrudRoutes(router: Router, user: UserMap): void {
  // Current user — cookie-authed session restore. Registered before `/users/:id`
  // so Express doesn't capture `me` as an `:id`. [M1-1] the app's auth client
  // calls this on init to restore the session from the httpOnly cookie after a
  // full page load (the in-memory bearer token does not survive a reload).
  if (user.readSelf) {
    router.get('/users/me', user.auth, user.readSelf)
  }
  router.get('/users/:id', user.authSelf, user.read)
  router.patch('/users/:id', user.authSelf, user.update)
  router.delete('/users/:id', user.authSelf, user.del)
}

/**
 * Mounts password + 2FA security routes:
 *
 * - `PATCH /users/:id/password` (authSelf+updatePassword)
 * - `POST /users/:id/verify-two-factor` (authSelf + rateLimitTwoFactor + verifyTwoFactor)
 *
 * The 2FA verification route carries a stricter limiter (`user.rateLimitTwoFactor`)
 * that temp-locks the second factor per account after consecutive misses.
 */
export function mountDefaultUserSecurityRoutes(router: Router, user: UserMap): void {
  router.patch('/users/:id/password', user.authSelf, user.updatePassword)
  // POST alias for clients that use the auth-client `changePassword` flow,
  // which historically dispatches POST. Same handler; both verbs accepted.
  router.post('/users/:id/password', user.authSelf, user.updatePassword)
  router.post(
    '/users/:id/verify-two-factor',
    user.authSelf,
    user.rateLimitTwoFactor,
    user.verifyTwoFactor,
  )
}

/**
 * Mounts plan/billing routes:
 *
 * - `PATCH /users/:id/plan` (authSelf+updatePlan)
 * - `POST /users/payment-notification/:provider` (requireWebhookAuthenticity+handlePaymentNotification)
 *
 * The notification route is public (providers POST to it), so it is gated by
 * `requireWebhookAuthenticity`: signature-verifying webhook providers (Stripe)
 * pass through, while unsigned server-to-server providers (Apple/Google) require
 * a shared secret — the endpoint is not open by default.
 */
export function mountDefaultUserBillingRoutes(router: Router, user: UserMap): void {
  router.patch('/users/:id/plan', user.authSelf, user.updatePlan)
  if (user.handlePaymentNotification) {
    const notificationHandlers = user.requireWebhookAuthenticity
      ? [user.requireWebhookAuthenticity, user.handlePaymentNotification]
      : [user.handlePaymentNotification]
    router.post('/users/payment-notification/:provider', ...notificationHandlers)
  }
}

/**
 * Optional payment-verification routes for apps that support
 * client-driven payment confirmation (Apple/Google receipt verify).
 *
 * Both verbs require `authSelf` ([M3-1]): the handler mutates and returns the
 * `:id` user, so an unauthenticated / cross-user call must not reach it. The
 * permissive global `verifyMiddleware()` never blocks, so per-route `authSelf`
 * is the gate. `authSelf` does NOT break the Stripe Checkout `success_url`
 * callback — that is a top-level browser navigation which carries the
 * `sameSite:'lax'` session cookie — and in-handler customer/checkout-session
 * binding remains as defense-in-depth. This mirrors the hardened declarative
 * route table (`resources/user/src/routes.ts`) and molecule-dev's live router;
 * the fix had not been propagated to this mounter, which the generated-app
 * fleet uses.
 *
 * - `GET /users/:id/verify-payment/:provider` (authSelf+verifyPayment)
 * - `POST /users/:id/verify-payment/:provider` (authSelf+verifyPayment)
 */
export function mountDefaultUserVerifyPaymentRoutes(router: Router, user: UserMap): void {
  if (!user.verifyPayment) return
  router.get('/users/:id/verify-payment/:provider', user.authSelf, user.verifyPayment)
  router.post('/users/:id/verify-payment/:provider', user.authSelf, user.verifyPayment)
}
