import { describe, expect, it } from 'vitest'

import { getProvider, hasProvider, requireProvider, setProvider } from '../provider.js'
import type { AgentRuntimeProvider } from '../types.js'

const fake: AgentRuntimeProvider = {
  name: 'test',
  async run() {
    return { exitStatus: 'completed', patch: '', logs: '' }
  },
}

describe('agent-run bond slot', () => {
  it('starts unbonded', () => {
    expect(hasProvider()).toBe(false)
    expect(getProvider()).toBeNull()
    expect(() => requireProvider()).toThrow('Agent runtime provider not configured')
  })

  it('bonds and requires a provider', () => {
    setProvider(fake)
    expect(hasProvider()).toBe(true)
    expect(requireProvider()).toBe(fake)
    expect(getProvider()).toBe(fake)
  })
})
