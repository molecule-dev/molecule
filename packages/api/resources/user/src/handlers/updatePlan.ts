import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import type { PaymentProvider, PlanService } from '@molecule/api-payments'
import type { MoleculeRequest } from '@molecule/api-resource'
import { update as resourceUpdate } from '@molecule/api-resource'

import { updatePlanPropsSchema } from '../schema.js'
import type * as types from '../types.js'

const analytics = getAnalytics()
const logger = getLogger()

/** Request body for plan update, containing the target plan key. */
export interface UpdatePlanRequest extends MoleculeRequest {
  body: {
    planKey?: string
  }
}

/**
 * Updates a user's subscription plan. Uses the bonded PlanService to look up plan metadata and
 * delegates to the appropriate bonded PaymentProvider based on the plan's `platformKey`. Handles
 * cross-platform subscription cancellation when switching providers. Returns a checkout URL
 * (status 201) for new subscriptions, or directly updates the user record for in-place changes
 * and free plan downgrades.
 * @param resource - The user resource configuration (name, tableName, schema).
 * @param resource.name - The resource name.
 * @param resource.tableName - The database table name for users.
 * @param resource.schema - The validation schema for user properties.
 * @returns A request handler for plan updates.
 */
export const updatePlan = ({ name, tableName, schema: _schema }: types.Resource) => {
  const updateResource = resourceUpdate({
    name,
    tableName,
    schema: updatePlanPropsSchema,
  })

  return async (req: UpdatePlanRequest) => {
    try {
      const id = req.params.id as string
      const { planKey } = req.body

      if (!planKey && planKey !== '') {
        return {
          statusCode: 400,
          body: { error: t('user.error.planKeyRequired'), errorKey: 'user.error.planKeyRequired' },
        }
      }

      // Get the user.
      const user = await findById<types.Props>(tableName, id)

      if (!user) {
        return {
          statusCode: 404,
          body: { error: t('user.error.notFound'), errorKey: 'user.error.notFound' },
        }
      }

      // Try to get plans from bond.
      const plans = get<PlanService>('plans')

      if (plans) {
        const plan = plans.findPlan(planKey)
        const previousPlan = plans.findPlan(user.planKey || '')

        if (!plan) {
          return {
            statusCode: 400,
            body: { error: t('user.error.invalidPlan'), errorKey: 'user.error.invalidPlan' },
          }
        }

        // If switching away from a different platform, cancel the previous subscription.
        if (
          previousPlan &&
          previousPlan.platformKey &&
          previousPlan.platformKey !== plan.platformKey
        ) {
          const previousProvider = get<PaymentProvider>('payments', previousPlan.platformKey)
          if (previousProvider?.cancelSubscription) {
            await previousProvider.cancelSubscription({ userId: user.id })
          }
        }

        // Delegate to platform-specific payment provider if available.
        if (plan.platformKey) {
          const paymentProvider = get<PaymentProvider>('payments', plan.platformKey)
          if (paymentProvider?.updateSubscription) {
            const result = await paymentProvider.updateSubscription({
              userId: user.id,
              newProductId: plan.platformProductId,
              previousProductId: previousPlan?.platformProductId,
            })

            if (result.checkoutUrl) {
              // New subscription requires checkout — return the URL to the client.
              analytics
                .track({
                  name: 'user.plan_checkout_created',
                  userId: id,
                  properties: {
                    previousPlanKey: previousPlan?.planKey,
                    newPlanKey: plan.planKey,
                    platformKey: plan.platformKey,
                  },
                })
                .catch(() => {})
              return { statusCode: 201, body: { checkoutUrl: result.checkoutUrl } }
            }

            if (result.updated) {
              // Subscription was updated in-place — update the user record.
              analytics
                .track({
                  name: 'user.plan_updated',
                  userId: id,
                  properties: {
                    previousPlanKey: previousPlan?.planKey,
                    newPlanKey: plan.planKey,
                    platformKey: plan.platformKey,
                  },
                })
                .catch(() => {})
              return await updateResource({
                id,
                props: {
                  planKey: plan.planKey,
                  planExpiresAt: result.subscription?.expiresAt,
                  planAutoRenews: result.subscription?.autoRenews,
                },
              })
            }

            analytics
              .track({
                name: 'user.plan_update_failed',
                userId: id,
                properties: {
                  previousPlanKey: previousPlan?.planKey,
                  newPlanKey: plan.planKey,
                  platformKey: plan.platformKey,
                },
              })
              .catch(() => {})
            return {
              statusCode: 400,
              body: {
                error: t('user.error.failedToUpdateSubscription'),
                errorKey: 'user.error.failedToUpdateSubscription',
              },
            }
          }
        }

        // No platform handler — free plan or direct update.
        if (plan.planKey === '') {
          // Switching to free plan. Keep current planKey if subscription hasn't expired yet.
          const now = new Date().getTime()
          const expires = new Date(user.planExpiresAt || 0).getTime()
          analytics
            .track({
              name: 'user.plan_updated',
              userId: id,
              properties: { previousPlanKey: previousPlan?.planKey, newPlanKey: '' },
            })
            .catch(() => {})
          return await updateResource({
            id,
            props: {
              planKey: now > expires ? plan.planKey : (user.planKey ?? plan.planKey),
              planAutoRenews: false,
            },
          })
        }

        analytics
          .track({
            name: 'user.plan_updated',
            userId: id,
            properties: { previousPlanKey: previousPlan?.planKey, newPlanKey: planKey },
          })
          .catch(() => {})
        return await updateResource({
          id,
          props: {
            planKey,
            planExpiresAt: undefined,
            planAutoRenews: false,
          },
        })
      }

      // No plans service bonded - just update planKey directly.
      analytics
        .track({
          name: 'user.plan_updated',
          userId: id,
          properties: { newPlanKey: planKey },
        })
        .catch(() => {})
      return await updateResource({ id, props: { planKey } })
    } catch (error) {
      logger.error(error)
      return {
        statusCode: 500,
        body: {
          error: t('user.error.failedToUpdatePlan'),
          errorKey: 'user.error.failedToUpdatePlan',
        },
      }
    }
  }
}
