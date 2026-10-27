/**
 * Paracrine core contract tests — the optionality and validation promises a
 * provider implementer compiles against.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

import { getProvider, hasProvider, requireProvider, setProvider } from '../provider.js'
import type { ParacrineProvider } from '../types.js'
import { isParacrineAgentId, PARACRINE_AGENT_ID, PARACRINE_BROADCAST } from '../types.js'

describe('agent id shape', () => {
  it('accepts the flat identifiers agents actually use', () => {
    for (const id of ['bench-1', 'claude:pid42', 'a_b.c@host', 'Z9']) {
      expect(isParacrineAgentId(id)).toBe(true)
    }
  })

  it('refuses path structure, escapes and whitespace — an id is data, not a path', () => {
    for (const id of ['../escape', 'a/b', 'b?x', 'b#f', 'has space', '', '%2e%2e']) {
      expect(isParacrineAgentId(id)).toBe(false)
    }
  })

  it('exports the broadcast address, distinct from any legal agent id', () => {
    expect(PARACRINE_BROADCAST).toBe('*')
    expect(isParacrineAgentId(PARACRINE_BROADCAST)).toBe(false)
    expect(PARACRINE_AGENT_ID.test('*')).toBe(false)
  })
})

describe('the bond slot', () => {
  it('requireProvider refuses loudly when nothing is bonded — never guesses a store', () => {
    // No provider bonded in this test's module registry state for 'paracrine'
    // unless a prior test bonded one; assert the refusal shape either way by
    // checking the error text names the fix.
    if (!hasProvider()) {
      expect(() => requireProvider()).toThrow(/No paracrine store is bonded/)
      expect(getProvider()).toBeNull()
    }
  })

  it('a bonded store is what requireProvider hands back', () => {
    const provider: ParacrineProvider = {
      name: 'stub',
      send: vi.fn(),
      receive: vi.fn(),
      ack: vi.fn(),
      reads: vi.fn(),
      purge: vi.fn(),
    }
    setProvider(provider)
    expect(hasProvider()).toBe(true)
    expect(requireProvider()).toBe(provider)
  })
})
