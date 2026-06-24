import { getAll } from '@molecule/api-bond'
import type { PaymentProvider } from '@molecule/api-payments'
import type {
  createRequestHandler as CreateRequestHandler,
  MoleculeRequestHandler,
} from '@molecule/api-resource'

import * as authorizers from './authorizers/index.js'
import * as handlers from './handlers/index.js'
import { resource } from './resource.js'

type RequestHandlerCreator = typeof CreateRequestHandler

/**
 * Shape of the user request-handler map produced by `createRequestHandlerMap`.
 * Names match the route definitions in `routes.ts`. Exported so helpers that
 * accept the map (e.g. `mountDefaultUserAuthRoutes`, `mountDefaultUserCrudRoutes`)
 * can type their parameter precisely instead of widening to
 * `Record<string, MoleculeRequestHandler>`.
 */
export interface UserRequestHandlerMap {
  auth: MoleculeRequestHandler
  authSelf: MoleculeRequestHandler
  rateLimitAuth: MoleculeRequestHandler
  rateLimitTwoFactor: MoleculeRequestHandler
  create: MoleculeRequestHandler
  logIn: MoleculeRequestHandler
  logInOAuth: MoleculeRequestHandler
  read: MoleculeRequestHandler
  readSelf: MoleculeRequestHandler
  update: MoleculeRequestHandler
  del: MoleculeRequestHandler
  updatePassword: MoleculeRequestHandler
  forgotPassword: MoleculeRequestHandler
  resetPassword: MoleculeRequestHandler
  verifyTwoFactor: MoleculeRequestHandler
  updatePlan: MoleculeRequestHandler
  verifyPayment: MoleculeRequestHandler
  handlePaymentNotification: MoleculeRequestHandler
  requireWebhookAuthenticity: MoleculeRequestHandler
}

/**
 * Creates the full request handler map for the User resource.
 * Optional features (OAuth, payments) are conditionally included
 * based on bonded providers.
 *
 * Handler names match the route definitions in routes.ts.
 * @param createRequestHandler - Factory from `@molecule/api-resource` that wraps handler configs into Express middleware.
 * @returns A `UserRequestHandlerMap` of handler names to Express middleware.
 */
export const createRequestHandlerMap = (
  createRequestHandler: RequestHandlerCreator,
): UserRequestHandlerMap => {
  const map: UserRequestHandlerMap = {
    // Authorizers
    auth: authorizers.auth(),
    authSelf: authorizers.authSelf(),
    // Default brute-force protection for the public/credential-bearing auth
    // endpoints (login, oauth, forgot/reset-password). Keyed by IP and by the
    // submitted account, with a low ceiling. No-ops (logs a warning) if no
    // rate-limit provider is bonded, so apps that opt out still boot.
    rateLimitAuth: authorizers.rateLimit({
      scope: 'auth',
      accountFrom: [authorizers.loginAccountKey, authorizers.emailAccountKey],
    }),
    // Stricter limiter for the authSelf-gated 2FA verification route — temp-locks
    // the second factor per account after consecutive misses.
    rateLimitTwoFactor: authorizers.rateLimit({
      scope: '2fa',
      max: 5,
      accountFrom: [authorizers.paramIdAccountKey],
    }),
    // Authenticity guard for the public payment-notification (IAP S2S) route.
    requireWebhookAuthenticity: authorizers.requireWebhookAuthenticity(),

    // Core handlers
    create: createRequestHandler(handlers.create(resource)),
    logIn: createRequestHandler(handlers.logIn(resource)),
    read: createRequestHandler(handlers.read(resource)),
    readSelf: createRequestHandler(handlers.readSelf(resource)),
    update: createRequestHandler(handlers.update(resource)),
    del: createRequestHandler(handlers.del(resource)),
    updatePassword: createRequestHandler(handlers.updatePassword(resource)),
    forgotPassword: createRequestHandler(handlers.forgotPassword(resource)),
    resetPassword: createRequestHandler(handlers.resetPassword(resource)),
    verifyTwoFactor: createRequestHandler(handlers.verifyTwoFactor(resource)),
    updatePlan: createRequestHandler(handlers.updatePlan(resource)),

    // OAuth login — handler checks bond registry at request time.
    logInOAuth: createRequestHandler(handlers.logInOAuth(resource)),

    // Payment handlers — always registered so route mounts don't crash with
    // "argument handler must be a function" when no payments bond is wired
    // at module-init time. The handlers themselves check the bond registry
    // at REQUEST time and respond with 503 if no provider is bonded for the
    // requested :provider. Adding a new payment provider requires only a
    // new bond package — no source changes here.
    verifyPayment: createRequestHandler(handlers.verifyPayment(resource)),
    handlePaymentNotification: createRequestHandler(handlers.handlePaymentNotification(resource)),
  }

  // Suppress unused-import warning while keeping the bond-registry import
  // for future reuse (handlers themselves still consult `getAll<PaymentProvider>('payments')`).
  void getAll<PaymentProvider>

  return map
}
