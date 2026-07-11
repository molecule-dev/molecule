import { beforeEach, describe, expect, it } from 'vitest'

import { configure, reset } from '@molecule/api-bond'

import {
  getProvider,
  getProviderByName,
  hasProvider,
  requireProvider,
  setProvider,
} from '../provider.js'
import type { AISummarizationProvider } from '../types.js'

const stubSummarizer = (name = 'custom'): AISummarizationProvider => ({
  name,
  async summarize() {
    return { summary: `stub:${name}` }
  },
})

describe('ai-summarization provider accessor (api-bond registry)', () => {
  beforeEach(() => {
    reset()
    configure({ strict: false, verbose: false })
  })

  it('starts with no provider bonded', () => {
    expect(hasProvider()).toBe(false)
    expect(getProvider()).toBeNull()
  })

  it('requireProvider throws when nothing is bonded', () => {
    expect(() => requireProvider()).toThrow(/not configured/)
  })

  it('setProvider then getProvider round-trips through the registry', () => {
    const p = stubSummarizer()
    setProvider(p)
    expect(getProvider()).toBe(p)
    expect(requireProvider()).toBe(p)
    expect(hasProvider()).toBe(true)
  })

  it('supports named providers via the registry', () => {
    const p = stubSummarizer('fast')
    setProvider('fast', p)
    expect(getProviderByName('fast')).toBe(p)
    // First named registration also fills the singleton fallback.
    expect(getProvider()).toBe(p)
  })
})
