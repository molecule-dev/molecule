/**
 * Payment-method utilities.
 *
 * @module
 */

import type { PaymentMethod, PaymentMethodRow } from './types.js'

/**
 * Converts a raw database row into a typed {@link PaymentMethod}.
 *
 * @param row - The database row.
 * @returns The deserialized payment method.
 */
export function toPaymentMethod(row: PaymentMethodRow): PaymentMethod {
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider,
    providerCustomerId: row.providerCustomerId,
    providerPaymentMethodId: row.providerPaymentMethodId,
    last4: row.last4,
    brand: row.brand,
    expMonth: row.expMonth,
    expYear: row.expYear,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
  }
}
