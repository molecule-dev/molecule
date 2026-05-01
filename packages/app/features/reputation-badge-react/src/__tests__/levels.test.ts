/**
 * Unit tests for the pure level-derivation helpers. No DOM, no React.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { colorForLevel, DEFAULT_THRESHOLDS, levelForScore } from '../levels.js'

describe('levelForScore (default thresholds)', () => {
  it('returns "newcomer" for scores below the contributor threshold', () => {
    expect(levelForScore(0)).toBe('newcomer')
    expect(levelForScore(99)).toBe('newcomer')
  })

  it('returns "contributor" at exactly the contributor threshold', () => {
    expect(levelForScore(DEFAULT_THRESHOLDS.contributor)).toBe('contributor')
  })

  it('returns "contributor" between contributor and trusted thresholds', () => {
    expect(levelForScore(250)).toBe('contributor')
    expect(levelForScore(499)).toBe('contributor')
  })

  it('returns "trusted" at exactly the trusted threshold', () => {
    expect(levelForScore(DEFAULT_THRESHOLDS.trusted)).toBe('trusted')
  })

  it('returns "veteran" between veteran and legend thresholds', () => {
    expect(levelForScore(2000)).toBe('veteran')
    expect(levelForScore(9999)).toBe('veteran')
  })

  it('returns "legend" at and above the legend threshold', () => {
    expect(levelForScore(10_000)).toBe('legend')
    expect(levelForScore(1_000_000)).toBe('legend')
  })
})

describe('levelForScore (custom thresholds)', () => {
  it('honors a custom threshold map', () => {
    const t = { contributor: 10, trusted: 20, veteran: 30, legend: 40 }
    expect(levelForScore(5, t)).toBe('newcomer')
    expect(levelForScore(15, t)).toBe('contributor')
    expect(levelForScore(25, t)).toBe('trusted')
    expect(levelForScore(35, t)).toBe('veteran')
    expect(levelForScore(45, t)).toBe('legend')
  })
})

describe('colorForLevel', () => {
  it('maps each level to a stable Badge color', () => {
    expect(colorForLevel('newcomer')).toBe('secondary')
    expect(colorForLevel('contributor')).toBe('info')
    expect(colorForLevel('trusted')).toBe('primary')
    expect(colorForLevel('veteran')).toBe('success')
    expect(colorForLevel('legend')).toBe('warning')
  })
})
