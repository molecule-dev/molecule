import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { unbondSingleton } from '@molecule/app-bond'

import { createFetchClient, getClient, setAuthTokenSource, setClient } from '../index.js'

describe('a separate account beside the visitor HTTP client', () => {
  const fetch = vi.fn(async () => Response.json({ id: 'stock-1' }))

  beforeEach(() => {
    unbondSingleton('http-client')
    setAuthTokenSource(null)
    fetch.mockClear()
    vi.stubGlobal('fetch', fetch)
  })

  afterEach(() => {
    setAuthTokenSource(null)
    unbondSingleton('http-client')
    vi.unstubAllGlobals()
  })

  it('writes stock for two accounts without changing the signed-in visitor', async () => {
    let visitorToken = 'visitor-a'
    setClient(createFetchClient({ baseURL: '/api', authScheme: 'Token' }))
    setAuthTokenSource(() => visitorToken)

    const scoped = createFetchClient({ baseURL: '/api', authScheme: 'Token' })
    scoped.setAuthToken('operator-a')
    const saved = await scoped.post<{ id: string }>('/stock', { name: 'Paper' })
    expect(saved.data).toEqual({ id: 'stock-1' })
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/stock',
      expect.objectContaining({
        headers: { Authorization: 'Token operator-a', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Paper' }),
      }),
    )

    visitorToken = 'visitor-b'
    scoped.setAuthToken('operator-b')
    await scoped.post('/stock', { name: 'Ink' })
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/stock',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Token operator-b' }),
      }),
    )
    expect(getClient().getAuthToken()).toBe('visitor-b')
    await getClient().get('/account')
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/account',
      expect.objectContaining({ headers: { Authorization: 'Token visitor-b' } }),
    )
  })

  it('leaves anonymous package requests separate from the visitor token source', async () => {
    setClient(createFetchClient({ baseURL: '/api' }))
    setAuthTokenSource(() => 'visitor')
    const scoped = createFetchClient({ baseURL: '/inventory' })
    await scoped.get('/catalog')
    expect(fetch).toHaveBeenLastCalledWith(
      '/inventory/catalog',
      expect.objectContaining({ headers: {} }),
    )
    await getClient().get('/account')
    expect(fetch).toHaveBeenLastCalledWith(
      '/api/account',
      expect.objectContaining({ headers: { Authorization: 'Bearer visitor' } }),
    )
  })
})
