/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the DeepL bond. Only the
 * network is mocked: `fetch` returns a real `/v2/translate` response body.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '@molecule/api-ai-translation-deepl'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('bonds DeepL and translates a batch, one result per input', async () => {
    vi.stubEnv('DEEPL_API_KEY', 'test-key:fx')
    vi.stubEnv('DEEPL_BASE_URL', '')
    const fetchMock = vi.fn(async () =>
      Response.json({
        translations: [
          { detected_source_language: 'EN', text: 'Hallo Welt' },
          { detected_source_language: 'EN', text: 'Danke für Ihre Bestellung' },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.DEEPL_API_KEY }))

    const { translations } = await requireProvider().translate({
      text: ['Hello world', 'Thanks for your order'],
      targetLang: 'DE',
    })

    expect(translations[0]?.text).toBe('Hallo Welt')
    expect(translations[0]?.detectedSourceLang).toBe('EN')
    expect(translations[1]?.text).toBe('Danke für Ihre Bestellung')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api-free.deepl.com/v2/translate')
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'DeepL-Auth-Key test-key:fx',
    )
    expect(JSON.parse(init.body as string)).toMatchObject({
      text: ['Hello world', 'Thanks for your order'],
      target_lang: 'DE',
    })
  })
})
