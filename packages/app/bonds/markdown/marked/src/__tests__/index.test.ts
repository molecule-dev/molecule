import { describe, expect, it } from 'vitest'

import type { MarkdownProvider } from '@molecule/app-markdown'

import { createProvider, escapeHtml, isSafeUrl, provider, slugify } from '../index.js'

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
      expect(createProvider({ linkTarget: '_self' }).render('[x](/a)').html).toContain(
        'target="_self"',
      )
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

    it('sanitize: false passes raw HTML and any scheme through', () => {
      const { html } = provider.render('<b>raw</b> [j](javascript:void(0))', { sanitize: false })
      expect(html).toContain('<b>raw</b>')
      expect(html).toContain('href="javascript:void(0)"')
    })
  })

  describe('helpers', () => {
    it('escapeHtml, slugify, isSafeUrl', () => {
      expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
        '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
      )
      expect(slugify('  Hello, World!  ')).toBe('hello-world')
      expect(slugify('Ünïcode & symbols')).toBe('ncode-symbols')
      expect(isSafeUrl('https://a.b/c')).toBe(true)
      expect(isSafeUrl('mailto:a@b.c')).toBe(true)
      expect(isSafeUrl('/relative')).toBe(true)
      expect(isSafeUrl('#hash')).toBe(true)
      expect(isSafeUrl('JavaScript:alert(1)')).toBe(false)
      expect(isSafeUrl('data:text/html,hi')).toBe(false)
      expect(isSafeUrl('vbscript:x')).toBe(false)
      expect(isSafeUrl('file:///etc/passwd')).toBe(false)
    })
  })
})
