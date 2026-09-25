import { describe, expect, it } from 'vitest'

import { languageName, toMadladLanguage } from '../languages.js'
import {
  assemblePieces,
  MARKER_FORMS,
  markersIntact,
  maskWith,
  splitProtected,
  unmaskWith,
} from '../protect.js'
import { createProvider } from '../provider.js'

/** A request the fake sidecar received. */
interface Call {
  method: string
  url: string
  headers: Record<string, string>
  body?: { texts: string[]; target: string; beamSize: number; maxLength: number }
}

/**
 * A fake sidecar: `/languages` lists `languages`, `/translate` answers with `respond`.
 *
 * @param respond - Translation for one text.
 * @param languages - Language list.
 */
function fakeSidecar(
  respond: (text: string, target: string) => string,
  languages = ['de', 'ja', 'no', 'zh', 'zh_Hant', 'kk'],
): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = []
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const call: Call = {
      method: init?.method ?? 'GET',
      url: String(input),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    }
    calls.push(call)
    if (call.url.endsWith('/languages')) return new Response(JSON.stringify({ languages }))
    const { texts, target } = call.body!
    return new Response(JSON.stringify({ translations: texts.map((t) => respond(t, target)) }))
  }) as typeof fetch
  return { fetch: impl, calls }
}

describe('languages (madlad)', () => {
  it('maps caller codes to MADLAD target tokens', () => {
    expect(toMadladLanguage('DE')).toBe('de')
    expect(toMadladLanguage('pt-BR')).toBe('pt')
    expect(toMadladLanguage('es-MX')).toBe('es')
    expect(toMadladLanguage('zh-TW')).toBe('zh_Hant')
    expect(toMadladLanguage('zh-CN')).toBe('zh')
    expect(toMadladLanguage('nb')).toBe('no')
    expect(toMadladLanguage('ms_Arab', new Set(['ms_Arab']))).toBe('ms_Arab')
    expect(languageName('zh_Hant')).toMatch(/Chinese/)
  })
})

describe('protect (madlad)', () => {
  it('masks with each marker form and restores by index', () => {
    const { pieces, originals } = splitProtected('{{count}} of {{total}}', [
      '{{count}}',
      '{{total}}',
    ])
    expect(originals).toEqual(['{{count}}', '{{total}}'])
    const [brackets, xml, tokens] = MARKER_FORMS
    expect(maskWith(pieces, brackets)).toBe('[0] of [1]')
    expect(maskWith(pieces, xml)).toBe('<x0/> of <x1/>')
    expect(maskWith(pieces, tokens)).toBe('⟦0⟧ of ⟦1⟧')
    expect(markersIntact('[1] 中 [ 0 ]', 2, brackets)).toBe(true)
    expect(markersIntact('[0]', 2, brackets)).toBe(false)
    expect(unmaskWith('<x1 /> 中 <x0/>', originals, xml)).toBe('{{total}} 中 {{count}}')
  })

  it('assembles separately translated pieces around the placeholders', () => {
    const { pieces, originals } = splitProtected('Welcome back, {{name}}!', ['{{name}}'])
    expect(pieces).toEqual(['Welcome back, ', '!'])
    expect(assemblePieces(pieces, ['Willkommen zurück,', '!'], originals)).toBe(
      'Willkommen zurück, {{name}}!',
    )
  })
})

