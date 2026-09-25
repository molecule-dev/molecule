import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createClassifier,
  DEFAULT_SERVICES_URL,
  MODERATION_SERVICE_LIMITS,
  MoleculeServiceError,
} from '../classifier.js'

const mockFetch = vi.fn()
const RESULT = { flagged: true, categories: [{ category: 'violence', flagged: true, score: 0.9 }] }
const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status })

describe('MoleculeContentClassifier', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.resetAllMocks()
    delete process.env.MOLECULE_API_KEY
    delete process.env.MOLECULE_SERVICES_URL
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('check posts content + options and returns the core result', async () => {
    mockFetch.mockResolvedValueOnce(json(200, RESULT))
    const r = await createClassifier({ apiKey: 'mk_t' }).check('text', {
      threshold: 0.5,
      categories: ['violence'],
    })
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${DEFAULT_SERVICES_URL}/moderation/check`)
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer mk_t')
    expect(JSON.parse(init.body as string)).toEqual({
      content: 'text',
      threshold: 0.5,
      categories: ['violence'],
    })
    expect(r).toEqual(RESULT)
  })

  it('checkImage posts base64 + MIME type to check-image', async () => {
    process.env.MOLECULE_API_KEY = 'mk_env'
    process.env.MOLECULE_SERVICES_URL = 'http://localhost:4000/api/v1/services/'
    mockFetch.mockResolvedValueOnce(json(200, RESULT))
    await createClassifier().checkImage!(new Uint8Array([1, 2, 3]), { mimeType: 'image/png' })
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://localhost:4000/api/v1/services/moderation/check-image')
    expect(JSON.parse(init.body as string)).toEqual({ image: 'AQID', mimeType: 'image/png' })
  })

  it('refuses an oversized image locally', async () => {
    const big = new Uint8Array(MODERATION_SERVICE_LIMITS.maxImageBytes + 1)
    await expect(createClassifier({ apiKey: 'mk_t' }).checkImage!(big)).rejects.toMatchObject({
      status: 413,
    })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('without a key throws 401 and never calls out', async () => {
    await expect(createClassifier().check('x')).rejects.toMatchObject({ status: 401 })
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it.each([
    [401, 'broker:moderation'],
    [402, 'usage billing'],
    [503, 'Retry'],
  ])('maps %i to MoleculeServiceError with a hint', async (status, hint) => {
    mockFetch.mockResolvedValueOnce(json(status, { error: 'no', errorKey: 'k' }))
    const e = await createClassifier({ apiKey: 'mk_t' })
      .check('x')
      .catch((error: unknown) => error)
    expect(e).toBeInstanceOf(MoleculeServiceError)
    expect(e).toMatchObject({ status, errorKey: 'k' })
    expect((e as Error).message).toContain(hint)
  })
})
