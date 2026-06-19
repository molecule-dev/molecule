/**
 * Tests for the payment-notification authenticity guard (M3-1, defense-in-depth).
 *
 * Webhook providers (Stripe) pass through (signature verified in handler);
 * server-to-server providers (Apple/Google) require a shared secret by default.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGet, mockGetConfig, mockT } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockGetConfig: vi.fn(),
  mockT: vi.fn((key: string) => key),
}))

vi.mock('@molecule/api-bond', () => ({ get: mockGet }))
vi.mock('@molecule/api-config', () => ({ get: mockGetConfig }))
vi.mock('@molecule/api-i18n', () => ({ t: mockT }))

import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { requireWebhookAuthenticity } from '../authorizers/requireWebhookAuthenticity.js'

const guard = requireWebhookAuthenticity()

const run = (req: Partial<MoleculeRequest>) => {
  const next = vi.fn()
  guard(
    {
      params: {},
      headers: {},
      query: {},
      ...req,
    } as unknown as MoleculeRequest,
    {} as MoleculeResponse,
    next,
  )
  return next
}

/** Did the middleware pass (next() with no error arg)? */
const passed = (next: ReturnType<typeof vi.fn>) =>
  next.mock.calls.length === 1 && next.mock.calls[0].length === 0

beforeEach(() => {
  vi.clearAllMocks()
  // Default config: secret required, configured secret = 's3cret'.
  mockGetConfig.mockImplementation((key: string, fallback?: string) => {
    if (key === 'PAYMENT_NOTIFICATION_SECRET') return 's3cret'
    return fallback
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('requireWebhookAuthenticity', () => {
  it('lets a signature-verifying webhook provider (Stripe) pass through', async () => {
    mockGet.mockReturnValue({ providerName: 'stripe', notificationFlow: 'webhook' })
    const next = run({ params: { provider: 'stripe' } as Record<string, string> })
    expect(passed(next)).toBe(true)
  })

  it('REGRESSION: rejects an S2S notification with no secret supplied', async () => {
    mockGet.mockReturnValue({ providerName: 'apple', notificationFlow: 'server-notification' })
    const next = run({ params: { provider: 'apple' } as Record<string, string> })
    expect(passed(next)).toBe(false)
    expect(next).toHaveBeenCalledWith('user.error.webhookUnauthorized')
  })

  it('rejects an S2S notification with a wrong secret', async () => {
    mockGet.mockReturnValue({ providerName: 'apple', notificationFlow: 'server-notification' })
    const next = run({
      params: { provider: 'apple' } as Record<string, string>,
      headers: { 'x-payment-notification-secret': 'wrong' },
    })
    expect(passed(next)).toBe(false)
  })

  it('accepts an S2S notification with the correct secret header', async () => {
    mockGet.mockReturnValue({ providerName: 'apple', notificationFlow: 'server-notification' })
    const next = run({
      params: { provider: 'apple' } as Record<string, string>,
      headers: { 'x-payment-notification-secret': 's3cret' },
    })
    expect(passed(next)).toBe(true)
  })

  it('accepts the correct secret via ?secret= query param', async () => {
    mockGet.mockReturnValue({ providerName: 'apple', notificationFlow: 'server-notification' })
    const next = run({
      params: { provider: 'apple' } as Record<string, string>,
      query: { secret: 's3cret' } as Record<string, string>,
    })
    expect(passed(next)).toBe(true)
  })

  it('passes through S2S when PAYMENT_NOTIFICATION_REQUIRE_SECRET=false (opt-out)', async () => {
    mockGetConfig.mockImplementation((key: string, fallback?: string) => {
      if (key === 'PAYMENT_NOTIFICATION_REQUIRE_SECRET') return 'false'
      if (key === 'PAYMENT_NOTIFICATION_SECRET') return ''
      return fallback
    })
    mockGet.mockReturnValue({ providerName: 'apple', notificationFlow: 'server-notification' })
    const next = run({ params: { provider: 'apple' } as Record<string, string> })
    expect(passed(next)).toBe(true)
  })

  it('rejects when no provider is bonded for the route param (fails closed)', async () => {
    mockGet.mockReturnValue(undefined)
    const next = run({ params: { provider: 'unknown' } as Record<string, string> })
    expect(passed(next)).toBe(false)
  })
})