describe('MadladTranslationProvider', () => {
  it('sends texts to the sidecar with the target token and restores placeholders', async () => {
    const { fetch, calls } = fakeSidecar((text, target) => `${target}:${text}`)
    const provider = createProvider({ baseUrl: 'http://madlad:8765/', apiKey: 'k', fetch })
    const result = await provider.translate({
      text: ['{{count}} items', 'Checkout'],
      targetLang: 'zh-TW',
      sourceLang: 'en',
      protect: ['{{count}}'],
    })
    expect(result.translations).toEqual([
      { text: 'zh_Hant:{{count}} items', detectedSourceLang: 'en' },
      { text: 'zh_Hant:Checkout', detectedSourceLang: 'en' },
    ])
    const post = calls.find((c) => c.method === 'POST')!
    expect(post.url).toBe('http://madlad:8765/translate')
    expect(post.headers.Authorization).toBe('Bearer k')
    expect(post.body).toMatchObject({ texts: ['[0] items', 'Checkout'], target: 'zh_Hant' })
  })

  it('retries lost placeholders with the next marker form, then piece by piece', async () => {
    const { fetch, calls } = fakeSidecar((text) => {
      if (text.includes('[0]')) return text.replace('[0]', '') // form 1 always loses it
      if (text.startsWith('Keep')) return text.replace('Keep', 'Behalte') // form 2 fine here
      if (text.includes('<x0/>') || text.includes('⟦0⟧')) return 'lost' // forms 2/3 lose it
      return `DE(${text})` // piece-by-piece pass
    })
    const provider = createProvider({ fetch, batchSize: 10 })
    const result = await provider.translate({
      text: ['Keep <keep> {{a}}', 'Welcome back, {{name}}!', 'Plain'],
      targetLang: 'de',
      protect: ['{{a}}', '{{name}}'],
    })
    expect(result.translations.map((t) => t.text)).toEqual([
      'Behalte <keep> {{a}}',
      'DE(Welcome back,) {{name}}!',
      'DE(Plain)',
    ])
    const posts = calls.filter((c) => c.method === 'POST').map((c) => c.body!.texts)
    expect(posts).toEqual([
      ['Keep <keep> [0]', 'Welcome back, [0]!', 'Plain'],
      ['Keep <keep> <x0/>', 'Welcome back, <x0/>!'],
      ['Welcome back, ⟦0⟧!'],
      ['Welcome back,'],
    ])
  })

  it('rejects a target MADLAD does not have', async () => {
    const { fetch } = fakeSidecar((t) => t)
    await expect(
      createProvider({ fetch }).translate({ text: 'Hi', targetLang: 'xx' }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_LANGUAGE' })
  })

  it('batches requests and reports its language list', async () => {
    const { fetch, calls } = fakeSidecar((t) => t)
    const provider = createProvider({ fetch, batchSize: 2 })
    await provider.translate({ text: ['a', 'b', 'c'], targetLang: 'nb' })
    expect(calls.filter((c) => c.method === 'POST').map((c) => c.body!.texts)).toEqual([
      ['a', 'b'],
      ['c'],
    ])
    expect(calls.filter((c) => c.method === 'POST')[0].body!.target).toBe('no')
    expect((await provider.getSupportedLanguages()).map((l) => l.language)).toContain('kk')
    expect((await provider.getUsage()).characterCount).toBe(3)
  })

  it('surfaces a sidecar error with its status', async () => {
    const fetch = (async (input: string | URL | Request) =>
      String(input).endsWith('/languages')
        ? new Response(JSON.stringify({ languages: ['de'] }))
        : new Response(JSON.stringify({ error: 'texts must be a list of strings' }), {
            status: 400,
          })) as typeof globalThis.fetch
    await expect(
      createProvider({ fetch }).translate({ text: 'Hi', targetLang: 'de' }),
    ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('list of strings') })
  })
})

/**
 * Live: needs a running sidecar (`sidecar/server.py` or its Dockerfile). Set
 * MADLAD_BASE_URL (and MADLAD_API_KEY if the sidecar has one).
 */
describe.skipIf(!process.env.MADLAD_BASE_URL)('MADLAD-400 (live)', () => {
  it('translates into Kazakh, Japanese and Traditional Chinese with placeholders intact', async () => {
    const provider = createProvider()
    const texts = ['You have {{count}} items in your cart.', 'Welcome back, {{name}}!']
    const protect = ['{{count}}', '{{name}}']
    for (const target of ['kk', 'ja', 'zh-TW']) {
      const { translations } = await provider.translate({
        text: texts,
        targetLang: target,
        protect,
      })
      expect(translations[0].text).toContain('{{count}}')
      expect(translations[1].text).toContain('{{name}}')
      expect(translations[0].text).not.toContain('items')
    }
  }, 600_000)
})
