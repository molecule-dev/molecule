import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createWorkerEngine } from '../engine.js'
import { languageName, toBergamotLanguage } from '../languages.js'
import {
  findProtected,
  maskHtml,
  maskTokens,
  tokensIntact,
  unmaskHtml,
  unmaskTokens,
} from '../protect.js'
import { createProvider } from '../provider.js'
import {
  availablePairs,
  downloadVerified,
  matchesServer,
  type ModelRecord,
  ModelStore,
  selectModelSet,
} from '../registry.js'
import type { BergamotEngine, BergamotRequest } from '../types.js'

/** A model-list record for tests. */
function record(
  fromLang: string,
  toLang: string,
  fileType: string,
  version: string,
  filterExpression = '',
): ModelRecord {
  const name = `${fileType}.${fromLang}${toLang}.${version}`
  return {
    name,
    fromLang,
    toLang,
    fileType,
    version,
    filter_expression: filterExpression,
    attachment: { hash: sha(name), size: name.length, location: `files/${name}` },
  }
}

/** SHA-256 of a string. */
function sha(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** All files of a pair at a version. */
function pair(from: string, to: string, version: string, filter = ''): ModelRecord[] {
  return ['model', 'lex', 'vocab'].map((type) => record(from, to, type, version, filter))
}

/** A fake engine: uppercases text, records requests, optionally drops tokens. */
function fakeEngine(transform: (text: string, request: BergamotRequest) => string): {
  engine: BergamotEngine
  requests: BergamotRequest[]
} {
  const requests: BergamotRequest[] = []
  return {
    requests,
    engine: {
      async translate(request) {
        requests.push(request)
        return request.texts.map((text) => transform(text, request))
      },
      async close() {},
    },
  }
}

/** A fetch serving a model list and each record's file (content = its name). */
function fakeFetch(records: ModelRecord[]): { fetch: typeof fetch; urls: string[] } {
  const urls: string[] = []
  const impl = (async (input: string | URL | Request) => {
    const url = String(input)
    urls.push(url)
    if (url.endsWith('/records')) return new Response(JSON.stringify({ data: records }))
    const found = records.find((r) => url.endsWith(r.attachment.location))
    return found ? new Response(found.name) : new Response('missing', { status: 404 })
  }) as typeof fetch
  return { fetch: impl, urls }
}

describe('languages', () => {
  it('reduces caller codes to the model list form', () => {
    expect(toBergamotLanguage('DE')).toBe('de')
    expect(toBergamotLanguage('pt-BR')).toBe('pt')
    expect(toBergamotLanguage('es-MX')).toBe('es')
    expect(toBergamotLanguage('EN-US')).toBe('en')
    expect(toBergamotLanguage('zh')).toBe('zh-Hans')
    expect(toBergamotLanguage('zh-TW')).toBe('zh-Hant')
    expect(toBergamotLanguage('zh_Hant_HK')).toBe('zh-Hant')
    expect(toBergamotLanguage('no')).toBe('nb')
    expect(languageName('de')).toBe('German')
  })
})

describe('protect (bergamot)', () => {
  it('masks with ⟦N⟧ tokens and restores by index', () => {
    const spans = findProtected('{{count}} of {{total}}', ['{{count}}', '{{total}}'])
    expect(maskTokens('{{count}} of {{total}}', ['{{count}}', '{{total}}'])).toBe('⟦0⟧ of ⟦1⟧')
    expect(tokensIntact('⟦1⟧ 中 ⟦ 0 ⟧', 2)).toBe(true)
    expect(tokensIntact('⟦0⟧', 2)).toBe(false)
    expect(tokensIntact('⟦0⟧ ⟦0⟧', 2)).toBe(false)
    expect(unmaskTokens('⟦1⟧ 中 ⟦0⟧', spans)).toBe('{{total}} 中 {{count}}')
  })

  it('HTML fallback escapes text and rebuilds spacing around restored placeholders', () => {
    const source = 'You have {{count}} items & more'
    const spans = findProtected(source, ['{{count}}'])
    expect(maskHtml(source, ['{{count}}'], false)).toBe('You have <x id="0"></x> items &amp; more')
    // Measured Bergamot output shape: double space before, none after.
    expect(unmaskHtml('Du hast  <x id="0"></x>Artikel &amp; mehr', spans, source, false)).toBe(
      'Du hast {{count}} Artikel & mehr',
    )
    // Leading space the engine invented is dropped; no space next to Japanese.
    const s2 = '{{name}} liked your post'
    expect(unmaskHtml(' <x id="0"></x>Gefiel', findProtected(s2, ['{{name}}']), s2, false)).toBe(
      '{{name}} Gefiel',
    )
    expect(unmaskHtml('表示中<x id="0"></x>の結果', spans, source, false)).toBe(
      '表示中{{count}}の結果',
    )
    // No space before punctuation.
    const s3 = 'Welcome back, {{name}}!'
    expect(
      unmaskHtml('Willkommen zurück, <x id="0"></x>!', findProtected(s3, ['{{name}}']), s3, false),
    ).toBe('Willkommen zurück, {{name}}!')
  })
})

describe('registry', () => {
  it('evaluates targeting rules for a desktop release server', () => {
    expect(matchesServer('')).toBe(true)
    expect(matchesServer(undefined)).toBe(true)
    expect(matchesServer("env.appinfo.OS != 'Android' || env.channel != 'release'")).toBe(true)
    expect(matchesServer("env.appinfo.OS == 'Android'")).toBe(false)
    expect(matchesServer("env.channel == 'default' || env.channel == 'nightly'")).toBe(false)
    expect(matchesServer('someUnknownRule()')).toBe(false)
  })

  it('picks the newest complete released set without mixing versions', () => {
    const records = [
      ...pair('en', 'de', '1.0'),
      ...pair('en', 'de', '2.1'),
      ...pair('en', 'de', '2.2', "env.channel == 'nightly'"),
      ...pair('en', 'de', '3.0'), // needs a newer runtime
      ...pair('en', 'de', '2.3a1'), // pre-release
      record('en', 'de', 'model', '2.9'), // incomplete
    ]
    const set = selectModelSet(records, 'en', 'de')!
    expect(set.version).toBe('2.1')
    expect(Object.values(set.files).every((r) => r!.version === '2.1')).toBe(true)
    expect(selectModelSet(records, 'en', 'fr')).toBeNull()
  })

  it('accepts separate source/target vocabularies', () => {
    const records = ['model', 'lex', 'srcvocab', 'trgvocab'].map((t) =>
      record('en', 'ja', t, '2.3'),
    )
    expect(Object.keys(selectModelSet(records, 'en', 'ja')!.files).sort()).toEqual([
      'lex',
      'model',
      'srcvocab',
      'trgvocab',
    ])
    expect(availablePairs(records)).toEqual([['en', 'ja']])
  })

  describe('downloads', () => {
    let dir: string
    beforeAll(async () => {
      dir = await mkdtemp(join(tmpdir(), 'bergamot-test-'))
    })
    afterAll(async () => {
      await rm(dir, { recursive: true, force: true })
    })

    it('verifies the hash and refuses a mismatch', async () => {
      const ok = (async () => new Response('hello')) as unknown as typeof fetch
      const dest = join(dir, 'a.bin')
      await downloadVerified(ok, 'https://x/a', sha('hello'), dest)
      expect(await readFile(dest, 'utf8')).toBe('hello')
      await expect(
        downloadVerified(ok, 'https://x/b', sha('other'), join(dir, 'b')),
      ).rejects.toThrow(/hash mismatch/)
    })

    it('caches the model list and each file on disk', async () => {
      const records = pair('en', 'de', '2.1')
      const { fetch, urls } = fakeFetch(records)
      const store = new ModelStore({
        cacheDir: dir,
        recordsUrl: 'https://rs.example/records',
        attachmentsUrl: 'https://cdn.example/',
        recordsMaxAgeMs: 60_000,
        fetch,
      })
      const spec = await store.ensureModel(selectModelSet(await store.records(), 'en', 'de')!)
      expect(spec.key).toBe('en-de@2.1')
      expect(await readFile(spec.files.model, 'utf8')).toBe('model.ende.2.1')
      const before = urls.length
      await store.ensureModel(selectModelSet(await store.records(), 'en', 'de')!)
      expect(urls.length).toBe(before) // nothing fetched twice
    })
  })
})

describe('BergamotTranslationProvider', () => {
  let dir: string
  const records = [
    ...pair('en', 'de', '2.1'),
    ...pair('fr', 'en', '1.0'),
    ...pair('en', 'ja', '2.3'),
  ]
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'bergamot-provider-'))
  })
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('translates plain text with ⟦N⟧ tokens and restores placeholders', async () => {
    const { engine, requests } = fakeEngine((text) => `DE:${text}`)
    const provider = createProvider({ cacheDir: dir, engine, fetch: fakeFetch(records).fetch })
    const result = await provider.translate({
      text: ['{{count}} items', 'Checkout'],
      targetLang: 'DE',
      protect: ['{{count}}'],
    })
    expect(result.translations.map((t) => t.text)).toEqual(['DE:{{count}} items', 'DE:Checkout'])
    expect(result.translations[0].detectedSourceLang).toBe('en')
    expect(requests).toHaveLength(1)
    expect(requests[0].html).toBe(false)
    expect(requests[0].texts[0]).toBe('⟦0⟧ items')
    expect(requests[0].models.map((m) => m.key)).toEqual(['en-de@2.1'])
  })

  it('retries only the texts that lost a token in HTML mode', async () => {
    const { engine, requests } = fakeEngine((text, request) =>
      request.html ? text.replace('items', 'Artikel') : text.replace('⟦0⟧', ''),
    )
    const provider = createProvider({ cacheDir: dir, engine, fetch: fakeFetch(records).fetch })
    const result = await provider.translate({
      text: ['{{count}} items', 'Checkout'],
      targetLang: 'de',
      protect: ['{{count}}'],
    })
    expect(requests.map((r) => r.html)).toEqual([false, true])
    expect(requests[1].texts).toEqual(['<x id="0"></x> items'])
    expect(result.translations.map((t) => t.text)).toEqual(['{{count}} Artikel', 'Checkout'])
  })

  it('pivots through English when there is no direct model', async () => {
    const { engine, requests } = fakeEngine((text) => text)
    const provider = createProvider({ cacheDir: dir, engine, fetch: fakeFetch(records).fetch })
    await provider.translate({ text: 'Bonjour', sourceLang: 'fr', targetLang: 'ja' })
    expect(requests[0].models.map((m) => m.key)).toEqual(['fr-en@1.0', 'en-ja@2.3'])
  })

  it('names the missing leg for an unsupported pair, and skips same-language calls', async () => {
    const { engine, requests } = fakeEngine((text) => text)
    const provider = createProvider({ cacheDir: dir, engine, fetch: fakeFetch(records).fetch })
    await expect(provider.translate({ text: 'Hi', targetLang: 'kk' })).rejects.toMatchObject({
      code: 'UNSUPPORTED_LANGUAGE_PAIR',
      message: expect.stringContaining('en→kk'),
    })
    const same = await provider.translate({ text: 'Hi', sourceLang: 'en-US', targetLang: 'EN' })
    expect(same.translations[0].text).toBe('Hi')
    expect(requests).toHaveLength(0)
  })

  it('translates caller markup in HTML mode directly', async () => {
    const { engine, requests } = fakeEngine((text) => text.replace('Hello', 'Hallo'))
    const provider = createProvider({ cacheDir: dir, engine, fetch: fakeFetch(records).fetch })
    const result = await provider.translate({
      text: '<b>Hello</b> {{name}}',
      targetLang: 'de',
      tagHandling: 'html',
      protect: ['{{name}}'],
    })
    expect(requests.map((r) => r.html)).toEqual([true])
    expect(result.translations[0].text).toBe('<b>Hallo</b> {{name}}')
  })

  it('lists sources and targets from the model list', async () => {
    const provider = createProvider({
      cacheDir: dir,
      engine: fakeEngine((t) => t).engine,
      fetch: fakeFetch(records).fetch,
    })
    expect((await provider.getSupportedLanguages('target')).map((l) => l.language)).toEqual([
      'de',
      'en',
      'ja',
    ])
    expect((await provider.getSupportedLanguages('source')).map((l) => l.language)).toEqual([
      'en',
      'fr',
    ])
  })
})

