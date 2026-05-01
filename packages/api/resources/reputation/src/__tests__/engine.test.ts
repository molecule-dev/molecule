/**
 * Pure-engine tests — no database, no I/O.
 *
 * Covers default thresholds, custom thresholds, boundary conditions,
 * edge cases (negative scores, empty thresholds).
 */

import { describe, expect, it } from 'vitest'

import { computeLevel } from '../engine.js'

describe('computeLevel — default thresholds', () => {
  it('returns level 0 for score 0', () => {
    expect(computeLevel(0)).toBe(0)
  })

  it('returns level 0 for score below first non-zero threshold', () => {
    expect(computeLevel(99)).toBe(0)
  })

  it('returns level 1 at first threshold (100)', () => {
    expect(computeLevel(100)).toBe(1)
  })

  it('returns level 1 just below the second threshold', () => {
    expect(computeLevel(499)).toBe(1)
  })

  it('returns level 2 at the second threshold (500)', () => {
    expect(computeLevel(500)).toBe(2)
  })

  it('returns level 3 at 1000', () => {
    expect(computeLevel(1000)).toBe(3)
  })

  it('returns level 4 at 5000', () => {
    expect(computeLevel(5000)).toBe(4)
  })

  it('returns the highest level for very large scores', () => {
    expect(computeLevel(1_000_000)).toBe(4)
  })

  it('clamps negative scores to level 0', () => {
    expect(computeLevel(-50)).toBe(0)
  })
})

describe('computeLevel — custom thresholds', () => {
  it('uses custom ascending thresholds', () => {
    const thresholds = [0, 10, 20, 30]
    expect(computeLevel(0, thresholds)).toBe(0)
    expect(computeLevel(9, thresholds)).toBe(0)
    expect(computeLevel(10, thresholds)).toBe(1)
    expect(computeLevel(25, thresholds)).toBe(2)
    expect(computeLevel(100, thresholds)).toBe(3)
  })

  it('handles single-threshold curves', () => {
    expect(computeLevel(0, [0])).toBe(0)
    expect(computeLevel(999, [0])).toBe(0)
  })

  it('returns 0 for an empty threshold array', () => {
    expect(computeLevel(500, [])).toBe(0)
  })
})
