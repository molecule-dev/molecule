// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import type { HttpClient } from '@molecule/app-http'

import { AuthContext, HttpContext } from '../../contexts.js'
import { useVerifyPaymentReturn } from '../useVerifyPaymentReturn.js'

type User = { id: string; email: string }

/**
 * Minimal auth client exposing the pieces `useAuth` reads.
 *
 * @param options - Whether auth has hydrated, and the signed-in user.
 * @returns The stub client plus its `refresh` spy.
 */
function makeAuthClient(options: { initialized?: boolean; user?: User | null } = {}): {
  client: AuthClient<User>
  refresh: ReturnType<typeof vi.fn>
} {
  const { initialized = true, user = { id: 'user_1', email: 'buyer@example.com' } } = options
  const state: AuthState<User> = {
    initialized,
    authenticated: !!user,
    user: user ?? null,
    loading: false,
    error: null,
  }
  const refresh = vi.fn().mockResolvedValue({ user, accessToken: 'token' })
  const client = {
    getState: () => state,
    onAuthChange: () => () => {},
    refresh,
  } as unknown as AuthClient<User>
  return { client, refresh }
}

/**
 * Minimal HTTP client whose `post` is a spy.
 *
 * @param post - The stubbed post implementation.
 * @returns The stub client.
 */
function makeHttpClient(post: ReturnType<typeof vi.fn>): HttpClient {
  return { post } as unknown as HttpClient
}

/**
 * Wraps a hook render in the auth + http contexts it reads.
 *
 * @param client - The auth client to provide.
 * @param http - The http client to provide.
 * @returns A wrapper component for `renderHook`.
 */
function wrapper(client: AuthClient<User>, http: HttpClient) {
  return ({ children }: { children: ReactNode }) => (
    <AuthContext.Provider value={client as never}>
      <HttpContext.Provider value={http}>{children}</HttpContext.Provider>
    </AuthContext.Provider>
  )
}

/**
 * Points the jsdom address bar at a checkout-return URL.
 *
 * @param search - The query string to set (including `?`).
 */
function setSearch(search: string): void {
  window.history.replaceState({}, '', `/plan-updated${search}`)
}

describe('useVerifyPaymentReturn', () => {
  beforeEach(() => {
    setSearch('')
  })

  it('verifies the purchase named by the return URL, from the app origin', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_123')
    const post = vi.fn().mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} })
    const { client, refresh } = makeAuthClient()

    const { result } = renderHook(() => useVerifyPaymentReturn(), {
      wrapper: wrapper(client, makeHttpClient(post)),
    })

    await waitFor(() => expect(result.current.status).toBe('verified'))
    expect(post).toHaveBeenCalledWith('/users/user_1/verify-payment/stripe', {
      subscriptionId: 'cs_live_123',
    })
    // The cached profile still says "free" until it is re-read.
    expect(refresh).toHaveBeenCalled()
  })

  // PayPal appends its own parameter names to the return URL.
  it.each([
    ['?provider=paypal&subscription_id=I-ABC', 'paypal', 'I-ABC'],
    ['?provider=paypal&token=EC-9GH', 'paypal', 'EC-9GH'],
    ['?provider=stripe&session_id=cs_live_456', 'stripe', 'cs_live_456'],
  ])('reads the provider id from %s', async (search, provider, id) => {
    setSearch(search)
    const post = vi.fn().mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} })
    const { client } = makeAuthClient()

    const { result } = renderHook(() => useVerifyPaymentReturn(), {
      wrapper: wrapper(client, makeHttpClient(post)),
    })

    await waitFor(() => expect(result.current.status).toBe('verified'))
    expect(post).toHaveBeenCalledWith(`/users/user_1/verify-payment/${provider}`, {
      subscriptionId: id,
    })
  })

  it('stays idle and issues no request on a normal page visit', async () => {
    const post = vi.fn()
    const { client } = makeAuthClient()

    const { result } = renderHook(() => useVerifyPaymentReturn(), {
      wrapper: wrapper(client, makeHttpClient(post)),
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.isReturn).toBe(false)
    expect(post).not.toHaveBeenCalled()
  })

  // After the redirect the page is a cold load: the bearer token is gone and
  // the session is still being restored from the httpOnly cookie. Verifying
  // before that lands would send the request unauthenticated.
  it('waits for auth to hydrate before verifying', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_789')
    const post = vi.fn()
    const { client } = makeAuthClient({ initialized: false, user: null })

    const { result } = renderHook(() => useVerifyPaymentReturn(), {
      wrapper: wrapper(client, makeHttpClient(post)),
    })

    expect(result.current.status).toBe('idle')
    expect(post).not.toHaveBeenCalled()
  })

  it('reports a failure and can retry it', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_fail')
    const post = vi
      .fn()
      .mockRejectedValueOnce(new Error('502'))
      .mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} })
    const { client } = makeAuthClient()

    const { result } = renderHook(() => useVerifyPaymentReturn(), {
      wrapper: wrapper(client, makeHttpClient(post)),
    })

    await waitFor(() => expect(result.current.status).toBe('failed'))
    expect(result.current.error?.message).toBe('502')

    result.current.retry()

    await waitFor(() => expect(result.current.status).toBe('verified'))
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('verifies once per transaction even as auth state settles', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_once')
    const post = vi.fn().mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} })
    const { client } = makeAuthClient()

    const { result, rerender } = renderHook(() => useVerifyPaymentReturn(), {
      wrapper: wrapper(client, makeHttpClient(post)),
    })

    await waitFor(() => expect(result.current.status).toBe('verified'))
    rerender()
    rerender()

    expect(post).toHaveBeenCalledTimes(1)
  })

  // A reload (or a shared link) must not re-run a purchase verification.
  it('drops the provider parameters from the URL once verified', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_clean&utm_source=email')
    const post = vi.fn().mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} })
    const { client } = makeAuthClient()

    const { result } = renderHook(() => useVerifyPaymentReturn(), {
      wrapper: wrapper(client, makeHttpClient(post)),
    })

    await waitFor(() => expect(result.current.status).toBe('verified'))
    expect(window.location.search).toBe('?utm_source=email')
  })

  it('keeps the URL intact when cleanUrl is disabled', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_keep')
    const post = vi.fn().mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} })
    const { client } = makeAuthClient()

    const { result } = renderHook(() => useVerifyPaymentReturn({ cleanUrl: false }), {
      wrapper: wrapper(client, makeHttpClient(post)),
    })

    await waitFor(() => expect(result.current.status).toBe('verified'))
    expect(window.location.search).toBe('?provider=stripe&sessionId=cs_live_keep')
  })

  it('uses the provider option when the URL names none', async () => {
    setSearch('?sessionId=cs_live_opt')
    const post = vi.fn().mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {} })
    const { client } = makeAuthClient()

    const { result } = renderHook(() => useVerifyPaymentReturn({ provider: 'stripe' }), {
      wrapper: wrapper(client, makeHttpClient(post)),
    })

    await waitFor(() => expect(result.current.status).toBe('verified'))
    expect(post).toHaveBeenCalledWith('/users/user_1/verify-payment/stripe', {
      subscriptionId: 'cs_live_opt',
    })
  })

  it('does nothing when disabled', async () => {
    setSearch('?provider=stripe&sessionId=cs_live_off')
    const post = vi.fn()
    const { client } = makeAuthClient()

    const { result } = renderHook(() => useVerifyPaymentReturn({ enabled: false }), {
      wrapper: wrapper(client, makeHttpClient(post)),
    })

    expect(result.current.status).toBe('idle')
    expect(post).not.toHaveBeenCalled()
  })
})
