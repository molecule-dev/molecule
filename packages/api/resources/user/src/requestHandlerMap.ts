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
 * Creates the full request handler map for the User resource.
 * Optional features (OAuth, payments) are conditionally included
 * based on bonded providers.
 *
 * Handler names match the route definitions in routes.ts.
 * @param createRequestHandler - Factory from `@molecule/api-resource` that wraps handler configs into Express middleware.
 * @returns A record mapping handler names (matching route definitions) to Express middleware functions.
 */
export const createRequestHandlerMap = (
  createRequestHandler: RequestHandlerCreator,
): Record<string, MoleculeRequestHandler> => {
  const map: Record<string, MoleculeRequestHandler> = {
    // Authorizers
    auth: authorizers.auth(),
    authSelf: authorizers.authSelf(),

    // Core handlers
    create: createRequestHandler(handlers.create(resource)),
    logIn: createRequestHandler(handlers.logIn(resource)),
    read: createRequestHandler(handlers.read(resource)),
    update: createRequestHandler(handlers.update(resource)),
    del: createRequestHandler(handlers.del(resource)),
    updatePassword: createRequestHandler(handlers.updatePassword(resource)),
    forgotPassword: createRequestHandler(handlers.forgotPassword(resource)),
    verifyTwoFactor: createRequestHandler(handlers.verifyTwoFactor(resource)),
    updatePlan: createRequestHandler(handlers.updatePlan(resource)),

    // OAuth login — handler checks bond registry at request time.
    logInOAuth: createRequestHandler(handlers.logInOAuth(resource)),
  }

  // Payment handlers — two generic handlers that work with any bonded
  // payment provider. The provider name comes from the :provider route
  // parameter at request time. Adding a new payment provider requires
  // only a new bond package — no source changes here.
  const paymentProviders = getAll<PaymentProvider>('payments')
  if (paymentProviders.size > 0) {
    map.verifyPayment = createRequestHandler(handlers.verifyPayment(resource))
    map.handlePaymentNotification = createRequestHandler(
      handlers.handlePaymentNotification(resource),
    )
  }

  return map
}
