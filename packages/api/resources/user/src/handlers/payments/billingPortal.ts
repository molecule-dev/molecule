import { getAnalytics, getLogger, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'
import {
  isConfigNotConfiguredError,
  type PaymentProvider,
  resolveBillingPortalReturnUrl,
} from '@molecule/api-payments'
import type { MoleculeRequest } from '@molecule/api-resource'

const analytics = getAnalytics()
const logger = getLogger()

/**
 * Opens the bonded provider's hosted billing portal for the user, so they can
 * update their payment method, see invoices, and cancel — the self-service
 * surface an app otherwise has to build (and usually doesn't, leaving a
 * subscriber with no way out but support).
 *
 * Reads the provider name from the `:provider` route parameter and returns the
 * portal URL for the client to open. Providers whose purchases are managed by
 * the platform store (Apple/Google) implement no portal and answer 400 —
 * their subscribers manage the subscription in the store app.
 *
 * The user is returned to the APP origin on exit (never the API origin, whose
 * host holds no session cookie); an app-relative `returnPath` in the request
 * body sends them back to the exact page they opened the portal from.
 * @returns A request handler that responds `{ url, id }` with the portal session.
 */
export const billingPortal = () => {
  return async (req: MoleculeRequest) => {
    const providerName = req.params.provider as string
    const id = req.params.id as string

    if (!providerName) {
      return {
        statusCode: 400,
        body: {
          error: t('user.payment.providerRequired'),
          errorKey: 'user.payment.providerRequired',
        },
      }
    }

    try {
      const provider = bondRequire<PaymentProvider>('payments', providerName)

      if (!provider.createPortalSession) {
        return {
          statusCode: 400,
          body: {
            error: t(
              'user.payment.portalNotSupported',
              { provider: providerName },
              { defaultValue: '{{provider}} does not offer a billing portal.' },
            ),
            errorKey: 'user.payment.portalNotSupported',
          },
        }
      }

      const session = await provider.createPortalSession({
        userId: id,
        returnUrl: resolveBillingPortalReturnUrl(req.body?.returnPath as string | undefined),
      })

      if (!session?.url) {
        // No customer record for this user (never purchased, or the purchase
        // was never linked) — a distinct, actionable outcome, not a failure.
        return {
          statusCode: 404,
          body: {
            error: t(
              'user.payment.noBillingAccount',
              { provider: providerName },
              { defaultValue: 'No {{provider}} billing account found for this user.' },
            ),
            errorKey: 'user.payment.noBillingAccount',
          },
        }
      }

      analytics
        .track({
          name: 'payment.portal_opened',
          userId: id,
          properties: { provider: providerName },
        })
        .catch(() => {})

      return { statusCode: 200, body: { id: session.id, url: session.url } }
    } catch (error) {
      // A missing provider secret is a config problem, not a billing problem —
      // pass its real 503 + errorKey through so the operator sees which key to
      // set (same contract as verifyPayment).
      if (isConfigNotConfiguredError(error)) {
        logger.warn(error.message, { errorKey: error.errorKey, provider: providerName })
        return {
          statusCode: error.statusCode,
          body: { error: error.message, errorKey: error.errorKey },
        }
      }
      logger.error(`${providerName} billingPortal error:`, error)
      return {
        statusCode: 500,
        body: {
          error: t(
            'user.payment.portalFailed',
            { provider: providerName },
            { defaultValue: 'Could not open the {{provider}} billing portal.' },
          ),
          errorKey: 'user.payment.portalFailed',
        },
      }
    }
  }
}
