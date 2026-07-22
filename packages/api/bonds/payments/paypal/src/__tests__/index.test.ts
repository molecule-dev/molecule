/**
 * Tests for the PayPal payment provider public API exports.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('index exports', () => {
  beforeEach(() => {
    vi.stubEnv('PAYPAL_CLIENT_ID', 'client_id_123')
    vi.stubEnv('PAYPAL_CLIENT_SECRET', 'client_secret_123')
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('should export getAccessToken', async () => {
    const module = await import('../index.js')
    expect(module.getAccessToken).toBeDefined()
    expect(typeof module.getAccessToken).toBe('function')
  })

  it('should export getBaseUrl', async () => {
    const module = await import('../index.js')
    expect(module.getBaseUrl).toBeDefined()
    expect(typeof module.getBaseUrl).toBe('function')
  })

  it('should export createSubscription', async () => {
    const module = await import('../index.js')
    expect(module.createSubscription).toBeDefined()
    expect(typeof module.createSubscription).toBe('function')
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

  it('should export reviseSubscription', async () => {
    const module = await import('../index.js')
    expect(module.reviseSubscription).toBeDefined()
    expect(typeof module.reviseSubscription).toBe('function')
  })

  it('should export createOrder / getOrder / captureOrder', async () => {
    const module = await import('../index.js')
    expect(typeof module.createOrder).toBe('function')
    expect(typeof module.getOrder).toBe('function')
    expect(typeof module.captureOrder).toBe('function')
  })

  it('should export createProduct / createPlan / getPlan', async () => {
    const module = await import('../index.js')
    expect(typeof module.createProduct).toBe('function')
    expect(typeof module.createPlan).toBe('function')
    expect(typeof module.getPlan).toBe('function')
  })

  it('should export verifyWebhookSignature', async () => {
    const module = await import('../index.js')
    expect(module.verifyWebhookSignature).toBeDefined()
    expect(typeof module.verifyWebhookSignature).toBe('function')
  })

  it('should export normalizeSubscription / normalizeSubscriptionStatus', async () => {
    const module = await import('../index.js')
    expect(typeof module.normalizeSubscription).toBe('function')
    expect(typeof module.normalizeSubscriptionStatus).toBe('function')
  })

  it('should export the paymentProvider bond adapter', async () => {
    const module = await import('../index.js')
    expect(module.paymentProvider).toBeDefined()
    expect(module.paymentProvider.providerName).toBe('paypal')
    expect(module.paymentProvider.verifyFlow).toBe('subscription')
    expect(module.paymentProvider.notificationFlow).toBe('webhook')
  })

  it('should export the secret definitions', async () => {
    const module = await import('../index.js')
    expect(module.paypalSecretDefinitions).toBeDefined()
    expect(module.paypalSecretDefinitions.map((d) => d.key)).toEqual([
      'PAYPAL_CLIENT_ID',
      'PAYPAL_CLIENT_SECRET',
      'PAYPAL_BASE_URL',
      'PAYPAL_WEBHOOK_ID',
    ])
  })

  it('should export all expected members', async () => {
    const module = await import('../index.js')
    const exportedKeys = Object.keys(module)

    expect(exportedKeys).toContain('getAccessToken')
    expect(exportedKeys).toContain('createSubscription')
    expect(exportedKeys).toContain('getSubscription')
    expect(exportedKeys).toContain('cancelSubscription')
    expect(exportedKeys).toContain('reviseSubscription')
    expect(exportedKeys).toContain('createOrder')
    expect(exportedKeys).toContain('verifyWebhookSignature')
    expect(exportedKeys).toContain('normalizeSubscription')
    expect(exportedKeys).toContain('paymentProvider')
    expect(exportedKeys).toContain('PayPalApiError')
  })
})
