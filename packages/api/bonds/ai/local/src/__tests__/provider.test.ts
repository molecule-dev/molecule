import { describe, expect, it } from 'vitest'

import { createProvider, LocalAIProvider } from '../provider.js'

// The local provider is currently a stub scaffold — no API wiring yet — so
// these tests pin the scaffold contract (factory shape + provider name) that
// the eventual implementation must preserve.
describe('createProvider (local scaffold)', () => {
  it('returns a LocalAIProvider instance', () => {
    expect(createProvider()).toBeInstanceOf(LocalAIProvider)
  })

  it('exposes the provider name "local"', () => {
    expect(createProvider().name).toBe('local')
  })

  it('accepts a config object without throwing', () => {
    expect(createProvider({ baseUrl: 'http://localhost:11434' }).name).toBe('local')
  })
})
