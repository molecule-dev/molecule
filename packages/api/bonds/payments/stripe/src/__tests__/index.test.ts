/**
 * Tests for the Stripe payment provider public API exports.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the stripe module before importing
vi.mock('stripe', () => {
  const MockStripe = vi.fn(function () {
    return {
      checkout: {
        sessions: {
          create: vi.fn(),
          retrieve: vi.fn(),
        },
      },
      subscriptions: {
        retrieve: vi.fn(),
        cancel: vi.fn(),
        update: vi.fn(),
      },
      webhooks: {
        constructEvent: vi.fn(),
      },
    }
  })

  return { default: MockStripe }
})

describe('index exports', () => {
  beforeEach(() => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123')
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_123')
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('should export getClient', async () => {
    const module = await import('../index.js')
    expect(module.getClient).toBeDefined()
    expect(typeof module.getClient).toBe('function')
  })

  it('should export createCheckoutSession', async () => {
    const module = await import('../index.js')
    expect(module.createCheckoutSession).toBeDefined()
    expect(typeof module.createCheckoutSession).toBe('function')
  })

  it('should export getCheckoutSession', async () => {
    const module = await import('../index.js')
    expect(module.getCheckoutSession).toBeDefined()
    expect(typeof module.getCheckoutSession).toBe('function')
  })

  it('should export getSubscription', async () => {
    const module = await import('../index.js')
    expect(module.getSubscription).toBeDefined()
    expect(typeof module.getSubscription).toBe('function')
  })

  it('should export cancelSubscription', async () => {
    const module = await import('../index.js')
    expect(module.cancelSubscription).toBeDefined()
    expect(typeof module.cancelSubscription).toBe('function')
  })

  it('should export updateSubscription', async () => {
    const module = await import('../index.js')
    expect(module.updateSubscription).toBeDefined()
    expect(typeof module.updateSubscription).toBe('function')
  })

  it('should export verifyWebhookSignature', async () => {
    const module = await import('../index.js')
    expect(module.verifyWebhookSignature).toBeDefined()
    expect(typeof module.verifyWebhookSignature).toBe('function')
  })

  it('should export normalizeSubscription', async () => {
    const module = await import('../index.js')
    expect(module.normalizeSubscription).toBeDefined()
    expect(typeof module.normalizeSubscription).toBe('function')
  })

  it('should export all expected members', async () => {
    const module = await import('../index.js')
    const exportedKeys = Object.keys(module)

    // Verify all expected exports are present
    expect(exportedKeys).toContain('getClient')
    expect(exportedKeys).toContain('createCheckoutSession')
    expect(exportedKeys).toContain('getCheckoutSession')
    expect(exportedKeys).toContain('getSubscription')
    expect(exportedKeys).toContain('cancelSubscription')
    expect(exportedKeys).toContain('updateSubscription')
    expect(exportedKeys).toContain('verifyWebhookSignature')
    expect(exportedKeys).toContain('normalizeSubscription')
  })
})
