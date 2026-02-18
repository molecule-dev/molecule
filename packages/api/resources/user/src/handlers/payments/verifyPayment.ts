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
      if (
        provider.verifyFlow === 'subscription' ||
        (!provider.verifyFlow && provider.verifySubscription)
      ) {
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

      // Update user's plan.
      const id = req.params.id as string
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

      // Store payment record via bond.
      const records = get<PaymentRecordService>('paymentRecords')
      if (records && verified.transactionId) {
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
