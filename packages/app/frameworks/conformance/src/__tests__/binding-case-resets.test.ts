import { describe, expect, it, vi } from 'vitest'

import { resetBindingForCase } from '../ui/spec.js'

describe('binding case resets', () => {
  it('runs a core-only binding without any feature reset functions', () => {
    expect(() => resetBindingForCase({})).not.toThrow()
  })

  it('clears the installed chat stores and model cache once per case', () => {
    const resetChatStoresForTests = vi.fn()
    const resetAIModelsCache = vi.fn()

    resetBindingForCase({ resetChatStoresForTests, resetAIModelsCache })

    expect(resetChatStoresForTests).toHaveBeenCalledTimes(1)
    expect(resetAIModelsCache).toHaveBeenCalledTimes(1)
  })
})
