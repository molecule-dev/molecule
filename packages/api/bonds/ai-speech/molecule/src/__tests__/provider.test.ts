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
