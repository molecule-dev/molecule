import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { RelayError } from '../errors.js'
import { createRelayFetch, installRelayFetch } from '../relay-fetch.js'
import type { RelayFetch } from '../types.js'
import {
  BLOCKED_HOST,
  BUSY_HOST,
  denialMessage,
  startTestServers,
  TEST_CREDENTIAL,
  type TestServers,
} from './relay-server.js'

let servers: TestServers
let relayFetch: RelayFetch
const originalFetch = globalThis.fetch

/** The echo payload the upstream returns. */
interface Echo {
  method: string
  path: string
  headers: Record<string, string>
  body: string
  bodyBase64: string
}

const expectRelayError = async (
  promise: Promise<unknown>,
  expected: { kind: RelayError['kind']; status?: number; message?: string | RegExp },
): Promise<RelayError> => {
  const error = await promise.then(
    () => {
      throw new Error('expected a RelayError')
    },
    (caught: unknown) => caught,
  )
  expect(error).toBeInstanceOf(RelayError)
  expect(error).toBeInstanceOf(TypeError)
  const relayError = error as RelayError
  expect(relayError.kind).toBe(expected.kind)
  if (expected.status !== undefined) expect(relayError.status).toBe(expected.status)
  if (typeof expected.message === 'string') expect(relayError.message).toBe(expected.message)
  else if (expected.message) expect(relayError.message).toMatch(expected.message)
  return relayError
}

beforeAll(async () => {
  servers = await startTestServers()
})

afterAll(async () => {
  await servers.close()
})

beforeEach(() => {
  servers.calls.length = 0
  relayFetch = createRelayFetch({ relayUrl: servers.relayUrl, credential: TEST_CREDENTIAL })
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('createRelayFetch: round trip', () => {
  it('returns the upstream status, headers and body, minus the relay’s own headers', async () => {
    const res = await relayFetch(`${servers.upstream}/echo?x=1`, {
      headers: { 'x-custom': 'one' },
    })
    expect(res.status).toBe(200)
    expect(res.statusText).toBe('OK')
    expect(res.ok).toBe(true)
    expect(res.headers.get('x-up')).toBe('yes')
    expect(res.headers.get('content-type')).toBe('application/json')
    expect(res.headers.get('x-relay-status')).toBeNull()
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(res.url).toBe(`${servers.upstream}/echo?x=1`)
    expect(res.redirected).toBe(false)
    const echo = (await res.json()) as Echo
    expect(echo.method).toBe('GET')
    expect(echo.path).toBe('/echo?x=1')
    expect(echo.headers['x-custom']).toBe('one')
  })

  it('sends the credential as Basic base64 and the request as the relay’s JSON', async () => {
    await relayFetch(`${servers.upstream}/echo`, { method: 'POST', body: 'hello' })
    expect(servers.calls).toHaveLength(1)
    const call = servers.calls[0]
    expect(call.authorization).toBe(`Basic ${btoa(TEST_CREDENTIAL)}`)
    expect(call.body).toMatchObject({
      url: `${servers.upstream}/echo`,
      method: 'POST',
      bodyBase64: btoa('hello'),
    })
  })

  it('accepts an already-encoded credential and a "Basic " prefix', async () => {
    for (const credential of [btoa(TEST_CREDENTIAL), `Basic ${btoa(TEST_CREDENTIAL)}`]) {
      const res = await createRelayFetch({ relayUrl: servers.relayUrl, credential })(
        `${servers.upstream}/echo`,
      )
      expect(res.status).toBe(200)
    }
  })

  it('round-trips binary bytes both ways', async () => {
    const res = await relayFetch(`${servers.upstream}/binary`)
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect(bytes).toEqual(new Uint8Array(Array.from({ length: 256 }, (_, i) => i)))

    const sent = new Uint8Array([0, 255, 128, 1, 10, 13])
    const echoed = (await (
      await relayFetch(`${servers.upstream}/echo`, { method: 'PUT', body: sent })
    ).json()) as Echo
    expect(echoed.method).toBe('PUT')
    expect(Uint8Array.from(atob(echoed.bodyBase64), (c) => c.charCodeAt(0))).toEqual(sent)
  })

  it('carries a POST body with its implied Content-Type (URLSearchParams, JSON string)', async () => {
    const form = (await (
      await relayFetch(`${servers.upstream}/echo`, {
        method: 'POST',
        body: new URLSearchParams({ amount: '100', currency: 'usd' }),
      })
    ).json()) as Echo
    expect(form.body).toBe('amount=100&currency=usd')
    expect(form.headers['content-type']).toContain('application/x-www-form-urlencoded')

    const json = (await (
      await relayFetch(`${servers.upstream}/echo`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ a: 1 }),
      })
    ).json()) as Echo
    expect(json.body).toBe('{"a":1}')
    expect(json.headers['content-type']).toBe('application/json')
  })

  it('accepts Headers, array and object header inits', async () => {
    for (const headers of [
      new Headers({ 'x-a': '1' }),
      [['x-a', '1']] as [string, string][],
      { 'x-a': '1' },
    ]) {
      const echo = (await (
        await relayFetch(`${servers.upstream}/echo`, { headers })
      ).json()) as Echo
      expect(echo.headers['x-a']).toBe('1')
    }
  })

  it('accepts a Request object: its method, headers and body', async () => {
    const request = new Request(`${servers.upstream}/echo`, {
      method: 'PATCH',
      headers: { 'x-from-request': 'yes' },
      body: 'patched',
    })
    const echo = (await (await relayFetch(request)).json()) as Echo
    expect(echo.method).toBe('PATCH')
    expect(echo.headers['x-from-request']).toBe('yes')
    expect(echo.body).toBe('patched')
  })

  it('accepts a URL object', async () => {
    const res = await relayFetch(new URL(`${servers.upstream}/echo`))
    expect(res.status).toBe(200)
  })

  it('reports upstream error statuses as Responses, not errors', async () => {
    const res = await relayFetch(`${servers.upstream}/status/402`)
    expect(res.status).toBe(402)
    expect(res.ok).toBe(false)
    expect(res.statusText).toBe('Payment Required')
    expect(await res.text()).toBe('status 402')
  })

  it('gives 204, 304 and HEAD a null body', async () => {
    const noContent = await relayFetch(`${servers.upstream}/status/204`)
    expect(noContent.status).toBe(204)
    expect(noContent.body).toBeNull()
    const notModified = await relayFetch(`${servers.upstream}/status/304`)
    expect(notModified.status).toBe(304)
    expect(notModified.body).toBeNull()
    const head = await relayFetch(`${servers.upstream}/echo`, { method: 'HEAD' })
    expect(head.status).toBe(200)
    expect(head.body).toBeNull()
    expect(head.headers.get('x-up')).toBe('yes')
  })

  it('refuses a body on GET the way fetch does, without calling the relay', async () => {
    await expect(relayFetch(`${servers.upstream}/echo`, { body: 'x' })).rejects.toThrow(TypeError)
    expect(servers.calls).toHaveLength(0)
  })
})

