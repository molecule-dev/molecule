import { describe, expect, it } from 'vitest'

import { createProvider, GoogleAIProvider } from '../provider.js'

// Google is currently a stub scaffold — no API wiring yet — so these tests
// pin the scaffold contract (factory shape + provider name) that the
// eventual implementation must preserve.
describe('createProvider (google scaffold)', () => {
  it('returns a GoogleAIProvider instance', () => {
    expect(createProvider()).toBeInstanceOf(GoogleAIProvider)
  })

  it('exposes the provider name "google"', () => {
    expect(createProvider().name).toBe('google')
  })

  it('accepts a config object without throwing', () => {
    expect(createProvider({ apiKey: 'k', baseUrl: 'https://x.test' }).name).toBe('google')
  })
})

describe('secret registration', () => {
  it('registers GOOGLE_AI_API_KEY in the @molecule/api-secrets registry', async () => {
    await import('../index.js')
    const { getSecretDefinition } = await import('@molecule/api-secrets')
    expect(getSecretDefinition('GOOGLE_AI_API_KEY')).toBeDefined()
  })
})
