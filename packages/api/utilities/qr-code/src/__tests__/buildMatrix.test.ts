import { describe, expect, it } from 'vitest'

import { buildMatrix } from '../buildMatrix.js'

describe('buildMatrix', () => {
  it('builds a matrix with module count > 0 for a simple input', () => {
    const matrix = buildMatrix('hello')
    expect(matrix.moduleCount).toBeGreaterThan(0)
  })

  it('returns the requested margin verbatim', () => {
    expect(buildMatrix('hi', 'M', 0).margin).toBe(0)
    expect(buildMatrix('hi', 'M', 4).margin).toBe(4)
    expect(buildMatrix('hi').margin).toBe(2)
  })

  it('exposes a callable isDark function', () => {
    const matrix = buildMatrix('test')
    expect(typeof matrix.isDark).toBe('function')
    // The top-left finder pattern is always dark.
    expect(matrix.isDark(0, 0)).toBe(true)
  })

  it('throws when value is empty', () => {
    expect(() => buildMatrix('')).toThrowError('value must be a non-empty string')
  })

  it('throws when value is not a string', () => {
    expect(() => buildMatrix(123 as unknown as string)).toThrowError(
      'value must be a non-empty string',
    )
    expect(() => buildMatrix(undefined as unknown as string)).toThrowError(
      'value must be a non-empty string',
    )
  })

  it('throws on negative margin', () => {
    expect(() => buildMatrix('hi', 'M', -1)).toThrowError(
      'margin must be a non-negative finite number',
    )
  })

  it('throws on non-finite margin', () => {
    expect(() => buildMatrix('hi', 'M', Infinity)).toThrowError(
      'margin must be a non-negative finite number',
    )
    expect(() => buildMatrix('hi', 'M', NaN)).toThrowError(
      'margin must be a non-negative finite number',
    )
  })

  it('higher EC level produces a larger or equal module count for the same payload', () => {
    const low = buildMatrix('the quick brown fox jumps over the lazy dog', 'L')
    const high = buildMatrix('the quick brown fox jumps over the lazy dog', 'H')
    expect(high.moduleCount).toBeGreaterThanOrEqual(low.moduleCount)
  })

  it('isDark is stable across calls (no internal mutation)', () => {
    const matrix = buildMatrix('stable')
    const a = matrix.isDark(2, 2)
    const b = matrix.isDark(2, 2)
    expect(a).toBe(b)
  })
})
