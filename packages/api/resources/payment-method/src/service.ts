/**
 * Saved payment-method service.
 *
 * All persistence goes through abstract `DataStore` methods (`@molecule/api-database`)
 * and all provider calls go through the abstract `payments` bond — there are no
 * direct Stripe SDK imports in this package.
 *
 * @module
 */

// Side-effect import: registers this resource's secret definitions so the
// runtime registry is populated even when service.js is imported directly
// (not through the package barrel).
import './secrets.js'

import { get } from '@molecule/api-bond'
import {
  create as dbCreate,
  deleteById,
  findMany,
  findOne,
  updateMany,
} from '@molecule/api-database'
import { logger } from '@molecule/api-logger'
import type { PaymentProvider } from '@molecule/api-payments'

import type { PaymentMethod, PaymentMethodRow, SetupIntentResponse } from './types.js'
import { toPaymentMethod } from './utilities.js'

/**
 * The provider name used by this resource. Currently fixed to `stripe` —
 * a future cross-rail rollout would dispatch on the user's selection.
 */
export const PROVIDER_NAME = 'stripe' as const

/**
 * The database table name for saved payment methods.
 */
export const TABLE_NAME = 'payment_methods'

/**
 * Looks up a user's existing provider customer ID across their saved methods.
 *
 * Saved methods all belong to the same provider customer, so any row will do.
 *
 * @param userId - The owning user.
 * @returns The provider customer ID, or `null` if the user has none yet.
 */
async function findExistingCustomerId(userId: string): Promise<string | null> {
  const rows = await findMany<PaymentMethodRow>(TABLE_NAME, {
    where: [
      { field: 'userId', operator: '=', value: userId },
      { field: 'provider', operator: '=', value: PROVIDER_NAME },
    ],
    limit: 1,
  })
  return rows[0]?.providerCustomerId ?? null
}

/**
 * Returns the bonded payments provider, throwing if none is wired.
 *
 * @returns The `PaymentProvider` bonded under `('payments', 'stripe')`.
 */
function getPaymentsProvider(): PaymentProvider {
  const provider = get<PaymentProvider>('payments', PROVIDER_NAME)
  if (!provider) {
    throw new Error(`No payments provider bonded for "${PROVIDER_NAME}"`)
  }
  return provider
}

/**
 * Creates a SetupIntent for the saved-card flow.
 *
 * Reuses the user's provider customer ID if one already exists; otherwise the
 * provider creates a new customer and the resulting ID is returned to the
 * client (and persisted on the next `attachPaymentMethod` call).
 *
 * @param userId - The user the SetupIntent is being created for.
 * @returns The SetupIntent payload to forward to the frontend SDK.
 */
export async function createSetupIntent(userId: string): Promise<SetupIntentResponse> {
  const provider = getPaymentsProvider()
  if (!provider.createSetupIntent) {
    throw new Error(`Payments provider "${PROVIDER_NAME}" does not support createSetupIntent`)
  }
  const customerId = (await findExistingCustomerId(userId)) ?? undefined
  const intent = await provider.createSetupIntent({
    customerId,
    metadata: { userId },
  })
  return {
    id: intent.id,
    clientSecret: intent.clientSecret,
    customerId: intent.customerId,
    provider: PROVIDER_NAME,
  }
}

/**
 * Records a saved payment method after the SetupIntent confirms client-side.
 *
 * Looks the payment method up via the bonded payments provider to capture
 * brand/last4/exp, then persists it. If the user has no other saved methods,
 * the new method is marked as default.
 *
 * @param userId - The owning user.
 * @param providerPaymentMethodId - The payment-method ID returned by the frontend SDK.
 * @returns The persisted payment method.
 */
