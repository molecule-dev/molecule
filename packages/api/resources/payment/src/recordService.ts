import { getAnalytics, getLogger } from '@molecule/api-bond'
import { create, deleteMany, findMany, findOne, query } from '@molecule/api-database'
const analytics = getAnalytics()
const logger = getLogger()
import type { PaymentRecordService } from '@molecule/api-payments'

import { resource } from './resource.js'

const { tableName } = resource

/**
 * Error thrown by {@link paymentRecordService.store} when inserting a payment
 * record violates the `UNIQUE(platformKey, transactionId)` constraint — i.e. the
 * transaction is already bound to an account.
 *
 * This is surfaced (not swallowed) so callers such as the user resource's
 * `verifyPayment` handler can enforce first-claim-wins ownership and reject a
 * replayed receipt instead of silently granting the plan to a second account.
 */
export class PaymentRecordConflictError extends Error {
  /** The platform key (e.g. `'apple'`, `'google'`, `'stripe'`). */
  readonly platformKey: string
  /** The transaction id that is already bound. */
  readonly transactionId: string

  /**
   * @param platformKey - The platform key of the conflicting record.
   * @param transactionId - The transaction id that is already bound.
   * @param options - Standard error options (e.g. `{ cause }`).
   */
  constructor(platformKey: string, transactionId: string, options?: ErrorOptions) {
    super(`Payment record already exists for ${platformKey} transaction ${transactionId}`, options)
    this.name = 'PaymentRecordConflictError'
    this.platformKey = platformKey
    this.transactionId = transactionId
  }
}

/**
 * Detects whether a caught error is a database unique-constraint / duplicate-key
 * violation, across the supported DataStore backends (Postgres `23505`, MySQL
 * `ER_DUP_ENTRY`/1062, SQLite `SQLITE_CONSTRAINT`), with a message fallback.
 * @param error - The caught error.
 * @returns `true` if the error represents a unique/duplicate-key conflict.
 */
const isUniqueConstraintViolation = (error: unknown): boolean => {
  const e = error as
    | { code?: string | number; errno?: number; message?: unknown }
    | null
    | undefined
  if (!e) return false
  if (e.code === '23505' || e.code === 'ER_DUP_ENTRY' || e.code === 'SQLITE_CONSTRAINT') return true
  if (typeof e.code === 'string' && e.code.startsWith('SQLITE_CONSTRAINT')) return true
  if (e.errno === 1062) return true
  return typeof e.message === 'string' && /duplicate key|unique constraint/i.test(e.message)
}

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
      // A UNIQUE(platformKey, transactionId) violation means this transaction is
      // already bound to an account. Surface it (do NOT swallow) so callers can
      // enforce first-claim-wins ownership and reject a replayed receipt instead
      // of silently granting the plan to a second account (R2-1).
      if (isUniqueConstraintViolation(error)) {
        analytics
          .track({
            name: 'payment.record_store_conflict',
            userId: record.userId,
            properties: { platformKey: record.platformKey, productId: record.productId },
          })
          .catch(() => {})
        throw new PaymentRecordConflictError(record.platformKey, record.transactionId, {
          cause: error,
        })
      }
      // Non-conflict failure (e.g. connection error): log and swallow as before —
      // a transient storage failure must not block an otherwise-verified grant.
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
