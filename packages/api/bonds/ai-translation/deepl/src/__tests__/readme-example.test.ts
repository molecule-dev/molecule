/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the real
 * `@molecule/api-ai-translation` core. Only the network is mocked: `fetch`
 * returns a real DeepL `/v2/translate` response.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requireProvider, setProvider } from '@molecule/api-ai-translation'

import { createProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('translates a batch of strings through the core', async () => {
    vi.stubEnv('DEEPL_API_KEY', 'test-key:fx')
    vi.stubEnv('DEEPL_BASE_URL', undefined)
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          translations: [
            { detected_source_language: 'EN', text: 'Hallo, Welt!' },
            { detected_source_language: 'EN', text: 'Ihre Bestellung wurde versandt.' },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    setProvider(createProvider({ apiKey: process.env.DEEPL_API_KEY }))

    const { translations } = await requireProvider().translate({
      text: ['Hello, world!', 'Your order shipped.'],
      targetLang: 'DE',
      formality: 'more',
    })

    expect(translations.map((t) => t.text)).toEqual([
      'Hallo, Welt!',
      'Ihre Bestellung wurde versandt.',
    ])
    expect(translations[0]?.detectedSourceLang).toBe('EN')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    // A free (`:fx`) key auto-routes to the free endpoint.
    expect(url).toBe('https://api-free.deepl.com/v2/translate')
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'DeepL-Auth-Key test-key:fx',
    )
    expect(JSON.parse(init.body as string)).toEqual({
      text: ['Hello, world!', 'Your order shipped.'],
      target_lang: 'DE',
      formality: 'more',
    })
  })
})
