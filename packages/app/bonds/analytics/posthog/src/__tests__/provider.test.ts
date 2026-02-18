/**
 * Tests for PostHog app analytics provider.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockInit, mockIdentify, mockCapture, mockGroup, mockReset } = vi.hoisted(() => ({
  mockInit: vi.fn(),
  mockIdentify: vi.fn(),
  mockCapture: vi.fn(),
  mockGroup: vi.fn(),
  mockReset: vi.fn(),
}))

vi.mock('posthog-js', () => ({
  posthog: {
    init: mockInit,
    identify: mockIdentify,
    capture: mockCapture,
    group: mockGroup,
    reset: mockReset,
  },
}))

import { createProvider, provider } from '../provider.js'

describe('PostHog app analytics provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createProvider', () => {
    it('should initialize PostHog with options', () => {
      createProvider({ apiKey: 'pk_test', host: 'https://ph.example.com', autocapture: true })
      expect(mockInit).toHaveBeenCalledWith('pk_test', {
        api_host: 'https://ph.example.com',
        autocapture: true,
        capture_pageview: false,
      })
    })

    it('should use defaults when no options provided', () => {
      createProvider()
      expect(mockInit).toHaveBeenCalledWith('', {
        api_host: 'https://app.posthog.com',
        autocapture: false,
        capture_pageview: false,
      })
    })
  })

  describe('provider methods', () => {
    let p: ReturnType<typeof createProvider>

    beforeEach(() => {
      p = createProvider({ apiKey: 'pk_test' })
    })

    it('identify should call posthog.identify', async () => {
      await p.identify({ userId: 'u1', email: 'a@b.com', name: 'User' })
      expect(mockIdentify).toHaveBeenCalledWith('u1', {
        email: 'a@b.com',
        name: 'User',
      })
    })

    it('identify should include traits', async () => {
      await p.identify({ userId: 'u1', traits: { plan: 'pro' } })
      expect(mockIdentify).toHaveBeenCalledWith('u1', {
        email: undefined,
        name: undefined,
        plan: 'pro',
      })
    })

    it('track should call posthog.capture', async () => {
      await p.track({ name: 'btn.click', properties: { label: 'submit' } })
      expect(mockCapture).toHaveBeenCalledWith('btn.click', { label: 'submit' })
    })

    it('page should call posthog.capture with $pageview', async () => {
      await p.page({ path: '/home', url: 'https://example.com/home', name: 'Home' })
      expect(mockCapture).toHaveBeenCalledWith('$pageview', {
        $current_url: 'https://example.com/home',
        $pathname: '/home',
        $referrer: undefined,
        page_name: 'Home',
        page_category: undefined,
      })
    })

    it('group should call posthog.group', async () => {
      await p.group!('org-1', { name: 'Acme' })
      expect(mockGroup).toHaveBeenCalledWith('company', 'org-1', { name: 'Acme' })
    })

    it('reset should call posthog.reset', async () => {
      await p.reset!()
      expect(mockReset).toHaveBeenCalled()
    })

    it('flush should resolve without error', async () => {
      await expect(p.flush!()).resolves.toBeUndefined()
    })
  })

  describe('lazy provider', () => {
    it('should export a provider object', () => {
      expect(provider).toBeDefined()
    })
  })
})
