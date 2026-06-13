/**
 * Tests for deterministic auto-tip selection.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { CHAT_TIPS, selectTip, TIP_INTERVAL } from '../components/chat-tips-utilities.js'

describe('selectTip', () => {
  it('is deterministic — the same index always returns the same tip', () => {
    for (let i = 0; i < 20; i++) {
      expect(selectTip(i)).toBe(selectTip(i))
    }
  })

  it('returns the first tip on a fresh conversation (slot 0)', () => {
    expect(selectTip(0)).toBe(CHAT_TIPS[0])
  })

  it('cycles through every tip via modulo', () => {
    for (let i = 0; i < CHAT_TIPS.length * 3; i++) {
      expect(selectTip(i)).toBe(CHAT_TIPS[i % CHAT_TIPS.length])
    }
  })

  it('clamps non-finite or negative indices to slot 0', () => {
    expect(selectTip(-1)).toBe(CHAT_TIPS[0])
    expect(selectTip(-100)).toBe(CHAT_TIPS[0])
    expect(selectTip(Number.NaN)).toBe(CHAT_TIPS[0])
    expect(selectTip(Number.POSITIVE_INFINITY)).toBe(CHAT_TIPS[0])
  })

  it('floors fractional indices', () => {
    expect(selectTip(1.9)).toBe(selectTip(1))
  })

  it('covers the core efficiency features', () => {
    const ids = CHAT_TIPS.map((t) => t.id)
    expect(ids).toEqual(expect.arrayContaining(['mention', 'slash', 'plan', 'undo', 'compact']))
  })
})

describe('TIP_INTERVAL', () => {
  it('is a sensible positive cadence', () => {
    expect(TIP_INTERVAL).toBeGreaterThan(0)
    expect(Number.isInteger(TIP_INTERVAL)).toBe(true)
  })
})
