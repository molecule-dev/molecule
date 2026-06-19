import { describe, expect, it } from 'vitest'

import type { MarkdownProvider } from '@molecule/app-markdown'

import { createProvider, provider } from '../index.js'

describe('@molecule/app-markdown-react-markdown', () => {
  describe('provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.name).toBe('react-markdown')
    })

    it('should conform to MarkdownProvider interface', () => {
      const p: MarkdownProvider = provider
      expect(p.name).toBe('react-markdown')
      expect(typeof p.render).toBe('function')
    })
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p.name).toBe('react-markdown')
    })

    it('should create a provider with custom config', () => {
      const p = createProvider({ sanitize: false, gfm: false })
      expect(p.name).toBe('react-markdown')
    })
  })

  describe('render', () => {
    it('should render headings', () => {
      const result = provider.render('# Hello World')
      expect(result.html).toContain('<h1')
      expect(result.html).toContain('Hello World')
    })

    it('should render multiple heading levels', () => {
      const md = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6'
      const result = provider.render(md)
      expect(result.html).toContain('<h1')
      expect(result.html).toContain('<h2')
      expect(result.html).toContain('<h3')
      expect(result.html).toContain('<h4')
      expect(result.html).toContain('<h5')
      expect(result.html).toContain('<h6')
    })

    it('should render bold text', () => {
      const result = provider.render('This is **bold** text')
      expect(result.html).toContain('<strong>bold</strong>')
    })

    it('should render italic text', () => {
      const result = provider.render('This is *italic* text')
      expect(result.html).toContain('<em>italic</em>')
    })

    it('should render links', () => {
      const result = provider.render('[Click here](https://example.com)')
      expect(result.html).toContain('<a href="https://example.com"')
      expect(result.html).toContain('Click here</a>')
    })

    it('should render links with target option', () => {
      const result = provider.render('[Link](https://example.com)', { linkTarget: '_blank' })
      expect(result.html).toContain('target="_blank"')
    })

    it('should render inline code', () => {
      const result = provider.render('Use `console.log()` here')
      expect(result.html).toContain('<code>console.log()</code>')
    })

    it('should render code blocks', () => {
      const result = provider.render('```js\nconst x = 1\n```')
      expect(result.html).toContain('<pre><code')
      expect(result.html).toContain('language-js')
    })

    it('should render blockquotes', () => {
      const result = provider.render('> This is a quote')
      expect(result.html).toContain('<blockquote>')
    })

    it('should render horizontal rules', () => {
      const result = provider.render('---')
      expect(result.html).toContain('<hr />')
    })

    it('should extract table of contents', () => {
      const md = '# Intro\n## Getting Started\n### Installation'
      const result = provider.render(md)
      expect(result.toc).toBeDefined()
      expect(result.toc).toHaveLength(3)
      expect(result.toc![0].text).toBe('Intro')
      expect(result.toc![0].level).toBe(1)
      expect(result.toc![1].text).toBe('Getting Started')
      expect(result.toc![1].level).toBe(2)
    })

    it('should return undefined toc when no headings', () => {
      const result = provider.render('Just some text')
      expect(result.toc).toBeUndefined()
    })

    it('should handle empty input', () => {
      const result = provider.render('')
      expect(result.html).toBe('')
    })

    it('should render images', () => {
      const result = provider.render('![Alt text](image.png)')
      expect(result.html).toContain('<img src="image.png" alt="Alt text"')
    })
  })

  describe('sanitization (secure-by-default)', () => {
    it('should drop a javascript: link scheme', () => {
      const result = provider.render('[click me](javascript:alert(1))')
      // Link text still renders, but the dangerous scheme is gone.
      expect(result.html).not.toContain('javascript:')
      expect(result.html).toContain('href=""')
      expect(result.html).toContain('click me</a>')
    })

    it('should drop a data: image scheme', () => {
      const result = provider.render('![x](data:text/html,<script>alert(1)</script>)')
      expect(result.html).not.toContain('data:')
      expect(result.html).toContain('<img src=""')
    })

    it('should neutralize a tab-obfuscated javascript: scheme', () => {
      const result = provider.render('[x](java\tscript:alert(1))')
      expect(result.html.toLowerCase()).not.toContain('javascript:')
      expect(result.html).toContain('href=""')
    })

    it('should neutralize a newline-obfuscated javascript: scheme', () => {
      const result = provider.render('[x](java\nscript:alert(1))')
      expect(result.html.toLowerCase()).not.toContain('javascript:')
      expect(result.html).toContain('href=""')
    })

    it('should neutralize a leading-whitespace javascript: scheme', () => {
      const result = provider.render('[x](  javascript:alert(1))')
      expect(result.html.toLowerCase()).not.toContain('javascript:')
      expect(result.html).toContain('href=""')
    })

    it('should neutralize a mixed-case JaVaScript: scheme', () => {
      const result = provider.render('[x](JaVaScript:alert(1))')
      expect(result.html.toLowerCase()).not.toContain('javascript:')
      expect(result.html).toContain('href=""')
    })

    it('should neutralize a leading-control-char data: URL', () => {
      const result = provider.render('![x](\x01data:text/html,<script>alert(1)</script>)')
      expect(result.html.toLowerCase()).not.toContain('data:')
      expect(result.html).toContain('<img src=""')
    })

    it('should keep legitimate http/https/mailto/relative URLs', () => {
      expect(provider.render('[a](https://example.com)').html).toContain(
        'href="https://example.com"',
      )
      expect(provider.render('[a](http://example.com)').html).toContain('href="http://example.com"')
      expect(provider.render('[a](mailto:me@example.com)').html).toContain(
        'href="mailto:me@example.com"',
      )
      expect(provider.render('[a](/relative/path)').html).toContain('href="/relative/path"')
      expect(provider.render('[a](#anchor)').html).toContain('href="#anchor"')
    })

    it('should prevent attribute breakout from a link URL', () => {
      const result = provider.render('[x](https://e.com" onmouseover="alert(1))')
      // The injected quote is escaped, so no new attribute can be created.
      expect(result.html).not.toContain('onmouseover="')
      expect(result.html).toContain('&quot;')
    })

    it('should escape a script tag embedded in text', () => {
      const result = provider.render('Hello <script>alert(1)</script> world')
      expect(result.html).not.toContain('<script>')
      expect(result.html).toContain('&lt;script&gt;')
    })

    it('should escape a raw less-than-leading line instead of passing it through', () => {
      const result = provider.render('<script>alert(1)</script>')
      expect(result.html).not.toContain('<script>')
      expect(result.html).toContain('&lt;script&gt;')
    })

    it('should escape inline HTML in bold/italic/blockquote/list content', () => {
      expect(provider.render('**<b>x</b>**').html).toContain(
        '<strong>&lt;b&gt;x&lt;/b&gt;</strong>',
      )
      expect(provider.render('> <i>q</i>').html).toContain(
        '<blockquote>&lt;i&gt;q&lt;/i&gt;</blockquote>',
      )
      expect(provider.render('- <em>item</em>').html).toContain(
        '<li>&lt;em&gt;item&lt;/em&gt;</li>',
      )
    })

    it('should pass raw HTML through when sanitize is disabled (opt-out)', () => {
      const raw = createProvider({ sanitize: false })
      const result = raw.render('[click](javascript:alert(1))\n<b>bold</b>')
      // Opt-out preserves raw passthrough — the swap/decoupling contract.
      expect(result.html).toContain('javascript:')
      expect(result.html).toContain('<b>bold</b>')
    })
  })
})
