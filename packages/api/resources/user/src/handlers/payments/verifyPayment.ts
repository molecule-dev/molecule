import { get, getAnalytics, getLogger, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'
import type { PaymentProvider, PaymentRecordService, PlanService } from '@molecule/api-payments'
import type { MoleculeRequest } from '@molecule/api-resource'
import { update as resourceUpdate } from '@molecule/api-resource'

import type * as types from '../../types.js'

const analytics = getAnalytics()
const logger = getLogger()

/**
 * Generic payment verification handler that works with any bonded PaymentProvider. Reads the
 * provider name from the `:provider` route parameter and dispatches based on `verifyFlow`:
 * - `'subscription'` (Stripe-style): Calls `verifySubscription(subscriptionId)`.
 * - Default (Apple/Google-style): Calls `verifyReceipt()` or `verifyPurchase()` with a receipt
 *   string and the plan's platform product ID.
 *
 * On successful verification, updates the user's plan (planKey, planExpiresAt, planAutoRenews)
 * and stores the payment record via the bonded PaymentRecordService.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler for payment verification.
 */
export const verifyPayment = ({ name, tableName, schema }: types.Resource) => {
  return async (req: MoleculeRequest) => {
    const providerName = req.params.provider as string

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
      const plans = bondRequire<PlanService>('plans')

      let verified: {
        productId: string
        transactionId?: string
        expiresAt?: string
        autoRenews?: boolean
        data?: unknown
      } | null = null
      let receipt: string | undefined

      // Dispatch based on verifyFlow (with method-existence fallback).
      const isSubscriptionFlow =
        provider.verifyFlow === 'subscription' ||
        (!provider.verifyFlow && !!provider.verifySubscription)
      if (isSubscriptionFlow) {
        // Stripe-style: subscriptionId in body or query.
        const subscriptionId = (req.body?.subscriptionId ?? req.query?.subscriptionId) as
          | string
          | undefined

        if (!subscriptionId) {
          return {
            statusCode: 400,
            body: {
              error: t('user.payment.subscriptionIdRequired', { provider: providerName }),
              errorKey: 'user.payment.subscriptionIdRequired',
            },
          }
        }

        if (!provider.verifySubscription) {
          return {
            statusCode: 500,
            body: {
              error: t('user.payment.verificationNotConfigured', { provider: providerName }),
              errorKey: 'user.payment.verificationNotConfigured',
            },
          }
        }

        verified = await provider.verifySubscription(subscriptionId)
      } else {
        // Apple/Google-style: receipt + planKey in body.
        const body = req.body || {}
        receipt = body.receipt as string | undefined
        const planKey = body.planKey as string | undefined

        if (!receipt || !planKey) {
          return {
            statusCode: 400,
            body: {
              error: t('user.payment.receiptAndPlanRequired', { provider: providerName }),
              errorKey: 'user.payment.receiptAndPlanRequired',
            },
          }
        }

        const plan = plans.findPlan(planKey)
        if (!plan || plan.platformKey !== providerName) {
          return {
            statusCode: 400,
            body: {
              error: t('user.payment.invalidPlan', { provider: providerName }),
              errorKey: 'user.payment.invalidPlan',
            },
          }
        }

        const verifyFn = provider.verifyReceipt ?? provider.verifyPurchase
        if (!verifyFn) {
          return {
            statusCode: 500,
            body: {
              error: t('user.payment.verificationNotConfigured', { provider: providerName }),
              errorKey: 'user.payment.verificationNotConfigured',
            },
          }
        }

        verified = await verifyFn.call(provider, receipt, plan.platformProductId)
      }

      if (!verified) {
        const id = req.params.id as string
        analytics
          .track({
            name: 'payment.verification_failed',
            userId: id,
            properties: { provider: providerName },
          })
          .catch(() => {})
        return {
          statusCode: 400,
          body: {
            error: t('user.payment.verificationFailed', { provider: providerName }),
            errorKey: 'user.payment.verificationFailed',
          },
        }
      }

      // Subscription-flow ownership binding. The resolved subscription must
      // belong to THIS user, so a caller cannot upgrade themselves by submitting
      // a subscription id they merely learned (leaked log / shared success_url /
      // support channel):
      //   • If the user already has a stored customer id for this provider, the
      //     verified subscription's customer MUST match it.
      //   • Otherwise (no prior record) a grant is only allowed when the
      //     verification came through the per-user, unguessable checkout-session
      //     redirect (`viaCheckoutSession`) — never from a bare, caller-supplied
      //     subscription id.
      if (isSubscriptionFlow) {
        const ownerId = req.params.id as string
        const data = (verified.data ?? {}) as { customerId?: string; viaCheckoutSession?: boolean }
        const verifiedCustomerId = data.customerId
        const records = get<PaymentRecordService>('paymentRecords')
        const existing = records ? await records.findByUserId(ownerId, providerName) : null
        const storedCustomerId = (existing?.data as { customerId?: string } | undefined)?.customerId

        const ownsByStoredCustomer =
          !!storedCustomerId && !!verifiedCustomerId && storedCustomerId === verifiedCustomerId
        const ownsByFreshCheckout = !storedCustomerId && data.viaCheckoutSession === true

        if (!ownsByStoredCustomer && !ownsByFreshCheckout) {
          analytics
            .track({
              name: 'payment.verification_ownership_rejected',
              userId: ownerId,
              properties: { provider: providerName },
            })
            .catch(() => {})
          return {
            statusCode: 403,
            body: {
              error: t(
                'user.payment.subscriptionOwnershipMismatch',
                { provider: providerName },
                { defaultValue: 'This subscription does not belong to your account.' },
              ),
              errorKey: 'user.payment.subscriptionOwnershipMismatch',
            },
          }
        }
      } else {
        // Receipt-flow (Apple/Google) ownership/replay binding (R2-1), mirroring
        // the subscription block above. A single purchased receipt must bind to
        // exactly ONE account (first-claim-wins) so it cannot be replayed to
        // upgrade many accounts. The atomic, race-safe backstop is the
        // insert-before-grant below; this is the fast, fail-closed pre-check.
        const ownerId = req.params.id as string

        // A receipt with no transaction id cannot be bound to a single account
        // and therefore cannot be protected from replay — fail closed rather
        // than grant an unbounded entitlement. (Google `latestOrderId` can be
        // missing.)
        if (!verified.transactionId) {
          analytics
            .track({
              name: 'payment.verification_failed',
              userId: ownerId,
              properties: { provider: providerName, reason: 'missing_transaction_id' },
            })
            .catch(() => {})
          return {
            statusCode: 400,
            body: {
              error: t('user.payment.verificationFailed', { provider: providerName }),
              errorKey: 'user.payment.verificationFailed',
            },
          }
        }

        const records = get<PaymentRecordService>('paymentRecords')
        const existing = records
          ? await records.findByTransaction(providerName, verified.transactionId)
          : null
        if (existing && existing.userId !== ownerId) {
          analytics
            .track({
              name: 'payment.verification_ownership_rejected',
              userId: ownerId,
              properties: { provider: providerName },
            })
            .catch(() => {})
          return {
            statusCode: 403,
            body: {
              error: t(
                'user.payment.transactionAlreadyClaimed',
                { provider: providerName },
                { defaultValue: 'This purchase is already associated with another account.' },
              ),
              errorKey: 'user.payment.transactionAlreadyClaimed',
            },
          }
        }
      }

      // Find matching plan from verified product.
      const plan = plans.findPlanByProductId(verified.productId)
      if (!plan) {
        return {
          statusCode: 400,
          body: {
            error: t('user.payment.unknownPlan', { provider: providerName }),
            errorKey: 'user.payment.unknownPlan',
          },
        }
      }

      const id = req.params.id as string
      const records = get<PaymentRecordService>('paymentRecords')

      // For the receipt (Apple/Google) flow, bind the transaction to THIS user
      // BEFORE granting the plan — fail-closed, first-claim-wins. The
      // UNIQUE(platformKey, transactionId) index makes a second account's insert
      // fail; `store()` surfaces that conflict (rather than swallowing it) so a
      // replayed receipt is rejected here instead of being granted (R2-1). The
      // subscription flow keeps its existing post-grant store (its ownership was
      // already enforced above).
      if (!isSubscriptionFlow && records && verified.transactionId) {
        try {
          await records.store({
            userId: id,
            platformKey: providerName,
            transactionId: verified.transactionId,
            productId: verified.productId,
            data: verified.data || {},
            ...(receipt ? { receipt } : {}),
          })
        } catch (error) {
          // Conflict: the transaction is already bound. Determine the owner —
          // if it belongs to another account, reject WITHOUT granting; if it is
          // this user re-verifying their own receipt, fall through to an
          // idempotent re-grant.
          const owner = await records.findByTransaction(providerName, verified.transactionId)
          if (!owner || owner.userId !== id) {
            analytics
              .track({
                name: 'payment.verification_ownership_rejected',
                userId: id,
                properties: { provider: providerName },
              })
              .catch(() => {})
            return {
              statusCode: 403,
              body: {
                error: t(
                  'user.payment.transactionAlreadyClaimed',
                  { provider: providerName },
                  { defaultValue: 'This purchase is already associated with another account.' },
                ),
                errorKey: 'user.payment.transactionAlreadyClaimed',
              },
            }
          }
          // Same user re-verifying their own receipt → idempotent re-grant.
          logger.warn('Receipt already recorded for this user; re-granting idempotently', { error })
        }
      }

      // Update user's plan.
      const updateUser = resourceUpdate<types.UpdatePlanProps>({
        name,
        tableName,
        schema,
      } as unknown as Parameters<typeof resourceUpdate<types.UpdatePlanProps>>[0])

      const result = await updateUser({
        id,
        props: {
          planKey: plan.planKey,
          planExpiresAt: verified.expiresAt,
          planAutoRenews: verified.autoRenews,
        },
      })

      analytics
        .track({
          name: 'payment.verified',
          userId: id,
          properties: {
            provider: providerName,
            productId: verified.productId,
            planKey: plan.planKey,
          },
        })
        .catch(() => {})

      // Store payment record via bond (subscription flow only — the receipt flow
      // already bound its record above, before granting).
      if (isSubscriptionFlow && records && verified.transactionId) {
        await records
          .store({
            userId: id,
            platformKey: providerName,
            transactionId: verified.transactionId,
            productId: verified.productId,
            data: verified.data || {},
            ...(receipt ? { receipt } : {}),
          })
          .catch((error) => logger.error('Failed to store payment:', error))
      }

      return result
    } catch (error) {
      logger.error(`${providerName} verifyPayment error:`, error)
      return {
        statusCode: 500,
        body: {
          error: t('user.payment.verificationFailed', { provider: providerName }),
          errorKey: 'user.payment.verificationFailed',
        },
      }
    }
  }
}
