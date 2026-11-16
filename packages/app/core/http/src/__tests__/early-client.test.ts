import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isBonded, unbondSingleton } from '@molecule/app-bond'

import { createFetchClient, getClient, setAuthTokenSource, setClient } from '../index.js'

describe('an HTTP client read before application provider setup', () => {
  const fetch = vi.fn(
    async () => new Response('{}', { headers: { 'content-type': 'application/json' } }),
  )

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

  it('uses the configured API prefix for a client captured by an imported service', async () => {
    const http = getClient()
    expect(isBonded('http-client')).toBe(false)
    setClient(createFetchClient({ baseURL: '/api' }))
    await http.post('/users', { user: { username: 'reader' } })
    expect(fetch).toHaveBeenCalledWith('/api/users', expect.objectContaining({ method: 'POST' }))
  })

  it('follows a vendor client with method receivers, including an extracted method', async () => {
    const http = getClient()
    const post = http.post
    const transport = createFetchClient({ baseURL: '/warehouse/v2' })
    const request = vi.spyOn(transport, 'post').mockImplementation(function (
      this: typeof transport,
      ...args
    ) {
      expect(this).toBe(transport)
      return transport.request({ method: 'POST', url: args[0], data: args[1] })
    })
    setClient(transport)
    await post('/receipts', { amount: 17 })
    expect(request).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith('/warehouse/v2/receipts', expect.any(Object))
    expect(http.baseURL).toBe('/warehouse/v2')
    http.baseURL = '/warehouse/v3'
    expect(transport.baseURL).toBe('/warehouse/v3')
  })

  it('uses the live session and provider after startup and after a provider swap', async () => {
    const http = getClient()
    let token = 'session-a'
    setAuthTokenSource(() => token)
    setClient(createFetchClient({ baseURL: '/first', authScheme: 'Token' }))
    token = 'session-b'
    await http.get('/items')
    expect(fetch).toHaveBeenLastCalledWith(
      '/first/items',
      expect.objectContaining({ headers: { Authorization: 'Token session-b' } }),
    )
    setClient(createFetchClient({ baseURL: '/second' }))
    await http.get('/items')
    expect(fetch).toHaveBeenLastCalledWith(
      '/second/items',
      expect.objectContaining({ headers: { Authorization: 'Bearer session-b' } }),
    )
  })

  it('keeps an explicitly created independent client independent of the application bond', async () => {
    const independent = createFetchClient({ baseURL: '/external' })
    setClient(createFetchClient({ baseURL: '/app' }))
    await independent.get('/catalog')
    expect(fetch).toHaveBeenCalledWith('/external/catalog', expect.any(Object))
  })

  it('still supports an unbonded same-origin app and bonding the early handle itself', async () => {
    const http = getClient()
    await http.get('/health')
    expect(fetch).toHaveBeenLastCalledWith('/health', expect.any(Object))
    setClient(http)
    await http.get('/health')
    expect(fetch).toHaveBeenLastCalledWith('/health', expect.any(Object))
  })
})
