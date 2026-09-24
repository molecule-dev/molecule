import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { decodeEntities, maskText, unmaskText } from '../protect.js'
import { createProvider } from '../provider.js'

describe('protect', () => {
  it('masks each protected occurrence as an indexed <x> tag and escapes plain text', () => {
    const { masked, originals } = maskText(
      'Rated {{rating}} of {{of}} & more <b>',
      ['{{rating}}', '{{of}}'],
      false,
    )
    expect(masked).toBe('Rated <x>0</x> of <x>1</x> &amp; more &lt;b&gt;')
    expect(originals).toEqual(['{{rating}}', '{{of}}'])
  })

  it('restores by index even when the translator reorders and pads the tags', () => {
    const { originals } = maskText('Rated {{rating}} of {{of}}', ['{{rating}}', '{{of}}'], false)
    expect(unmaskText('<x> 1</x>개 중 <x>0 </x>개 &amp; 더', originals, false)).toBe(
      ' {{of}}개 중 {{rating}} 개 & 더',
    )
  })

  it('protects the longer token when tokens overlap', () => {
    const { originals } = maskText('{{count}} and {{count}}s', ['{{count}}', '{{count}}s'], false)
    expect(originals).toEqual(['{{count}}', '{{count}}s'])
  })

  it('protects a token containing an escaped character and restores it verbatim', () => {
    const { masked, originals } = maskText('Use <Tab> & go', ['<Tab>'], false)
    expect(masked).toBe('Use <x>0</x> &amp; go')
    expect(unmaskText('Nutze <x>0</x> &amp; los', originals, false)).toBe('Nutze <Tab> & los')
  })

  it('leaves caller markup unescaped when tagHandling is set', () => {
    const { masked } = maskText('<p>Hi {{name}}</p>', ['{{name}}'], true)
    expect(masked).toBe('<p>Hi <x>0</x></p>')
  })

  it('decodes numeric and named entities', () => {
    expect(decodeEntities('S&#39;està &quot;ok&quot; &#x27;x&#x27;')).toBe(`S'està "ok" 'x'`)
  })
})

describe('DeepL provider with protect', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    mockFetch.mockReset()
  })

  it('sends XML with ignore_tags and returns plain text with placeholders restored', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({
        translations: [
          { detected_source_language: 'EN', text: 'Bewertung <x>0</x> von <x>1</x> &amp; mehr' },
        ],
      }),
    })

    const provider = createProvider({ apiKey: 'key:fx' })
    const result = await provider.translate({
      text: 'Rated {{rating}} of {{of}} & more',
      targetLang: 'DE',
      protect: ['{{rating}}', '{{of}}'],
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.text).toEqual(['Rated <x>0</x> of <x>1</x> &amp; more'])
    expect(body.tag_handling).toBe('xml')
    expect(body.ignore_tags).toEqual(['x'])
    expect(result.translations[0].text).toBe('Bewertung {{rating}} von {{of}} & mehr')
  })

  it('sends plain text unchanged when nothing is protected', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: vi.fn().mockResolvedValue({
        translations: [{ detected_source_language: 'EN', text: 'A & B' }],
      }),
    })

    const provider = createProvider({ apiKey: 'key:fx' })
    await provider.translate({ text: 'A & B', targetLang: 'DE' })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
    expect(body.text).toEqual(['A & B'])
    expect(body.tag_handling).toBeUndefined()
  })
})
