/**
 * Security tests for the generic payment verification handler.
 *
 * Covers the Stripe subscription-flow ownership binding (M3-2): a caller must
 * not be able to claim a subscription that belongs to another Stripe customer.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGet, mockRequire, mockGetAnalytics, mockGetLogger, mockT, mockUpdateFn } = vi.hoisted(
  () => ({
    mockGet: vi.fn(),
    mockRequire: vi.fn(),
    mockGetAnalytics: vi.fn(() => ({
      track: vi.fn(() => ({ catch: vi.fn() })),
      identify: vi.fn(() => ({ catch: vi.fn() })),
    })),
    mockGetLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
    mockT: vi.fn((key: string) => key),
    mockUpdateFn: vi.fn(),
  }),
)

vi.mock('@molecule/api-bond', () => ({
  get: mockGet,
  require: mockRequire,
  getAnalytics: mockGetAnalytics,
  getLogger: mockGetLogger,
}))

vi.mock('@molecule/api-i18n', () => ({ t: mockT }))

vi.mock('@molecule/api-resource', () => ({
  update: vi.fn(() => mockUpdateFn),
}))

import type { MoleculeRequest } from '@molecule/api-resource'

import { verifyPayment } from '../handlers/payments/verifyPayment.js'
import { propsSchema } from '../schema.js'

const testResource = { name: 'User', tableName: 'users', schema: propsSchema }
const handler = verifyPayment(testResource)

const makeReq = (overrides: Record<string, unknown> = {}): MoleculeRequest =>
  ({
    body: {},
    params: {} as Record<string, string>,
    query: {},
    headers: {},
    cookies: {} as Record<string, string>,
    ...overrides,
  }) as unknown as MoleculeRequest

/** Wire the Stripe subscription provider + plan service + records bond. */
const wire = (opts: {
  verifiedCustomerId?: string
  viaCheckoutSession?: boolean
  storedCustomerId?: string | null
}) => {
  const provider = {
    providerName: 'stripe',
    verifyFlow: 'subscription' as const,
    verifySubscription: vi.fn().mockResolvedValue({
      productId: 'prod_premium',
      transactionId: 'sub_abc',
      expiresAt: new Date(4070908800000).toISOString(),
      autoRenews: true,
      data: { customerId: opts.verifiedCustomerId, viaCheckoutSession: !!opts.viaCheckoutSession },
    }),
  }
  const plans = {
    findPlan: vi.fn(),
    findPlanByProductId: vi.fn(() => ({ planKey: 'premium', platformKey: 'stripe' })),
    getDefaultPlan: vi.fn(),
    getAllPlans: vi.fn(),
  }
  const records = {
    findByUserId: vi
      .fn()
      .mockResolvedValue(
        opts.storedCustomerId === undefined
          ? null
          : opts.storedCustomerId === null
            ? null
            : { data: { customerId: opts.storedCustomerId } },
      ),
    store: vi.fn().mockResolvedValue(undefined),
    findByTransaction: vi.fn(),
    findByCustomerData: vi.fn(),
    deleteByUserId: vi.fn(),
  }
  mockRequire.mockImplementation((category: string) => {
    if (category === 'payments') return provider
    if (category === 'plans') return plans
    return undefined
  })
  mockGet.mockImplementation((category: string) =>
    category === 'paymentRecords' ? records : undefined,
  )
  return { provider, plans, records }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateFn.mockResolvedValue({ statusCode: 200, body: { props: { planKey: 'premium' } } })
})

afterEach(() => {
  vi.restoreAllMocks()
})

/**
 * Wire an Apple/Google receipt-flow provider + plan service + records bond.
 * `records` is returned so tests can program `findByTransaction`/`store` per case.
 */
