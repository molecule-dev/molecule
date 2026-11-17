import { describe, expect, it } from 'vitest'

import { fuzzyScore } from '../components/quick-picker-utilities.js'

describe('fuzzyScore', () => {
  it('matches the query characters in order, ignoring case', () => {
    expect(fuzzyScore('qo', 'Quick Open')).toBeGreaterThan(0)
    expect(fuzzyScore('QO', 'quick open')).toBe(fuzzyScore('qo', 'quick open'))
  })

  it('returns -1 when a character is missing or out of order', () => {
    expect(fuzzyScore('xyz', 'Quick Open')).toBe(-1)
    expect(fuzzyScore('oq', 'Quick Open')).toBe(-1)
  })

  it('scores an empty query 0, so every item matches', () => {
    expect(fuzzyScore('', 'anything')).toBe(0)
  })

  it('scores consecutive matches and a first-character match higher', () => {
    // q(1+5) u(2) i(3): a run from the label's start.
    expect(fuzzyScore('qui', 'quick')).toBe(11)
    // q(1+5), then the run breaks: k(1).
    expect(fuzzyScore('qk', 'quick')).toBe(7)
    // No first-character bonus: c(1) k(2).
    expect(fuzzyScore('ck', 'quick')).toBe(3)
    expect(fuzzyScore('open', 'Open File')).toBeGreaterThan(
      fuzzyScore('open', 'Toggle Open Editors'),
    )
  })
})
