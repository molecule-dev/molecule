import { afterEach, describe, expect, it, vi } from 'vitest'

import { createJWTAuthClient } from '../index.js'
import type { AuthClient, UserProfile } from '../types.js'

afterEach(() => vi.unstubAllGlobals())

describe('profile endpoint resolution', () => {
  it('resolves the current user before applying a submitted identity patch', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ user: { id: 'edited', name: 'Saved' } }), {
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetch)
    const endpoint = vi.fn((user: { id: string }) => '/members/' + encodeURIComponent(user.id))
    const client = createJWTAuthClient({
      storage: 'memory',
      baseURL: '/api',
      profileEndpoint: endpoint,
    })
    client.setSession({ accessToken: 'token', user: { id: 'reader/space ?' } })
    await client.updateProfile({ id: 'edited', name: 'Saved' })
    expect(endpoint).toHaveBeenCalledWith({ id: 'reader/space ?' })
    expect(fetch).toHaveBeenCalledWith(
      '/api/members/reader%2Fspace%20%3F',
      expect.objectContaining({ method: 'PATCH', body: '{"id":"edited","name":"Saved"}' }),
    )
  })
  it('does not invoke a user-keyed resolver or issue a request without a user', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const endpoint = vi.fn((user: { id: string }) => '/members/' + user.id)
    const client = createJWTAuthClient({ storage: 'memory', profileEndpoint: endpoint })
    await expect(client.updateProfile({ name: 'Saved' })).rejects.toThrow('Sign in')
    expect(endpoint).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('does not send a previous account route with a newly adopted session', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const client: AuthClient<UserProfile> = createJWTAuthClient<UserProfile>({
      storage: 'memory',
      profileEndpoint: (user) => {
        client.setSession({ accessToken: 'new-token', user: { id: 'next' } })
        return '/members/' + user.id
      },
    })
    client.setSession({ accessToken: 'token', user: { id: 'reader' } })
    await expect(client.updateProfile({ name: 'Saved' })).rejects.toThrow('session changed')
    expect(client.getUser()).toEqual({ id: 'next' })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('checks session ownership after serializing the request body', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ id: 'reader', name: 'Saved' })))
    vi.stubGlobal('fetch', fetch)
    const client: AuthClient<UserProfile> = createJWTAuthClient<UserProfile>({
      storage: 'memory',
      profileEndpoint: (user) => '/members/' + user.id,
      profileRequestBody: (patch) => ({
        toJSON: () => {
          client.setSession({ accessToken: 'new-token', user: { id: 'next' } })
          return patch
        },
      }),
    })
    client.setSession({ accessToken: 'token', user: { id: 'reader' } })
    await expect(client.updateProfile({ name: 'Saved' })).rejects.toThrow('session changed')
    expect(client.getUser()).toEqual({ id: 'next' })
    expect(fetch).not.toHaveBeenCalled()
  })
  it('refuses an empty resolved route without changing the user or sending a request', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const client = createJWTAuthClient({ storage: 'memory', profileEndpoint: () => '' })
    client.setSession({ accessToken: 'token', user: { id: 'reader' } })
    await expect(client.updateProfile({ name: 'Saved' })).rejects.toThrow('nonempty route')
    expect(client.getUser()).toEqual({ id: 'reader' })
    expect(fetch).not.toHaveBeenCalled()
  })
})
