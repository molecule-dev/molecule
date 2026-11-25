import { Router } from 'express'

import { createRequestHandler } from '@molecule/api-resource'
import { authorizers, handlers, resource } from '@molecule/api-resource-user'

const router = Router()
const create = handlers.create(resource)
const logIn = handlers.logIn(resource)
const auth = authorizers.auth()
const authSelf = authorizers.authSelf()
const rateLimitAuth = authorizers.rateLimit({
  scope: 'auth',
  accountFrom: [authorizers.loginAccountKey, authorizers.emailAccountKey],
})
const rateLimitTwoFactor = authorizers.rateLimit({
  scope: '2fa',
  max: 5,
  accountFrom: [authorizers.paramIdAccountKey],
})

// Edit paths, incoming fields and JSON here. The account services own passwords,
// credential checks, device sessions, and user storage.
router.post('/users', async (req, res) => {
  const result = await create(req, res)
  res.status(result.statusCode).json(result.body)
})

router.post('/users/log-in', rateLimitAuth, async (req, res) => {
  const result = await logIn(req, res)
  res.status(result.statusCode).json(result.body)
})

router.post('/users/logout', auth, createRequestHandler(handlers.logout()))

// Keep current-user lookup before the parameterized route.
router.get('/users/me', auth, createRequestHandler(handlers.readSelf(resource)))
router.get('/users/:id', authSelf, createRequestHandler(handlers.read(resource)))
router.patch('/users/:id', authSelf, createRequestHandler(handlers.update(resource)))
router.delete('/users/:id', authSelf, createRequestHandler(handlers.del(resource)))
router.patch(
  '/users/:id/password',
  authSelf,
  createRequestHandler(handlers.updatePassword(resource)),
)

/**
 * OAuth initiation and credential exchange routes, mounted when the stack has an OAuth provider.
 */
export const oauthRouter = Router()
oauthRouter.get(
  '/users/oauth/:provider',
  rateLimitAuth,
  createRequestHandler(handlers.oauthAuthorize()),
)
oauthRouter.post(
  '/users/log-in/oauth',
  rateLimitAuth,
  createRequestHandler(handlers.logInOAuth(resource)),
)

/** Password reset by email, mounted with an email transport, which sends the reset link. */
export const emailsRouter = Router()
emailsRouter.post(
  '/users/forgot-password',
  rateLimitAuth,
  createRequestHandler(handlers.forgotPassword(resource)),
)
emailsRouter.post(
  '/users/reset-password',
  rateLimitAuth,
  createRequestHandler(handlers.resetPassword(resource)),
)

/**
 * Two-factor set-up, enabling and disabling, mounted with a two-factor provider, which checks the
 * codes.
 */
export const twoFactorRouter = Router()
twoFactorRouter.post(
  '/users/:id/verify-two-factor',
  authSelf,
  rateLimitTwoFactor,
  createRequestHandler(handlers.verifyTwoFactor(resource)),
)

/**
 * Plan changes, authenticated billing routes and the provider webhook, mounted with a payments
 * provider.
 */
export const paymentsRouter = Router()
paymentsRouter.patch(
  '/users/:id/plan',
  authSelf,
  createRequestHandler(handlers.updatePlan(resource)),
)
const verifyPayment = createRequestHandler(handlers.verifyPayment(resource))
paymentsRouter.get('/users/:id/verify-payment/:provider', authSelf, verifyPayment)
paymentsRouter.post('/users/:id/verify-payment/:provider', authSelf, verifyPayment)
paymentsRouter.post(
  '/users/:id/billing-portal/:provider',
  authSelf,
  createRequestHandler(handlers.billingPortal()),
)
paymentsRouter.post(
  '/users/payment-notification/:provider',
  authorizers.requireWebhookAuthenticity(),
  createRequestHandler(handlers.handlePaymentNotification(resource)),
)

export default router
