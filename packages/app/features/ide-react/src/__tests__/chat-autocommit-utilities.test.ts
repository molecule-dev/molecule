/**
 * Tests for the `/autocommit` command parsing and the countdown reducer's
 * arm / reset / tick / fire state machine.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  AUTO_COMMIT_DISABLED,
  autoCommitReducer,
  type AutoCommitState,
  DEFAULT_AUTO_COMMIT_SECONDS,
  formatAutoCommitBadge,
  isAutoCommitArmed,
  isAutoCommitDue,
  isAutoCommitEnabled,
  parseAutoCommitCommand,
  resolveAutoCommitSeconds,
} from '../components/chat-autocommit-utilities.js'
import { COMMANDS } from '../components/chat-commands.js'

describe('parseAutoCommitCommand', () => {
  it('returns null seconds when no argument is given (show usage)', () => {
    expect(parseAutoCommitCommand('/autocommit')).toEqual({ seconds: null })
    expect(parseAutoCommitCommand('  /AutoCommit  ')).toEqual({ seconds: null })
  })

  it('parses a positive cadence', () => {
    expect(parseAutoCommitCommand('/autocommit 30')).toEqual({ seconds: 30 })
    expect(parseAutoCommitCommand('/autocommit 5')).toEqual({ seconds: 5 })
  })

  it('parses 0 as the cancel sentinel', () => {
    expect(parseAutoCommitCommand('/autocommit 0')).toEqual({ seconds: 0 })
  })

  it('returns null for non-autocommit input or non-integer args', () => {
    expect(parseAutoCommitCommand('/autocommitx')).toBeNull()
    expect(parseAutoCommitCommand('/autocommit 1.5')).toBeNull()
    expect(parseAutoCommitCommand('/autocommit -5')).toBeNull()
    expect(parseAutoCommitCommand('autocommit 5')).toBeNull()
  })
})

describe('resolveAutoCommitSeconds — auto-commit is ON by default', () => {
  it('resolves a never-configured setting (undefined/null) to the positive default', () => {
    expect(DEFAULT_AUTO_COMMIT_SECONDS).toBeGreaterThan(0)
    expect(resolveAutoCommitSeconds(undefined)).toBe(DEFAULT_AUTO_COMMIT_SECONDS)
    expect(resolveAutoCommitSeconds(null)).toBe(DEFAULT_AUTO_COMMIT_SECONDS)
  })

  it('respects an explicit off (0 or negative stays 0 — a user choice, never re-defaulted)', () => {
    expect(resolveAutoCommitSeconds(0)).toBe(0)
    expect(resolveAutoCommitSeconds(-5)).toBe(0)
  })

  it('floors an explicit positive cadence to whole seconds', () => {
    expect(resolveAutoCommitSeconds(45)).toBe(45)
    expect(resolveAutoCommitSeconds(12.9)).toBe(12)
  })

  it('falls back to the default for invalid values (non-number, NaN, Infinity)', () => {
    expect(resolveAutoCommitSeconds('30')).toBe(DEFAULT_AUTO_COMMIT_SECONDS)
    expect(resolveAutoCommitSeconds(Number.NaN)).toBe(DEFAULT_AUTO_COMMIT_SECONDS)
    expect(resolveAutoCommitSeconds(Number.POSITIVE_INFINITY)).toBe(DEFAULT_AUTO_COMMIT_SECONDS)
  })
})

describe('autoCommitReducer — set', () => {
  it('arms with a full countdown for a positive cadence', () => {
    expect(autoCommitReducer(AUTO_COMMIT_DISABLED, { type: 'set', seconds: 20 })).toEqual({
      intervalSeconds: 20,
      remaining: 20,
    })
  })

  it('disables on set 0 (cancel), regardless of prior state', () => {
    const armed: AutoCommitState = { intervalSeconds: 20, remaining: 3 }
    expect(autoCommitReducer(armed, { type: 'set', seconds: 0 })).toEqual(AUTO_COMMIT_DISABLED)
    expect(autoCommitReducer(armed, { type: 'set', seconds: -1 })).toEqual(AUTO_COMMIT_DISABLED)
  })

  it('re-arms with the new cadence when changed while running', () => {
    const armed: AutoCommitState = { intervalSeconds: 20, remaining: 4 }
    expect(autoCommitReducer(armed, { type: 'set', seconds: 60 })).toEqual({
      intervalSeconds: 60,
      remaining: 60,
    })
  })
})

describe('autoCommitReducer — hydrate (restore persisted cadence on load)', () => {
  it('restores a positive cadence in the PAUSED state (enabled but not counting down)', () => {
    const s = autoCommitReducer(AUTO_COMMIT_DISABLED, { type: 'hydrate', seconds: 30 })
    expect(s).toEqual({ intervalSeconds: 30, remaining: null })
    // Enabled (badge shows "on") but NOT armed — so reopening a project never
    // auto-commits a tree the user hasn't touched; it re-arms on the next change.
    expect(isAutoCommitEnabled(s)).toBe(true)
    expect(isAutoCommitArmed(s)).toBe(false)
  })

  it('re-arms only on the next file change after hydrating', () => {
    let s = autoCommitReducer(AUTO_COMMIT_DISABLED, { type: 'hydrate', seconds: 15 })
    expect(s.remaining).toBeNull()
    // a tick while paused does nothing (no countdown is running yet)
    expect(autoCommitReducer(s, { type: 'tick' })).toEqual(s)
    // the first file change arms the full countdown
    s = autoCommitReducer(s, { type: 'reset' })
    expect(s).toEqual({ intervalSeconds: 15, remaining: 15 })
  })

  it('treats a non-positive persisted value as off (disabled)', () => {
    expect(autoCommitReducer(AUTO_COMMIT_DISABLED, { type: 'hydrate', seconds: 0 })).toEqual(
      AUTO_COMMIT_DISABLED,
    )
    expect(autoCommitReducer(AUTO_COMMIT_DISABLED, { type: 'hydrate', seconds: -3 })).toEqual(
      AUTO_COMMIT_DISABLED,
    )
  })

  it('does NOT start a countdown, unlike `set` (the load vs. user-action distinction)', () => {
    const hydrated = autoCommitReducer(AUTO_COMMIT_DISABLED, { type: 'hydrate', seconds: 45 })
    const setByUser = autoCommitReducer(AUTO_COMMIT_DISABLED, { type: 'set', seconds: 45 })
    expect(hydrated.remaining).toBeNull() // restored, paused
    expect(setByUser.remaining).toBe(45) // explicit user choice, counting down
  })
})

describe('autoCommitReducer — tick', () => {
  it('decrements toward zero', () => {
    const s: AutoCommitState = { intervalSeconds: 10, remaining: 3 }
    expect(autoCommitReducer(s, { type: 'tick' })).toEqual({ intervalSeconds: 10, remaining: 2 })
  })

  it('floors at zero (the due instant) and does not go negative', () => {
    const zero: AutoCommitState = { intervalSeconds: 10, remaining: 0 }
    expect(autoCommitReducer(zero, { type: 'tick' })).toEqual({ intervalSeconds: 10, remaining: 0 })
  })

  it('is a no-op when disabled or paused (remaining null)', () => {
    expect(autoCommitReducer(AUTO_COMMIT_DISABLED, { type: 'tick' })).toEqual(AUTO_COMMIT_DISABLED)
    const paused: AutoCommitState = { intervalSeconds: 10, remaining: null }
    expect(autoCommitReducer(paused, { type: 'tick' })).toEqual(paused)
  })
})

describe('autoCommitReducer — reset (file change)', () => {
  it('restarts the full countdown when enabled', () => {
    const s: AutoCommitState = { intervalSeconds: 15, remaining: 2 }
    expect(autoCommitReducer(s, { type: 'reset' })).toEqual({ intervalSeconds: 15, remaining: 15 })
  })

  it('re-arms a paused countdown on the next file change', () => {
    const paused: AutoCommitState = { intervalSeconds: 15, remaining: null }
    expect(autoCommitReducer(paused, { type: 'reset' })).toEqual({
      intervalSeconds: 15,
      remaining: 15,
    })
  })

  it('is a no-op when disabled', () => {
    expect(autoCommitReducer(AUTO_COMMIT_DISABLED, { type: 'reset' })).toEqual(AUTO_COMMIT_DISABLED)
  })
})

describe('autoCommitReducer — fired (commit dispatched)', () => {
  it('pauses (remaining null) but keeps the cadence so a clean tree is not re-committed', () => {
    const due: AutoCommitState = { intervalSeconds: 15, remaining: 0 }
    expect(autoCommitReducer(due, { type: 'fired' })).toEqual({
      intervalSeconds: 15,
      remaining: null,
    })
  })

  it('is a no-op when disabled', () => {
    expect(autoCommitReducer(AUTO_COMMIT_DISABLED, { type: 'fired' })).toEqual(AUTO_COMMIT_DISABLED)
  })
})

describe('full debounce cycle', () => {
  it('arms → resets on each change → ticks to zero → fires → pauses → re-arms on next change', () => {
    let s = autoCommitReducer(AUTO_COMMIT_DISABLED, { type: 'set', seconds: 3 })
    expect(s.remaining).toBe(3)
    // a change mid-countdown restarts the timer
    s = autoCommitReducer({ ...s, remaining: 1 }, { type: 'reset' })
    expect(s.remaining).toBe(3)
    // idle ticks to zero
    s = autoCommitReducer(s, { type: 'tick' })
    s = autoCommitReducer(s, { type: 'tick' })
    s = autoCommitReducer(s, { type: 'tick' })
    expect(isAutoCommitDue(s)).toBe(true)
    // component fires /commit then dispatches fired → paused
    s = autoCommitReducer(s, { type: 'fired' })
    expect(isAutoCommitArmed(s)).toBe(false)
    expect(isAutoCommitEnabled(s)).toBe(true)
    // a tick while paused does nothing (no re-fire on clean tree)
    expect(autoCommitReducer(s, { type: 'tick' })).toEqual(s)
    // the next file change re-arms
    s = autoCommitReducer(s, { type: 'reset' })
    expect(s.remaining).toBe(3)
  })
})

describe('predicates and badge formatting', () => {
  it('isAutoCommitEnabled reflects the cadence', () => {
    expect(isAutoCommitEnabled(AUTO_COMMIT_DISABLED)).toBe(false)
    expect(isAutoCommitEnabled({ intervalSeconds: 5, remaining: null })).toBe(true)
  })

  it('isAutoCommitArmed reflects an active countdown', () => {
    expect(isAutoCommitArmed({ intervalSeconds: 5, remaining: 2 })).toBe(true)
    expect(isAutoCommitArmed({ intervalSeconds: 5, remaining: null })).toBe(false)
  })

  it('formatAutoCommitBadge shows seconds while counting and nothing when paused/off', () => {
    expect(formatAutoCommitBadge({ intervalSeconds: 5, remaining: 3 })).toBe('3s')
    expect(formatAutoCommitBadge({ intervalSeconds: 5, remaining: 0 })).toBe('0s')
    expect(formatAutoCommitBadge({ intervalSeconds: 5, remaining: null })).toBe('')
    expect(formatAutoCommitBadge(AUTO_COMMIT_DISABLED)).toBe('')
  })
})

describe('command registry wiring', () => {
  it('registers /autocommit under the code category', () => {
    const cmd = COMMANDS.find((c) => c.id === 'autocommit')
    expect(cmd).toMatchObject({
      label: '/autocommit',
      category: 'code',
      usage: '/autocommit <seconds>',
    })
  })
})
