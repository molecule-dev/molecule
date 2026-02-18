import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import type { PaymentProvider, PaymentRecordService, PlanService } from '@molecule/api-payments'
import type { MoleculeRequest } from '@molecule/api-resource'
import { update as resourceUpdate } from '@molecule/api-resource'

import type * as types from '../../types.js'

const analytics = getAnalytics()
const logger = getLogger()

/**
 * Generic payment notification handler that works with any bonded PaymentProvider. Reads the
 * provider name from the `:provider` route parameter and dispatches based on `notificationFlow`:
 * - `'webhook'` (Stripe-style): Calls `handleWebhookEvent()` to parse signed webhook payloads,
 *   then looks up the user via PaymentRecordService by customer ID.
 * - Default (Apple/Google-style): Calls `parseNotification()` for server-to-server notifications,
 *   then looks up the user via PaymentRecordService by transaction ID.
 *
 * Updates the user's plan on renewal/change or clears it on cancellation/expiry/refund/revocation.
 * Always returns 200 to acknowledge receipt.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler for payment provider notifications.
 */
export const handlePaymentNotification = ({ name, tableName, schema }: types.Resource) => {
  return async (req: MoleculeRequest) => {
    const okResponse = { statusCode: 200, body: 'OK' }
    const providerName = req.params.provider as string

    if (!providerName) return okResponse

    try {
      const provider = get<PaymentProvider>('payments', providerName)
      if (!provider) return okResponse

      const plans = get<PlanService>('plans')
      if (!plans) return okResponse

      const records = get<PaymentRecordService>('paymentRecords')

      const updateUser = resourceUpdate({
        name,
        tableName,
        schema,
      })

      const cancelTypes = ['canceled', 'expired', 'refund', 'revoked']

      // Dispatch based on notificationFlow (with method-existence fallback).
      if (
        provider.notificationFlow === 'webhook' ||
        (!provider.notificationFlow && provider.handleWebhookEvent)
      ) {
        // Stripe-style: signed webhook with event type in payload.
        if (!provider.handleWebhookEvent) return okResponse

        const event = await provider.handleWebhookEvent(req)
        if (!event) {
          return { statusCode: 400, body: { error: 'Invalid webhook event' } }
        }

        const subscription = event.subscription
        if (!subscription?.customerId) return okResponse

        // Find user by customer ID via PaymentRecordService.
        const payment = records
          ? await records.findByCustomerData(providerName, 'customerId', subscription.customerId)
          : null

        if (!payment) {
          logger.error(
            `${providerName} webhook: no user found for customer ${subscription.customerId}`,
          )
          return okResponse
        }

        const plan = subscription.productId
          ? plans.findPlanByProductId(subscription.productId)
          : null

        analytics
          .track({
            name: 'payment.notification_received',
            userId: payment.userId,
            properties: { provider: providerName, type: event.type },
          })
          .catch(() => {})

        if (cancelTypes.includes(event.type)) {
          await updateUser({
            id: payment.userId,
            props: {
              planKey: '',
              planAutoRenews: false,
            },
          })
          analytics
            .track({
              name: 'payment.subscription_canceled',
              userId: payment.userId,
              properties: { provider: providerName, type: event.type },
            })
            .catch(() => {})
        } else if (plan) {
          await updateUser({
            id: payment.userId,
            props: {
              planKey: plan.planKey,
              planExpiresAt: subscription.expiresAt,
              planAutoRenews: subscription.autoRenews,
            },
          })
          analytics
            .track({
              name: 'payment.subscription_renewed',
              userId: payment.userId,
              properties: { provider: providerName, planKey: plan.planKey },
            })
            .catch(() => {})
        }

        return okResponse
      }

      // Apple/Google-style: server-to-server notification.
      if (!provider.parseNotification) return okResponse

      const notification = await provider.parseNotification(req.body)
      if (!notification?.transactionId) return okResponse

      // Find existing payment by transaction ID via PaymentRecordService.
      const existingPayment = records
        ? await records.findByTransaction(providerName, notification.transactionId)
        : null

      if (!existingPayment) return okResponse

      analytics
        .track({
          name: 'payment.notification_received',
          userId: existingPayment.userId,
          properties: { provider: providerName, type: notification.type },
        })
        .catch(() => {})

      const plan = notification.productId ? plans.findPlanByProductId(notification.productId) : null

      if (cancelTypes.includes(notification.type)) {
        await updateUser({
          id: existingPayment.userId,
          props: {
            planKey: '',
            planAutoRenews: false,
          },
        })
        analytics
          .track({
            name: 'payment.subscription_canceled',
            userId: existingPayment.userId,
            properties: { provider: providerName, type: notification.type },
          })
          .catch(() => {})
      } else if (plan && notification.expiresAt) {
        await updateUser({
          id: existingPayment.userId,
          props: {
            planKey: plan.planKey,
            planExpiresAt: notification.expiresAt,
            planAutoRenews: notification.autoRenews ?? true,
          },
        })
        analytics
          .track({
            name: 'payment.subscription_renewed',
            userId: existingPayment.userId,
            properties: { provider: providerName, planKey: plan.planKey },
          })
          .catch(() => {})
      }

      return okResponse
    } catch (error) {
      logger.error(`${providerName} handlePaymentNotification error:`, error)
      return okResponse
    }
  }
}
