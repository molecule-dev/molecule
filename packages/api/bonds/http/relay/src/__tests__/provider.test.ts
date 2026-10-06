import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { HttpError } from '@molecule/api-http'
import { get, getClient, post, request, setClient } from '@molecule/api-http'
import { getAllSecretDefinitions } from '@molecule/api-secrets'

import { createRelayClient, provider, relayClient, RelayError } from '../index.js'
import {
  BLOCKED_HOST,
  denialMessage,
  startTestServers,
  TEST_CREDENTIAL,
  type TestServers,
} from './relay-server.js'

let servers: TestServers

/** The echo payload the upstream returns. */
interface Echo {
  method: string
  path: string
  headers: Record<string, string>
  body: string
}

beforeAll(async () => {
  servers = await startTestServers()
})

afterAll(async () => {
  await servers.close()
})

beforeEach(() => {
  servers.calls.length = 0
})

describe('relay provider through the @molecule/api-http contract', () => {
  it('exports a typed provider that is the default relay client', () => {
    expect(provider).toBe(relayClient)
    for (const method of ['request', 'get', 'post', 'put', 'patch', 'delete'] as const) {
      expect(typeof provider[method]).toBe('function')
    }
  })

  it('sends get/post through the bonded relay client', async () => {
    setClient(createRelayClient({ relayUrl: servers.relayUrl, credential: TEST_CREDENTIAL }))
    expect(getClient()).not.toBe(provider)

    const res = await get<Echo>(`${servers.upstream}/echo`, {
      params: { q: 'a b', skip: undefined },
    })
    expect(res.status).toBe(200)
    expect(res.statusText).toBe('OK')
    expect(res.data.method).toBe('GET')
    expect(res.data.path).toBe('/echo?q=a+b')
    expect(res.headers['x-up']).toBe('yes')
    expect(res.request.url).toBe(`${servers.upstream}/echo?q=a+b`)

    const created = await post<Echo>(`${servers.upstream}/echo`, { amount: 100 })
    expect(created.data.method).toBe('POST')
    expect(created.data.body).toBe('{"amount":100}')
    expect(created.data.headers['content-type']).toBe('application/json')
    expect(servers.calls).toHaveLength(2)
  })

  it('applies baseURL, raw text responses and caller headers', async () => {
    const client = createRelayClient({ relayUrl: servers.relayUrl, credential: TEST_CREDENTIAL })
    const res = await client.get<string>('/status/201', {
      baseURL: servers.upstream,
      responseType: 'text',
      headers: { 'x-a': '1' },
    })
    expect(res.status).toBe(201)
    expect(res.data).toBe('status 201')
  })

  it('reads a non-JSON body as null with the default json responseType', async () => {
    const client = createRelayClient({ relayUrl: servers.relayUrl, credential: TEST_CREDENTIAL })
    const res = await client.get(`${servers.upstream}/status/200`)
    expect(res.data).toBeNull()
  })

  it('returns binary as an ArrayBuffer', async () => {
    const client = createRelayClient({ relayUrl: servers.relayUrl, credential: TEST_CREDENTIAL })
    const res = await client.get<ArrayBuffer>(`${servers.upstream}/binary`, {
      responseType: 'arraybuffer',
    })
    expect(new Uint8Array(res.data)[255]).toBe(255)
  })

  it('throws an HttpError with the upstream response for a non-2xx status', async () => {
    const client = createRelayClient({ relayUrl: servers.relayUrl, credential: TEST_CREDENTIAL })
    const error = (await client
      .get(`${servers.upstream}/status/404`)
      .catch((e: unknown) => e)) as HttpError
    expect(error.response?.status).toBe(404)
    expect(error.request.url).toBe(`${servers.upstream}/status/404`)
    expect(error).not.toBeInstanceOf(RelayError)
  })

  it('follows redirects through the relay', async () => {
    const client = createRelayClient({ relayUrl: servers.relayUrl, credential: TEST_CREDENTIAL })
    const res = await client.post<Echo>(
      `${servers.upstream}/redirect?status=307&to=%2Fecho`,
      'kept',
    )
    expect(res.data.method).toBe('POST')
    expect(res.data.body).toBe('kept')
    expect(servers.calls).toHaveLength(2)
  })

  it('throws the relay’s refusal as a RelayError carrying the request', async () => {
    setClient(createRelayClient({ relayUrl: servers.relayUrl, credential: TEST_CREDENTIAL }))
    const error = (await request(`https://${BLOCKED_HOST}/x`).catch(
      (e: unknown) => e,
    )) as RelayError
    expect(error).toBeInstanceOf(RelayError)
    expect(error.kind).toBe('refused')
    expect(error.status).toBe(403)
    expect(error.message).toBe(denialMessage(BLOCKED_HOST, 443))
    expect(error.request?.url).toBe(`https://${BLOCKED_HOST}/x`)
  })

  it('marks a timeout', async () => {
    const client = createRelayClient({ relayUrl: servers.relayUrl, credential: TEST_CREDENTIAL })
    const error = (await client
      .get(`${servers.upstream}/slow`, { timeout: 50 })
      .catch((e: unknown) => e)) as HttpError
    expect(error.isTimeout).toBe(true)
    expect(error.isAborted).toBe(true)
    expect(error.code).toBe('ETIMEDOUT')
  })

  it('registers its secrets', () => {
    const keys = getAllSecretDefinitions().map((definition) => definition.key)
    expect(keys).toEqual(
      expect.arrayContaining(['MOLECULE_EGRESS_RELAY_URL', 'MOLECULE_EGRESS_CREDENTIAL']),
    )
  })
})
