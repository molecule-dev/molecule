import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { AIImageGenerationProvider } from '../types.js'

let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider
let hasProvider: typeof ProviderModule.hasProvider
let requireProvider: typeof ProviderModule.requireProvider

const stub = (name = 'mock'): AIImageGenerationProvider =>
  ({ name, generate: async () => ({ images: [] }) }) as unknown as AIImageGenerationProvider

describe('ai-image-generation provider singleton', () => {
  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../provider.js')
    setProvider = mod.setProvider
    getProvider = mod.getProvider
    hasProvider = mod.hasProvider
    requireProvider = mod.requireProvider
  })

  it('starts with no provider bonded', () => {
    expect(hasProvider()).toBe(false)
    expect(getProvider()).toBeNull()
  })

  it('requireProvider throws when nothing is bonded', () => {
    expect(() => requireProvider()).toThrow(/AIImageGeneration provider not configured/)
  })

  it('setProvider then getProvider returns the bonded instance', () => {
    const p = stub()
    setProvider(p)
    expect(getProvider()).toBe(p)
    expect(hasProvider()).toBe(true)
  })

  it('requireProvider returns the bonded instance', () => {
    const p = stub()
    setProvider(p)
    expect(requireProvider()).toBe(p)
  })

  it('setProvider replaces the previous provider', () => {
    const a = stub('a')
    const b = stub('b')
    setProvider(a)
    setProvider(b)
    expect(getProvider()).toBe(b)
  })

  it('state is module-singleton (persists within a module instance)', () => {
    const p = stub()
    setProvider(p)
    expect(getProvider()).toBe(p)
    expect(getProvider()).toBe(p)
  })
})
