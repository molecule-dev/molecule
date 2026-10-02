import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createProvider } from '../provider.js'

const mockFetch = vi.fn()

describe('MoleculeTranslationProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  it('posts the core params to the hosted endpoint with the project key', async () => {
    const result = { translations: [{ text: '{{count}} Artikel', detectedSourceLang: '' }] }
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => result })

    const provider = createProvider({
      apiKey: 'mk_test',
      servicesUrl: 'http://localhost:4000/api/v1/services/',
    })
    const out = await provider.translate({
      text: '{{count}} items',
      targetLang: 'de',
      protect: ['{{count}}'],
      formality: 'more',
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:4000/api/v1/services/translation/translate')
    expect(init.headers.Authorization).toBe('Bearer mk_test')
    // Unsupported fields are not sent.
    expect(JSON.parse(init.body as string)).toEqual({
      text: '{{count}} items',
      targetLang: 'de',
      protect: ['{{count}}'],
    })
    expect(out).toEqual(result)
    expect((await provider.getUsage()).characterCount).toBe(15)
  })

  it('throws the service error with status and errorKey', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 402,
      text: async () =>
        JSON.stringify({ error: 'Budget used up.', errorKey: 'hostedServices.error.budget' }),
    })
    await expect(
      createProvider({ apiKey: 'mk_test' }).translate({ text: 'x', targetLang: 'de' }),
    ).rejects.toMatchObject({
      message: 'molecule.dev translation error (402): Budget used up.',
      status: 402,
      errorKey: 'hostedServices.error.budget',
    })
  })

  it('refuses to call without a key', async () => {
    const saved = process.env.MOLECULE_API_KEY
    delete process.env.MOLECULE_API_KEY
    try {
      await expect(
        createProvider().translate({ text: 'x', targetLang: 'de' }),
      ).rejects.toMatchObject({
        errorKey: 'aiTranslationMolecule.error.missingKey',
      })
      expect(mockFetch).not.toHaveBeenCalled()
    } finally {
      if (saved !== undefined) process.env.MOLECULE_API_KEY = saved
    }
  })

  it('lists languages with English names', async () => {
    expect(await createProvider({ apiKey: 'k' }).getSupportedLanguages()).toContainEqual({
      language: 'de',
      name: 'German',
    })
  })
})

describe('servicesUrl guard', () => {
  it('accepts an https base and loopback http bases', () => {
    expect(() =>
      createProvider({ apiKey: 'k', servicesUrl: 'https://services.example.com/api/v1' }),
    ).not.toThrow()
    expect(() =>
      createProvider({ apiKey: 'k', servicesUrl: 'http://localhost:4000/api/v1/services' }),
    ).not.toThrow()
    expect(() =>
      createProvider({ apiKey: 'k', servicesUrl: 'http://127.0.0.1:4000/api/v1/services' }),
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
      createProvider({ apiKey: 'k', servicesUrl: 'http://services.example.com/api/v1' }),
    ).toThrow(/must use https.*Bearer token/s)
  })
})

// Live check against a running molecule.dev API — set MOLECULE_API_KEY and
// MOLECULE_SERVICES_URL (e.g. http://localhost:4000/api/v1/services).
describe.skipIf(!process.env.MOLECULE_API_KEY || !process.env.MOLECULE_SERVICES_URL)(
  'MoleculeTranslationProvider (live)',
  () => {
    it('translates through molecule.dev and keeps placeholders', async () => {
      const result = await createProvider().translate({
        text: ['Showing {{start}}-{{end}} of {{count}} stories', 'Close menu'],
        targetLang: 'de',
        sourceLang: 'en',
        protect: ['{{start}}', '{{end}}', '{{count}}'],
      })
      const [first, second] = result.translations.map((t) => t.text)
      for (const token of ['{{start}}', '{{end}}', '{{count}}']) expect(first).toContain(token)
      expect(second).not.toBe('Close menu')
    }, 120_000)
  },
)
