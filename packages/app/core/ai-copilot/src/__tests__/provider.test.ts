import { beforeEach, describe, expect, it } from 'vitest'

import { bond, reset } from '@molecule/app-bond'

import { getProvider, hasProvider, requireProvider, setProvider } from '../provider.js'
import type { AICopilotProvider } from '../types.js'

const mockProvider: AICopilotProvider = {
  name: 'test',
  getSuggestions: async () => {},
  acceptSuggestion: async () => {},
  rejectSuggestion: async () => {},
  abort: () => {},
}

describe('@molecule/app-ai-copilot provider', () => {
  beforeEach(() => {
    reset()
  })

  it('should return null when no provider is set', () => {
    expect(getProvider()).toBeNull()
    expect(hasProvider()).toBe(false)
  })

  it('should throw when requiring absent provider', () => {
    expect(() => requireProvider()).toThrow(/AICopilot provider not configured/)
  })

  it('should set and get provider', () => {
    setProvider(mockProvider)
    expect(getProvider()).toBe(mockProvider)
    expect(hasProvider()).toBe(true)
  })

  it('should require provider when set', () => {
    setProvider(mockProvider)
    expect(requireProvider()).toBe(mockProvider)
  })

  it('should replace the previous provider', () => {
    const mockProviderB: AICopilotProvider = { ...mockProvider, name: 'test-b' }
    setProvider(mockProvider)
    setProvider(mockProviderB)
    expect(getProvider()).toBe(mockProviderB)
  })

  it('bond("ai-copilot", p) via @molecule/app-bond is visible through the core accessors', () => {
    // The exact bug this migration fixes: bond() on the shared registry must be
    // observable through the core's own accessors.
    bond('ai-copilot', mockProvider)
    expect(hasProvider()).toBe(true)
    expect(getProvider()).toBe(mockProvider)
    expect(requireProvider()).toBe(mockProvider)
  })
})