/**
 * Live: runs the real Bergamot WASM runtime in worker threads. Set BERGAMOT_CACHE_DIR
 * (models download there on first run: ~5 MB runtime + ~37 MB for en→de, ~50 MB for en→ja).
 */
describe.skipIf(!process.env.BERGAMOT_CACHE_DIR)('Bergamot (live)', () => {
  const cacheDir = process.env.BERGAMOT_CACHE_DIR!
  let engine: BergamotEngine

  it('translates en→de and en→ja with placeholders intact, and de→ja through English', async () => {
    const store = new ModelStore({
      cacheDir,
      recordsUrl:
        'https://firefox.settings.services.mozilla.com/v1/buckets/main/collections/translations-models/records',
      attachmentsUrl: 'https://firefox-settings-attachments.cdn.mozilla.net/',
      recordsMaxAgeMs: 24 * 60 * 60 * 1000,
      fetch,
    })
    engine = createWorkerEngine({
      runtime: () => store.ensureRuntime(),
      workers: 2,
      maxLoadedRoutes: 2,
    })
    const provider = createProvider({ cacheDir, engine })
    const texts = ['You have {{count}} items in your cart.', '{{name}} liked your post', 'Close']
    const protect = ['{{count}}', '{{name}}']

    const de = await provider.translate({ text: texts, targetLang: 'de', protect })
    expect(de.translations[0].text).toContain('{{count}}')
    expect(de.translations[0].text).toMatch(/Warenkorb/)
    expect(de.translations[1].text).toContain('{{name}}')

    const ja = await provider.translate({ text: texts, targetLang: 'ja', protect })
    expect(ja.translations[0].text).toContain('{{count}}')
    expect(ja.translations[1].text).toContain('{{name}}')
    expect(ja.translations[2].text).toMatch(/[぀-ヿ一-鿿]/)

    const pivot = await provider.translate({
      text: 'Willkommen zurück, {{name}}!',
      sourceLang: 'de',
      targetLang: 'es',
      protect: ['{{name}}'],
    })
    expect(pivot.translations[0].text).toContain('{{name}}')
    expect(pivot.translations[0].text.toLowerCase()).toMatch(/bienvenid/)
    await engine.close()
  }, 300_000)
})
