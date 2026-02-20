/**
 * Tests for notifications provider management (named bonds).
 */

const { registry } = vi.hoisted(() => {
  const registry = new Map<string, Map<string, unknown>>()
  return { registry }
})

vi.mock('@molecule/api-bond', () => ({
  bond: vi.fn((type: string, name: string, provider: unknown) => {
    if (!registry.has(type)) registry.set(type, new Map())
    registry.get(type)!.set(name, provider)
  }),
  get: vi.fn((type: string, name?: string) => {
    if (name) return registry.get(type)?.get(name) ?? undefined
    return registry.get(type)?.values().next().value ?? undefined
  }),
  getAll: vi.fn((type: string) => registry.get(type) ?? new Map()),
  isBonded: vi.fn((type: string) => registry.has(type) && registry.get(type)!.size > 0),
  getLogger: vi.fn(() => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() })),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: vi.fn((_key: string, _values?: unknown, opts?: { defaultValue?: string }) => {
    return opts?.defaultValue ?? _key
  }),
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getAllProviders, getProvider, hasProvider, notifyAll, setProvider } from '../provider.js'
import type { Notification, NotificationResult, NotificationsProvider } from '../types.js'

const createMockProvider = (name: string, result?: NotificationResult): NotificationsProvider => ({
  name,
  send: vi.fn().mockResolvedValue(result ?? { success: true }),
})

const sampleNotification: Notification = {
  subject: 'Test Alert',
  body: 'Something happened.',
  metadata: { severity: 'high' },
}

describe('@molecule/api-notifications provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    registry.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setProvider', () => {
    it('should register a named provider via bond', async () => {
      const { bond } = await import('@molecule/api-bond')
      const provider = createMockProvider('webhook')

      setProvider('webhook', provider)

      expect(bond).toHaveBeenCalledWith('notifications', 'webhook', provider)
    })
  })

  describe('getProvider', () => {
    it('should return the correct named provider', () => {
      const provider = createMockProvider('webhook')
      setProvider('webhook', provider)

      const result = getProvider('webhook')

      expect(result).toBe(provider)
    })

    it('should return null for an unknown name', () => {
      const result = getProvider('email')

      expect(result).toBeNull()
    })
  })

  describe('hasProvider', () => {
    it('should return false when no providers are bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should return true when at least one provider is bonded', () => {
      setProvider('slack', createMockProvider('slack'))

      expect(hasProvider()).toBe(true)
    })
  })

  describe('getAllProviders', () => {
    it('should return all registered providers', () => {
      const webhook = createMockProvider('webhook')
      const slack = createMockProvider('slack')
      setProvider('webhook', webhook)
      setProvider('slack', slack)

      const all = getAllProviders()

      expect(all.size).toBe(2)
      expect(all.get('webhook')).toBe(webhook)
      expect(all.get('slack')).toBe(slack)
    })
  })

  describe('notifyAll', () => {
    it('should send notification through all bonded channels and collect results', async () => {
      const webhook = createMockProvider('webhook', { success: true })
      const slack = createMockProvider('slack', { success: true })
      setProvider('webhook', webhook)
      setProvider('slack', slack)

      const results = await notifyAll(sampleNotification)

      expect(results).toHaveLength(2)
      expect(results.every((r) => r.success)).toBe(true)
      expect(webhook.send).toHaveBeenCalledWith(sampleNotification)
      expect(slack.send).toHaveBeenCalledWith(sampleNotification)
    })

    it('should include channel name on each result', async () => {
      const webhook = createMockProvider('webhook', { success: true })
      const slack = createMockProvider('slack', { success: true })
      setProvider('webhook', webhook)
      setProvider('slack', slack)

      const results = await notifyAll(sampleNotification)

      expect(results[0].channel).toBe('webhook')
      expect(results[1].channel).toBe('slack')
    })

    it('should include sentAt timestamp on each result', async () => {
      const webhook = createMockProvider('webhook', { success: true })
      setProvider('webhook', webhook)

      const before = new Date().toISOString()
      const results = await notifyAll(sampleNotification)
      const after = new Date().toISOString()

      expect(results[0].sentAt).toBeDefined()
      expect(results[0].sentAt! >= before).toBe(true)
      expect(results[0].sentAt! <= after).toBe(true)
    })

    it('should log a warning and return empty array when no providers are configured', async () => {
      const { getAll, getLogger } = await import('@molecule/api-bond')
      vi.mocked(getAll).mockReturnValueOnce(new Map())
      const mockLogger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }
      vi.mocked(getLogger).mockReturnValueOnce(mockLogger as never)

      const results = await notifyAll(sampleNotification)

      expect(results).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('No notification providers configured'),
      )
    })

    it('should handle one channel returning a failure result gracefully', async () => {
      const webhook = createMockProvider('webhook', { success: true })
      const slack = createMockProvider('slack', {
        success: false,
        error: 'Slack returned HTTP 500',
      })
      setProvider('webhook', webhook)
      setProvider('slack', slack)

      const results = await notifyAll(sampleNotification)

      expect(results).toHaveLength(2)
      const successResults = results.filter((r) => r.success)
      const failResults = results.filter((r) => !r.success)
      expect(successResults).toHaveLength(1)
      expect(failResults).toHaveLength(1)
      expect(failResults[0].error).toBe('Slack returned HTTP 500')
      expect(failResults[0].channel).toBe('slack')
    })

    it('should handle a channel throwing an exception without stopping others', async () => {
      const webhook = createMockProvider('webhook', { success: true })
      const slack = createMockProvider('slack')
      vi.mocked(slack.send).mockRejectedValue(new Error('Network timeout'))
      setProvider('webhook', webhook)
      setProvider('slack', slack)

      const results = await notifyAll(sampleNotification)

      expect(results).toHaveLength(2)
      // webhook should still succeed
      expect(results[0].success).toBe(true)
      expect(results[0].channel).toBe('webhook')
      // slack should have an error captured
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBe('Network timeout')
      expect(results[1].channel).toBe('slack')
      expect(results[1].sentAt).toBeDefined()
    })
  })
})
