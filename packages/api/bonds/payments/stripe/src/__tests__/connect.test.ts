/**
 * Tests for the Stripe Connect helpers.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockAccount = {
  id: 'acct_123',
  type: 'express',
  charges_enabled: true,
  payouts_enabled: true,
  requirements: { currently_due: [] as string[] },
}

const mockAccountIncomplete = {
  id: 'acct_456',
  type: 'standard',
  charges_enabled: false,
  payouts_enabled: false,
  requirements: { currently_due: ['business_profile.url', 'tos_acceptance.date'] },
}

const mockAccountLink = {
  url: 'https://connect.stripe.com/setup/s/acct_123/abc',
  expires_at: 1800000000,
}

const mockTransfer = {
  id: 'tr_123',
  amount: 5000,
  currency: 'usd',
  destination: 'acct_123',
  transfer_group: 'order_42',
}

const mockPayout = {
  id: 'po_123',
  amount: 4500,
  currency: 'usd',
  status: 'pending',
  arrival_date: 1800001000,
}

let mockAccountsCreate: ReturnType<typeof vi.fn>
let mockAccountsRetrieve: ReturnType<typeof vi.fn>
let mockAccountLinksCreate: ReturnType<typeof vi.fn>
let mockTransfersCreate: ReturnType<typeof vi.fn>
let mockPayoutsCreate: ReturnType<typeof vi.fn>
let mockWebhooksConstructEvent: ReturnType<typeof vi.fn>

vi.mock('stripe', () => {
  mockAccountsCreate = vi.fn().mockResolvedValue(mockAccount)
  mockAccountsRetrieve = vi.fn().mockResolvedValue(mockAccount)
  mockAccountLinksCreate = vi.fn().mockResolvedValue(mockAccountLink)
  mockTransfersCreate = vi.fn().mockResolvedValue(mockTransfer)
  mockPayoutsCreate = vi.fn().mockResolvedValue(mockPayout)
  mockWebhooksConstructEvent = vi.fn().mockImplementation((_payload, signature, _secret) => {
    if (signature === 'invalid_signature') {
      throw new Error('Webhook signature verification failed')
    }
    if (signature === 'payout.created') {
      return {
        id: 'evt_payout',
        type: 'payout.created',
        data: { object: { id: 'po_999', amount: 1000, currency: 'usd', status: 'pending' } },
      }
    }
    if (signature === 'transfer.created') {
      return {
        id: 'evt_transfer',
        type: 'transfer.created',
        data: { object: { id: 'tr_999', amount: 2000, destination: 'acct_xyz' } },
      }
    }
    if (signature === 'application_fee.refunded') {
      return {
        id: 'evt_fee',
        type: 'application_fee.refunded',
        data: { object: { id: 'fr_999', amount: 100 } },
      }
    }
    if (signature === 'unknown_event') {
      return {
        id: 'evt_unknown',
        type: 'customer.subscription.updated',
        data: { object: { id: 'sub_xxx' } },
      }
    }
    // Default: account.updated
    return {
      id: 'evt_account',
      type: 'account.updated',
      data: { object: { id: 'acct_123', charges_enabled: true } },
    }
  })

  const MockStripe = vi.fn(function () {
    return {
      checkout: {
        sessions: { create: vi.fn(), retrieve: vi.fn() },
      },
      subscriptions: {
        retrieve: vi.fn(),
        cancel: vi.fn(),
        update: vi.fn(),
      },
      webhooks: {
        constructEvent: mockWebhooksConstructEvent,
      },
      accounts: {
        create: mockAccountsCreate,
        retrieve: mockAccountsRetrieve,
      },
      accountLinks: {
        create: mockAccountLinksCreate,
      },
      transfers: {
        create: mockTransfersCreate,
      },
      payouts: {
        create: mockPayoutsCreate,
      },
    }
  })

  return { default: MockStripe }
})

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }

describe('Stripe Connect', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123')
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  describe('createConnectedAccount', () => {
    it('creates an express account with country and email', async () => {
      const { createConnectedAccount } = await import('../connect.js')

      const result = await createConnectedAccount({
        type: 'express',
        country: 'US',
        email: 'seller@example.com',
      })

      expect(result.id).toBe('acct_123')
      expect(mockAccountsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'express',
          country: 'US',
          email: 'seller@example.com',
        }),
        undefined,
      )
    })

    it('passes business profile fields when provided', async () => {
      const { createConnectedAccount } = await import('../connect.js')

      await createConnectedAccount({
        type: 'standard',
        country: 'GB',
        email: 'shop@example.co.uk',
        businessProfile: {
          name: 'Acme Shop',
          url: 'https://acme.example',
          productDescription: 'Widgets',
          supportEmail: 'help@acme.example',
          supportPhone: '+441234567890',
          mcc: '5734',
        },
      })

      expect(mockAccountsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          business_profile: {
            name: 'Acme Shop',
            url: 'https://acme.example',
            product_description: 'Widgets',
            support_email: 'help@acme.example',
            support_phone: '+441234567890',
            mcc: '5734',
          },
        }),
        undefined,
      )
    })

    it('forwards idempotency key when provided', async () => {
      const { createConnectedAccount } = await import('../connect.js')

      await createConnectedAccount({
        type: 'custom',
        country: 'US',
        email: 'a@b.com',
        idempotencyKey: 'idem-acct-1',
      })

      expect(mockAccountsCreate).toHaveBeenCalledWith(expect.any(Object), {
        idempotencyKey: 'idem-acct-1',
      })
    })

    it('logs and rethrows on Stripe error', async () => {
      mockAccountsCreate.mockRejectedValueOnce(new Error('Stripe accounts.create failed'))
      const { createConnectedAccount } = await import('../connect.js')

      await expect(
        createConnectedAccount({ type: 'express', country: 'US', email: 'x@y.com' }),
      ).rejects.toThrow('Stripe accounts.create failed')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating Stripe connected account:',
        expect.any(Error),
      )
    })
  })

  describe('createAccountLink', () => {
    it('creates an onboarding link with return + refresh URLs', async () => {
      const { createAccountLink } = await import('../connect.js')

      const result = await createAccountLink({
        accountId: 'acct_123',
        returnUrl: 'https://app.example/return',
        refreshUrl: 'https://app.example/refresh',
        type: 'account_onboarding',
      })

      expect(result.url).toBe('https://connect.stripe.com/setup/s/acct_123/abc')
      expect(result.expiresAt).toBe(1800000000)
      expect(mockAccountLinksCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          account: 'acct_123',
          return_url: 'https://app.example/return',
          refresh_url: 'https://app.example/refresh',
          type: 'account_onboarding',
        }),
        undefined,
      )
    })

    it('supports account_update links', async () => {
      const { createAccountLink } = await import('../connect.js')

      await createAccountLink({
        accountId: 'acct_123',
        returnUrl: 'https://app.example/return',
        refreshUrl: 'https://app.example/refresh',
        type: 'account_update',
      })

      expect(mockAccountLinksCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'account_update' }),
        undefined,
      )
    })

    it('logs and rethrows on Stripe error', async () => {
      mockAccountLinksCreate.mockRejectedValueOnce(new Error('Stripe accountLinks failed'))
      const { createAccountLink } = await import('../connect.js')

      await expect(
        createAccountLink({
          accountId: 'acct_123',
          returnUrl: 'https://r',
          refreshUrl: 'https://rf',
          type: 'account_onboarding',
        }),
      ).rejects.toThrow('Stripe accountLinks failed')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating Stripe account link:',
        expect.any(Error),
      )
    })
  })

  describe('createTransfer', () => {
    it('creates a transfer to a connected account', async () => {
      const { createTransfer } = await import('../connect.js')

      const result = await createTransfer({
        amount: 5000,
        currency: 'usd',
        destination: 'acct_123',
        transferGroup: 'order_42',
      })

      expect(result.id).toBe('tr_123')
      expect(result.amount).toBe(5000)
      expect(result.currency).toBe('usd')
      expect(result.destination).toBe('acct_123')
      expect(result.transferGroup).toBe('order_42')
      expect(mockTransfersCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5000,
          currency: 'usd',
          destination: 'acct_123',
          transfer_group: 'order_42',
        }),
        undefined,
      )
    })

    it('passes sourceTransaction through as source_transaction', async () => {
      const { createTransfer } = await import('../connect.js')

      await createTransfer({
        amount: 100,
        currency: 'usd',
        destination: 'acct_xyz',
        sourceTransaction: 'ch_999',
      })

      expect(mockTransfersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ source_transaction: 'ch_999' }),
        undefined,
      )
    })

    it('logs and rethrows on Stripe error', async () => {
      mockTransfersCreate.mockRejectedValueOnce(new Error('Insufficient funds'))
      const { createTransfer } = await import('../connect.js')

      await expect(
        createTransfer({ amount: 100, currency: 'usd', destination: 'acct_z' }),
      ).rejects.toThrow('Insufficient funds')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating Stripe transfer:',
        expect.any(Error),
      )
    })
  })

  describe('createPayout', () => {
    it('issues a payout scoped to the connected account', async () => {
      const { createPayout } = await import('../connect.js')

      const result = await createPayout({
        accountId: 'acct_123',
        amount: 4500,
        currency: 'usd',
      })

      expect(result.id).toBe('po_123')
      expect(result.status).toBe('pending')
      expect(result.arrivalDate).toBe(1800001000)
      expect(mockPayoutsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 4500, currency: 'usd' }),
        expect.objectContaining({ stripeAccount: 'acct_123' }),
      )
    })

    it('forwards instant method and idempotency key', async () => {
      const { createPayout } = await import('../connect.js')

      await createPayout({
        accountId: 'acct_123',
        amount: 100,
        currency: 'usd',
        method: 'instant',
        idempotencyKey: 'idem-payout-1',
      })

      expect(mockPayoutsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'instant' }),
        expect.objectContaining({ stripeAccount: 'acct_123', idempotencyKey: 'idem-payout-1' }),
      )
    })

    it('logs and rethrows on Stripe error', async () => {
      mockPayoutsCreate.mockRejectedValueOnce(new Error('Payout failed'))
      const { createPayout } = await import('../connect.js')

      await expect(
        createPayout({ accountId: 'acct_123', amount: 1, currency: 'usd' }),
      ).rejects.toThrow('Payout failed')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error creating Stripe payout:',
        expect.any(Error),
      )
    })
  })

  describe('getAccountStatus', () => {
    it('returns charges/payouts enabled and requirementsCurrent=true when nothing is due', async () => {
      const { getAccountStatus } = await import('../connect.js')

      const status = await getAccountStatus('acct_123')

      expect(status.id).toBe('acct_123')
      expect(status.chargesEnabled).toBe(true)
      expect(status.payoutsEnabled).toBe(true)
      expect(status.requirementsCurrent).toBe(true)
      expect(status.type).toBe('express')
      expect(status.currentlyDue).toEqual([])
    })

    it('reports requirementsCurrent=false when fields are due', async () => {
      mockAccountsRetrieve.mockResolvedValueOnce(mockAccountIncomplete)
      const { getAccountStatus } = await import('../connect.js')

      const status = await getAccountStatus('acct_456')

      expect(status.chargesEnabled).toBe(false)
      expect(status.payoutsEnabled).toBe(false)
      expect(status.requirementsCurrent).toBe(false)
      expect(status.currentlyDue).toContain('business_profile.url')
      expect(status.currentlyDue).toContain('tos_acceptance.date')
    })

    it('logs and rethrows on Stripe error', async () => {
      mockAccountsRetrieve.mockRejectedValueOnce(new Error('No such account'))
      const { getAccountStatus } = await import('../connect.js')

      await expect(getAccountStatus('acct_missing')).rejects.toThrow('No such account')
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error retrieving Stripe connected account:',
        expect.any(Error),
      )
    })
  })

  describe('processConnectWebhook', () => {
    it('verifies and normalizes account.updated', async () => {
      const { processConnectWebhook } = await import('../connect.js')

      const event = processConnectWebhook({ 'stripe-signature': 'valid' }, '{"id":"evt_account"}')

      expect(event.type).toBe('account.updated')
      expect(event.rawType).toBe('account.updated')
      expect(event.resourceId).toBe('acct_123')
    })

    it('normalizes payout.created', async () => {
      const { processConnectWebhook } = await import('../connect.js')

      const event = processConnectWebhook({ 'stripe-signature': 'payout.created' }, '{"id":"evt"}')

      expect(event.type).toBe('payout.created')
      expect(event.resourceId).toBe('po_999')
    })

    it('normalizes transfer.created and pulls accountId from header', async () => {
      const { processConnectWebhook } = await import('../connect.js')

      const event = processConnectWebhook(
        { 'stripe-signature': 'transfer.created', 'stripe-account': 'acct_platform' },
        '{"id":"evt"}',
      )

      expect(event.type).toBe('transfer.created')
      expect(event.resourceId).toBe('tr_999')
      expect(event.accountId).toBe('acct_platform')
    })

    it('normalizes application_fee.refunded', async () => {
      const { processConnectWebhook } = await import('../connect.js')

      const event = processConnectWebhook(
        { 'stripe-signature': 'application_fee.refunded' },
        '{"id":"evt"}',
      )

      expect(event.type).toBe('application_fee.refunded')
      expect(event.resourceId).toBe('fr_999')
    })

    it('returns type=unknown for unrelated events but still verifies signature', async () => {
      const { processConnectWebhook } = await import('../connect.js')

      const event = processConnectWebhook({ 'stripe-signature': 'unknown_event' }, '{"id":"evt"}')

      expect(event.type).toBe('unknown')
      expect(event.rawType).toBe('customer.subscription.updated')
    })

    it('throws if stripe-signature header is missing', async () => {
      const { processConnectWebhook } = await import('../connect.js')

      expect(() => processConnectWebhook({}, '{}')).toThrow('Missing stripe-signature header')
    })

    it('rethrows when signature verification fails', async () => {
      const { processConnectWebhook } = await import('../connect.js')

      expect(() =>
        processConnectWebhook({ 'stripe-signature': 'invalid_signature' }, '{}'),
      ).toThrow('Webhook signature verification failed')
    })
  })

  describe('index re-exports', () => {
    it('exposes Connect helpers from the package barrel', async () => {
      const mod = await import('../index.js')

      expect(typeof mod.createConnectedAccount).toBe('function')
      expect(typeof mod.createAccountLink).toBe('function')
      expect(typeof mod.createTransfer).toBe('function')
      expect(typeof mod.createPayout).toBe('function')
      expect(typeof mod.getAccountStatus).toBe('function')
      expect(typeof mod.processConnectWebhook).toBe('function')
    })
  })
})
