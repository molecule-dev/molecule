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
export function mountDefaultDeviceRoutes(router: Router, Device: DeviceMap): void {
  router.get('/devices', Device.auth, Device.query)
  router.get('/devices/:id', Device.authUser, Device.read)
  router.patch('/devices/:id', Device.authUser, Device.update)
  router.delete('/devices/:id', Device.authUser, Device.del)
}

/**
 * Mounts the public auth endpoints:
 *
 * - `POST /users` (create)
 * - `POST /users/log-in` (logIn)
 * - `POST /users/forgot-password` (forgotPassword)
 */
export function mountDefaultUserAuthRoutes(router: Router, User: UserMap): void {
  router.post('/users', User.create)
  router.post('/users/log-in', User.logIn)
  router.post('/users/forgot-password', User.forgotPassword)
}

/**
 * Optional reset-password route: `POST /users/reset-password`.
 * Only mount when the app uses the pkg's resetPassword handler
 * rather than a custom local handler.
 */
export function mountDefaultUserResetPasswordRoute(router: Router, User: UserMap): void {
  if (!User.resetPassword) return
  router.post('/users/reset-password', User.resetPassword)
}

/**
 * Mounts the authed-self user CRUD routes:
 *
 * - `GET /users/:id` (authSelf+read)
 * - `PATCH /users/:id` (authSelf+update)
 * - `DELETE /users/:id` (authSelf+del)
 */
export function mountDefaultUserCrudRoutes(router: Router, User: UserMap): void {
  router.get('/users/:id', User.authSelf, User.read)
  router.patch('/users/:id', User.authSelf, User.update)
  router.delete('/users/:id', User.authSelf, User.del)
}

/**
 * Mounts password + 2FA security routes:
 *
 * - `PATCH /users/:id/password` (authSelf+updatePassword)
 * - `POST /users/:id/verify-two-factor` (authSelf+verifyTwoFactor)
 */
export function mountDefaultUserSecurityRoutes(router: Router, User: UserMap): void {
  router.patch('/users/:id/password', User.authSelf, User.updatePassword)
  router.post('/users/:id/verify-two-factor', User.authSelf, User.verifyTwoFactor)
}

/**
 * Mounts plan/billing routes:
 *
 * - `PATCH /users/:id/plan` (authSelf+updatePlan)
 * - `POST /users/payment-notification/:provider` (handlePaymentNotification, public)
 */
export function mountDefaultUserBillingRoutes(router: Router, User: UserMap): void {
  router.patch('/users/:id/plan', User.authSelf, User.updatePlan)
  if (User.handlePaymentNotification) {
    router.post('/users/payment-notification/:provider', User.handlePaymentNotification)
  }
}

/**
 * Optional payment-verification routes for apps that support
 * client-driven payment confirmation (Apple/Google receipt verify).
 *
 * - `GET /users/:id/verify-payment/:provider` (verifyPayment)
 * - `POST /users/:id/verify-payment/:provider` (verifyPayment)
 */
export function mountDefaultUserVerifyPaymentRoutes(router: Router, User: UserMap): void {
  if (!User.verifyPayment) return
  router.get('/users/:id/verify-payment/:provider', User.verifyPayment)
  router.post('/users/:id/verify-payment/:provider', User.verifyPayment)
}
