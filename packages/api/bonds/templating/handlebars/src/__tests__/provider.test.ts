import { describe, expect, it } from 'vitest'

import type { TemplateProvider } from '@molecule/api-templating'

import { createProvider, provider } from '../provider.js'

describe('handlebars template provider', () => {
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
      const result = await p.render('{{shout name}}', { name: 'hello' })
      expect(result).toBe('HELLO')
    })

    it('should register initial partials from config', async () => {
      const p = createProvider({
        partials: {
          greeting: 'Hello {{name}}!',
        },
      })
      const result = await p.render('{{> greeting}}', { name: 'World' })
      expect(result).toBe('Hello World!')
    })
  })

  describe('render', () => {
    it('should render a simple template', async () => {
      const p = createProvider()
      const result = await p.render('Hello {{name}}!', { name: 'World' })
      expect(result).toBe('Hello World!')
    })

    it('should render nested properties', async () => {
      const p = createProvider()
      const result = await p.render('{{user.name}} is {{user.age}}', {
        user: { name: 'Alice', age: 30 },
      })
      expect(result).toBe('Alice is 30')
    })

    it('should HTML-escape output by default', async () => {
      const p = createProvider()
      const result = await p.render('{{content}}', { content: '<script>alert("xss")</script>' })
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    })

    it('should not escape when triple-braces are used', async () => {
      const p = createProvider()
      const result = await p.render('{{{content}}}', { content: '<b>bold</b>' })
      expect(result).toBe('<b>bold</b>')
    })

    it('should not escape when escape option is false', async () => {
      const p = createProvider()
      const result = await p.render('{{content}}', { content: '<b>bold</b>' }, { escape: false })
      expect(result).toBe('<b>bold</b>')
    })

    it('should not escape when config escape is false', async () => {
      const p = createProvider({ escape: false })
      const result = await p.render('{{content}}', { content: '<b>bold</b>' })
      expect(result).toBe('<b>bold</b>')
    })

    it('should handle #each blocks', async () => {
      const p = createProvider()
      const result = await p.render('{{#each items}}{{this}} {{/each}}', {
        items: ['a', 'b', 'c'],
      })
      expect(result).toBe('a b c ')
    })

    it('should handle #if blocks', async () => {
      const p = createProvider()
      const result = await p.render('{{#if show}}visible{{else}}hidden{{/if}}', { show: true })
      expect(result).toBe('visible')
    })

    it('should handle #unless blocks', async () => {
      const p = createProvider()
      const result = await p.render('{{#unless hidden}}visible{{/unless}}', { hidden: false })
      expect(result).toBe('visible')
    })

    it('should handle missing variables gracefully', async () => {
      const p = createProvider()
      const result = await p.render('Hello {{name}}!', {})
      expect(result).toBe('Hello !')
    })

    it('should use per-render helpers', async () => {
      const p = createProvider()
      const result = await p.render('{{whisper name}}', { name: 'HELLO' }, {
        helpers: {
          whisper: (val: unknown): string => String(val).toLowerCase(),
        },
      })
      expect(result).toBe('hello')
    })

    it('should use per-render partials', async () => {
      const p = createProvider()
      const result = await p.render('{{> footer}}', { year: 2026 }, {
        partials: {
          footer: 'Copyright {{year}}',
        },
      })
      expect(result).toBe('Copyright 2026')
    })
  })

  describe('compile', () => {
    it('should compile a template and return CompiledTemplate', async () => {
      const p = createProvider()
      const compiled = await p.compile('Hello {{name}}!')
      expect(compiled).toBeDefined()
      expect(compiled.id).toMatch(/^hbs-/)
      expect(compiled.source).toBe('Hello {{name}}!')
      expect(compiled.compiled).toBeInstanceOf(Function)
    })

    it('should generate unique IDs', async () => {
      const p = createProvider()
      const a = await p.compile('{{a}}')
      const b = await p.compile('{{b}}')
      expect(a.id).not.toBe(b.id)
    })
  })

  describe('renderCompiled', () => {
    it('should render a compiled template', async () => {
      const p = createProvider()
      const compiled = await p.compile('Hello {{name}}!')
      const result = p.renderCompiled(compiled, { name: 'World' })
      expect(result).toBe('Hello World!')
    })

    it('should render compiled template with different data', async () => {
      const p = createProvider()
      const compiled = await p.compile('Hi {{name}}!')
      expect(p.renderCompiled(compiled, { name: 'Alice' })).toBe('Hi Alice!')
      expect(p.renderCompiled(compiled, { name: 'Bob' })).toBe('Hi Bob!')
    })

    it('should use registered helpers in compiled templates', async () => {
      const p = createProvider()
      p.registerHelper('upper', (val: unknown): string => String(val).toUpperCase())
      const compiled = await p.compile('{{upper name}}')
      const result = p.renderCompiled(compiled, { name: 'hello' })
      expect(result).toBe('HELLO')
    })

    it('should use registered partials in compiled templates', async () => {
      const p = createProvider()
      p.registerPartial('header', '<h1>{{title}}</h1>')
      const compiled = await p.compile('{{> header}}')
      const result = p.renderCompiled(compiled, { title: 'Test' })
      expect(result).toBe('<h1>Test</h1>')
    })
  })

  describe('registerHelper', () => {
    it('should register a helper usable in templates', async () => {
      const p = createProvider()
      p.registerHelper('reverse', (val: unknown): string =>
        String(val).split('').reverse().join(''),
      )
      const result = await p.render('{{reverse word}}', { word: 'hello' })
      expect(result).toBe('olleh')
    })

    it('should override existing helpers', async () => {
      const p = createProvider({
        helpers: {
          greet: (): string => 'Hello',
        },
      })
      p.registerHelper('greet', (): string => 'Hi')
      const result = await p.render('{{greet}}', {})
      expect(result).toBe('Hi')
    })
  })

  describe('registerPartial', () => {
    it('should register a partial usable in templates', async () => {
      const p = createProvider()
      p.registerPartial('nav', '<nav>{{links}}</nav>')
      const result = await p.render('{{> nav}}', { links: 'Home | About' })
      expect(result).toBe('<nav>Home | About</nav>')
    })

    it('should override existing partials', async () => {
      const p = createProvider({
        partials: {
          footer: 'Old footer',
        },
      })
      p.registerPartial('footer', 'New footer')
      const result = await p.render('{{> footer}}', {})
      expect(result).toBe('New footer')
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
