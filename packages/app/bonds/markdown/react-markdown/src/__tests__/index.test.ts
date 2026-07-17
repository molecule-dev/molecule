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

  // ---------------------------------------------------------------------------
  // Core CommonMark rendering (proves react-markdown actually runs)
  // ---------------------------------------------------------------------------

  describe('render (CommonMark)', () => {
    it('should render headings with slug ids', () => {
      const result = provider.render('# Hello World')
      expect(result.html).toContain('<h1')
      expect(result.html).toContain('id="hello-world"')
      expect(result.html).toContain('Hello World')
    })

    it('should render all six heading levels', () => {
      const md = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6'
      const result = provider.render(md)
      for (const tag of ['<h1', '<h2', '<h3', '<h4', '<h5', '<h6']) {
        expect(result.html).toContain(tag)
      }
    })

    it('should render bold text', () => {
      expect(provider.render('This is **bold** text').html).toContain('<strong>bold</strong>')
    })

    it('should render italic text', () => {
      expect(provider.render('This is *italic* text').html).toContain('<em>italic</em>')
    })

    it('should render links', () => {
      const result = provider.render('[Click here](https://example.com)')
      expect(result.html).toContain('<a href="https://example.com"')
      expect(result.html).toContain('Click here</a>')
    })

    it('should render inline code', () => {
      expect(provider.render('Use `console.log()` here').html).toContain(
        '<code>console.log()</code>',
      )
    })

    it('should render fenced code blocks with a language class', () => {
      const result = provider.render('```js\nconst x = 1\n```')
      expect(result.html).toContain('<pre><code')
      expect(result.html).toContain('language-js')
      expect(result.html).toContain('const x = 1')
    })

    it('should render blockquotes', () => {
      expect(provider.render('> This is a quote').html).toContain('<blockquote>')
    })

    it('should render horizontal rules', () => {
      expect(provider.render('---').html).toContain('<hr')
    })

    it('should render unordered and ordered lists', () => {
      expect(provider.render('- one\n- two').html).toContain('<ul>')
      expect(provider.render('- one\n- two').html).toContain('<li>one</li>')
      expect(provider.render('1. one\n2. two').html).toContain('<ol>')
    })

    it('should render images (and strip react-dom SSR preload hints)', () => {
      const result = provider.render('![Alt text](image.png)')
      expect(result.html).toContain('<img src="image.png" alt="Alt text"')
      // The react-dom resource-preload <link> must not leak into the output.
      expect(result.html).not.toContain('rel="preload"')
      expect(result.html).not.toContain('<link')
    })

    it('should handle empty input', () => {
      expect(provider.render('').html).toBe('')
    })

    it('should not throw on malformed markdown', () => {
      expect(() => provider.render('**unclosed and [broken](')).not.toThrow()
      expect(typeof provider.render('**unclosed and [broken](').html).toBe('string')
    })
  })

  // ---------------------------------------------------------------------------
  // GitHub Flavored Markdown (proves remark-gfm actually runs)
  // ---------------------------------------------------------------------------

  describe('render (GFM via remark-gfm)', () => {
    it('should render a GFM pipe table as a real <table>', () => {
      const md = '| Name | Score |\n| --- | --- |\n| Ada | 100 |'
      const result = provider.render(md)
      expect(result.html).toContain('<table>')
      expect(result.html).toContain('<thead>')
      expect(result.html).toContain('<th>Name</th>')
      expect(result.html).toContain('<td>Ada</td>')
      expect(result.html).toContain('<td>100</td>')
    })

    it('should render a GFM task list with checkbox inputs', () => {
      const result = provider.render('- [x] done\n- [ ] todo')
      expect(result.html).toContain('type="checkbox"')
      // The completed item is checked; the pending one is not.
      expect(result.html).toContain('checked')
      expect(result.html).toContain('done')
      expect(result.html).toContain('todo')
    })

    it('should render GFM strikethrough', () => {
      expect(provider.render('~~gone~~').html).toContain('<del>gone</del>')
    })

    it('should render GFM bare-URL autolinks', () => {
      const result = provider.render('visit https://example.com now')
      expect(result.html).toContain('<a href="https://example.com"')
    })

    it('should NOT render GFM extras when gfm is disabled', () => {
      const p = createProvider({ gfm: false })
      const result = p.render('| a | b |\n| - | - |\n| 1 | 2 |')
      // Without remark-gfm the pipe table is literal text, not a <table>.
      expect(result.html).not.toContain('<table>')
      expect(result.html).toContain('| a | b |')
    })

    it('should honor per-call gfm override (off) even on a gfm-default provider', () => {
      const result = provider.render('~~gone~~', { gfm: false })
      expect(result.html).not.toContain('<del>')
    })
  })

  // ---------------------------------------------------------------------------
  // Options / config knobs (previously inert — now real)
  // ---------------------------------------------------------------------------

  describe('options', () => {
    it('should apply linkTarget _blank with a safe rel', () => {
      const result = provider.render('[Link](https://example.com)', { linkTarget: '_blank' })
      expect(result.html).toContain('target="_blank"')
      expect(result.html).toContain('rel="noopener noreferrer"')
      // The react-markdown `node` extra-prop must not leak into the DOM.
      expect(result.html).not.toContain('node=')
    })

    it('should default links to _self (no target injected)', () => {
      const result = provider.render('[Link](https://example.com)')
      expect(result.html).not.toContain('target="_blank"')
    })

    it('should convert soft line breaks to <br> when breaks is enabled', () => {
      const withBreaks = provider.render('line one\nline two', { breaks: true })
      expect(withBreaks.html).toContain('<br')
      const withoutBreaks = provider.render('line one\nline two')
      expect(withoutBreaks.html).not.toContain('<br')
    })

    it('should honor custom component overrides from config', () => {
      // A string override remaps the tag name (react-markdown feature).
      const p = createProvider({ components: { h1: 'h2' } })
      const result = p.render('# Title')
      expect(result.html).toContain('<h2')
      expect(result.html).not.toContain('<h1')
    })

    it('should honor per-call component overrides', () => {
      const result = provider.render('# Title', { components: { h1: 'h2' } })
      expect(result.html).toContain('<h2')
    })

    it('should drop elements via disallowedElements', () => {
      const p = createProvider({ disallowedElements: ['img'] })
      const result = p.render('![x](y.png)\n\nkeep me')
      expect(result.html).not.toContain('<img')
      expect(result.html).toContain('keep me')
    })

    it('should restrict output via allowedElements', () => {
      const p = createProvider({ allowedElements: ['p'] })
      const result = p.render('# heading\n\njust a paragraph')
      expect(result.html).not.toContain('<h1')
      expect(result.html).toContain('<p>')
    })
  })

  // ---------------------------------------------------------------------------
  // Table of contents
  // ---------------------------------------------------------------------------

  describe('table of contents', () => {
    it('should extract a TOC from headings', () => {
      const md = '# Intro\n## Getting Started\n### Installation'
      const result = provider.render(md)
      expect(result.toc).toBeDefined()
      expect(result.toc).toHaveLength(3)
      expect(result.toc![0]).toMatchObject({ text: 'Intro', level: 1, id: 'intro' })
      expect(result.toc![1]).toMatchObject({ text: 'Getting Started', level: 2 })
      expect(result.toc![2]).toMatchObject({ text: 'Installation', level: 3 })
    })

    it('should return undefined toc when there are no headings', () => {
      expect(provider.render('Just some text').toc).toBeUndefined()
    })

    it('should stamp matching ids so TOC anchors resolve', () => {
      const result = provider.render('## Getting Started')
      expect(result.toc![0].id).toBe('getting-started')
      expect(result.html).toContain('id="getting-started"')
    })
  })

  // ---------------------------------------------------------------------------
  // Security (XSS) — react-markdown escapes raw HTML and sanitizes URLs
  // ---------------------------------------------------------------------------

  describe('security (secure-by-default)', () => {
    it('should escape a raw <script> tag embedded in text', () => {
      const result = provider.render('Hello <script>alert(1)</script> world')
      expect(result.html).not.toContain('<script>')
      expect(result.html).toContain('&lt;script&gt;')
    })

    it('should never render raw HTML tags as active markup', () => {
      const result = provider.render('<b>bold</b> and <img src=x onerror=alert(1)>')
      // Raw HTML is escaped to inert text: no active <b> or <img> element and
      // therefore no live onerror attribute — the whole thing is `&lt;…&gt;`.
      expect(result.html).not.toContain('<b>bold</b>')
      expect(result.html).not.toContain('<img')
      expect(result.html).toContain('&lt;b&gt;')
      expect(result.html).toContain('&lt;img')
    })

    it('should neutralize a javascript: link scheme', () => {
      const result = provider.render('[click me](javascript:alert(1))')
      expect(result.html).not.toContain('javascript:')
      expect(result.html).toContain('href=""')
      expect(result.html).toContain('click me')
    })

    it('should strip a data: image scheme', () => {
      const result = provider.render('![x](data:text/html,<script>alert(1)</script>)')
      expect(result.html).not.toContain('data:')
      expect(result.html).not.toContain('<script>')
    })

    it('should keep legitimate http/https/mailto/relative URLs', () => {
      expect(provider.render('[a](https://example.com)').html).toContain(
        'href="https://example.com"',
      )
      expect(provider.render('[a](mailto:me@example.com)').html).toContain(
        'href="mailto:me@example.com"',
      )
      expect(provider.render('[a](/relative/path)').html).toContain('href="/relative/path"')
    })

    it('should relax URL filtering when sanitize is disabled (opt-out)', () => {
      // Default provider strips a data: URL from a link…
      expect(provider.render('[a](data:text/plain,hi)').html).toContain('href=""')
      // …but sanitize:false lets it through for trusted, app-authored content.
      const trusted = createProvider({ sanitize: false })
      expect(trusted.render('[a](data:text/plain,hi)').html).toContain('href="data:text/plain,hi"')
    })
  })
})
