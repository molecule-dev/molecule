/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: plans are registered and a verified
 * subscription is recorded through the real `paymentRecordService` over the
 * bonded DataStore. Only the postgresql driver is replaced by an in-test store
 * that enforces `UNIQUE(platformKey, transactionId)` like the real table.
 *
 * @module
 */
const { fakeStore } = vi.hoisted(() => ({
  fakeStore: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    updateMany: vi.fn(),
    deleteById: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setStore, type WhereCondition } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'
import type { NormalizedSubscription } from '@molecule/api-payments'

import {
  PaymentRecordConflictError,
  paymentRecordService,
  planService,
  registerPlans,
  stripeMonthly,
} from '../index.js'

process.env.STRIPE_PRICE_MONTHLY = 'price_monthly_test'

setStore(store)
registerPlans({
  stripeMonthly: { ...stripeMonthly, platformPriceIds: [process.env.STRIPE_PRICE_MONTHLY ?? ''] },
})

/**
 * The example's grant helper, verbatim.
 *
 * @param userId - The session user.
 * @param verified - The provider's server-side verification result.
 * @returns The granted plan, or `null`.
 */
async function grantVerifiedSubscription(userId: string, verified: NormalizedSubscription) {
  if (!verified.isActive) return null
  const record = {
    userId,
    platformKey: verified.provider,
    transactionId: verified.subscriptionId,
    productId: verified.productId,
    data: verified.rawData,
  }
  try {
    await paymentRecordService.store(record)
  } catch (error) {
    if (!(error instanceof PaymentRecordConflictError)) throw error
    const owner = await paymentRecordService.findByTransaction(
      record.platformKey,
      record.transactionId,
    )
    if (owner?.userId !== userId)
      throw new Error('Subscription is bound to another account', { cause: error })
  }
  return planService.findPlanByProductId(verified.productId)
}

/** In-test `payments` rows. */
let rows: Record<string, unknown>[]

beforeEach(() => {
  rows = []
  fakeStore.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => {
    if (
      rows.some(
        (row) => row.platformKey === data.platformKey && row.transactionId === data.transactionId,
      )
    ) {
      throw Object.assign(new Error('duplicate key value violates unique constraint'), {
        code: '23505',
      })
    }
    rows.push(data)
    return { data, affected: 1 }
  })
  fakeStore.findOne.mockImplementation(
    async (_table: string, where: WhereCondition[]) =>
      rows.find((row) => where.every((w) => row[w.field] === w.value)) ?? null,
  )
})

const verified: NormalizedSubscription = {
  provider: 'stripe',
  subscriptionId: 'sub_123',
  productId: 'price_monthly_test',
  status: 'active',
  isActive: true,
  rawData: { customer: 'cus_123' },
}

describe('README @example', () => {
  it('records the verified subscription and resolves the registered plan by price id', async () => {
    const plan = await grantVerifiedSubscription('user-123', verified)

    expect(plan?.planKey).toBe('stripeMonthly')
    expect(plan?.capabilities.premium).toBe(true)
    expect(rows).toEqual([
      expect.objectContaining({
        userId: 'user-123',
        platformKey: 'stripe',
        transactionId: 'sub_123',
      }),
    ])
  })

  it('is idempotent for the owner and rejects a replay into another account', async () => {
    await grantVerifiedSubscription('user-123', verified)

    expect((await grantVerifiedSubscription('user-123', verified))?.planKey).toBe('stripeMonthly')
    await expect(grantVerifiedSubscription('user-456', verified)).rejects.toThrow(
      'Subscription is bound to another account',
    )
  })

  it('grants nothing for an inactive or unknown subscription', async () => {
    expect(await grantVerifiedSubscription('user-123', { ...verified, isActive: false })).toBeNull()
    expect(
      await grantVerifiedSubscription('user-123', {
        ...verified,
        subscriptionId: 'sub_999',
        productId: 'price_unknown',
      }),
    ).toBeNull()
  })
})