describe('createRelayFetch: redirects', () => {
  const redirect = (to: string, status = 302): string =>
    `${servers.upstream}/redirect?status=${status}&to=${encodeURIComponent(to)}`

  it('follows 302 as a GET without the body, through the relay again', async () => {
    const res = await relayFetch(redirect('/echo'), {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'payload',
    })
    const echo = (await res.json()) as Echo
    expect(echo.method).toBe('GET')
    expect(echo.body).toBe('')
    expect(echo.headers['content-type']).toBeUndefined()
    expect(res.redirected).toBe(true)
    expect(res.url).toBe(`${servers.upstream}/echo`)
    expect(servers.calls).toHaveLength(2)
    expect((servers.calls[1].body as { url: string }).url).toBe(`${servers.upstream}/echo`)
  })

  it('follows 303 as a GET', async () => {
    const echo = (await (
      await relayFetch(redirect('/echo', 303), { method: 'PUT', body: 'x' })
    ).json()) as Echo
    expect(echo.method).toBe('GET')
    expect(echo.body).toBe('')
  })

  it('keeps HEAD as HEAD on a 302', async () => {
    const res = await relayFetch(redirect('/echo'), { method: 'HEAD' })
    expect(res.status).toBe(200)
    expect(res.body).toBeNull()
    expect((servers.calls[1].body as { method: string }).method).toBe('HEAD')
  })

  it('keeps method and body on 307 and 308', async () => {
    for (const status of [307, 308]) {
      const echo = (await (
        await relayFetch(redirect('/echo', status), { method: 'POST', body: 'kept' })
      ).json()) as Echo
      expect(echo.method).toBe('POST')
      expect(echo.body).toBe('kept')
    }
  })

  it('follows a chain and stops after 5 redirects', async () => {
    const chain = redirect(redirect(redirect('/echo')))
    const res = await relayFetch(chain)
    expect(res.status).toBe(200)
    expect(servers.calls).toHaveLength(4)

    servers.calls.length = 0
    await expectRelayError(relayFetch(`${servers.upstream}/loop`), {
      kind: 'redirect',
      message: 'Too many redirects (more than 5).',
    })
    expect(servers.calls).toHaveLength(6)
  })

  it('honours maxRedirects', async () => {
    const strict = createRelayFetch({
      relayUrl: servers.relayUrl,
      credential: TEST_CREDENTIAL,
      maxRedirects: 1,
    })
    await expectRelayError(strict(redirect(redirect('/echo'))), { kind: 'redirect' })
  })

  it('returns the 3xx Response itself with redirect: "manual"', async () => {
    const res = await relayFetch(redirect('/echo'), { redirect: 'manual' })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/echo')
    expect(res.redirected).toBe(false)
    expect(servers.calls).toHaveLength(1)
  })

  it('rejects with redirect: "error"', async () => {
    await expectRelayError(relayFetch(redirect('/echo'), { redirect: 'error' }), {
      kind: 'redirect',
    })
    expect(servers.calls).toHaveLength(1)
  })

  it('refuses a hop to a non-http(s) URL', async () => {
    await expectRelayError(relayFetch(redirect('ftp://files.example.com/x')), {
      kind: 'redirect',
      message: 'A redirect to a ftp: URL cannot be followed.',
    })
    expect(servers.calls).toHaveLength(1)
  })

  it('returns a 3xx without Location as-is', async () => {
    const res = await relayFetch(`${servers.upstream}/no-location`)
    expect(res.status).toBe(302)
  })

  it('drops Authorization on a cross-origin redirect and keeps it on a same-origin one', async () => {
    const auth = { authorization: 'Bearer sk_test' }
    const same = (await (await relayFetch(redirect('/echo'), { headers: auth })).json()) as Echo
    expect(same.headers.authorization).toBe('Bearer sk_test')
    const cross = (await (
      await relayFetch(redirect(`${servers.upstreamOther}/echo`), { headers: auth })
    ).json()) as Echo
    expect(cross.headers.authorization).toBeUndefined()
  })
})

