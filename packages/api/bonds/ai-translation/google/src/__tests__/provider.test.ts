import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { decodeEntities, maskText, unmaskText } from '../protect.js'
import { createProvider } from '../provider.js'

const mockFetch = vi.fn()

/** A successful v2 translate response. */
function translateResponse(texts: string[], detected = 'en'): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({
      data: {
        translations: texts.map((translatedText) => ({
          translatedText,
          detectedSourceLanguage: detected,
        })),
      },
    }),
  }
}

/** A failed response. */
function errorResponse(status: number, body: string): Record<string, unknown> {
  return {
    ok: false,
    status,
    headers: new Headers(),
    text: vi.fn().mockResolvedValue(body),
    clone() {
      return { text: vi.fn().mockResolvedValue(body) }
    },
  }
}

describe('protect (google)', () => {
  it('sends protected substrings as indexed translate="no" spans, escaping plain text', () => {
    const { masked, originals } = maskText(
      'Showing {{start}}-{{end}} & more',
      ['{{start}}', '{{end}}'],
      false,
    )
    expect(masked).toBe(
      'Showing <span translate="no">0</span>-<span translate="no">1</span> &amp; more',
    )
    expect(originals).toEqual(['{{start}}', '{{end}}'])
  })

  it('restores originals by index even when Google reorders and pads the spans', () => {
    const { originals } = maskText('{{a}} of {{b}}', ['{{a}}', '{{b}}'], false)
    expect(
      unmaskText(
        '<span translate="no"> 1</span> का <span translate="no">0</span> &#39;x&#39;',
        originals,
        false,
      ),
    ).toBe(" {{b}} का {{a}} 'x'")
  })

  it('decodes entities', () => {
    expect(decodeEntities('S&#39;està &amp; &quot;ok&quot;')).toBe(`S'està & "ok"`)
  })
})

describe('GoogleTranslationProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  it('posts html-format requests with the key and restores placeholders', async () => {
    mockFetch.mockResolvedValue(
      translateResponse(['<span translate="no">0</span> Artikel &amp; mehr']),
    )
    const provider = createProvider({ apiKey: 'k' })
    const result = await provider.translate({
      text: '{{count}} items & more',
      targetLang: 'de',
      protect: ['{{count}}'],
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(String(url)).toBe('https://translation.googleapis.com/language/translate/v2?key=k')
    expect(JSON.parse(init.body as string)).toEqual({
      q: ['<span translate="no">0</span> items &amp; more'],
      target: 'de',
      format: 'html',
    })
    expect(result.translations).toEqual([
      { text: '{{count}} Artikel & mehr', detectedSourceLang: 'en' },
    ])
  })

  it('splits more than 128 texts into several requests, preserving order', async () => {
    const texts = Array.from({ length: 130 }, (_, i) => `t${i}`)
    mockFetch
      .mockResolvedValueOnce(translateResponse(texts.slice(0, 128).map((t) => t.toUpperCase())))
      .mockResolvedValueOnce(translateResponse(texts.slice(128).map((t) => t.toUpperCase())))
    const result = await createProvider({ apiKey: 'k' }).translate({
      text: texts,
      targetLang: 'de',
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.translations.map((t) => t.text)).toEqual(texts.map((t) => t.toUpperCase()))
  })

  it('retries a rate-limit 403, but fails an auth 403 at once', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(403, '{"error":{"message":"User Rate Limit Exceeded"}}'))
      .mockResolvedValueOnce(translateResponse(['Hallo']))
    const provider = createProvider({ apiKey: 'k' })
    const promise = provider.translate({ text: 'Hello', targetLang: 'de' })
    await vi.advanceTimersByTimeAsync(5000)
    expect((await promise).translations[0].text).toBe('Hallo')

    mockFetch.mockReset()
    mockFetch.mockResolvedValue(errorResponse(403, '{"error":{"message":"API key not valid"}}'))
    await expect(provider.translate({ text: 'Hello', targetLang: 'de' })).rejects.toMatchObject({
      message: 'Google Translate translate API error (403): API key not valid',
      status: 403,
    })
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('counts characters sent in getUsage', async () => {
    mockFetch.mockResolvedValue(translateResponse(['a', 'b']))
    const provider = createProvider({ apiKey: 'k' })
    await provider.translate({ text: ['abc', 'de'], targetLang: 'fr' })
    expect(await provider.getUsage()).toEqual({
      characterCount: 5,
      characterLimit: Number.POSITIVE_INFINITY,
    })
  })
})

// Live check against the real API — runs only when a key is present.
describe.skipIf(!process.env.GOOGLE_TRANSLATE_API_KEY)('Google Translate (live)', () => {
  it('keeps placeholders in a real translation', async () => {
    const result = await createProvider().translate({
      text: 'Showing {{start}}-{{end}} of {{count}} stories',
      targetLang: 'kk',
      protect: ['{{start}}', '{{end}}', '{{count}}'],
    })
    const text = result.translations[0].text
    for (const token of ['{{start}}', '{{end}}', '{{count}}']) expect(text).toContain(token)
    expect(text).not.toMatch(/<span|&#|\{\{[^}]*$/)
  })
})