const wireReceipt = (opts: { transactionId?: string | undefined } = {}) => {
  const transactionId = 'transactionId' in opts ? opts.transactionId : 'txn_shared'
  const provider = {
    providerName: 'apple',
    verifyFlow: 'receipt' as const,
    verifyReceipt: vi.fn().mockResolvedValue({
      productId: 'com.app.pro',
      transactionId,
      expiresAt: new Date(4070908800000).toISOString(),
      autoRenews: true,
      data: {},
    }),
  }
  const plans = {
    findPlan: vi.fn(() => ({
      planKey: 'pro',
      platformKey: 'apple',
      platformProductId: 'com.app.pro',
    })),
    findPlanByProductId: vi.fn(() => ({ planKey: 'pro', platformKey: 'apple' })),
    getDefaultPlan: vi.fn(),
    getAllPlans: vi.fn(),
  }
  const records = {
    findByUserId: vi.fn().mockResolvedValue(null),
    store: vi.fn().mockResolvedValue(undefined),
    findByTransaction: vi.fn().mockResolvedValue(null),
    findByCustomerData: vi.fn(),
    deleteByUserId: vi.fn(),
  }
  mockRequire.mockImplementation((category: string) => {
    if (category === 'payments') return provider
    if (category === 'plans') return plans
    return undefined
  })
  mockGet.mockImplementation((category: string) =>
    category === 'paymentRecords' ? records : undefined,
  )
  return { provider, plans, records }
}

