/**
 * `withTransaction()` against a recording pool: commit on success, rollback on
 * a throw, a nested call joins the outer transaction, and a bond without
 * interactive transactions (D1) is refused with the reason.
 */
import { beforeEach, describe, expect, it } from 'vitest'

import {
  type DatabasePool,
  type DatabaseTransaction,
  getActiveTransaction,
  setPool,
  withTransaction,
} from '../index.js'

let log: string[]
let opened: DatabaseTransaction[]

const recordingPool = (withTransactions = true): DatabasePool => ({
  async query() {
    log.push('pool.query')
    return { rows: [], rowCount: 0 }
  },
  async connect() {
    throw new Error('not used')
  },
  async end() {},
  ...(withTransactions
    ? {
        async transaction(): Promise<DatabaseTransaction> {
          log.push('begin')
          const tx: DatabaseTransaction = {
            async query() {
              log.push('tx.query')
              return { rows: [], rowCount: 0 }
            },
            release() {},
            async commit() {
              log.push('commit')
            },
            async rollback() {
              log.push('rollback')
            },
          }
          opened.push(tx)
          return tx
        },
      }
    : {}),
})

beforeEach(() => {
  log = []
  opened = []
})

describe('withTransaction', () => {
  it('commits and returns what the callback resolves to', async () => {
    setPool(recordingPool())
    const out = await withTransaction(async () => {
      expect(getActiveTransaction()).toBe(opened[0])
      return 42
    })
    expect(out).toBe(42)
    expect(log).toEqual(['begin', 'commit'])
    expect(getActiveTransaction()).toBeUndefined()
  })

  it('rolls back and rethrows the callback error', async () => {
    setPool(recordingPool())
    await expect(
      withTransaction(async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')
    expect(log).toEqual(['begin', 'rollback'])
  })

  it('joins an enclosing transaction instead of opening a second one', async () => {
    setPool(recordingPool())
    await withTransaction(async () => {
      await withTransaction(async () => {
        expect(getActiveTransaction()).toBe(opened[0])
      })
    })
    expect(log).toEqual(['begin', 'commit'])
  })

  it('refuses, naming the reason, on a bond with no interactive transactions', async () => {
    setPool(recordingPool(false))
    await expect(withTransaction(async () => 1)).rejects.toThrow(/no interactive transactions/)
  })
})
