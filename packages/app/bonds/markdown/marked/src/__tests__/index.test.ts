import { describe, expect, it } from 'vitest'

import { I18nError } from '@molecule/app-i18n'
import type { MarkdownProvider } from '@molecule/app-markdown'

import { createProvider, escapeHtml, isSafeUrl, provider, slugify } from '../index.js'

/**
 * Runs a render and returns the `i18nKey` of the `I18nError` it threw.
 *
 * @param run - The render to run.
 * @returns The thrown `i18nKey`, or `undefined` when nothing was thrown.
 */
function thrownI18nKey(run: () => unknown): string | undefined {
  try {
    run()
  } catch (error) {
    return error instanceof I18nError ? error.i18nKey : undefined
  }
  return undefined
}

describe('@molecule/app-markdown-marked', () => {
  describe('provider', () => {
    it('exports a default provider that conforms to MarkdownProvider', () => {
      const p: MarkdownProvider = provider
      expect(p.name).toBe('marked')
      expect(typeof p.render).toBe('function')
    })

    it('createProvider accepts config and per-call options override it', () => {
      const p = createProvider({ gfm: false })
      const table = '| a | b |\n| - | - |\n| 1 | 2 |'
      expect(p.render(table).html).not.toContain('<table>')
      expect(p.render(table, { gfm: true }).html).toContain('<table>')
    })
  })

  describe('rendering', () => {
    it('renders common markdown to real HTML', () => {
      const { html } = provider.render(
        '# Title\n\nSome **bold** and *italic* with `code`.\n\n- one\n- two\n\n1. first\n\n[link](https://example.com)\n\n```ts\nconst a = 1\n```',
      )
      expect(html).toContain('<h1 id="title">Title</h1>')
      expect(html).toContain('<strong>bold</strong>')
      expect(html).toContain('<em>italic</em>')
      expect(html).toContain('<code>code</code>')
      expect(html).toContain('<ul>')
      expect(html).toContain('<ol>')
      expect(html).toContain('<a href="https://example.com">link</a>')
      expect(html).toContain('<pre><code class="language-ts">const a = 1\n</code></pre>')
    })

    it('renders GFM tables, strikethrough and task lists by default', () => {
      const { html } = provider.render(
        '| a | b |\n| - | - |\n| 1 | 2 |\n\n~~gone~~\n\n- [x] done\n- [ ] todo',
      )
      expect(html).toContain('<table>')
      expect(html).toContain('<del>gone</del>')
      expect(html).toContain('type="checkbox"')
    })

    it('breaks turns a single newline into <br>', () => {
      expect(provider.render('a\nb').html).not.toContain('<br>')
      expect(provider.render('a\nb', { breaks: true }).html).toContain('<br>')
    })

    it('linkTarget _blank adds rel noopener noreferrer', () => {
      const { html } = provider.render('[x](https://example.com)', { linkTarget: '_blank' })
      expect(html).toContain('target="_blank" rel="noopener noreferrer"')
    })

    it('linkTarget _self and unset emit no target', () => {
      expect(createProvider({ linkTarget: '_self' }).render('[x](/a)').html).toBe(
        '<p><a href="/a">x</a></p>\n',
      )
      expect(provider.render('[x](/a)', { linkTarget: '_self' }).html).toBe(
        '<p><a href="/a">x</a></p>\n',
      )
      expect(provider.render('[x](/a)').html).toBe('<p><a href="/a">x</a></p>\n')
    })

    it('extracts a table of contents with unique heading ids', () => {
      const { html, toc } = provider.render('# One\n\n## Two words\n\n## Two words\n\n### Three')
      expect(toc).toEqual([
        { id: 'one', text: 'One', level: 1 },
        { id: 'two-words', text: 'Two words', level: 2 },
        { id: 'two-words-2', text: 'Two words', level: 2 },
        { id: 'three', text: 'Three', level: 3 },
      ])
      expect(html).toContain('<h2 id="two-words-2">Two words</h2>')
    })

    it('headingIds: false leaves headings bare and the toc empty', () => {
      const { html, toc } = createProvider({ headingIds: false }).render('## A')
      expect(html).toBe('<h2>A</h2>\n')
      expect(toc).toEqual([])
    })

    it('keeps Unicode letters and digits in heading ids', () => {
      const { html, toc } = provider.render('# 日本語\n\n## 123 numbers')
      expect(toc).toEqual([
        { id: '日本語', text: '日本語', level: 1 },
        { id: '123-numbers', text: '123 numbers', level: 2 },
      ])
      expect(html).toContain('<h1 id="日本語">日本語</h1>')
    })

    it('gives a heading with no letters or digits the section id', () => {
      const { toc } = provider.render('# 🎉\n\n## 🎉')
      expect(toc.map((entry) => entry.id)).toEqual(['section', 'section-2'])
    })

    it('does not let a suffixed slug collide with a later heading', () => {
      const { toc } = provider.render('# a\n\n# a\n\n# a-2')
      expect(toc.map((entry) => entry.id)).toEqual(['a', 'a-2', 'a-2-2'])
    })

    it('uses a custom slugify when given', () => {
      const p = createProvider({ slugify: (t) => `h-${t.length}` })
      expect(p.render('## Hello').toc).toEqual([{ id: 'h-5', text: 'Hello', level: 2 }])
    })

    it('does not throw on malformed markdown', () => {
      for (const src of ['**unclosed', '[broken](', '```\nno end', '<div', '']) {
        expect(() => provider.render(src)).not.toThrow()
      }
      expect(provider.render('**unclosed').html).toContain('**unclosed')
    })
  })

  describe('sanitization (on by default)', () => {
    it('escapes raw HTML blocks and inline tags to inert text', () => {
      const { html } = provider.render(
        '<script>alert(1)</script>\n\ntext with <b onclick="x()">bold</b> and <img src=x onerror=alert(1)>',
      )
      // no active markup survives: the tags are text now, and text is inert
      expect(html).not.toContain('<script')
      expect(html).not.toContain('<img')
      expect(html).not.toContain('<b ')
      expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    })

    it('drops dangerous link and image URLs but keeps the text', () => {
      const { html } = provider.render(
        '[click](javascript:alert(1)) [tab](java\tscript:alert(1)) ![pic](data:image/png;base64,AAAA) [ok](https://ok.example) [rel](/page) [frag](#x)',
      )
      expect(html).not.toContain('javascript:')
      expect(html).not.toContain('data:')
      expect(html).toContain('click')
      expect(html).toContain('pic')
      expect(html).toContain('<a href="https://ok.example">ok</a>')
      expect(html).toContain('<a href="/page">rel</a>')
      expect(html).toContain('<a href="#x">frag</a>')
    })

    it('sanitize: false passes raw HTML and a non-script scheme through', () => {
      const { html } = provider.render('<b>raw</b> [f](ftp://x.com/a)', { sanitize: false })
      expect(html).toContain('<b>raw</b>')
      expect(html).toContain('<a href="ftp://x.com/a">f</a>')
    })

    it('drops javascript: and vbscript: links even with sanitize: false', () => {
      const { html } = provider.render(
        '[a](javascript:alert(1)) [b](vbscript:msgbox(1)) ![c](javascript:alert(1))',
        { sanitize: false },
      )
      expect(html).not.toContain('javascript:')
      expect(html).not.toContain('vbscript:')
      expect(html).toContain('a b c')
    })
  })

  describe('provider parity', () => {
    it('escapes title and alt text exactly once', () => {
      const { html } = provider.render(
        '[a](https://x.com "Tom & \\"Jerry\\"") ![Tom & "Jerry"](https://x.com/i.png)',
      )
      expect(html).toContain('title="Tom &amp; &quot;Jerry&quot;"')
      expect(html).toContain('alt="Tom &amp; &quot;Jerry&quot;"')
      expect(html).not.toContain('&amp;amp;')
    })

    it('percent-encodes a space in a link destination', () => {
      expect(provider.render('[a](<https://x.com/a b>)').html).toBe(
        '<p><a href="https://x.com/a%20b">a</a></p>\n',
      )
    })

    it('builds toc text from the heading rendered text', () => {
      const { toc } = provider.render('# Use `x`\n\n## A *b* c\n\n### See [the docs](/docs)')
      expect(toc).toEqual([
        { id: 'use-x', text: 'Use x', level: 1 },
        { id: 'a-b-c', text: 'A b c', level: 2 },
        { id: 'see-the-docs', text: 'See the docs', level: 3 },
      ])
    })
  })

  describe('elementAttributes', () => {
    it('adds each attribute to every element of that kind, value escaped once', () => {
      const { html } = provider.render('[a](https://x.com) and [b](/b)\n\n- one', {
        elementAttributes: {
          a: { class: 'link', 'data-note': 'say "hi" <now> & go' },
          li: { class: 'item' },
        },
      })
      expect(html).toContain(
        '<a href="https://x.com" class="link" data-note="say &quot;hi&quot; &lt;now&gt; &amp; go">a</a>',
      )
      expect(html).toContain(
        '<a href="/b" class="link" data-note="say &quot;hi&quot; &lt;now&gt; &amp; go">b</a>',
      )
      expect(html).toContain('<li class="item">one</li>')
    })

    it('reaches headings and task-list boxes', () => {
      const { html } = provider.render('# T\n\n- [x] done', {
        elementAttributes: { h1: { class: 'title' }, input: { class: 'box' } },
      })
      expect(html).toContain('<h1 id="t" class="title">T</h1>')
      expect(html).toContain('<input checked="" disabled="" type="checkbox" class="box">')
    })

    it("gives a table's own tbody its attributes when a header cell's raw HTML holds a <tbody>", () => {
      const { html } = provider.render('| <tbody> |\n|---|\n| x |', {
        sanitize: false,
        elementAttributes: { tbody: { class: 'b' }, thead: { class: 'h' } },
      })
      expect(html).toContain('<th><tbody></th>')
      expect(html).toContain('<thead class="h">')
      expect(html).toContain('<tbody class="b"><tr>\n<td>x</td>')
    })

    it('merges a configured class with the fenced code language class', () => {
      expect(
        provider.render('```js\nx\n```', { elementAttributes: { code: { class: 'hl' } } }).html,
      ).toBe('<pre><code class="language-js hl">x\n</code></pre>\n')
    })

    it('cannot set an attribute the renderer owns', () => {
      expect(
        thrownI18nKey(() =>
          provider.render('[a](https://x.com)', {
            elementAttributes: { a: { href: 'https://evil.example' } },
          }),
        ),
      ).toBe('markdown.elementAttributes.refused')
    })

    it('cannot add an event handler', () => {
      expect(
        thrownI18nKey(() =>
          provider.render('text', { elementAttributes: { p: { OnClick: 'alert(1)' } } }),
        ),
      ).toBe('markdown.elementAttributes.refused')
    })
  })

  describe('components', () => {
    it('refuses a components override, because it returns an HTML string', () => {
      expect(thrownI18nKey(() => provider.render('# T', { components: { a: () => '' } }))).toBe(
        'markdown.components.unsupported',
      )
      expect(thrownI18nKey(() => provider.render('# T', { components: {} }))).toBe(
        'markdown.components.unsupported',
      )
    })

    it('renders when components is undefined', () => {
      expect(provider.render('# T', { components: undefined }).html).toContain('<h1 id="t">T</h1>')
    })
  })

  describe('footnotes', () => {
    it('restarts reference numbering for each render', () => {
      const source = 'x[^1] and y[^2]\n\n[^1]: one\n[^2]: two'
      const first = provider.render(source).html
      const second = provider.render(source).html
      expect(second).toBe(first)
      expect(first).toContain('id="fnref-1"')
      expect(first).toContain('id="fnref-2"')
      expect(first).not.toContain('id="fnref-3"')
    })

    it('renders a definition with no reference as nothing, not as text', () => {
      // marked-footnote consumes the (unreferenced) definition and emits no
      // section for it, so only the surrounding prose survives.
      const { html } = provider.render('text\n\n[^unused]: dangling')
      expect(html).toBe('<p>text</p>\n')
      expect(html).not.toContain('data-footnotes')
    })

    it('leaves a reference with no definition as literal text', () => {
      expect(provider.render('see [^missing]').html).toBe('<p>see [^missing]</p>\n')
    })

    it('renders the links and emphasis inside a footnote definition', () => {
      const { html } = provider.render('x[^1]\n\n[^1]: a [link](/a) and *em*')
      expect(html).toContain('<li id="fn-1">')
      expect(html).toContain('<a href="/a">link</a>')
      expect(html).toContain('<em>em</em>')
      expect(html).toContain('data-footnote-backref')
    })
  })

  describe('helpers', () => {
    it('escapeHtml, slugify, isSafeUrl', () => {
      expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
        '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
      )
      expect(slugify('  Hello, World!  ')).toBe('hello-world')
      expect(slugify('Ünïcode & symbols')).toBe('ünïcode-symbols')
      expect(isSafeUrl('https://a.b/c')).toBe(true)
      expect(isSafeUrl('mailto:a@b.c')).toBe(true)
      expect(isSafeUrl('tel:+15551234567')).toBe(true)
      expect(isSafeUrl('irc://irc.example.com/#c')).toBe(true)
      expect(isSafeUrl('xmpp:me@example.com')).toBe(true)
      expect(isSafeUrl('/relative')).toBe(true)
      expect(isSafeUrl('#hash')).toBe(true)
      expect(isSafeUrl('JavaScript:alert(1)')).toBe(false)
      expect(isSafeUrl('data:text/html,hi')).toBe(false)
      expect(isSafeUrl('vbscript:x')).toBe(false)
      expect(isSafeUrl('file:///etc/passwd')).toBe(false)
    })
  })
})
