/**
 * Tests for the hosted billing-portal handler — the self-service surface a
 * subscriber uses to update a card, read invoices, and cancel.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRequire, mockGetAnalytics, mockGetLogger, mockT } = vi.hoisted(() => {
  const mockTrack = vi.fn(() => ({ catch: vi.fn() }))
  return {
    mockRequire: vi.fn(),
    mockGetAnalytics: vi.fn(() => ({
      track: mockTrack,
      identify: vi.fn(() => ({ catch: vi.fn() })),
    })),
    mockGetLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() })),
    mockT: vi.fn((key: string) => key),
  }
})

vi.mock('@molecule/api-bond', () => ({
  get: vi.fn(),
  require: mockRequire,
  getAnalytics: mockGetAnalytics,
  getLogger: mockGetLogger,
}))

vi.mock('@molecule/api-i18n', () => ({ t: mockT }))

import type { MoleculeRequest } from '@molecule/api-resource'
import { configNotConfiguredError } from '@molecule/api-secrets'

import { billingPortal } from '../handlers/payments/billingPortal.js'

const handler = billingPortal()

const makeReq = (overrides: Record<string, unknown> = {}): MoleculeRequest =>
  ({
    body: {},
    params: { id: 'user_1', provider: 'stripe' } as Record<string, string>,
    query: {},
    headers: {},
    cookies: {} as Record<string, string>,
    ...overrides,
  }) as unknown as MoleculeRequest

describe('billingPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('APP_ORIGIN', 'https://app.example.com')
    vi.stubEnv('API_ORIGIN', 'https://api.example.com')
    vi.stubEnv('ORIGIN', '')
    vi.stubEnv('PAYMENTS_BILLING_RETURN_PATH', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the provider portal URL for the authenticated user', async () => {
    const createPortalSession = vi
      .fn()
      .mockResolvedValue({ id: 'bps_1', url: 'https://billing.stripe.com/p/session/live_1' })
    mockRequire.mockReturnValue({ providerName: 'stripe', createPortalSession })

    const result = await handler(makeReq())

    expect(createPortalSession).toHaveBeenCalledWith({
      userId: 'user_1',
      returnUrl: 'https://app.example.com',
    })
    expect(result).toEqual({
      statusCode: 200,
      body: { id: 'bps_1', url: 'https://billing.stripe.com/p/session/live_1' },
    })
  })

  // The portal exit must land on the app, whose host holds the session cookie —
  // returning to the API origin would drop the user on a host they are not
  // authenticated to.
  it('returns the user to the app page they opened the portal from', async () => {
    const createPortalSession = vi
      .fn()
      .mockResolvedValue({ id: 'bps_2', url: 'https://billing.stripe.com/p/session/live_2' })
    mockRequire.mockReturnValue({ providerName: 'stripe', createPortalSession })

    await handler(makeReq({ body: { returnPath: '/settings?tab=billing' } }))

    expect(createPortalSession).toHaveBeenCalledWith({
      userId: 'user_1',
      returnUrl: 'https://app.example.com/settings?tab=billing',
    })
  })

  it('never returns the user off the app origin, whatever the client sends', async () => {
    const createPortalSession = vi
      .fn()
      .mockResolvedValue({ id: 'bps_3', url: 'https://billing.stripe.com/p/session/live_3' })
    mockRequire.mockReturnValue({ providerName: 'stripe', createPortalSession })

    await handler(makeReq({ body: { returnPath: 'https://evil.example/phish' } }))

    expect(createPortalSession).toHaveBeenCalledWith({
      userId: 'user_1',
      returnUrl: 'https://app.example.com',
    })
  })

  it('answers 404 when the user has no billing account with the provider', async () => {
    mockRequire.mockReturnValue({
      providerName: 'stripe',
      createPortalSession: vi.fn().mockResolvedValue(null),
    })

    const result = await handler(makeReq())

    expect(result).toMatchObject({
      statusCode: 404,
      body: { errorKey: 'user.payment.noBillingAccount' },
    })
  })

  // Apple/Google purchases are managed in the platform store; the bond
  // implements no portal, and that is a clean 400, not a crash.
  it('answers 400 when the bonded provider offers no portal', async () => {
    mockRequire.mockReturnValue({ providerName: 'apple' })

    const result = await handler(makeReq({ params: { id: 'user_1', provider: 'apple' } }))

    expect(result).toMatchObject({
      statusCode: 400,
      body: { errorKey: 'user.payment.portalNotSupported' },
    })
  })

  it('requires a provider route parameter', async () => {
    const result = await handler(makeReq({ params: { id: 'user_1' } }))

    expect(result).toMatchObject({
      statusCode: 400,
      body: { errorKey: 'user.payment.providerRequired' },
    })
  })

  // A missing secret is an operator problem with an actionable message — it
  // must not be flattened into the same 500 a provider outage returns.
  it('passes a config-not-configured error through with its own status', async () => {
    mockRequire.mockReturnValue({
      providerName: 'stripe',
      createPortalSession: vi
        .fn()
        .mockRejectedValue(configNotConfiguredError('STRIPE_SECRET_KEY', 'payments')),
    })

    const result = await handler(makeReq())

    expect(result).toMatchObject({ statusCode: 503, body: { errorKey: 'config.notConfigured' } })
  })

  it('answers 500 when the provider call fails', async () => {
    mockRequire.mockReturnValue({
      providerName: 'stripe',
      createPortalSession: vi.fn().mockRejectedValue(new Error('stripe down')),
    })

    const result = await handler(makeReq())

    expect(result).toMatchObject({
      statusCode: 500,
      body: { errorKey: 'user.payment.portalFailed' },
    })
  })
})
