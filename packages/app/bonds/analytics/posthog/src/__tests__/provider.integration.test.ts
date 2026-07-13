/**
 * REAL-DEPENDENCY integration tests — no vi.mock: the actual posthog-js
 * module, the real `@molecule/app-analytics` core, and the real
 * `@molecule/app-bond` registry underneath.
 *
 * The unit suite (`provider.test.ts`) mocks posthog-js, so it can only
 * validate OUR assumptions about the SDK — not the SDK. The trap this file
 * pins: the auto-generated Bond Wiring docs teach `setProvider(provider)`, and
 * the lazy `provider` export used to call `posthog.init('')` — which leaves
 * the real SDK singleton uninitialized (its own error never names the env var
 * this stack wires), after which every call is silently dropped. Mocked tests
 * asserted `init('')` happily. The unconfigured path must degrade gracefully
 * with an actionable breadcrumb and must never touch the SDK or the network
 * (no external service needed for this contract).
 *
 * @module
 */

import { posthog } from 'posthog-js'
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

describe('@molecule/app-analytics-posthog × REAL posthog-js', () => {
  it('CONSUMER PROPERTY: importing the package with the real SDK is safe outside a browser (SSR/test runners)', () => {
    // This file already imported the barrel's modules with the REAL posthog-js
    // — reaching this line proves module load doesn't require window/document.
    expect(createProvider).toBeTypeOf('function')
    expect(provider).toBeDefined()
  })

  it('CONSUMER PROPERTY + FAILURE DISAMBIGUATION: the documented Bond Wiring (setProvider(provider)) with no key survives a real app boot — one actionable warning, zero SDK/network activity', async () => {
    const initSpy = vi.spyOn(posthog, 'init')
    const captureSpy = vi.spyOn(posthog, 'capture')
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
      // var — distinguishable from the SDK's own generic "initialized without
      // a token" error, which never says what to configure in THIS stack.
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('VITE_POSTHOG_KEY'))

      // The unconfigured path must never initialize or call the SDK — an
      // uninitialized posthog-js singleton silently drops every call, which is
      // exactly the black hole this contract prevents.
      expect(initSpy).not.toHaveBeenCalled()
      expect(captureSpy).not.toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
      initSpy.mockRestore()
      captureSpy.mockRestore()
    }
  })

  it('createProvider() without a key returns a complete, resolving no-op provider (fresh warning per create)', async () => {
    const initSpy = vi.spyOn(posthog, 'init')
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

  it('CONSUMER PROPERTY: the real SDK exposes __loaded as the flag that gates re-init (the property our double-init warning reads)', () => {
    // Confirms against the REAL posthog-js .d.ts/runtime shape (not a guess)
    // that `__loaded` exists and starts falsy — the mocked unit suite
    // (provider.test.ts) exercises the actual warning branch by toggling
    // this same property on its mock, since driving the real SDK through a
    // second real `.init()` call requires a browser environment this
    // package's tests intentionally never spin up (see the no-token tests
    // above — this file only ever configures the SDK with an EMPTY token to
    // stay network-free).
    expect(posthog.__loaded).toBe(false)
    expect(typeof posthog.__loaded).toBe('boolean')
  })
})
