/**
 * Header names are case-insensitive, so the client must merge them that way.
 *
 * A plain object holding both `content-type` and `Content-Type` reaches the wire as one
 * `application/json, application/json` value (fetch appends each key), which JSON body parsers
 * reject — the server then sees no body. The same join turned a caller's `authorization` plus the
 * client's token into `Bearer a, Bearer b`. Each case reads the headers the way fetch itself does:
 * through `new Headers(init.headers)`.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFetchClient } from '../provider.js'

const mockFetch = vi.fn()

/** The headers of the last request, as fetch would send them. */
const sent = (): Headers => new Headers((mockFetch.mock.calls.at(-1)?.[1] as RequestInit).headers)

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    text: () => Promise.resolve('{}'),
    json: () => Promise.resolve({}),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('header names in any case', () => {
  it('sends one JSON content type when the caller names it in lower case', async () => {
    await createFetchClient().put(
      '/x',
      { enabled: true },
      { headers: { 'content-type': 'application/json' } },
    )
    expect(sent().get('content-type')).toBe('application/json')
  })

  it("keeps the caller's own content type for an object body", async () => {
    await createFetchClient().patch(
      '/x',
      { name: 'x' },
      { headers: { 'content-type': 'application/merge-patch+json' } },
    )
    expect(sent().get('content-type')).toBe('application/merge-patch+json')
  })

  it('adds the JSON content type when no header names one', async () => {
    await createFetchClient().post('/x', { a: 1 })
    expect(sent().get('content-type')).toBe('application/json')
  })

  it('lets a request header replace a default spelled differently', async () => {
    await createFetchClient({ defaultHeaders: { 'X-Trace': 'default' } }).get('/x', {
      headers: { 'x-trace': 'request' },
    })
    expect(sent().get('x-trace')).toBe('request')
  })

  it("sends one Authorization, the client's token, over a caller's lower-case header", async () => {
    const client = createFetchClient()
    client.setAuthToken('jwt-1')
    await client.get('/x', { headers: { authorization: 'Bearer other' } })
    expect(sent().get('authorization')).toBe('Bearer jwt-1')
  })

  it('drops every spelling of the content type for FormData so the browser sets the boundary', async () => {
    const form = new FormData()
    form.append('f', 'v')
    await createFetchClient().post('/x', form, {
      headers: { 'content-type': 'multipart/form-data' },
    })
    expect(sent().get('content-type')).toBeNull()
  })
})
