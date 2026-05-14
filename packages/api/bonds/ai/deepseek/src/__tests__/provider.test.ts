import { describe, expect, it } from 'vitest'

import { createProvider, DeepseekAIProvider } from '../provider.js'

// DeepSeek is currently a stub scaffold — no API wiring yet — so these
// tests pin the scaffold contract (factory shape + provider name) that the
// eventual implementation must preserve.
describe('createProvider (deepseek scaffold)', () => {
  it('returns a DeepseekAIProvider instance', () => {
    expect(createProvider()).toBeInstanceOf(DeepseekAIProvider)
  })

  it('exposes the provider name "deepseek"', () => {
    expect(createProvider().name).toBe('deepseek')
  })

  it('accepts a config object without throwing', () => {
    expect(createProvider({ apiKey: 'k', baseUrl: 'https://x.test' }).name).toBe('deepseek')
  })
})
