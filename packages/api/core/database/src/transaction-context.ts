/**
 * `withTransaction(fn)`: every database call made while `fn` runs — the CRUD
 * helpers (`create`, `findMany`, `updateById`, …) and `query()` alike — joins
 * one transaction, on any bond that supports interactive transactions.
 *
 * Without it, the CRUD helpers run on the pool and commit on their own, so
 * calling them between `BEGIN` and `COMMIT` is either quietly not atomic
 * (Postgres, MySQL: a failure leaves half the writes committed) or a deadlock
 * (SQLite: the open transaction holds the single connection, and the helper's
 * query waits behind it forever).
 *
 * @module
 */

import { AsyncLocalStorage } from 'node:async_hooks'

import { getPool } from './provider.js'
import type { DatabaseTransaction } from './types.js'

const STORAGE_KEY = Symbol.for('@molecule/api-database/transaction-context')

/**
 * One storage per process, even if two copies of this package are installed:
 * the bond and the application must see the same active transaction.
 */
const storage: AsyncLocalStorage<DatabaseTransaction> = (() => {
  const holder = globalThis as typeof globalThis & {
    [STORAGE_KEY]?: AsyncLocalStorage<DatabaseTransaction>
  }
  holder[STORAGE_KEY] ??= new AsyncLocalStorage<DatabaseTransaction>()
  return holder[STORAGE_KEY]
})()

/**
 * The transaction opened by the enclosing `withTransaction()` call, if any.
 * Bond pools call this from `query()` and send the statement to the active
 * transaction when it is one they opened.
 *
 * @returns The active transaction, or `undefined` outside `withTransaction()`.
 */
export const getActiveTransaction = (): DatabaseTransaction | undefined => storage.getStore()

/**
 * Runs `fn` inside one database transaction: commits when it resolves, rolls
 * back and rethrows when it throws. Every database call made while `fn` runs
 * joins the transaction — `create`/`findMany`/`updateById`/`deleteById`, raw
 * `query()`, and the resource packages built on them — so all-or-nothing work
 * needs no separate connection and no raw SQL:
 *
 * ```ts
 * await withTransaction(async () => {
 *   const order = await create('orders', { userId, total })
 *   await updateById('products', productId, { stock: stock - 1 })
 * })
 * ```
 *
 * A nested `withTransaction()` joins the outer one. Calls made by unrelated
 * concurrent requests do not join it.
 *
 * @param fn - The work to run atomically.
 * @returns What `fn` resolves to.
 * @throws {Error} If the bonded database has no interactive transactions
 *   (Cloudflare D1), or rethrows what `fn` throws after rolling back.
 */
export const withTransaction = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (storage.getStore()) return fn()
  const pool = getPool()
  if (!pool.transaction) {
    throw new Error(
      'withTransaction(): the bonded database has no interactive transactions (Cloudflare D1). Group the writes into one batch instead.',
    )
  }
  const tx = await pool.transaction()
  let result: T
  try {
    result = await storage.run(tx, fn)
  } catch (error) {
    try {
      await tx.rollback()
    } catch (rollbackError) {
      // Both failures matter: the work's error says why, the rollback's says the
      // connection may still hold the transaction.
      throw new AggregateError(
        [error, rollbackError],
        'withTransaction(): the work failed and so did the rollback',
        { cause: rollbackError },
      )
    }
    throw error
  }
  await tx.commit()
  return result
}