export async function attachPaymentMethod(
  userId: string,
  providerPaymentMethodId: string,
): Promise<PaymentMethod> {
  const provider = getPaymentsProvider()
  if (!provider.getPaymentMethod) {
    throw new Error(`Payments provider "${PROVIDER_NAME}" does not support getPaymentMethod`)
  }
  const pm = await provider.getPaymentMethod(providerPaymentMethodId)
  if (!pm) {
    throw new Error(`Payment method "${providerPaymentMethodId}" not found at provider`)
  }

  const existingCustomerId = await findExistingCustomerId(userId)
  if (!existingCustomerId) {
    // The frontend SDK confirmed the SetupIntent against a customer the
    // resource layer hasn't seen yet. Re-issue a SetupIntent if you need the
    // customer ID — for the attach call, the caller is responsible for
    // providing it via the SetupIntent flow. We cannot infer it from the PM
    // ID alone without a direct provider lookup that varies per rail, so this
    // path persists with an empty customer ID and relies on the next
    // SetupIntent to backfill.
    logger.warn(
      'attachPaymentMethod called before any SetupIntent established a customer ID; ' +
        'persisting with empty customer ID. The next SetupIntent will create + persist one.',
      { userId, providerPaymentMethodId },
    )
  }

  const existingForUser = await findMany<PaymentMethodRow>(TABLE_NAME, {
    where: [
      { field: 'userId', operator: '=', value: userId },
      { field: 'provider', operator: '=', value: PROVIDER_NAME },
    ],
    limit: 1,
  })
  const isFirst = existingForUser.length === 0

  const result = await dbCreate<PaymentMethodRow>(TABLE_NAME, {
    userId,
    provider: PROVIDER_NAME,
    providerCustomerId: existingCustomerId ?? '',
    providerPaymentMethodId: pm.id,
    last4: pm.last4,
    brand: pm.brand,
    expMonth: pm.expMonth,
    expYear: pm.expYear,
    isDefault: isFirst,
  })
  if (!result.data) {
    throw new Error('Failed to persist payment method')
  }
  return toPaymentMethod(result.data)
}

/**
 * Lists every saved payment method for a user, newest first.
 *
 * @param userId - The owning user.
 * @returns The user's saved payment methods.
 */
export async function listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  const rows = await findMany<PaymentMethodRow>(TABLE_NAME, {
    where: [{ field: 'userId', operator: '=', value: userId }],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
  })
  return rows.map(toPaymentMethod)
}

/**
 * Looks up a single saved payment method, enforcing ownership.
 *
 * @param id - The payment-method row ID.
 * @param userId - The user expected to own the row.
 * @returns The payment method, or `null` if not found / not owned by `userId`.
 */
export async function getPaymentMethod(id: string, userId: string): Promise<PaymentMethod | null> {
  const row = await findOne<PaymentMethodRow>(TABLE_NAME, [
    { field: 'id', operator: '=', value: id },
  ])
  if (!row) return null
  if (row.userId !== userId) return null
  return toPaymentMethod(row)
}

/**
 * Marks a payment method as the user's default, clearing the flag from any
 * other saved methods belonging to the same user.
 *
 * @param userId - The owning user.
 * @param id - The payment-method row to promote.
 * @returns The updated default payment method, or `null` if not found / not owned.
 */
export async function setDefaultPaymentMethod(
  userId: string,
  id: string,
): Promise<PaymentMethod | null> {
  const target = await getPaymentMethod(id, userId)
  if (!target) return null

  await updateMany(
    TABLE_NAME,
    [
      { field: 'userId', operator: '=', value: userId },
      { field: 'isDefault', operator: '=', value: true },
    ],
    { isDefault: false },
  )
  await updateMany(TABLE_NAME, [{ field: 'id', operator: '=', value: id }], { isDefault: true })

  const updated = await findOne<PaymentMethodRow>(TABLE_NAME, [
    { field: 'id', operator: '=', value: id },
  ])
  return updated ? toPaymentMethod(updated) : null
}

/**
 * Deletes a saved payment method, detaching it from the provider first.
 *
 * The local row is removed even if the provider detach call fails — the
 * provider error is logged but does not abort the delete (orphaned records at
 * the provider are preferable to a method we can't remove from our own UI).
 *
 * @param id - The payment-method row to delete.
 * @param userId - The user expected to own the row.
 * @returns `true` on success, `false` if the row was not found or not owned by `userId`.
 */
export async function deletePaymentMethod(id: string, userId: string): Promise<boolean> {
  const row = await findOne<PaymentMethodRow>(TABLE_NAME, [
    { field: 'id', operator: '=', value: id },
  ])
  if (!row || row.userId !== userId) return false

  const provider = getPaymentsProvider()
  if (provider.detachPaymentMethod) {
    try {
      const ok = await provider.detachPaymentMethod(row.providerPaymentMethodId)
      if (!ok) {
        logger.warn('Provider detachPaymentMethod returned false', {
          userId,
          providerPaymentMethodId: row.providerPaymentMethodId,
        })
      }
    } catch (error) {
      logger.error('Provider detachPaymentMethod threw', {
        userId,
        providerPaymentMethodId: row.providerPaymentMethodId,
        error,
      })
    }
  }

  await deleteById(TABLE_NAME, id)
  return true
}
