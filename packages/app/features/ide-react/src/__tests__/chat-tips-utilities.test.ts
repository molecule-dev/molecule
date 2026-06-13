/**
 * Tests for deterministic auto-tip selection.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  CHAT_TIPS,
  pickIdleTip,
  selectTip,
  shouldShowIdleTip,
  TIP_COOLDOWN_MS,
  TIP_IDLE_MS,
  TIP_IDLE_PROBABILITY,
  TIP_MIN_MESSAGES,
} from '../components/chat-tips-utilities.js'

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

describe('shouldShowIdleTip', () => {
  const idle = TIP_IDLE_MS + 1
  const cooled = TIP_COOLDOWN_MS + 1
  const pass = TIP_IDLE_PROBABILITY - 0.01

  it('never tips before the conversation has real history (no first-prompt tip)', () => {
    expect(
      shouldShowIdleTip({ messageCount: 0, msSinceLastActivity: idle, msSinceLastTip: cooled }, 0),
    ).toBe(false)
    expect(
      shouldShowIdleTip(
        { messageCount: TIP_MIN_MESSAGES - 1, msSinceLastActivity: idle, msSinceLastTip: cooled },
        0,
      ),
    ).toBe(false)
  })

  it('never tips until the conversation has been idle a while', () => {
    expect(
      shouldShowIdleTip(
        {
          messageCount: TIP_MIN_MESSAGES,
          msSinceLastActivity: TIP_IDLE_MS - 1,
          msSinceLastTip: cooled,
        },
        0,
      ),
    ).toBe(false)
  })

  it('respects the cooldown so tips never pile up', () => {
    expect(
      shouldShowIdleTip(
        {
          messageCount: TIP_MIN_MESSAGES,
          msSinceLastActivity: idle,
          msSinceLastTip: TIP_COOLDOWN_MS - 1,
        },
        0,
      ),
    ).toBe(false)
  })

  it('is probabilistic once allowed — not every idle period', () => {
    const ready = {
      messageCount: TIP_MIN_MESSAGES,
      msSinceLastActivity: idle,
      msSinceLastTip: cooled,
    }
    expect(shouldShowIdleTip(ready, pass)).toBe(true)
    expect(shouldShowIdleTip(ready, TIP_IDLE_PROBABILITY + 0.01)).toBe(false)
  })

  it('treats a never-tipped conversation (Infinity gap) as cooldown-elapsed', () => {
    expect(
      shouldShowIdleTip(
        {
          messageCount: TIP_MIN_MESSAGES,
          msSinceLastActivity: idle,
          msSinceLastTip: Number.POSITIVE_INFINITY,
        },
        pass,
      ),
    ).toBe(true)
  })
})

describe('pickIdleTip', () => {
  it('returns a real tip from the pool', () => {
    expect(CHAT_TIPS).toContain(pickIdleTip([], 0))
  })

  it('prefers a tip not yet shown', () => {
    const shown = CHAT_TIPS.slice(0, CHAT_TIPS.length - 1).map((t) => t.id)
    expect(pickIdleTip(shown, 0)).toBe(CHAT_TIPS[CHAT_TIPS.length - 1])
  })

  it('falls back to the full pool once every tip has been shown', () => {
    const all = CHAT_TIPS.map((t) => t.id)
    expect(CHAT_TIPS).toContain(pickIdleTip(all, 0.5))
  })

  it('clamps out-of-range or non-finite random rolls', () => {
    expect(CHAT_TIPS).toContain(pickIdleTip([], 1))
    expect(CHAT_TIPS).toContain(pickIdleTip([], -1))
    expect(CHAT_TIPS).toContain(pickIdleTip([], Number.NaN))
  })
})
