import { beforeEach, describe, expect, it } from 'vitest'

import { bond, reset } from '@molecule/app-bond'

import { getProvider, hasProvider, requireProvider, setProvider } from '../provider.js'
import type { AIImageGeneratorProvider } from '../types.js'

const stub = (name = 'mock'): AIImageGeneratorProvider => ({ name }) as AIImageGeneratorProvider

describe('ai-image-generator provider singleton', () => {
  beforeEach(() => {
    reset()
  })

  it('starts with no provider bonded', () => {
    expect(hasProvider()).toBe(false)
    expect(getProvider()).toBeNull()
  })

  it('requireProvider throws when nothing is bonded', () => {
    expect(() => requireProvider()).toThrow(/AIImageGenerator provider not configured/)
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

  it('bond("ai-image-generator", p) via @molecule/app-bond is visible through the core accessors', () => {
    // The exact bug this migration fixes: bond() on the shared registry must be
    // observable through the core's own accessors.
    const p = stub()
    bond('ai-image-generator', p)
    expect(hasProvider()).toBe(true)
    expect(getProvider()).toBe(p)
    expect(requireProvider()).toBe(p)
  })
})
