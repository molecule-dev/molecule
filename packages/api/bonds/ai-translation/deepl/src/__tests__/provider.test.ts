import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()

/** Creates a successful DeepL translate response. */
function mockTranslateResponse(
  translations: Array<{ detected_source_language: string; text: string }>,
): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({ translations }),
  }
}

/** Creates a successful DeepL languages response. */
function mockLanguagesResponse(
  languages: Array<{ language: string; name: string; supports_formality?: boolean }>,
): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue(languages),
  }
}

/** Creates a successful DeepL usage response. */
function mockUsageResponse(
  characterCount: number,
  characterLimit: number,
): Record<string, unknown> {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue({
      character_count: characterCount,
      character_limit: characterLimit,
    }),
  }
}

/** Creates a mock error response. */
function mockErrorResponse(status: number, body: string): Record<string, unknown> {
  return {
    ok: false,
    status,
    statusText: `Status ${status}`,
    text: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeeplTranslationProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const provider = createProvider({ apiKey: 'test-key:fx', baseUrl: 'https://test.api' })

  // =========================================================================
  // translate()
  // =========================================================================

  describe('translate()', () => {
    it('translates a single text', async () => {
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo Welt' }]),
      )

      const result = await provider.translate({ text: 'Hello World', targetLang: 'DE' })

      expect(result.translations).toEqual([{ text: 'Hallo Welt', detectedSourceLang: 'EN' }])
      expect(result.translations).toHaveLength(1)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://test.api/v2/translate')
      const body = JSON.parse(init.body as string)
      expect(body.text).toEqual(['Hello World'])
      expect(body.target_lang).toBe('DE')
    })

    it('translates multiple texts in a single request', async () => {
      mockFetch.mockResolvedValue(
        mockTranslateResponse([
          { detected_source_language: 'EN', text: 'Hallo' },
          { detected_source_language: 'EN', text: 'Welt' },
        ]),
      )

      const result = await provider.translate({
        text: ['Hello', 'World'],
        targetLang: 'DE',
      })

      expect(result.translations).toHaveLength(2)
      expect(result.translations[0].text).toBe('Hallo')
      expect(result.translations[1].text).toBe('Welt')
    })

    it('returns empty result for empty text array', async () => {
      const result = await provider.translate({ text: [], targetLang: 'DE' })

      expect(result.translations).toEqual([])
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sends source language when specified', async () => {
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Bonjour' }]),
      )

      await provider.translate({ text: 'Hello', targetLang: 'FR', sourceLang: 'EN' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.source_lang).toBe('EN')
    })

    it('sends formality when not default', async () => {
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      await provider.translate({ text: 'Hello', targetLang: 'DE', formality: 'more' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.formality).toBe('more')
    })

    it('omits formality when set to default', async () => {
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      await provider.translate({ text: 'Hello', targetLang: 'DE', formality: 'default' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.formality).toBeUndefined()
    })

    it('sends model_type when not latency_optimized', async () => {
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      await provider.translate({
        text: 'Hello',
        targetLang: 'DE',
        modelType: 'quality_optimized',
      })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.model_type).toBe('quality_optimized')
    })

    it('sends preserve_formatting when specified', async () => {
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      await provider.translate({ text: 'Hello', targetLang: 'DE', preserveFormatting: true })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.preserve_formatting).toBe(true)
    })

    it('sends glossary_id when specified', async () => {
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      await provider.translate({
        text: 'Hello',
        targetLang: 'DE',
        sourceLang: 'EN',
        glossaryId: 'gloss-123',
      })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.glossary_id).toBe('gloss-123')
    })

    it('sends tag_handling when specified', async () => {
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: '<p>Hallo</p>' }]),
      )

      await provider.translate({ text: '<p>Hello</p>', targetLang: 'DE', tagHandling: 'html' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.tag_handling).toBe('html')
    })

    it('sends context when specified', async () => {
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Bank' }]),
      )

      await provider.translate({
        text: 'bank',
        targetLang: 'DE',
        context: 'This is about financial institutions.',
      })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.context).toBe('This is about financial institutions.')
    })

    it('sends correct Authorization header', async () => {
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      await provider.translate({ text: 'Hello', targetLang: 'DE' })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['Authorization']).toBe('DeepL-Auth-Key test-key:fx')
      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  // =========================================================================
  // Batching
  // =========================================================================

  describe('batching', () => {
    it('splits texts exceeding 50 into multiple requests', async () => {
      const texts = Array.from({ length: 75 }, (_, i) => `text-${i}`)
      const batch1 = texts.slice(0, 50).map((t) => ({
        detected_source_language: 'EN',
        text: `translated-${t}`,
      }))
      const batch2 = texts.slice(50).map((t) => ({
        detected_source_language: 'EN',
        text: `translated-${t}`,
      }))

      mockFetch
        .mockResolvedValueOnce(mockTranslateResponse(batch1))
        .mockResolvedValueOnce(mockTranslateResponse(batch2))

      const result = await provider.translate({ text: texts, targetLang: 'DE' })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.translations).toHaveLength(75)

      // Verify batch sizes
      const body1 = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      const body2 = JSON.parse((mockFetch.mock.calls[1] as [string, RequestInit])[1].body as string)
      expect(body1.text).toHaveLength(50)
      expect(body2.text).toHaveLength(25)
    })
  })

  // =========================================================================
  // getSupportedLanguages()
  // =========================================================================

  describe('getSupportedLanguages()', () => {
    it('returns source languages by default', async () => {
      mockFetch.mockResolvedValue(
        mockLanguagesResponse([
          { language: 'EN', name: 'English' },
          { language: 'DE', name: 'German', supports_formality: true },
        ]),
      )

      const result = await provider.getSupportedLanguages()

      expect(result).toEqual([
        { language: 'EN', name: 'English', supportsFormality: undefined },
        { language: 'DE', name: 'German', supportsFormality: true },
      ])

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://test.api/v2/languages')
    })

    it('passes type parameter for target languages', async () => {
      mockFetch.mockResolvedValue(
        mockLanguagesResponse([
          { language: 'DE', name: 'German', supports_formality: true },
          { language: 'FR', name: 'French', supports_formality: true },
        ]),
      )

      await provider.getSupportedLanguages('target')

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://test.api/v2/languages?type=target')
    })

    it('uses GET method', async () => {
      mockFetch.mockResolvedValue(mockLanguagesResponse([]))

      await provider.getSupportedLanguages()

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(init.method).toBe('GET')
    })
  })

  // =========================================================================
  // getUsage()
  // =========================================================================

  describe('getUsage()', () => {
    it('returns character count and limit', async () => {
      mockFetch.mockResolvedValue(mockUsageResponse(42_000, 500_000))

      const result = await provider.getUsage()

      expect(result).toEqual({ characterCount: 42_000, characterLimit: 500_000 })

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://test.api/v2/usage')
    })

    it('uses GET method with auth header', async () => {
      mockFetch.mockResolvedValue(mockUsageResponse(0, 500_000))

      await provider.getUsage()

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(init.method).toBe('GET')
      const headers = init.headers as Record<string, string>
      expect(headers['Authorization']).toBe('DeepL-Auth-Key test-key:fx')
    })
  })

  // =========================================================================
  // Error handling
  // =========================================================================

  describe('error handling', () => {
    it('throws on 403 forbidden with API error message', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(403, JSON.stringify({ message: 'Forbidden' })))

      await expect(provider.translate({ text: 'test', targetLang: 'DE' })).rejects.toThrow(
        'DeepL translate API error: Forbidden',
      )
    })

    it('throws on 456 quota exceeded', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(456, JSON.stringify({ message: 'Quota exceeded' })),
      )

      await expect(provider.translate({ text: 'test', targetLang: 'DE' })).rejects.toThrow(
        'DeepL translate API error: Quota exceeded',
      )
    })

    it('throws with HTTP status when error body is not JSON', async () => {
      mockFetch.mockResolvedValue(mockErrorResponse(500, 'Internal Server Error'))

      await expect(provider.translate({ text: 'test', targetLang: 'DE' })).rejects.toThrow(
        'DeepL translate API error: Internal Server Error',
      )
    })

    it('retries on 429 rate limit', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: vi.fn().mockResolvedValue('{}'),
          headers: new Headers(),
        })
        .mockResolvedValueOnce(
          mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
        )

      const promise = provider.translate({ text: 'Hello', targetLang: 'DE' })
      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.translations[0].text).toBe('Hallo')
    })

    it('retries on 503 service unavailable', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: vi.fn().mockResolvedValue('{}'),
          headers: new Headers(),
        })
        .mockResolvedValueOnce(
          mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
        )

      const promise = provider.translate({ text: 'Hello', targetLang: 'DE' })
      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.translations[0].text).toBe('Hallo')
    })

    it('retries on 529 too many requests', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 529,
          statusText: 'Too Many Requests',
          text: vi.fn().mockResolvedValue('{}'),
          headers: new Headers(),
        })
        .mockResolvedValueOnce(
          mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
        )

      const promise = provider.translate({ text: 'Hello', targetLang: 'DE' })
      await vi.advanceTimersByTimeAsync(5000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.translations[0].text).toBe('Hallo')
    })

    it('respects Retry-After header', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: vi.fn().mockResolvedValue('{}'),
          headers: new Headers({ 'retry-after': '2' }),
        })
        .mockResolvedValueOnce(
          mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
        )

      const promise = provider.translate({ text: 'Hello', targetLang: 'DE' })
      await vi.advanceTimersByTimeAsync(3000)
      const result = await promise

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result.translations[0].text).toBe('Hallo')
    })

    it('throws after exhausting retries', async () => {
      const makeErrorResp = () => ({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: vi.fn().mockResolvedValue(JSON.stringify({ message: 'Rate limit exceeded' })),
        headers: new Headers(),
      })
      mockFetch
        .mockResolvedValueOnce(makeErrorResp())
        .mockResolvedValueOnce(makeErrorResp())
        .mockResolvedValueOnce(makeErrorResp())
        .mockResolvedValueOnce(makeErrorResp())

      const promise = provider.translate({ text: 'test', targetLang: 'DE' })
      const assertion = expect(promise).rejects.toThrow(
        'DeepL translate API error: Rate limit exceeded',
      )
      await vi.advanceTimersByTimeAsync(60_000)
      await assertion

      expect(mockFetch).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
    })

    it('throws on getSupportedLanguages error', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(401, JSON.stringify({ message: 'Invalid auth key' })),
      )

      await expect(provider.getSupportedLanguages()).rejects.toThrow(
        'DeepL languages API error: Invalid auth key',
      )
    })

    it('throws on getUsage error', async () => {
      mockFetch.mockResolvedValue(
        mockErrorResponse(401, JSON.stringify({ message: 'Invalid auth key' })),
      )

      await expect(provider.getUsage()).rejects.toThrow('DeepL usage API error: Invalid auth key')
    })
  })

  // =========================================================================
  // Configuration
  // =========================================================================

  describe('configuration', () => {
    it('has correct provider name', () => {
      expect(provider.name).toBe('deepl')
    })

    it('uses DEEPL_API_KEY env var when no key provided', async () => {
      vi.stubEnv('DEEPL_API_KEY', 'env-key-pro')
      const envProvider = createProvider({ baseUrl: 'https://test.api' })
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      await envProvider.translate({ text: 'Hello', targetLang: 'DE' })

      const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
      const headers = init.headers as Record<string, string>
      expect(headers['Authorization']).toBe('DeepL-Auth-Key env-key-pro')
    })

    it('auto-detects free API URL for keys ending in :fx', () => {
      const freeProvider = createProvider({ apiKey: 'my-key:fx' })
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      void freeProvider.translate({ text: 'Hello', targetLang: 'DE' })

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://api-free.deepl.com/v2/translate')
    })

    it('auto-detects pro API URL for keys not ending in :fx', () => {
      const proProvider = createProvider({ apiKey: 'my-pro-key' })
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      void proProvider.translate({ text: 'Hello', targetLang: 'DE' })

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://api.deepl.com/v2/translate')
    })

    it('respects explicit baseUrl over auto-detection', () => {
      const customProvider = createProvider({
        apiKey: 'my-key:fx',
        baseUrl: 'https://custom.api',
      })
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      void customProvider.translate({ text: 'Hello', targetLang: 'DE' })

      const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://custom.api/v2/translate')
    })

    it('uses default formality from config', async () => {
      const formalProvider = createProvider({
        apiKey: 'test-key:fx',
        baseUrl: 'https://test.api',
        defaultFormality: 'more',
      })
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      await formalProvider.translate({ text: 'Hello', targetLang: 'DE' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.formality).toBe('more')
    })

    it('uses default model type from config', async () => {
      const qualityProvider = createProvider({
        apiKey: 'test-key:fx',
        baseUrl: 'https://test.api',
        defaultModelType: 'quality_optimized',
      })
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      await qualityProvider.translate({ text: 'Hello', targetLang: 'DE' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.model_type).toBe('quality_optimized')
    })

    it('param-level formality overrides config default', async () => {
      const formalProvider = createProvider({
        apiKey: 'test-key:fx',
        baseUrl: 'https://test.api',
        defaultFormality: 'more',
      })
      mockFetch.mockResolvedValue(
        mockTranslateResponse([{ detected_source_language: 'EN', text: 'Hallo' }]),
      )

      await formalProvider.translate({ text: 'Hello', targetLang: 'DE', formality: 'less' })

      const body = JSON.parse((mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string)
      expect(body.formality).toBe('less')
    })
  })
})
