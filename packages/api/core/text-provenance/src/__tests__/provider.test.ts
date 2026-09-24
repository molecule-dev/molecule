import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { Attribution, TextProvenanceProvider } from '../types.js'

let mod: typeof ProviderModule

const result: Attribution = { paragraphs: [], words: 0, aiWords: 0, aiShare: 0, prompts: [] }

describe('text provenance provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    mod = await import('../provider.js')
  })

  it('throws a named error when no provider is bonded', () => {
    expect(mod.hasProvider()).toBe(false)
    expect(() => mod.attributeText({ paragraphs: [], sessions: [] })).toThrow(
      'Text provenance provider not configured. Call setProvider() first.',
    )
  })

  it('delegates to the bonded provider', () => {
    const p: TextProvenanceProvider = { attribute: vi.fn(() => result) }
    mod.setProvider(p)
    expect(mod.hasProvider()).toBe(true)
    const input = { paragraphs: ['a'], sessions: [], options: { minAiShare: 0.7 } }
    expect(mod.attributeText(input)).toBe(result)
    expect(p.attribute).toHaveBeenCalledWith(input)
  })
})