describe('createRelayFetch: relay refusals', () => {
  it('turns a 401 into a typed error with the relay’s message', async () => {
    const wrong = createRelayFetch({ relayUrl: servers.relayUrl, credential: 'proj-1:wrong' })
    await expectRelayError(wrong(`${servers.upstream}/echo`), {
      kind: 'refused',
      status: 401,
      message: 'A valid egress credential is required.',
    })
  })

  it('preserves a 403 policy denial verbatim', async () => {
    const error = await expectRelayError(relayFetch(`https://${BLOCKED_HOST}/v1/x`), {
      kind: 'refused',
      status: 403,
      message: denialMessage(BLOCKED_HOST, 443),
    })
    expect(error.code).toBe('RELAY_REFUSED')
  })

  it('preserves 429 and 502 messages', async () => {
    await expectRelayError(relayFetch(`https://${BUSY_HOST}/`), {
      kind: 'refused',
      status: 429,
      message: 'Too many relayed requests are in flight for this project.',
    })
    await expectRelayError(relayFetch('http://127.0.0.1:1/'), {
      kind: 'refused',
      status: 502,
      message: 'The upstream could not be reached.',
    })
  })

  it('reports a non-relay answer (wrong URL) and an unreachable relay as unavailable', async () => {
    const wrongPath = createRelayFetch({
      relayUrl: `${servers.upstream}/status/404`,
      credential: TEST_CREDENTIAL,
    })
    await expectRelayError(wrongPath(`${servers.upstreamOther}/echo`), {
      kind: 'unavailable',
      status: 404,
    })
    const down = createRelayFetch({
      relayUrl: 'http://127.0.0.1:1/api/egress-relay',
      credential: TEST_CREDENTIAL,
    })
    await expectRelayError(down(`${servers.upstream}/echo`), { kind: 'unavailable' })
  })

  it('reports a 200 without X-Relay-Status as a protocol error', async () => {
    const notRelay = createRelayFetch({
      relayUrl: `${servers.upstream}/echo`,
      credential: TEST_CREDENTIAL,
    })
    await expectRelayError(notRelay(`${servers.upstreamOther}/echo`), { kind: 'protocol' })
  })

  it('fails with a config error when no relay URL or credential is set', async () => {
    const saved = { ...process.env }
    delete process.env.MOLECULE_EGRESS_RELAY_URL
    delete process.env.MOLECULE_EGRESS_CREDENTIAL
    try {
      await expectRelayError(createRelayFetch()(`${servers.upstream}/echo`), {
        kind: 'config',
        message: /MOLECULE_EGRESS_RELAY_URL/,
      })
      await expectRelayError(
        createRelayFetch({ relayUrl: servers.relayUrl })(`${servers.upstream}/echo`),
        { kind: 'config', message: /MOLECULE_EGRESS_CREDENTIAL/ },
      )
    } finally {
      process.env = saved
    }
  })

  it('reads the relay URL and credential from the environment', async () => {
    const saved = { ...process.env }
    process.env.MOLECULE_EGRESS_RELAY_URL = servers.relayUrl
    process.env.MOLECULE_EGRESS_CREDENTIAL = TEST_CREDENTIAL
    try {
      expect((await createRelayFetch()(`${servers.upstream}/echo`)).status).toBe(200)
    } finally {
      process.env = saved
    }
  })
})

