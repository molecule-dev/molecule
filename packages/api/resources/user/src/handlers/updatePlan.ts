import { get, getAnalytics, getLogger } from '@molecule/api-bond'
import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import {
  isConfigNotConfiguredError,
  type PaymentProvider,
  type PlanService,
} from '@molecule/api-payments'
import type { MoleculeRequest } from '@molecule/api-resource'
import { update as resourceUpdate } from '@molecule/api-resource'

import { updatePlanPropsSchema } from '../schema.js'
import type * as types from '../types.js'
import { invalidateEntitlementsCacheSafe } from '../utilities/invalidateEntitlements.js'

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

  /**
   * Fire-and-forget analytics with the failure logged (never thrown): a lost
   * funnel event must not break a plan update, but it must not vanish either.
   *
   * @param name - The analytics event name.
   * @param userId - The user the event belongs to.
   * @param properties - Event properties.
   */
  const trackSafe = (name: string, userId: string, properties: Record<string, unknown>): void => {
    analytics.track({ name, userId, properties }).catch((error) => {
      logger.debug(`Analytics track failed for ${name} (best-effort)`, { userId, error })
    })
  }

  /**
   * Log a rejected plan update before returning its 4xx. Every rejection here
   * ends a PAID-conversion attempt, and an unlogged one leaves zero server-side
   * trace when a user reports "the upgrade button did nothing".
   *
   * @param reason - Human-readable rejection reason.
   * @param context - Request context (userId, planKey, errorKey, ...).
   */
  const logRejection = (reason: string, context: Record<string, unknown>): void => {
    logger.warn(`Plan update rejected: ${reason}`, context)
  }

  return async (req: UpdatePlanRequest) => {
    try {
      const id = req.params.id as string
      const { planKey } = req.body

      if (!planKey && planKey !== '') {
        logRejection('no planKey in request body', {
          userId: id,
          errorKey: 'user.error.planKeyRequired',
        })
        return {
          statusCode: 400,
          body: { error: t('user.error.planKeyRequired'), errorKey: 'user.error.planKeyRequired' },
        }
      }

      // Get the user.
      const user = await findById<types.Props>(tableName, id)

      if (!user) {
        logRejection('user not found', { userId: id, errorKey: 'user.error.notFound' })
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
          logRejection('planKey not in the plan catalogue', {
            userId: id,
            planKey,
            errorKey: 'user.error.invalidPlan',
          })
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
              trackSafe('user.plan_checkout_created', id, {
                previousPlanKey: previousPlan?.planKey,
                newPlanKey: plan.planKey,
                platformKey: plan.platformKey,
              })
              return { statusCode: 201, body: { checkoutUrl: result.checkoutUrl } }
            }

            if (result.updated) {
              // Subscription was updated in-place — update the user record.
              trackSafe('user.plan_updated', id, {
                previousPlanKey: previousPlan?.planKey,
                newPlanKey: plan.planKey,
                platformKey: plan.platformKey,
              })
              const updated = await updateResource({
                id,
                props: {
                  planKey: plan.planKey,
                  planExpiresAt: result.subscription?.expiresAt,
                  planAutoRenews: result.subscription?.autoRenews,
                },
              })
              // Drop the cached plan key so the plan change takes effect
              // immediately, not after the entitlements cache TTL.
              invalidateEntitlementsCacheSafe(id)
              return updated
            }

            trackSafe('user.plan_update_failed', id, {
              previousPlanKey: previousPlan?.planKey,
              newPlanKey: plan.planKey,
              platformKey: plan.platformKey,
            })
            // The provider swallowed its own error into { updated: false } (a
            // declined card, an unknown price id, a misconfigured product) —
            // this line is the only request-scoped trace of a LOST conversion.
            logRejection('payment provider did not update the subscription', {
              userId: id,
              planKey,
              platformKey: plan.platformKey,
              errorKey: 'user.error.failedToUpdateSubscription',
            })
            return {
              statusCode: 400,
              body: {
                error: t('user.error.failedToUpdateSubscription'),
                errorKey: 'user.error.failedToUpdateSubscription',
              },
            }
          }

          // The plan is tied to a payment platform, but the bonded provider has
          // no in-place `updateSubscription` (e.g. Apple/Google receipt-only
          // providers). NEVER direct-set a paid planKey without a positive
          // provider confirmation — activation MUST go through receipt
          // verification (POST /users/:id/verify-payment/:provider). Falling
          // through here previously let a user self-grant a paid (Pro) plan with
          // no payment.
          logRejection('provider has no updateSubscription — verification required', {
            userId: id,
            planKey,
            platformKey: plan.platformKey,
            errorKey: 'user.error.subscriptionActivationRequiresVerification',
          })
          return {
            statusCode: 400,
            body: {
              error: t('user.error.subscriptionActivationRequiresVerification', undefined, {
                defaultValue:
                  'Subscription activation must go through receipt verification — use POST /users/:id/verify-payment/:provider.',
              }),
              errorKey: 'user.error.subscriptionActivationRequiresVerification',
            },
          }
        }

        // No platform handler — free-plan downgrade only.
        if (plan.planKey === '') {
          // Switching to free plan. Keep current planKey if subscription hasn't expired yet.
          const now = new Date().getTime()
          const expires = new Date(user.planExpiresAt || 0).getTime()
          trackSafe('user.plan_updated', id, {
            previousPlanKey: previousPlan?.planKey,
            newPlanKey: '',
          })
          const downgraded = await updateResource({
            id,
            props: {
              planKey: now > expires ? plan.planKey : (user.planKey ?? plan.planKey),
              planAutoRenews: false,
            },
          })
          // Drop the cached plan key so the downgrade takes effect
          // immediately, not after the entitlements cache TTL.
          invalidateEntitlementsCacheSafe(id)
          return downgraded
        }

        // A non-free plan with NO payment platform handler cannot be confirmed
        // by any provider — refuse to grant it. Only the free plan ('') may be
        // written without provider confirmation (handled above); every paid
        // planKey must go through a provider `updateSubscription`
        // (checkout/in-place) or receipt verification
        // (POST /users/:id/verify-payment/:provider). This closes the
        // self-grant escalation where a user PATCHed a paid planKey directly.
        logRejection('paid plan has no payment platform handler', {
          userId: id,
          planKey,
          errorKey: 'user.error.subscriptionActivationRequiresVerification',
        })
        return {
          statusCode: 400,
          body: {
            error: t('user.error.subscriptionActivationRequiresVerification', undefined, {
              defaultValue:
                'Subscription activation must go through receipt verification — use POST /users/:id/verify-payment/:provider.',
            }),
            errorKey: 'user.error.subscriptionActivationRequiresVerification',
          },
        }
      }

      // No plans service bonded — only allow downgrade to free plan.
      // Upgrades MUST go through a bonded PlanService + PaymentProvider to prevent
      // privilege escalation (users setting planKey to a paid tier without payment).
      if (planKey !== '') {
        logRejection('no plans service bonded — paid planKey refused', {
          userId: id,
          planKey,
          errorKey: 'user.error.failedToUpdatePlan',
        })
        return {
          statusCode: 400,
          body: {
            error: t('user.error.failedToUpdatePlan'),
            errorKey: 'user.error.failedToUpdatePlan',
          },
        }
      }
      trackSafe('user.plan_updated', id, { newPlanKey: planKey })
      const result = await updateResource({ id, props: { planKey, planAutoRenews: false } })
      // Drop the cached plan key so the downgrade takes effect immediately,
      // not after the entitlements cache TTL.
      invalidateEntitlementsCacheSafe(id)
      return result
    } catch (error) {
      // A bonded payment provider rethrows a tagged config-not-configured
      // error (e.g. STRIPE_SECRET_KEY unset) instead of swallowing it — pass
      // its REAL statusCode/errorKey through instead of flattening it to a
      // generic 500. Otherwise a missing secret is indistinguishable from an
      // unexpected server error at the exact moment a user tries to upgrade.
      if (isConfigNotConfiguredError(error)) {
        logger.warn(error.message, { errorKey: error.errorKey })
        return {
          statusCode: error.statusCode,
          body: { error: error.message, errorKey: error.errorKey },
        }
      }
      logger.error('Plan update failed', {
        userId: req.params.id,
        planKey: req.body?.planKey,
        error,
      })
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
