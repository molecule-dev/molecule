import { afterEach, describe, expect, it, vi } from 'vitest'

import type { NotificationPayload, PushSubscription } from '@molecule/api-push-notifications'
import { fetchPublicKey, setProvider } from '@molecule/api-push-notifications'

import {
  createProvider,
  MoleculePushProvider,
  PUSH_SERVICE_LIMITS,
  PushServiceError,
} from '../provider.js'

/** Stub fetch with `status` and `body`. */
function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn> {
  const fn = vi
    .fn()
    .mockResolvedValue(
      new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }),
    )
  vi.stubGlobal('fetch', fn)
  return fn
}

const SUB: PushSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/c1',
  keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
}
const PAYLOAD: NotificationPayload = { title: 'Order shipped', options: { body: 'Track it.' } }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api-push-notifications-molecule', () => {
  it('posts subscription + payload to push/send and returns the SendResult', async () => {
    const sent = { statusCode: 201, headers: { Location: 'urn:x-fcm:1' }, body: '' }
    const fetchMock = stubFetch(200, sent)
    const provider = createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    })
    const result = await provider.send(SUB, PAYLOAD)
    expect(result).toEqual(sent)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:1/api/v1/services/push/send')
    expect(JSON.parse(String(init.body))).toEqual({ subscription: SUB, payload: PAYLOAD })
  })

  it('sends delivery options to push/send only when given', async () => {
    const fetchMock = stubFetch(200, { statusCode: 201, headers: {}, body: '' })
    const provider = createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    })
    const options = { ttl: 600, urgency: 'high' as const, topic: 'approval-1' }
    await provider.sendMany([SUB], PAYLOAD, options)
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ subscription: SUB, payload: PAYLOAD, options })
  })

  it('throws a dead subscription as PushServiceError with statusCode, like web-push (OLD MUSTFAIL: resolved)', async () => {
    stubFetch(200, { statusCode: 410, headers: { 'x-a': '1' }, body: 'gone' })
    const provider = createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    })
    const error = await provider.send(SUB, PAYLOAD).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PushServiceError)
    expect(error).toMatchObject({ statusCode: 410, headers: { 'x-a': '1' }, body: 'gone' })
    expect((error as Error).message).toMatch(/gone; delete it/)
  })

  it('the core’s documented pruning finds the dead subscription in sendMany', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ statusCode: 201, headers: {}, body: '' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ statusCode: 404, headers: {}, body: '' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ statusCode: 429, headers: {}, body: '' }), { status: 200 }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    })
    const results = await provider.sendMany([SUB, SUB, SUB], PAYLOAD)
    // The pattern from @molecule/api-push-notifications' docs, verbatim in shape.
    const gone = results
      .map((r, i) => ({ i, code: (r.error as { statusCode?: number } | undefined)?.statusCode }))
      .filter(({ code }) => code === 404 || code === 410)
      .map(({ i }) => i)
    expect(gone).toEqual([1])
    expect(results[0].result?.statusCode).toBe(201)
    expect(results[2].error).toMatchObject({ statusCode: 429 })
  })

  it('sendMany returns one entry per subscription and never aborts the batch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ statusCode: 201, headers: {}, body: '' }), { status: 200 }),
      )
      .mockRejectedValueOnce(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)
    const provider = createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    })
    const results = await provider.sendMany([SUB, SUB], PAYLOAD)
    expect(results).toHaveLength(2)
    expect(results[0].result?.statusCode).toBe(201)
    expect(results[0].error).toBeUndefined()
    expect(results[1].result).toBeUndefined()
    expect(results[1].error).toBeInstanceOf(Error)
  })

  it("the core's fetchPublicKey asks the service and caches the key for getPublicKey", async () => {
    const fetchMock = stubFetch(200, { publicKey: 'BPk1-test' })
    const provider = createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    })
    setProvider(provider)
    expect(provider.getPublicKey()).toBeUndefined()
    expect(await fetchPublicKey()).toBe('BPk1-test')
    expect(provider.getPublicKey()).toBe('BPk1-test')
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:1/api/v1/services/push/vapid-key')
    expect(JSON.parse(String(init.body))).toEqual({})
  })

  it('asks the service for the key once: later and concurrent calls share it', async () => {
    const fetchMock = stubFetch(200, { publicKey: 'BPk1-test' })
    const provider = new MoleculePushProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    })
    const keys = await Promise.all([provider.fetchPublicKey(), provider.fetchPublicKey()])
    expect(keys).toEqual(['BPk1-test', 'BPk1-test'])
    expect(await provider.fetchPublicKey()).toBe('BPk1-test')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not keep a failed key request: the next call asks again', async () => {
    stubFetch(500, { error: 'down' })
    const provider = new MoleculePushProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    })
    await expect(provider.fetchPublicKey()).rejects.toThrow(/push\/vapid-key failed \(500\)/)
    expect(provider.getPublicKey()).toBeUndefined()
    stubFetch(200, { publicKey: 'BPk1-test' })
    expect(await provider.fetchPublicKey()).toBe('BPk1-test')
  })

  it('refuses bad subscriptions and payloads locally, before any request', async () => {
    const fetchMock = stubFetch(200, {})
    const provider = createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    })
    await expect(provider.send({ endpoint: '', keys: SUB.keys }, PAYLOAD)).rejects.toMatchObject({
      status: 400,
    })
    await expect(
      provider.send({ endpoint: SUB.endpoint, keys: { p256dh: '', auth: '' } }, PAYLOAD),
    ).rejects.toMatchObject({ status: 400 })
    await expect(
      provider.send({ endpoint: SUB.endpoint, keys: SUB.keys }, { title: '' }),
    ).rejects.toMatchObject({ status: 400 })
    const fat: NotificationPayload = { title: 'x', options: { data: { pad: 'y'.repeat(4000) } } }
    await expect(provider.send(SUB, fat)).rejects.toMatchObject({ status: 413 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a serialized payload over the limit with the spec rationale', async () => {
    const fetchMock = stubFetch(200, {})
    const provider = new MoleculePushProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    })
    const fat: NotificationPayload = {
      title: 'x',
      options: { data: { pad: 'y'.repeat(PUSH_SERVICE_LIMITS.maxPayloadChars) } },
    }
    await expect(provider.send(SUB, fat)).rejects.toMatchObject({ status: 413 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('generateVapidKeys throws with the self-hosted pointer', () => {
    const provider = createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:1/api/v1/services',
    })
    expect(() => provider.generateVapidKeys()).toThrow(/web-push/)
  })

  it('throws MoleculeServiceError without a key, before any request', async () => {
    const fetchMock = stubFetch(200, {})
    const old = process.env.MOLECULE_API_KEY
    delete process.env.MOLECULE_API_KEY
    try {
      await expect(
        createProvider({ servicesUrl: 'http://localhost:1/api/v1/services' }).send(SUB, PAYLOAD),
      ).rejects.toMatchObject({ status: 401 })
    } finally {
      if (old !== undefined) process.env.MOLECULE_API_KEY = old
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('surfaces the service error key and hint on a refusal', async () => {
    stubFetch(401, { error: 'token invalid', errorKey: 'hostedServices.error.tokenInvalid' })
    await expect(
      createProvider({
        apiKey: 'mk_bad',
        servicesUrl: 'http://localhost:1/api/v1/services',
      }).send(SUB, PAYLOAD),
    ).rejects.toMatchObject({
      status: 401,
      errorKey: 'hostedServices.error.tokenInvalid',
    })
  })

  it('refuses a public cleartext services URL at construction', () => {
    expect(() =>
      createProvider({ apiKey: 'mk_test', servicesUrl: 'http://example.com/api/v1/services' }),
    ).toThrow(/must use https/)
  })
})
