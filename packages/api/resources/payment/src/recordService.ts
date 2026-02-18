import { getAnalytics, getLogger } from '@molecule/api-bond'
import { create, deleteMany, findMany, findOne, query } from '@molecule/api-database'
const analytics = getAnalytics()
const logger = getLogger()
import type { PaymentRecordService } from '@molecule/api-payments'

import { resource } from './resource.js'

const { tableName } = resource

/**
 * PaymentRecordService implementation for the bond system.
 *
 * Provides payment record CRUD operations that other resources
 * can use through `get<PaymentRecordService>('paymentRecords')`.
 */
export const paymentRecordService: PaymentRecordService = {
  async store(record) {
    try {
      // Use DataStore create with try/catch for duplicate handling.
      // The DataStore implementation handles conflicts per-database.
      await create(tableName, {
        userId: record.userId,
        platformKey: record.platformKey,
        transactionId: record.transactionId,
        productId: record.productId,
        data: JSON.stringify(record.data || {}),
        receipt: record.receipt ?? null,
      })
      analytics
        .track({
          name: 'payment.record_stored',
          userId: record.userId,
          properties: { platformKey: record.platformKey, productId: record.productId },
        })
        .catch(() => {})
    } catch (error) {
      // Silently handle conflicts (e.g. duplicate records).
      logger.error('Failed to store payment record:', error)
      analytics
        .track({
          name: 'payment.record_store_failed',
          userId: record.userId,
          properties: { platformKey: record.platformKey, productId: record.productId },
        })
        .catch(() => {})
    }
  },

  async findByTransaction(platformKey, transactionId) {
    try {
      return await findOne<{ userId: string }>(tableName, [
        { field: 'transactionId', operator: '=', value: transactionId },
        { field: 'platformKey', operator: '=', value: platformKey },
      ])
    } catch (error) {
      logger.error('Failed to find payment by transaction:', error)
      return null
    }
  },

  async findByCustomerData(platformKey, key, value) {
    try {
      // Uses JSONB operator (->>) — not expressible via DataStore, requires raw query.
      // This is intentionally database-specific per DataStore docs:
      // "For complex queries not covered by this interface, use the raw DatabasePool.query() method instead."
      const result = await query<{ userId: string }>(
        `SELECT "userId" FROM "${tableName}" WHERE "platformKey" = $1 AND "data"->>$2 = $3 LIMIT 1`,
        [platformKey, key, value],
      )

      return result?.rows?.[0] ?? null
    } catch (error) {
      logger.error('Failed to find payment by customer data:', error)
      return null
    }
  },

  async findByUserId(userId, platformKey) {
    try {
      const results = await findMany<{ data: unknown; transactionId?: string }>(tableName, {
        where: [
          { field: 'userId', operator: '=', value: userId },
          { field: 'platformKey', operator: '=', value: platformKey },
        ],
        orderBy: [{ field: 'updatedAt', direction: 'desc' }],
        limit: 1,
      })

      return results[0] ?? null
    } catch (error) {
      logger.error('Failed to find payment by userId:', error)
      return null
    }
  },

  async deleteByUserId(userId) {
    try {
      await deleteMany(tableName, [{ field: 'userId', operator: '=', value: userId }])
    } catch (error) {
      logger.error('Failed to delete payment records:', error)
    }
  },
}