describe('createRelayFetch: abort, streams, pass-through', () => {
  it('rejects with the standard AbortError when aborted mid-request', async () => {
    const controller = new AbortController()
    const pending = relayFetch(`${servers.upstream}/slow`, { signal: controller.signal })
    setTimeout(() => controller.abort(), 50)
    const error = await pending.then(
      () => null,
      (caught: unknown) => caught,
    )
    expect(error).toBeInstanceOf(DOMException)
    expect((error as DOMException).name).toBe('AbortError')
  })

  it('rejects at once for an already-aborted signal, without calling the relay', async () => {
    const error = await relayFetch(`${servers.upstream}/echo`, {
      signal: AbortSignal.abort(),
    }).then(
      () => null,
      (caught: unknown) => caught,
    )
    expect((error as DOMException).name).toBe('AbortError')
    expect(servers.calls).toHaveLength(0)
  })

  it('rejects a ReadableStream body loudly, without calling the relay', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('chunk'))
        controller.close()
      },
    })
    await expectRelayError(
      relayFetch(`${servers.upstream}/echo`, {
        method: 'POST',
        body: stream,
        duplex: 'half',
      } as RequestInit),
      { kind: 'unsupported', message: /ReadableStream/ },
    )
    expect(servers.calls).toHaveLength(0)
  })

  it('leaves non-http(s) URLs to the underlying fetch', async () => {
    const res = await relayFetch('data:text/plain,hi')
    expect(await res.text()).toBe('hi')
    expect(servers.calls).toHaveLength(0)
  })

  it('sends URLs matched by bypass straight to the underlying fetch', async () => {
    const bypassing = createRelayFetch({
      relayUrl: servers.relayUrl,
      credential: TEST_CREDENTIAL,
      bypass: (url) => url.port === new URL(servers.upstreamOther).port,
    })
    const res = await bypassing(`${servers.upstreamOther}/echo`)
    expect(res.headers.get('set-cookie')).toBe('session=secret')
    expect(servers.calls).toHaveLength(0)
  })
})

describe('installRelayFetch', () => {
  it('routes globalThis.fetch through the relay and uninstall restores the previous fetch', async () => {
    const installation = installRelayFetch({
      relayUrl: servers.relayUrl,
      credential: TEST_CREDENTIAL,
    })
    expect(globalThis.fetch).toBe(installation.fetch)
    const res = await fetch(`${servers.upstream}/echo`)
    expect(res.status).toBe(200)
    expect(servers.calls).toHaveLength(1)

    installation.uninstall()
    expect(globalThis.fetch).toBe(originalFetch)
    installation.uninstall()
    expect(globalThis.fetch).toBe(originalFetch)
  })

  it('does not relay requests to the relay URL itself (no recursion)', async () => {
    const installation = installRelayFetch({
      relayUrl: servers.relayUrl,
      credential: TEST_CREDENTIAL,
    })
    const direct = await fetch(servers.relayUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Basic ${btoa(TEST_CREDENTIAL)}`,
      },
      body: JSON.stringify({ url: `${servers.upstream}/echo` }),
    })
    expect(direct.status).toBe(200)
    expect(direct.headers.get('x-relay-status')).toBe('200')
    expect(servers.calls).toHaveLength(1)
    expect(servers.calls[0].body).toEqual({ url: `${servers.upstream}/echo` })
    installation.uninstall()
  })

  it('throws at install time when nothing is configured', () => {
    const saved = { ...process.env }
    delete process.env.MOLECULE_EGRESS_RELAY_URL
    delete process.env.MOLECULE_EGRESS_CREDENTIAL
    try {
      expect(() => installRelayFetch()).toThrow(RelayError)
      expect(globalThis.fetch).toBe(originalFetch)
    } finally {
      process.env = saved
    }
  })

  it('leaves a later replacement of fetch alone on uninstall', () => {
    const installation = installRelayFetch({
      relayUrl: servers.relayUrl,
      credential: TEST_CREDENTIAL,
    })
    const later = (async () => new Response('later')) as typeof fetch
    globalThis.fetch = later
    installation.uninstall()
    expect(globalThis.fetch).toBe(later)
  })
})
