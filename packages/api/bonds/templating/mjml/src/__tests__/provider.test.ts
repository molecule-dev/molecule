import { describe, expect, it } from 'vitest'

import type { TemplateProvider } from '@molecule/api-templating'

import { createProvider, provider } from '../provider.js'

/** Minimal valid MJML template wrapper. */
const wrap = (content: string): string =>
  `<mjml><mj-body><mj-section><mj-column>${content}</mj-column></mj-section></mj-body></mjml>`

describe('mjml template provider', () => {
  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p).toBeDefined()
      expect(p.render).toBeInstanceOf(Function)
      expect(p.compile).toBeInstanceOf(Function)
      expect(p.renderCompiled).toBeInstanceOf(Function)
      expect(p.registerHelper).toBeInstanceOf(Function)
      expect(p.registerPartial).toBeInstanceOf(Function)
    })

    it('should register initial helpers from config', async () => {
      const p = createProvider({
        helpers: {
          shout: (val: unknown): string => String(val).toUpperCase(),
        },
      })
      const result = await p.render(wrap('<mj-text>{{shout name}}</mj-text>'), { name: 'hello' })
      expect(result).toContain('HELLO')
    })

    it('should register initial partials from config', async () => {
      const p = createProvider({
        partials: {
          greeting: '<mj-text>Hello {{name}}!</mj-text>',
        },
      })
      const result = await p.render(wrap('{{> greeting}}'), { name: 'World' })
      expect(result).toContain('Hello World!')
    })
  })

  describe('render', () => {
    it('should render MJML to responsive HTML', async () => {
      const p = createProvider()
      const result = await p.render(wrap('<mj-text>Hello World!</mj-text>'), {})
      expect(result).toContain('<!doctype html>')
      expect(result).toContain('Hello World!')
    })

    it('should interpolate variables', async () => {
      const p = createProvider()
      const result = await p.render(wrap('<mj-text>Hello {{name}}!</mj-text>'), { name: 'Alice' })
      expect(result).toContain('Hello Alice!')
    })

    it('should interpolate nested properties', async () => {
      const p = createProvider()
      const result = await p.render(wrap('<mj-text>{{user.name}}</mj-text>'), {
        user: { name: 'Bob' },
      })
      expect(result).toContain('Bob')
    })

    it('should HTML-escape output by default', async () => {
      const p = createProvider()
      const result = await p.render(wrap('<mj-text>{{content}}</mj-text>'), {
        content: '<script>alert("xss")</script>',
      })
      expect(result).not.toContain('<script>')
      expect(result).toContain('&lt;script&gt;')
    })

    it('should not escape with triple-braces', async () => {
      const p = createProvider()
      const result = await p.render(wrap('<mj-text>{{{content}}}</mj-text>'), {
        content: '<b>bold</b>',
      })
      expect(result).toContain('<b>bold</b>')
    })

    it('should handle Handlebars #each blocks', async () => {
      const p = createProvider()
      const result = await p.render(wrap('<mj-text>{{#each items}}{{this}} {{/each}}</mj-text>'), {
        items: ['a', 'b', 'c'],
      })
      expect(result).toContain('a b c')
    })

    it('should handle Handlebars #if blocks', async () => {
      const p = createProvider()
      const result = await p.render(
        wrap('<mj-text>{{#if show}}visible{{else}}hidden{{/if}}</mj-text>'),
        { show: true },
      )
      expect(result).toContain('visible')
      expect(result).not.toContain('hidden')
    })

    it('should use per-render helpers', async () => {
      const p = createProvider()
      const result = await p.render(
        wrap('<mj-text>{{lower name}}</mj-text>'),
        { name: 'HELLO' },
        {
          helpers: {
            lower: (val: unknown): string => String(val).toLowerCase(),
          },
        },
      )
      expect(result).toContain('hello')
    })

    it('should use per-render partials', async () => {
      const p = createProvider()
      const result = await p.render(
        wrap('{{> footer}}'),
        { year: '2026' },
        {
          partials: {
            footer: '<mj-text>Copyright {{year}}</mj-text>',
          },
        },
      )
      expect(result).toContain('Copyright 2026')
    })

    it('should produce responsive HTML with media queries', async () => {
      const p = createProvider()
      const result = await p.render(wrap('<mj-text>Responsive</mj-text>'), {})
      expect(result).toContain('@media')
    })
  })

  describe('compile', () => {
    it('should compile a template and return CompiledTemplate', async () => {
      const p = createProvider()
      const compiled = await p.compile(wrap('<mj-text>Hello {{name}}!</mj-text>'))
      expect(compiled).toBeDefined()
      expect(compiled.id).toMatch(/^mjml-/)
      expect(compiled.source).toContain('mj-text')
      expect(compiled.compiled).toBeInstanceOf(Function)
    })

    it('should generate unique IDs', async () => {
      const p = createProvider()
      const a = await p.compile(wrap('<mj-text>{{a}}</mj-text>'))
      const b = await p.compile(wrap('<mj-text>{{b}}</mj-text>'))
      expect(a.id).not.toBe(b.id)
    })
  })

  describe('renderCompiled', () => {
    it('should render a compiled MJML template', async () => {
      const p = createProvider()
      const compiled = await p.compile(wrap('<mj-text>Hello {{name}}!</mj-text>'))
      const result = p.renderCompiled(compiled, { name: 'World' })
      expect(result).toContain('<!doctype html>')
      expect(result).toContain('Hello World!')
    })

    it('should render compiled template with different data', async () => {
      const p = createProvider()
      const compiled = await p.compile(wrap('<mj-text>Hi {{name}}!</mj-text>'))
      expect(p.renderCompiled(compiled, { name: 'Alice' })).toContain('Hi Alice!')
      expect(p.renderCompiled(compiled, { name: 'Bob' })).toContain('Hi Bob!')
    })
  })

  describe('registerHelper', () => {
    it('should register a helper usable in templates', async () => {
      const p = createProvider()
      p.registerHelper('reverse', (val: unknown): string =>
        String(val).split('').reverse().join(''),
      )
      const result = await p.render(wrap('<mj-text>{{reverse word}}</mj-text>'), { word: 'hello' })
      expect(result).toContain('olleh')
    })
  })

  describe('registerPartial', () => {
    it('should register a partial usable in templates', async () => {
      const p = createProvider()
      p.registerPartial('header', '<mj-text>Welcome {{user}}</mj-text>')
      const result = await p.render(wrap('{{> header}}'), { user: 'Admin' })
      expect(result).toContain('Welcome Admin')
    })
  })

  describe('validation', () => {
    it('should use soft validation by default (render despite errors)', async () => {
      const p = createProvider()
      const result = await p.render(
        '<mjml><mj-body><mj-invalid>test</mj-invalid></mj-body></mjml>',
        {},
      )
      expect(result).toBeDefined()
    })

    it('should throw on strict validation with invalid MJML', async () => {
      const p = createProvider({ validationLevel: 'strict' })
      await expect(
        p.render('<mjml><mj-body><mj-invalid>test</mj-invalid></mj-body></mjml>', {}),
      ).rejects.toThrow()
    })

    it('should skip validation when configured', async () => {
      const p = createProvider({ validationLevel: 'skip' })
      const result = await p.render(
        '<mjml><mj-body><mj-invalid>test</mj-invalid></mj-body></mjml>',
        {},
      )
      expect(result).toBeDefined()
    })
  })

  describe('default provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.render).toBeInstanceOf(Function)
    })

    it('should conform to TemplateProvider interface', () => {
      const p: TemplateProvider = provider
      expect(p.render).toBeInstanceOf(Function)
      expect(p.compile).toBeInstanceOf(Function)
      expect(p.renderCompiled).toBeInstanceOf(Function)
      expect(p.registerHelper).toBeInstanceOf(Function)
      expect(p.registerPartial).toBeInstanceOf(Function)
    })
  })
})
