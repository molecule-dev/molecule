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
 * - `POST /users/log-in` (logIn)
 * - `POST /users/forgot-password` (forgotPassword)
 */
export function mountDefaultUserAuthRoutes(router: Router, user: UserMap): void {
  router.post('/users', user.create)
  router.post('/users/log-in', user.logIn)
  router.post('/users/forgot-password', user.forgotPassword)
}

/**
 * Optional reset-password route: `POST /users/reset-password`.
 * Only mount when the app uses the pkg's resetPassword handler
 * rather than a custom local handler.
 */
export function mountDefaultUserResetPasswordRoute(router: Router, user: UserMap): void {
  if (!user.resetPassword) return
  router.post('/users/reset-password', user.resetPassword)
}

/**
 * Mounts the authed-self user CRUD routes:
 *
 * - `GET /users/:id` (authSelf+read)
 * - `PATCH /users/:id` (authSelf+update)
 * - `DELETE /users/:id` (authSelf+del)
 */
export function mountDefaultUserCrudRoutes(router: Router, user: UserMap): void {
  router.get('/users/:id', user.authSelf, user.read)
  router.patch('/users/:id', user.authSelf, user.update)
  router.delete('/users/:id', user.authSelf, user.del)
}

/**
 * Mounts password + 2FA security routes:
 *
 * - `PATCH /users/:id/password` (authSelf+updatePassword)
 * - `POST /users/:id/verify-two-factor` (authSelf+verifyTwoFactor)
 */
export function mountDefaultUserSecurityRoutes(router: Router, user: UserMap): void {
  router.patch('/users/:id/password', user.authSelf, user.updatePassword)
  // POST alias for clients that use the auth-client `changePassword` flow,
  // which historically dispatches POST. Same handler; both verbs accepted.
  router.post('/users/:id/password', user.authSelf, user.updatePassword)
  router.post('/users/:id/verify-two-factor', user.authSelf, user.verifyTwoFactor)
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
 * - `GET /users/:id/verify-payment/:provider` (verifyPayment) — unauthenticated
 *   browser redirect target (e.g. Stripe Checkout success_url); ownership is
 *   enforced inside the handler via the customer/checkout-session binding.
 * - `POST /users/:id/verify-payment/:provider` (authSelf+verifyPayment) — the
 *   mobile receipt path credits `:id`, so only that authenticated user may call it.
 */
export function mountDefaultUserVerifyPaymentRoutes(router: Router, user: UserMap): void {
  if (!user.verifyPayment) return
  router.get('/users/:id/verify-payment/:provider', user.verifyPayment)
  router.post('/users/:id/verify-payment/:provider', user.authSelf, user.verifyPayment)
}
