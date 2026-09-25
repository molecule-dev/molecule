import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createClassifier, OpenaiModerationError, toModerationResult } from '../classifier.js'

const mockFetch = vi.fn()
const ENTRY = {
  flagged: true,
  categories: { violence: true, harassment: false, 'sexual/minors': false },
  category_scores: { violence: 0.95, harassment: 0.4, 'sexual/minors': 0.001 },
}
const ok = (): Response =>
  new Response(JSON.stringify({ id: 'm', model: 'omni-moderation-latest', results: [ENTRY] }), {
    status: 200,
  })

describe('toModerationResult', () => {
  it("uses OpenAI's own verdict without a threshold, highest score first", () => {
    const r = toModerationResult(ENTRY)
    expect(r.flagged).toBe(true)
    expect(r.categories.map((c) => c.category)).toEqual(['violence', 'harassment', 'sexual/minors'])
    expect(r.categories.find((c) => c.category === 'harassment')?.flagged).toBe(false)
  })

  it('a threshold re-decides every category by score', () => {
    const r = toModerationResult(ENTRY, { threshold: 0.3 })
    expect(r.categories.filter((c) => c.flagged).map((c) => c.category)).toEqual([
      'violence',
      'harassment',
    ])
  })

  it('a category filter limits both the list and the overall verdict', () => {
    const r = toModerationResult(ENTRY, { categories: ['sexual/minors'] })
    expect(r.categories).toHaveLength(1)
    expect(r.flagged).toBe(false)
  })
})

describe('OpenaiContentClassifier', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.resetAllMocks()
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_BASE_URL
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('check posts text input to /v1/moderations with the default model', async () => {
    mockFetch.mockResolvedValueOnce(ok())
    const r = await createClassifier({ apiKey: 'sk-t' }).check('hi')
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.openai.com/v1/moderations')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-t')
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'omni-moderation-latest',
      input: [{ type: 'text', text: 'hi' }],
    })
    expect(r.flagged).toBe(true)
  })

  it('checkImage sends a data URL with the given MIME type', async () => {
    mockFetch.mockResolvedValueOnce(ok())
    await createClassifier({ apiKey: 'sk-t' }).checkImage!(new Uint8Array([1, 2, 3]), {
      mimeType: 'image/png',
    })
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
    expect(body.input).toEqual([
      { type: 'image_url', image_url: { url: 'data:image/png;base64,AQID' } },
    ])
  })

  it('honors OPENAI_BASE_URL', async () => {
    process.env.OPENAI_API_KEY = 'sk-env'
    process.env.OPENAI_BASE_URL = 'http://gateway.local/'
    mockFetch.mockResolvedValueOnce(ok())
    await createClassifier().check('x')
    expect((mockFetch.mock.calls[0] as [string])[0]).toBe('http://gateway.local/v1/moderations')
  })

  it('throws with the status on an error response, and without a key never calls out', async () => {
    mockFetch.mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
    await expect(createClassifier({ apiKey: 'sk-t' }).check('x')).rejects.toMatchObject({
      status: 429,
    })
    await expect(createClassifier().check('x')).rejects.toBeInstanceOf(OpenaiModerationError)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('throws when the response has no result instead of reporting "not flagged"', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ results: [] }), { status: 200 }))
    await expect(createClassifier({ apiKey: 'sk-t' }).check('x')).rejects.toThrow(/no result/)
  })
})
