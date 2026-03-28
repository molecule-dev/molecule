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
})
