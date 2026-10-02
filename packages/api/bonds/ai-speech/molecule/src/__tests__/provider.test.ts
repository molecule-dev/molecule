import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createProvider,
  DEFAULT_SERVICES_URL,
  MoleculeServiceError,
  SPEECH_SERVICE_LIMITS,
} from '../provider.js'

const mockFetch = vi.fn()
const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('MoleculeSpeechProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.resetAllMocks()
    delete process.env.MOLECULE_API_KEY
    delete process.env.MOLECULE_SERVICES_URL
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('synthesize posts defaults and decodes base64 audio into bytes', async () => {
    mockFetch.mockResolvedValueOnce(json(200, { audio: 'AQID', contentType: 'audio/mpeg' }))
    const r = await createProvider({ apiKey: 'mk_t' }).synthesize!({ input: 'hi' })
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${DEFAULT_SERVICES_URL}/speech/synthesize`)
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer mk_t')
    expect(JSON.parse(init.body as string)).toEqual({ input: 'hi', voice: 'alloy', model: 'tts-1' })
    expect(Array.from(r.audio)).toEqual([1, 2, 3])
    expect(r.contentType).toBe('audio/mpeg')
  })

  it('transcribe sends base64 audio + filename and returns the verbose result', async () => {
    process.env.MOLECULE_API_KEY = 'mk_env'
    process.env.MOLECULE_SERVICES_URL = 'http://localhost:4000/api/v1/services/'
    mockFetch.mockResolvedValueOnce(json(200, { text: 'hello', duration: 1.2 }))
    const r = await createProvider().transcribe!({
      audio: new Uint8Array([1, 2, 3]),
      filename: 'memo.m4a',
      language: 'en',
    })
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:4000/api/v1/services/speech/transcribe')
    expect(JSON.parse(init.body as string)).toEqual({
      audio: 'AQID',
      filename: 'memo.m4a',
      language: 'en',
    })
    expect(r).toEqual({ text: 'hello', duration: 1.2 })
  })

  it('refuses oversized audio locally without a request', async () => {
    const big = new Uint8Array(SPEECH_SERVICE_LIMITS.maxTranscribeBytes + 1)
    await expect(
      createProvider({ apiKey: 'mk_t' }).transcribe!({ audio: big }),
    ).rejects.toMatchObject({ status: 413 })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('throws a clear 401 when MOLECULE_API_KEY is missing', async () => {
    await expect(createProvider().synthesize!({ input: 'x' })).rejects.toMatchObject({
      status: 401,
      message: expect.stringContaining('MOLECULE_API_KEY'),
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it.each([
    [401, 'broker:speech'],
    [402, 'usage billing'],
    [429, 'Slow down'],
  ])('maps %i to MoleculeServiceError with a hint', async (status, hint) => {
    mockFetch.mockResolvedValueOnce(json(status, { error: 'no', errorKey: 'k' }))
    const e = await createProvider({ apiKey: 'mk_t' }).synthesize!({ input: 'x' }).catch(
      (error: unknown) => error,
    )
    expect(e).toBeInstanceOf(MoleculeServiceError)
    expect(e).toMatchObject({ status, errorKey: 'k' })
    expect((e as Error).message).toContain(hint)
  })

  it('does not implement the methods the service lacks', () => {
    const p = createProvider({ apiKey: 'mk_t' })
    expect(p.listVoices).toBeUndefined()
    expect(p.synthesizeStream).toBeUndefined()
    expect(p.translate).toBeUndefined()
  })
})

describe('servicesUrl guard', () => {
  it('accepts an https base and loopback http bases', () => {
    expect(() =>
      createProvider({ apiKey: 'mk_t', servicesUrl: 'https://services.example.com/api/v1' }),
    ).not.toThrow()
    expect(() =>
      createProvider({ apiKey: 'mk_t', servicesUrl: 'http://localhost:4000/api/v1/services' }),
    ).not.toThrow()
    expect(() =>
      createProvider({ apiKey: 'mk_t', servicesUrl: 'http://127.0.0.1:4000/api/v1/services' }),
    ).not.toThrow()
  })

  it('accepts private-network http: the sandbox gateway and RFC 1918 hosts', () => {
    for (const url of [
      'http://host.docker.internal:4000/api/v1/services',
      'http://10.0.0.7:4000/api/v1/services',
      'http://172.16.0.9:4000/api/v1/services',
      'http://172.31.255.255:4000/api/v1/services',
      'http://192.168.1.10:4000/api/v1/services',
    ]) {
      expect(() => createProvider({ apiKey: 'mk_test', servicesUrl: url })).not.toThrow()
    }
  })

  it('still refuses public cleartext shapes that only LOOK private', () => {
    // 172.32+ is public, and a hostname that merely starts with a
    // private-looking label never matches.
    for (const url of [
      'http://172.32.0.1:4000/api/v1/services',
      'http://192.168.example.com/api/v1/services',
      'http://10.0.0.1.nip.io/api/v1/services',
    ]) {
      expect(() => createProvider({ apiKey: 'mk_test', servicesUrl: url })).toThrow(
        /must use https.*Bearer token/s,
      )
    }
    // An out-of-range octet never even parses as a URL — refused as invalid.
    expect(() =>
      createProvider({ apiKey: 'mk_test', servicesUrl: 'http://10.0.0.300:4000/api/v1/services' }),
    ).toThrow(/Invalid MOLECULE_SERVICES_URL/)
  })
  it('refuses a plain-http base on a public host, naming the misconfiguration', () => {
    expect(() =>
      createProvider({ apiKey: 'mk_t', servicesUrl: 'http://services.example.com/api/v1' }),
    ).toThrow(/must use https.*Bearer token/s)
  })
})