describe('verifyPayment — Apple/Google receipt ownership binding (R2-1)', () => {
  it('REGRESSION: rejects a second account replaying a receipt already bound to another user', async () => {
    const { records } = wireReceipt()
    // The transaction is already bound to a different account.
    records.findByTransaction.mockResolvedValue({ userId: 'owner' })

    const req = makeReq({
      params: { id: 'attacker', provider: 'apple' },
      body: { receipt: 'base64-receipt', planKey: 'pro' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(403)
    expect((result?.body as { errorKey?: string })?.errorKey).toBe(
      'user.payment.transactionAlreadyClaimed',
    )
    // Plan must NOT be granted and the record must NOT be (re)written for the attacker.
    expect(mockUpdateFn).not.toHaveBeenCalled()
    expect(records.store).not.toHaveBeenCalled()
  })

  it('allows the first account to claim an unbound receipt (binds before granting)', async () => {
    const { records } = wireReceipt()
    // Unbound: no existing record, store succeeds.
    records.findByTransaction.mockResolvedValue(null)

    const req = makeReq({
      params: { id: 'owner', provider: 'apple' },
      body: { receipt: 'base64-receipt', planKey: 'pro' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(200)
    // Record bound BEFORE the grant.
    expect(records.store).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'owner',
        platformKey: 'apple',
        transactionId: 'txn_shared',
      }),
    )
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'owner', props: expect.objectContaining({ planKey: 'pro' }) }),
    )
  })

  it('allows the original owner to re-verify their own receipt (idempotent re-grant on conflict)', async () => {
    const { records } = wireReceipt()
    // Pre-check sees no other owner; the insert hits the UNIQUE constraint, and
    // the re-query shows the SAME user owns it → idempotent re-grant.
    records.findByTransaction.mockResolvedValueOnce(null).mockResolvedValueOnce({ userId: 'owner' })
    records.store.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'))

    const req = makeReq({
      params: { id: 'owner', provider: 'apple' },
      body: { receipt: 'base64-receipt', planKey: 'pro' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalled()
  })

  it('REGRESSION: loses the race when a concurrent insert binds the receipt to another account', async () => {
    const { records } = wireReceipt()
    // Pre-check passes (null), but the insert conflicts and the re-query shows a
    // DIFFERENT owner won the race → reject without granting.
    records.findByTransaction
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ userId: 'winner' })
    records.store.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'))

    const req = makeReq({
      params: { id: 'loser', provider: 'apple' },
      body: { receipt: 'base64-receipt', planKey: 'pro' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(403)
    expect((result?.body as { errorKey?: string })?.errorKey).toBe(
      'user.payment.transactionAlreadyClaimed',
    )
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('fails closed when the verified receipt has no transaction id (unbindable)', async () => {
    wireReceipt({ transactionId: undefined })

    const req = makeReq({
      params: { id: 'owner', provider: 'apple' },
      body: { receipt: 'base64-receipt', planKey: 'pro' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(400)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })
})

describe('verifyPayment — Stripe subscription ownership binding (M3-2)', () => {
  it('REGRESSION: rejects a free user claiming a foreign subscription id (no record, bare sub_)', async () => {
    wire({ verifiedCustomerId: 'cus_victim', viaCheckoutSession: false, storedCustomerId: null })

    const req = makeReq({
      params: { id: 'attacker', provider: 'stripe' },
      body: { subscriptionId: 'sub_victim' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(403)
    expect((result?.body as { errorKey?: string })?.errorKey).toBe(
      'user.payment.subscriptionOwnershipMismatch',
    )
    // Plan must NOT be granted.
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('REGRESSION: rejects when the verified customer differs from the stored customer', async () => {
    wire({
      verifiedCustomerId: 'cus_victim',
      viaCheckoutSession: false,
      storedCustomerId: 'cus_attacker',
    })

    const req = makeReq({
      params: { id: 'attacker', provider: 'stripe' },
      body: { subscriptionId: 'sub_victim' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(403)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('allows a first-time grant through the per-user checkout-session redirect', async () => {
    wire({ verifiedCustomerId: 'cus_me', viaCheckoutSession: true, storedCustomerId: null })

    const req = makeReq({
      params: { id: 'me', provider: 'stripe' },
      query: { subscriptionId: 'cs_my_session' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'me', props: expect.objectContaining({ planKey: 'premium' }) }),
    )
  })

  it('allows a returning user whose stored customer matches the verified subscription', async () => {
    wire({ verifiedCustomerId: 'cus_me', viaCheckoutSession: false, storedCustomerId: 'cus_me' })

    const req = makeReq({
      params: { id: 'me', provider: 'stripe' },
      body: { subscriptionId: 'sub_me' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalled()
  })
})

describe('verifyPayment — Stripe subscription replay defense (M3-1)', () => {
  it('REGRESSION: rejects a second fresh account replaying a checkout-session id already bound to another account', async () => {
    const { records } = wire({
      verifiedCustomerId: 'cus_a1',
      viaCheckoutSession: true,
      storedCustomerId: null,
    })
    // The subscription (transaction) is already bound to the account that first
    // completed the paid checkout (A1). A2 is fresh, so it passes
    // `ownsByFreshCheckout`, but the first-claim-wins pre-check must reject it.
    records.findByTransaction.mockResolvedValue({ userId: 'a1' })

    const req = makeReq({
      params: { id: 'a2', provider: 'stripe' },
      query: { subscriptionId: 'cs_shared_session' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(403)
    expect((result?.body as { errorKey?: string })?.errorKey).toBe(
      'user.payment.transactionAlreadyClaimed',
    )
    // Premium must NOT be granted to A2 and no record written for A2.
    expect(mockUpdateFn).not.toHaveBeenCalled()
    expect(records.store).not.toHaveBeenCalled()
  })

  it('REGRESSION: loses the race when a concurrent insert binds the subscription to another account', async () => {
    const { records } = wire({
      verifiedCustomerId: 'cus_a1',
      viaCheckoutSession: true,
      storedCustomerId: null,
    })
    // Pre-check passes (null), but the insert conflicts and the re-query shows a
    // DIFFERENT owner won the race → reject without granting (no swallowed
    // conflict-after-grant).
    records.findByTransaction
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ userId: 'winner' })
    records.store.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'))

    const req = makeReq({
      params: { id: 'loser', provider: 'stripe' },
      query: { subscriptionId: 'cs_shared_session' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(403)
    expect((result?.body as { errorKey?: string })?.errorKey).toBe(
      'user.payment.transactionAlreadyClaimed',
    )
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })

  it('binds the subscription record BEFORE granting on a legitimate first-time checkout', async () => {
    const { records } = wire({
      verifiedCustomerId: 'cus_me',
      viaCheckoutSession: true,
      storedCustomerId: null,
    })
    records.findByTransaction.mockResolvedValue(null)

    const req = makeReq({
      params: { id: 'me', provider: 'stripe' },
      query: { subscriptionId: 'cs_my_session' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(200)
    // Record bound (store called) before the grant, keyed to this user + the
    // verified subscription id.
    expect(records.store).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'me',
        platformKey: 'stripe',
        transactionId: 'sub_abc',
      }),
    )
    expect(mockUpdateFn).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'me', props: expect.objectContaining({ planKey: 'premium' }) }),
    )
  })

  it('allows the original owner to re-verify their own subscription (idempotent re-grant on conflict)', async () => {
    const { records } = wire({
      verifiedCustomerId: 'cus_me',
      viaCheckoutSession: false,
      storedCustomerId: 'cus_me',
    })
    // Pre-check sees no other owner; the insert hits the UNIQUE constraint, and
    // the re-query shows the SAME user owns it → idempotent re-grant.
    records.findByTransaction.mockResolvedValueOnce(null).mockResolvedValueOnce({ userId: 'me' })
    records.store.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'))

    const req = makeReq({
      params: { id: 'me', provider: 'stripe' },
      body: { subscriptionId: 'sub_me' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(200)
    expect(mockUpdateFn).toHaveBeenCalled()
  })

  it('accepts the provider snake_case redirect echo (subscription_id / token) as the subscription id', async () => {
    // PayPal appends its OWN parameter names to the return_url after buyer
    // approval — `subscription_id` for billing subscriptions, `token` for v2
    // orders — so the handler must read those fallbacks, not just `subscriptionId`.
    const { provider, records } = wire({
      verifiedCustomerId: 'cus_me',
      viaCheckoutSession: true,
      storedCustomerId: null,
    })
    records.findByTransaction.mockResolvedValue(null)

    const bySubscriptionId = await handler(
      makeReq({
        params: { id: 'me', provider: 'paypal' },
        query: { subscription_id: 'I-PAYPAL1' },
      }),
    )
    expect(bySubscriptionId?.statusCode).toBe(200)
    expect(provider.verifySubscription).toHaveBeenCalledWith('I-PAYPAL1')

    vi.clearAllMocks()
    mockUpdateFn.mockResolvedValue({ statusCode: 200, body: { props: { planKey: 'premium' } } })
    const { provider: provider2, records: records2 } = wire({
      verifiedCustomerId: 'cus_me',
      viaCheckoutSession: true,
      storedCustomerId: null,
    })
    records2.findByTransaction.mockResolvedValue(null)

    const byToken = await handler(
      makeReq({ params: { id: 'me', provider: 'paypal' }, query: { token: '5O190127TN364715T' } }),
    )
    expect(byToken?.statusCode).toBe(200)
    expect(provider2.verifySubscription).toHaveBeenCalledWith('5O190127TN364715T')
  })

  it('fails closed when the verified subscription has no transaction id (unbindable)', async () => {
    const { provider } = wire({
      verifiedCustomerId: 'cus_me',
      viaCheckoutSession: true,
      storedCustomerId: null,
    })
    provider.verifySubscription.mockResolvedValue({
      productId: 'prod_premium',
      expiresAt: new Date(4070908800000).toISOString(),
      autoRenews: true,
      data: { customerId: 'cus_me', viaCheckoutSession: true },
    })

    const req = makeReq({
      params: { id: 'me', provider: 'stripe' },
      query: { subscriptionId: 'cs_my_session' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(400)
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })
})

describe('verifyPayment — bond config-not-configured passthrough [ambiguous-failure]', () => {
  it('surfaces a rethrown config-not-configured error as its real 503, not a generic 500', async () => {
    // Regression: a bonded provider's verifySubscription/verifyReceipt/
    // verifyPurchase now RETHROWS a tagged config-not-configured error
    // instead of swallowing it to `null` (which this handler would otherwise
    // report as a generic 400 'verificationFailed' — indistinguishable from
    // an actually-bad receipt). The handler's catch must pass the real
    // statusCode/errorKey through.
    const { provider } = wire({ verifiedCustomerId: 'cus_me', viaCheckoutSession: true })
    const configError = Object.assign(
      new Error('STRIPE_SECRET_KEY is not set — payments is disabled.'),
      { statusCode: 503, errorKey: 'config.notConfigured' },
    )
    provider.verifySubscription.mockRejectedValue(configError)

    const req = makeReq({
      params: { id: 'me', provider: 'stripe' },
      query: { subscriptionId: 'cs_my_session' },
    })

    const result = await handler(req)

    expect(result?.statusCode).toBe(503)
    expect((result?.body as { errorKey?: string })?.errorKey).toBe('config.notConfigured')
    expect((result?.body as { error?: string })?.error).toContain('STRIPE_SECRET_KEY')
    expect(mockUpdateFn).not.toHaveBeenCalled()
  })
})
