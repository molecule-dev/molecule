import { describe, expect, it } from 'vitest'

import { clamp, lerpRgba, parseCssColor } from '../color.js'

describe('parseCssColor — keywords', () => {
  it('parses "transparent" → fully transparent black', () => {
    expect(parseCssColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 })
  })

  it('parses "black"', () => {
    expect(parseCssColor('black')).toEqual({ r: 0, g: 0, b: 0, a: 255 })
  })

  it('parses "white"', () => {
    expect(parseCssColor('white')).toEqual({ r: 255, g: 255, b: 255, a: 255 })
  })

  it('is case-insensitive for keywords', () => {
    expect(parseCssColor('BLACK')).toEqual({ r: 0, g: 0, b: 0, a: 255 })
    expect(parseCssColor('  WHITE  ')).toEqual({ r: 255, g: 255, b: 255, a: 255 })
  })

  it('returns null for empty / unknown input', () => {
    expect(parseCssColor('')).toBeNull()
    expect(parseCssColor('rebeccapurple')).toBeNull()
    expect(parseCssColor('garbage')).toBeNull()
  })
})

describe('parseCssColor — hex', () => {
  it('parses #rrggbb', () => {
    expect(parseCssColor('#FF8800')).toEqual({ r: 255, g: 136, b: 0, a: 255 })
  })

  it('parses #rrggbbaa', () => {
    expect(parseCssColor('#FF880080')).toEqual({ r: 255, g: 136, b: 0, a: 128 })
  })

  it('expands #rgb shorthand to rrggbb', () => {
    expect(parseCssColor('#F80')).toEqual({ r: 255, g: 136, b: 0, a: 255 })
  })

  it('expands #rgba shorthand', () => {
    expect(parseCssColor('#F808')).toEqual({ r: 255, g: 136, b: 0, a: 136 })
  })

  it('returns null for invalid hex lengths', () => {
    expect(parseCssColor('#12')).toBeNull() // 2 chars
    expect(parseCssColor('#12345')).toBeNull() // 5 chars
    expect(parseCssColor('#123456789')).toBeNull() // 9 chars
  })

  it('lowercases hex (regression — case insensitive)', () => {
    expect(parseCssColor('#ff8800')).toEqual({ r: 255, g: 136, b: 0, a: 255 })
  })
})

describe('parseCssColor — rgb()/rgba() function', () => {
  it('parses rgb() with integer channels', () => {
    expect(parseCssColor('rgb(255, 128, 0)')).toEqual({ r: 255, g: 128, b: 0, a: 255 })
  })

  it('parses rgba() with alpha in [0, 1]', () => {
    expect(parseCssColor('rgba(255, 0, 0, 0.5)')).toEqual({ r: 255, g: 0, b: 0, a: 128 })
  })

  it('parses rgb() with percentage channels', () => {
    expect(parseCssColor('rgb(100%, 50%, 0%)')).toEqual({ r: 255, g: 128, b: 0, a: 255 })
  })

  it('parses rgba() with percentage alpha', () => {
    expect(parseCssColor('rgba(255, 0, 0, 50%)')).toEqual({ r: 255, g: 0, b: 0, a: 128 })
  })

  it('accepts space-separated CSS Color Module L4 syntax', () => {
    expect(parseCssColor('rgb(255 128 0)')).toEqual({ r: 255, g: 128, b: 0, a: 255 })
  })

  it('clamps channel values that exceed 255', () => {
    expect(parseCssColor('rgb(999, 128, 0)')).toEqual({ r: 255, g: 128, b: 0, a: 255 })
  })

  it('clamps negative channel values to 0', () => {
    expect(parseCssColor('rgb(-50, 128, 0)')).toEqual({ r: 0, g: 128, b: 0, a: 255 })
  })

  it('returns null for too-few or too-many channels', () => {
    expect(parseCssColor('rgb(255, 128)')).toBeNull()
    expect(parseCssColor('rgb(1, 2, 3, 4, 5)')).toBeNull()
  })

  it('returns null when a channel cannot be parsed as a number', () => {
    expect(parseCssColor('rgb(red, 128, 0)')).toBeNull()
  })
})

describe('clamp', () => {
  it('returns value when within [lo, hi]', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('returns lo when below', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('returns hi when above', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('returns boundary values inclusively', () => {
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })
})

describe('lerpRgba', () => {
  const black = { r: 0, g: 0, b: 0, a: 255 }
  const white = { r: 255, g: 255, b: 255, a: 255 }

  it('returns a (start) at t=0', () => {
    expect(lerpRgba(black, white, 0)).toEqual(black)
  })

  it('returns b (end) at t=1', () => {
    expect(lerpRgba(black, white, 1)).toEqual(white)
  })

  it('returns midpoint at t=0.5', () => {
    expect(lerpRgba(black, white, 0.5)).toEqual({ r: 128, g: 128, b: 128, a: 255 })
  })

  it('clamps t to [0, 1]', () => {
    expect(lerpRgba(black, white, -0.5)).toEqual(black)
    expect(lerpRgba(black, white, 1.5)).toEqual(white)
  })

  it('interpolates alpha channel along with rgb', () => {
    const opaque = { r: 100, g: 100, b: 100, a: 255 }
    const transparent = { r: 100, g: 100, b: 100, a: 0 }
    expect(lerpRgba(opaque, transparent, 0.5).a).toBe(128)
  })

  it('rounds non-integer channel results', () => {
    const a = { r: 0, g: 0, b: 0, a: 255 }
    const b = { r: 3, g: 0, b: 0, a: 255 }
    // t=0.5 → r=1.5 → rounds to 2
    expect(lerpRgba(a, b, 0.5).r).toBe(2)
  })
})
