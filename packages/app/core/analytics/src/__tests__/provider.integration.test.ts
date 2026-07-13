/**
 * REAL-DEPENDENCY integration tests — no mocks, the actual @molecule/app-bond
 * registry this package rides on.
 *
 * The unit suites mock `@molecule/app-bond` (with `isBonded` pinned to `true`),
 * so they can never feel lifecycle/ordering bugs in the real registry. One
 * shipped unfelt: `setupAutoTracking()` captured `getProvider()` ONCE at setup,
 * so running it before the analytics bond was set (a completely ordinary app
 * bootstrap ordering) permanently baked in the no-op provider — every
 * auto-tracked event silently vanished forever, even after bonding.
 *
 * @module
 */

import { unbond } from '@molecule/app-bond'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { setupAutoTracking } from '../auto-tracking.js'
import {
  flush,
  group,
  hasProvider,
  identify,
  page,
  reset,
  setProvider,
  track,
} from '../provider.js'
import type { AnalyticsEvent, AnalyticsProvider } from '../types.js'

/** Builds a recording provider whose calls are captured for assertions. */
const recordingProvider = (): AnalyticsProvider & { calls: { method: string; arg: unknown }[] } => {
  const calls: { method: string; arg: unknown }[] = []
  return {
    calls,
    identify: async (user) => {
      calls.push({ method: 'identify', arg: user })
    },
    track: async (event) => {
      calls.push({ method: 'track', arg: event })
    },
    page: async (pageView) => {
      calls.push({ method: 'page', arg: pageView })
    },
    reset: async () => {
      calls.push({ method: 'reset', arg: undefined })
    },
  }
}

afterEach(() => {
  // The real registry is module-global state — leave it clean for other files.
  unbond('app-analytics')
})

describe('@molecule/app-analytics × REAL @molecule/app-bond', () => {
  it('CONSUMER PROPERTY: every analytics call is safe with NO provider bonded (never throws, never rejects)', async () => {
    expect(hasProvider()).toBe(false)
    await expect(track({ name: 'button.clicked' })).resolves.toBeUndefined()
    await expect(identify({ userId: 'u1' })).resolves.toBeUndefined()
    await expect(page({ path: '/' })).resolves.toBeUndefined()
    await expect(group('org-1')).resolves.toBeUndefined()
    await expect(reset()).resolves.toBeUndefined()
    await expect(flush()).resolves.toBeUndefined()
  })

  it('FAILURE DISAMBIGUATION: hasProvider() is the signal that separates "analytics disabled" from "tracking"', async () => {
    // Errors are swallowed by design (analytics must never break the UI), so
    // hasProvider() is the ONLY way a caller can tell a silently-dropped event
    // (no bond) from a delivered one — assert both states are distinguishable.
    expect(hasProvider()).toBe(false)

    const provider = recordingProvider()
    setProvider(provider)
    expect(hasProvider()).toBe(true)
    await track({ name: 'purchase.completed', properties: { amount: 49.99 } })
    expect(provider.calls).toEqual([
      {
        method: 'track',
        arg: { name: 'purchase.completed', properties: { amount: 49.99 } },
      },
    ])
  })

  it('CONSUMER PROPERTY: a rejecting provider cannot break the UI — convenience calls still resolve', async () => {
    const failing: AnalyticsProvider = {
      identify: async () => {
        throw new Error('analytics backend down')
      },
      track: async () => {
        throw new Error('analytics backend down')
      },
      page: async () => {
        throw new Error('analytics backend down')
      },
    }
    setProvider(failing)
    await expect(track({ name: 'x' })).resolves.toBeUndefined()
    await expect(identify({ userId: 'u1' })).resolves.toBeUndefined()
    await expect(page({ path: '/' })).resolves.toBeUndefined()
    // Optional methods the provider doesn't implement are silent no-ops too.
    await expect(group('org-1')).resolves.toBeUndefined()
    await expect(reset()).resolves.toBeUndefined()
  })

  it('REGRESSION: setupAutoTracking() BEFORE the bond exists still tracks events fired AFTER bonding', async () => {
    // The ordinary bootstrap ordering trap: auto-tracking wired first,
    // analytics provider bonded later. With setup-time provider capture this
    // baked in the no-op provider and dropped every event forever.
    let authListener:
      | ((event: {
          type: 'login' | 'logout' | 'register' | 'refresh' | 'error'
          user?: { id: string; email?: string; name?: string }
        }) => void)
      | null = null
    const cleanup = setupAutoTracking({
      authClient: {
        addEventListener: (listener) => {
          authListener = listener
          return () => {
            authListener = null
          }
        },
      },
    })

    // Event before bonding: swallowed by the no-op provider (safe)…
    authListener!({ type: 'login', user: { id: 'early' } })

    // …then the app bonds the real provider…
    const provider = recordingProvider()
    setProvider(provider)

    // …and events fired after MUST reach it.
    authListener!({ type: 'login', user: { id: 'u9', email: 'u9@example.com', name: 'U Nine' } })
    await vi.waitFor(() => {
      expect(provider.calls.some((c) => c.method === 'identify')).toBe(true)
      expect(provider.calls.some((c) => c.method === 'track')).toBe(true)
    })
    const identifyCall = provider.calls.find((c) => c.method === 'identify')!
    expect(identifyCall.arg).toEqual({ userId: 'u9', email: 'u9@example.com', name: 'U Nine' })
    const trackCall = provider.calls.find((c) => c.method === 'track')!
    expect((trackCall.arg as AnalyticsEvent).name).toBe('auth.login')

    // Cleanup detaches the source listener.
    cleanup()
    expect(authListener).toBeNull()
  })

  it('auto-tracked logout resets identity; route changes become page views (real bond, real provider)', async () => {
    const provider = recordingProvider()
    setProvider(provider)

    let routeListener:
      | ((location: { pathname: string; search: string; hash: string }, action: string) => void)
      | null = null
    let authListener: ((event: { type: 'logout' }) => void) | null = null
    const cleanup = setupAutoTracking({
      authClient: {
        addEventListener: (listener) => {
          authListener = listener as (event: { type: 'logout' }) => void
          return () => {}
        },
      },
      router: {
        subscribe: (listener) => {
          routeListener = listener
          return () => {}
        },
      },
    })

    routeListener!({ pathname: '/settings', search: '?tab=profile', hash: '#top' }, 'PUSH')
    authListener!({ type: 'logout' })

    await vi.waitFor(() => {
      expect(provider.calls.some((c) => c.method === 'page')).toBe(true)
      expect(provider.calls.some((c) => c.method === 'reset')).toBe(true)
    })
    expect(provider.calls.find((c) => c.method === 'page')!.arg).toEqual({
      path: '/settings',
      url: '/settings?tab=profile#top',
    })
    expect(
      provider.calls.find(
        (c) => c.method === 'track' && (c.arg as AnalyticsEvent).name === 'auth.logout',
      ),
    ).toBeDefined()

    cleanup()
  })
})
