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
    // Mirrors the REAL SDK's own instance field (verified against
    // posthog-js's compiled source + .d.ts: `__loaded=!1` in the
    // constructor, flipped to `!0` inside a successful `_init()`). The mock
    // `init` above is a bare vi.fn() and does NOT flip this itself — tests
    // that need the "already initialized" branch set it explicitly, the
    // same way the real SDK would have after a first successful init.
    __loaded: false,
  },
}))

import { posthog } from 'posthog-js'

import { createProvider, provider } from '../provider.js'

describe('PostHog app analytics provider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    posthog.__loaded = false
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

    it('should leave api_host to the SDK default when no host provided', () => {
      // The SDK's own default is the current PostHog Cloud US endpoint
      // (us.i.posthog.com); forcing the legacy app.posthog.com here was drift.
      createProvider({ apiKey: 'pk_test' })
      expect(mockInit).toHaveBeenCalledWith('pk_test', {
        autocapture: false,
        capture_pageview: false,
      })
    })

    // Regression test for the api-drift finding: posthog-js's `posthog`
    // client is a module-level singleton, so a second real `.init()` call
    // no-ops and keeps the FIRST config — a changed host/autocapture used to
    // vanish with only the SDK's own generic warning (which never says
    // WHICH call was ignored). This pins that molecule's own actionable
    // warning fires when `posthog.__loaded` is already true.
    it('should warn (naming the ignored call) when createProvider() runs again after the SDK already initialized', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        createProvider({ apiKey: 'pk_first', host: 'https://us.i.posthog.com' })
        expect(warnSpy).not.toHaveBeenCalled()

        // Simulate what the REAL SDK does internally after a successful init.
        posthog.__loaded = true

        createProvider({ apiKey: 'pk_first', host: 'https://eu.i.posthog.com' })
        expect(warnSpy).toHaveBeenCalledTimes(1)
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('already initialized'))
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('IGNORED'))
        // We still call init() every time (harmless — the real SDK's own
        // `__loaded` guard makes it a no-op); only our extra warning is new.
        expect(mockInit).toHaveBeenCalledTimes(2)
      } finally {
        warnSpy.mockRestore()
      }
    })

    it('should NOT warn about re-initialization on the very first createProvider() call', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        createProvider({ apiKey: 'pk_test' })
        expect(warnSpy).not.toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
    })

    it('should NOT initialize the SDK without an API key — warns once and no-ops instead', async () => {
      // posthog.init('') leaves the singleton uninitialized and every later
      // call is silently dropped. The provider must degrade gracefully with a
      // breadcrumb naming the env var this stack actually wires.
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        const p = createProvider()
        expect(mockInit).not.toHaveBeenCalled()
        expect(warnSpy).toHaveBeenCalledTimes(1)
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('VITE_POSTHOG_KEY'))
        // All calls resolve (analytics must never break the UI) and never touch the SDK.
        await expect(p.track({ name: 'x' })).resolves.toBeUndefined()
        await expect(p.identify({ userId: 'u1' })).resolves.toBeUndefined()
        await expect(p.page({ path: '/' })).resolves.toBeUndefined()
        expect(mockCapture).not.toHaveBeenCalled()
        expect(mockIdentify).not.toHaveBeenCalled()
      } finally {
        warnSpy.mockRestore()
      }
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

    it('track should honor a caller-supplied timestamp via CaptureOptions', async () => {
      const timestamp = new Date('2026-01-01T00:00:00Z')
      await p.track({ name: 'btn.click', properties: { label: 'submit' }, timestamp })
      expect(mockCapture).toHaveBeenCalledWith('btn.click', { label: 'submit' }, { timestamp })
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
