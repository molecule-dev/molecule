import { beforeEach, describe, expect, it } from 'vitest'

import { configure, reset } from '@molecule/api-bond'

import {
  getAllProviders,
  getProvider,
  getProviderByName,
  hasProvider,
  requireProvider,
  setProvider,
} from '../provider.js'
import type { AIClassificationProvider, ClassifyResult } from '../types.js'

// ---------------------------------------------------------------------------
// Stub provider — the core defines the contract only, so tests bond a stub
// implementation of AIClassificationProvider (the real impl lives in the
// @molecule/api-ai-classification-llm bond package).
// ---------------------------------------------------------------------------

const makeStub = (name: string): AIClassificationProvider => ({
  name,
  async classify(): Promise<ClassifyResult> {
    return { labels: [{ label: 'spam', score: 1 }], top: 'spam' }
  },
})

const stubA = makeStub('stub-a')
const stubB = makeStub('stub-b')

describe('ai-classification bond accessor', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('requireProvider throws when nothing is bonded', () => {
    expect(hasProvider()).toBe(false)
    expect(getProvider()).toBeNull()
    expect(() => requireProvider()).toThrow(/not configured/i)
  })

  it('setProvider(provider) registers a singleton and round-trips', async () => {
    setProvider(stubA)
    expect(hasProvider()).toBe(true)
    expect(getProvider()).toBe(stubA)
    expect(requireProvider()).toBe(stubA)

    const result = await requireProvider().classify({ text: 'x', labels: ['spam', 'ham'] })
    expect(result.top).toBe('spam')
  })

  it('setProvider(name, provider) registers a named provider + singleton fallback', () => {
    setProvider('stub-a', stubA)
    expect(getProviderByName('stub-a')).toBe(stubA)
    // First named registration auto-fills the singleton fallback.
    expect(getProvider()).toBe(stubA)
    expect(hasProvider('stub-a')).toBe(true)
  })

  it('does not overwrite the singleton when a second named provider is added', () => {
    setProvider('stub-a', stubA)
    setProvider('stub-b', stubB)
    expect(getProvider()).toBe(stubA)
    expect(getAllProviders().size).toBe(2)
    expect(getProviderByName('stub-b')).toBe(stubB)
  })
})
