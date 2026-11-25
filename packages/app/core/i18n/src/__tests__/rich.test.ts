import { describe, expect, it } from 'vitest'

import * as i18n from '../index.js'

const key = 'content.privacyPolicy'

describe('parseRichMessage', () => {
  it('preserves the five tags, nesting and surrounding whitespace', () => {
    expect(
      i18n.parseRichMessage(
        key,
        '\n<h2>Privacy</h2>\n<p>Read <strong>this &amp; that</strong>.</p>\n<ul>\n  <li>One<ul><li>Two</li></ul></li>\n</ul>\n',
      ),
    ).toEqual([
      { kind: 'text', text: '\n' },
      { kind: 'element', tag: 'h2', children: [{ kind: 'text', text: 'Privacy' }] },
      { kind: 'text', text: '\n' },
      {
        kind: 'element',
        tag: 'p',
        children: [
          { kind: 'text', text: 'Read ' },
          { kind: 'element', tag: 'strong', children: [{ kind: 'text', text: 'this & that' }] },
          { kind: 'text', text: '.' },
        ],
      },
      { kind: 'text', text: '\n' },
      {
        kind: 'element',
        tag: 'ul',
        children: [
          { kind: 'text', text: '\n  ' },
          {
            kind: 'element',
            tag: 'li',
            children: [
              { kind: 'text', text: 'One' },
              {
                kind: 'element',
                tag: 'ul',
                children: [
                  { kind: 'element', tag: 'li', children: [{ kind: 'text', text: 'Two' }] },
                ],
              },
            ],
          },
          { kind: 'text', text: '\n' },
        ],
      },
      { kind: 'text', text: '\n' },
    ])
  })

  it('inserts markup and entity syntax from an interpolation value as literal text', () => {
    const appName = '<b>A&B</b> &amp; {other}'
    expect(
      i18n.parseRichMessage(key, '<p>For {{appName}}.</p>', { appName, other: 'Other' }),
    ).toEqual([
      { kind: 'element', tag: 'p', children: [{ kind: 'text', text: `For ${appName}.` }] },
    ])
  })

  it('keeps unsupported catalog HTML for web and identifies the markup and key for native', () => {
    expect(
      i18n.parseRichMessage(key, '<p>For <em title="{{appName}}">{{appName}}</em>.</p>', {
        appName: '<b>A&B</b>',
      }),
    ).toEqual([
      {
        kind: 'legacy-html',
        diagnostic: 'Unsupported rich translation markup <em> in "content.privacyPolicy"',
        html: '<p>For <em title="{{appName}}">&lt;b&gt;A&amp;B&lt;/b&gt;</em>.</p>',
      },
    ])
  })

  it('preserves catalog markup when portable tags have invalid nesting', () => {
    expect(i18n.parseRichMessage(key, '<p>One<p>Two</p>')).toEqual([
      {
        kind: 'legacy-html',
        diagnostic: 'Unsupported rich translation markup <p> in "content.privacyPolicy"',
        html: '<p>One<p>Two</p>',
      },
    ])
  })

  it('decodes numeric references and common bare entities only in catalog text', () => {
    expect(
      i18n.parseRichMessage(key, '<p>&#65; &#123;name&#125; &amp {{name}}</p>', {
        name: '<b>A&B</b> &amp;',
      }),
    ).toEqual([
      {
        kind: 'element',
        tag: 'p',
        children: [{ kind: 'text', text: 'A {name} & <b>A&B</b> &amp;' }],
      },
    ])
  })

  it('leaves an ambiguous legacy tag and raw text unchanged while interpolating ordinary text', () => {
    const nodes = i18n.parseRichMessage(
      key,
      '<a title=<{{appName}}>>{{appName}}</a><style>{{appName}}</style>',
      { appName: '<b>A&B</b>' },
    )
    expect(nodes).toEqual([
      {
        kind: 'legacy-html',
        diagnostic: 'Unsupported rich translation markup <a> in "content.privacyPolicy"',
        html: '<a title=<{{appName}}>>&lt;b&gt;A&amp;B&lt;/b&gt;</a><style>{{appName}}</style>',
      },
    ])
  })
})

describe('tRich', () => {
  it('reads the bonded locale, English fallback and lazy modules without a separate catalog', async () => {
    const previous = i18n.getProvider()
    const provider = i18n.createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: { [key]: '<p>For {{appName}}.</p>' } },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' },
    ])

    try {
      i18n.setProvider(provider)
      await provider.setLocale('fr')
      const values = { appName: '<b>A&B</b>' }
      expect(i18n.tRich(key, values)).toEqual([
        { kind: 'element', tag: 'p', children: [{ kind: 'text', text: 'For <b>A&B</b>.' }] },
      ])

      provider.registerContent?.('privacy', async (locale) => {
        await Promise.resolve()
        provider.addTranslations(locale, { [key]: '<p>Für {{appName}}.</p>' })
      })
      await provider.setLocale('de')
      expect(i18n.tRich(key, values)).toEqual([
        { kind: 'element', tag: 'p', children: [{ kind: 'text', text: 'Für <b>A&B</b>.' }] },
      ])
    } finally {
      i18n.setProvider(previous)
    }
  })

  it('uses plural lookup and defaults before interpolating text', () => {
    const provider = i18n.createSimpleI18nProvider('en', [
      {
        code: 'en',
        name: 'English',
        translations: { 'cart.items_other': '<p>{{count}} items</p>' },
      },
    ])
    const rich = i18n.createRichTranslator(provider.t)
    expect(rich('cart.items', { count: '<b>Two</b>' }, { count: 2 })).toEqual([
      { kind: 'element', tag: 'p', children: [{ kind: 'text', text: '<b>Two</b> items' }] },
    ])
    expect(
      rich('missing', undefined, { count: 1, defaultValue_one: '<p>{{count}} item</p>' }),
    ).toEqual([{ kind: 'element', tag: 'p', children: [{ kind: 'text', text: '1 item' }] }])
    expect(rich('missing', undefined, { defaultValue: '' })).toEqual([])
    expect(rich('<em>Missing key</em>')).toEqual([{ kind: 'text', text: '<em>Missing key</em>' }])
  })

  it('lets the provider use interpolation values to select the uninterpolated template', () => {
    const rich = i18n.createRichTranslator((_key, values, options) => {
      expect(options?.skipInterpolation).toBe(true)
      const count = options?.count ?? values?.count
      return count === 1 ? '<p>{{count}} item</p>' : '<p>{{count}} items</p>'
    })

    expect(rich('cart.items', { count: 1 })).toEqual([
      { kind: 'element', tag: 'p', children: [{ kind: 'text', text: '1 item' }] },
    ])
    expect(rich('cart.items', { count: 2 })).toEqual([
      { kind: 'element', tag: 'p', children: [{ kind: 'text', text: '2 items' }] },
    ])
  })
})
