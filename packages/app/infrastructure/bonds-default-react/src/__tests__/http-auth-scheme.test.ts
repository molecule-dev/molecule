import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDefaultHttpClientWithAuthBearer } from '../index.js'

/**
 * Reads back the `Authorization` header the helper's request interceptor put on
 * the request the client just sent.
 *
 * @param fetchMock - The stubbed `fetch`.
 * @returns The header value, or undefined when the request carried none.
 */
function authorizationHeader(fetchMock: ReturnType<typeof vi.fn>): string | undefined {
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
  return (init?.headers as Record<string, string> | undefined)?.Authorization
}

describe('createDefaultHttpClientWithAuthBearer — the auth scheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the token with the configured authScheme', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { httpClient } = createDefaultHttpClientWithAuthBearer({
      baseURL: 'http://api.test',
      getToken: () => 'my-jwt-token',
      authScheme: 'Token',
    })

    await httpClient.get('/me')

    expect(authorizationHeader(fetchMock)).toBe('Token my-jwt-token')
  })

  it('sends the token with Bearer when no authScheme is configured', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { httpClient } = createDefaultHttpClientWithAuthBearer({
      baseURL: 'http://api.test',
      getToken: () => 'my-jwt-token',
    })

    await httpClient.get('/me')

    expect(authorizationHeader(fetchMock)).toBe('Bearer my-jwt-token')
  })
})
