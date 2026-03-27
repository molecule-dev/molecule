import { beforeEach, describe, expect, it } from 'vitest'

import type { MarkdownOptions, MarkdownProvider, RenderedMarkdown, TocEntry } from '../index.js'
import { getProvider, hasProvider, requireProvider, setProvider } from '../index.js'

describe('@molecule/app-markdown', () => {
  beforeEach(() => {
    // Reset provider between tests
    setProvider(null as unknown as MarkdownProvider)
  })

  describe('Types compile correctly', () => {
    it('should compile TocEntry type', () => {
      const entry: TocEntry = {
        id: 'introduction',
        text: 'Introduction',
        level: 1,
      }
      expect(entry.id).toBe('introduction')
      expect(entry.level).toBe(1)
    })

    it('should compile RenderedMarkdown type', () => {
      const result: RenderedMarkdown = {
        html: '<h1>Hello</h1>',
        toc: [{ id: 'hello', text: 'Hello', level: 1 }],
      }
      expect(result.html).toBe('<h1>Hello</h1>')
      expect(result.toc).toHaveLength(1)
    })

    it('should compile RenderedMarkdown without toc', () => {
      const result: RenderedMarkdown = {
        html: '<p>Simple text</p>',
      }
      expect(result.html).toBe('<p>Simple text</p>')
      expect(result.toc).toBeUndefined()
    })

    it('should compile MarkdownOptions type', () => {
      const options: MarkdownOptions = {
        sanitize: true,
        gfm: true,
        breaks: false,
        syntaxHighlight: true,
        components: { a: 'custom-link' },
        linkTarget: '_blank',
      }
      expect(options.sanitize).toBe(true)
      expect(options.linkTarget).toBe('_blank')
    })

    it('should compile MarkdownOptions with minimal config', () => {
      const options: MarkdownOptions = {}
      expect(options.sanitize).toBeUndefined()
    })

    it('should compile MarkdownProvider type', () => {
      const provider: MarkdownProvider = {
        name: 'test',
        render: (markdown: string) => ({ html: `<p>${markdown}</p>` }),
      }
      expect(provider.name).toBe('test')
      expect(provider.render('hello').html).toBe('<p>hello</p>')
    })
  })

  describe('Provider management', () => {
    it('should return null when no provider is set', () => {
      expect(getProvider()).toBeNull()
    })

    it('should return false for hasProvider when none set', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should throw on requireProvider when none set', () => {
      expect(() => requireProvider()).toThrow(
        'Markdown provider not configured. Bond a markdown provider first.',
      )
    })

    it('should set and get a provider', () => {
      const mockProvider: MarkdownProvider = {
        name: 'test-md',
        render: () => ({ html: '' }),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true for hasProvider after setting', () => {
      const mockProvider: MarkdownProvider = {
        name: 'test-md',
        render: () => ({ html: '' }),
      }
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })

    it('should return provider from requireProvider after setting', () => {
      const mockProvider: MarkdownProvider = {
        name: 'test-md',
        render: () => ({ html: '' }),
      }
      setProvider(mockProvider)
      expect(requireProvider()).toBe(mockProvider)
    })

    it('should allow replacing a provider', () => {
      const provider1: MarkdownProvider = {
        name: 'provider-1',
        render: () => ({ html: '1' }),
      }
      const provider2: MarkdownProvider = {
        name: 'provider-2',
        render: () => ({ html: '2' }),
      }
      setProvider(provider1)
      expect(getProvider()?.name).toBe('provider-1')
      setProvider(provider2)
      expect(getProvider()?.name).toBe('provider-2')
    })
  })

  describe('Provider rendering', () => {
    it('should call render with markdown and options', () => {
      const mockProvider: MarkdownProvider = {
        name: 'test',
        render: (markdown, options) => ({
          html: `<div>${markdown}</div>`,
          toc: options?.gfm ? [{ id: 'test', text: 'Test', level: 1 }] : undefined,
        }),
      }
      setProvider(mockProvider)

      const provider = requireProvider()
      const result = provider.render('# Test', { gfm: true })
      expect(result.html).toBe('<div># Test</div>')
      expect(result.toc).toHaveLength(1)
    })

    it('should render without options', () => {
      const mockProvider: MarkdownProvider = {
        name: 'test',
        render: (markdown) => ({ html: `<p>${markdown}</p>` }),
      }
      setProvider(mockProvider)

      const result = requireProvider().render('Hello')
      expect(result.html).toBe('<p>Hello</p>')
    })
  })
})
