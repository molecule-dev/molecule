import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type { AgentSession, AgentTranscriptReader } from '../types.js'

let mod: typeof ProviderModule

const session: AgentSession = {
  format: 'mock',
  harness: 'Mock',
  turns: [{ role: 'user', text: 'hi', files: [] }],
}
const reader = (): AgentTranscriptReader => ({
  format: 'mock',
  label: 'Mock',
  detect: vi.fn((i) => i.text.startsWith('mock')),
  read: vi.fn(() => session),
})

describe('agent transcript provider', () => {
  beforeEach(async () => {
    vi.resetModules()
    mod = await import('../provider.js')
  })

  it('throws a named error when no reader is bonded', () => {
    expect(mod.hasProvider()).toBe(false)
    expect(() => mod.getProvider()).toThrow(
      'Agent transcript reader not configured. Call setProvider() first.',
    )
    expect(() => mod.readTranscript({ text: 'mock' })).toThrow(/not configured/)
  })

  it('delegates detect and read to the bonded reader', () => {
    const r = reader()
    mod.setProvider(r)
    expect(mod.hasProvider()).toBe(true)
    expect(mod.getProvider()).toBe(r)
    expect(mod.canReadTranscript({ text: 'mock file' })).toBe(true)
    expect(mod.canReadTranscript({ text: 'other' })).toBe(false)
    expect(mod.readTranscript({ text: 'mock file', fileName: 'a.txt' })).toBe(session)
    expect(r.read).toHaveBeenCalledWith({ text: 'mock file', fileName: 'a.txt' })
  })
})
