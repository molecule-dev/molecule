import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { CompiledTemplate, TemplateProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let render: typeof ProviderModule.render
let compile: typeof ProviderModule.compile
let renderCompiled: typeof ProviderModule.renderCompiled
let registerHelper: typeof ProviderModule.registerHelper
let registerPartial: typeof ProviderModule.registerPartial

const mockCompiled: CompiledTemplate = {
  id: 'mock-id',
  source: 'Hello {{name}}!',
  compiled: {},
}

const createMockProvider = (overrides?: Partial<TemplateProvider>): TemplateProvider => ({
  render: vi.fn().mockResolvedValue('Hello World!'),
  compile: vi.fn().mockResolvedValue(mockCompiled),
  renderCompiled: vi.fn().mockReturnValue('Hello Fast!'),
  registerHelper: vi.fn(),
  registerPartial: vi.fn(),
  ...overrides,
})

describe('templating provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
    hasProvider = providerModule.hasProvider
    render = providerModule.render
    compile = providerModule.compile
    renderCompiled = providerModule.renderCompiled
    registerHelper = providerModule.registerHelper
    registerPartial = providerModule.registerPartial
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Template provider not configured. Call setProvider() first.',
      )
    })

    it('should return false when no provider is configured', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get provider', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should return true when provider is configured', () => {
      const mockProvider = createMockProvider()
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('convenience functions', () => {
    let mockProvider: TemplateProvider

    beforeEach(() => {
      mockProvider = createMockProvider()
      setProvider(mockProvider)
    })

    it('should delegate render to provider', async () => {
      const data = { name: 'World' }
      const result = await render('Hello {{name}}!', data)
      expect(mockProvider.render).toHaveBeenCalledWith('Hello {{name}}!', data, undefined)
      expect(result).toBe('Hello World!')
    })

    it('should delegate render with options to provider', async () => {
      const data = { name: 'World' }
      const options = { escape: false }
      await render('Hello {{name}}!', data, options)
      expect(mockProvider.render).toHaveBeenCalledWith('Hello {{name}}!', data, options)
    })

    it('should delegate compile to provider', async () => {
      const result = await compile('Hello {{name}}!')
      expect(mockProvider.compile).toHaveBeenCalledWith('Hello {{name}}!')
      expect(result).toBe(mockCompiled)
    })

    it('should delegate renderCompiled to provider', () => {
      const data = { name: 'Fast' }
      const result = renderCompiled(mockCompiled, data)
      expect(mockProvider.renderCompiled).toHaveBeenCalledWith(mockCompiled, data)
      expect(result).toBe('Hello Fast!')
    })

    it('should delegate registerHelper to provider', () => {
      const fn = (val: unknown): string => String(val).toUpperCase()
      registerHelper('uppercase', fn)
      expect(mockProvider.registerHelper).toHaveBeenCalledWith('uppercase', fn)
    })

    it('should delegate registerPartial to provider', () => {
      registerPartial('header', '<header>{{title}}</header>')
      expect(mockProvider.registerPartial).toHaveBeenCalledWith(
        'header',
        '<header>{{title}}</header>',
      )
    })
  })

  describe('error handling', () => {
    it('should throw on render when no provider is set', async () => {
      await expect(render('test', {})).rejects.toThrow(
        'Template provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on compile when no provider is set', async () => {
      await expect(compile('test')).rejects.toThrow(
        'Template provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on renderCompiled when no provider is set', () => {
      expect(() => renderCompiled(mockCompiled, {})).toThrow(
        'Template provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on registerHelper when no provider is set', () => {
      expect(() => registerHelper('test', () => '')).toThrow(
        'Template provider not configured. Call setProvider() first.',
      )
    })

    it('should throw on registerPartial when no provider is set', () => {
      expect(() => registerPartial('test', '')).toThrow(
        'Template provider not configured. Call setProvider() first.',
      )
    })
  })
})
