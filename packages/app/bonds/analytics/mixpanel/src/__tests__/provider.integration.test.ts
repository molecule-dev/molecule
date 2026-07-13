/**
 * REAL-DEPENDENCY integration tests — no vi.mock: the actual mixpanel-browser
 * module, the real `@molecule/app-analytics` core, and the real
 * `@molecule/app-bond` registry underneath.
 *
 * The unit suite (`provider.test.ts`) mocks mixpanel-browser, so it can only
 * validate OUR assumptions about the SDK — not the SDK. That gap hid a silent
 * event black hole: the auto-generated Bond Wiring docs teach
 * `setProvider(provider)`, and the lazy `provider` export used to initialize
 * the REAL SDK with an empty token — which mixpanel-browser accepts in TOTAL
 * silence, sending every event to api.mixpanel.com where it is dropped
 * server-side with no client-side breadcrumb. Mocked tests asserted
 * `init('')` happily. This file pins the graceful-degradation contract against
 * the real module (no external service needed: the unconfigured path must
 * never touch the network at all).
 *
 * @module
 */

import mixpanel from 'mixpanel-browser'
import { describe, expect, it, vi } from 'vitest'

import {
  flush,
  group,
  hasProvider,
  identify,
  page,
  reset,
  setProvider,
  track,
} from '@molecule/app-analytics'

import { createProvider, provider } from '../provider.js'

describe('@molecule/app-analytics-mixpanel × REAL mixpanel-browser', () => {
  it('CONSUMER PROPERTY: importing the package with the real SDK is safe outside a browser (SSR/test runners)', () => {
    // This file already imported the barrel's modules with the REAL
    // mixpanel-browser — reaching this line proves module load doesn't require
    // window/document. The exports must be intact too.
    expect(createProvider).toBeTypeOf('function')
    expect(provider).toBeDefined()
  })

  it('CONSUMER PROPERTY + FAILURE DISAMBIGUATION: the documented Bond Wiring (setProvider(provider)) with no token survives a real app boot — one actionable warning, zero SDK/network activity', async () => {
    const initSpy = vi.spyOn(mixpanel, 'init')
    const trackSpy = vi.spyOn(mixpanel, 'track')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // Disambiguation signal 1: before wiring, "no provider bonded" is
      // observable — a caller can tell "analytics not wired" apart from
      // "wired but unconfigured".
      expect(hasProvider()).toBe(false)

      // The exact flow the auto-generated MOLECULE.md Bond Wiring teaches:
      setProvider(provider)
      expect(hasProvider()).toBe(true)
      // Bonding alone must not touch the SDK (lazy init) and must not warn yet.
      expect(warnSpy).not.toHaveBeenCalled()

      // A realistic app session: identify on login, events, page views, logout.
      await expect(identify({ userId: 'u1', email: 'u@example.com' })).resolves.toBeUndefined()
      await expect(
        track({ name: 'purchase.completed', properties: { amount: 49.99 } }),
      ).resolves.toBeUndefined()
      await expect(page({ path: '/pricing' })).resolves.toBeUndefined()
      await expect(group('org-1', { plan: 'pro' })).resolves.toBeUndefined()
      await expect(reset()).resolves.toBeUndefined()
      await expect(flush()).resolves.toBeUndefined()

      // Disambiguation signal 2: EXACTLY one warning naming the canonical env
      // var — "events never appear in Mixpanel" is diagnosable from the console
      // (vs the raw SDK, which accepts an empty token in total silence).
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('VITE_MIXPANEL_TOKEN'))

      // The unconfigured path must never initialize the SDK or send anything:
      // mixpanel.init('') + track would fire junk requests at api.mixpanel.com
      // from every visitor's browser.
      expect(initSpy).not.toHaveBeenCalled()
      expect(trackSpy).not.toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
      initSpy.mockRestore()
      trackSpy.mockRestore()
    }
  })

  it('createProvider() without a token returns a complete, resolving no-op provider (fresh warning per create)', async () => {
    const initSpy = vi.spyOn(mixpanel, 'init')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const p = createProvider()
      expect(warnSpy).toHaveBeenCalledTimes(1)
      // Every AnalyticsProvider method is present and safe — a partial no-op
      // would crash optional-method callers at runtime.
      await expect(p.identify({ userId: 'u1' })).resolves.toBeUndefined()
      await expect(p.track({ name: 'x' })).resolves.toBeUndefined()
      await expect(p.page({ path: '/' })).resolves.toBeUndefined()
      await expect(p.group!('org-1')).resolves.toBeUndefined()
      await expect(p.reset!()).resolves.toBeUndefined()
      await expect(p.flush!()).resolves.toBeUndefined()
      expect(initSpy).not.toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
      initSpy.mockRestore()
    }
  })
})
