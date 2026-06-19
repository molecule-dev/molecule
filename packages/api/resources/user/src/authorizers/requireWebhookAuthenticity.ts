import crypto from 'node:crypto'

import { get } from '@molecule/api-bond'
import { get as getConfig } from '@molecule/api-config'
import { t } from '@molecule/api-i18n'
import type { PaymentProvider } from '@molecule/api-payments'
import type { MoleculeRequestHandler } from '@molecule/api-resource'

/**
 * Constant-time string comparison. Returns `false` on length mismatch and
 * otherwise uses `crypto.timingSafeEqual`, so the shared-secret check does not
 * leak via comparison timing.
 * @param a - First string.
 * @param b - Second string.
 * @returns `true` if the strings are equal.
 */
const timingSafeEqualString = (a: string, b: string): boolean => {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) {
    return false
  }
  return crypto.timingSafeEqual(ab, bb)
}

/**
 * Middleware guarding the public `POST /users/payment-notification/:provider`
 * endpoint against forged server-to-server (Apple/Google IAP) notifications.
 *
 * Self-verifying webhook providers (e.g. Stripe) authenticate the payload by
 * cryptographic signature INSIDE the handler (`constructEvent`), so they pass
 * through untouched.
 *
 * Server-to-server providers (Apple/Google RTDN) carry no transport signature —
 * their endpoint is otherwise open to anyone — so a shared secret is REQUIRED by
 * default ("IAP apps are not open by default"). The secret is supplied via the
 * `x-payment-notification-secret` header or `?secret=` query param (configure
 * the provider's notification URL accordingly) and is compared in constant time
 * against `PAYMENT_NOTIFICATION_SECRET`. Deployments that rely solely on the
 * provider's in-handler receipt re-verification can opt out with
 * `PAYMENT_NOTIFICATION_REQUIRE_SECRET=false` — but the secure behavior ships ON
 * by default and is never relaxed based on request presence.
 *
 * @returns An Express-compatible middleware function.
 */
export const requireWebhookAuthenticity = (): MoleculeRequestHandler => (req, res, next) => {
  try {
    const rawProvider = req.params.provider
    const providerName = (Array.isArray(rawProvider) ? rawProvider[0] : rawProvider) as
      | string
      | undefined
    const provider = providerName ? get<PaymentProvider>('payments', providerName) : null

    // Self-verifying webhook providers (Stripe) verify the signature in the
    // handler — let them through.
    if (
      provider &&
      (provider.notificationFlow === 'webhook' ||
        (!provider.notificationFlow && provider.handleWebhookEvent))
    ) {
      return next()
    }

    // Explicit opt-out for operators relying on in-provider receipt
    // re-verification (Apple/Google) instead of an edge secret.
    const requireSecret =
      getConfig<string>('PAYMENT_NOTIFICATION_REQUIRE_SECRET', 'true') !== 'false'
    if (!requireSecret) {
      return next()
    }

    const configured = getConfig<string>('PAYMENT_NOTIFICATION_SECRET', '') || ''
    const headerVal = req.headers['x-payment-notification-secret']
    const headerSecret = Array.isArray(headerVal) ? headerVal[0] : headerVal
    const querySecret = typeof req.query?.secret === 'string' ? req.query.secret : undefined
    const supplied = headerSecret || querySecret

    if (configured && supplied && timingSafeEqualString(configured, supplied)) {
      return next()
    }
  } catch (_error) {
    // Any failure resolving the provider/secret falls through to the safe
    // reject below — fail closed, never open.
  }
  return next(
    t('user.error.webhookUnauthorized', undefined, {
      defaultValue: 'Unauthorized payment notification',
    }),
  )
}
