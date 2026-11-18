/**
 * Unit tests for the cryptographic password-generation utilities.
 *
 * Validates: length clamping, charset assembly (incl. `noSimilar` and
 * `noAmbiguous` filters), reliance on `crypto.getRandomValues`, and
 * that no two adjacent generated passwords match.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

import {
  buildCharset,
  clampLength,
  DEFAULT_CHARSET,
  generatePassword,
  MAX_LENGTH,
  MIN_LENGTH,
} from '../generator.js'

describe('clampLength', () => {
  it('clamps below MIN_LENGTH up to MIN_LENGTH', () => {
    expect(clampLength(0)).toBe(MIN_LENGTH)
    expect(clampLength(-9)).toBe(MIN_LENGTH)
  })

  it('clamps above MAX_LENGTH down to MAX_LENGTH', () => {
    expect(clampLength(1000)).toBe(MAX_LENGTH)
  })

  it('passes valid integers through unchanged', () => {
    expect(clampLength(20)).toBe(20)
  })

  it('floors fractional inputs', () => {
    expect(clampLength(20.7)).toBe(20)
  })

  it('returns MIN_LENGTH for non-finite inputs (NaN, Infinity)', () => {
    expect(clampLength(Number.NaN)).toBe(MIN_LENGTH)
    expect(clampLength(Infinity)).toBe(MIN_LENGTH)
    expect(clampLength(-Infinity)).toBe(MIN_LENGTH)
  })
})

describe('buildCharset', () => {
  it('includes all classes by default', () => {
    const pool = buildCharset(DEFAULT_CHARSET)
    expect(pool).toMatch(/[A-Z]/)
    expect(pool).toMatch(/[a-z]/)
    expect(pool).toMatch(/[0-9]/)
    expect(pool).toMatch(/[!@#$%]/)
  })

  it('respects individual toggles being off', () => {
    const pool = buildCharset({
      ...DEFAULT_CHARSET,
      uppercase: false,
      symbols: false,
    })
    expect(pool).not.toMatch(/[A-Z]/)
    expect(pool).not.toMatch(/[!@#$%^&*]/)
    expect(pool).toMatch(/[a-z]/)
    expect(pool).toMatch(/[0-9]/)
  })

  it('falls back to lowercase + digits when every inclusion toggle is off', () => {
    const pool = buildCharset({
      ...DEFAULT_CHARSET,
      uppercase: false,
      lowercase: false,
      digits: false,
      symbols: false,
    })
    expect(pool).toMatch(/[a-z]/)
    expect(pool).toMatch(/[0-9]/)
  })

  it('strips similar glyphs when noSimilar is on', () => {
    const pool = buildCharset({ ...DEFAULT_CHARSET, noSimilar: true })
    for (const c of '0Oo1lI') {
      expect(pool).not.toContain(c)
    }
  })

  it('strips ambiguous specials when noAmbiguous is on', () => {
    const pool = buildCharset({ ...DEFAULT_CHARSET, noAmbiguous: true })
    for (const c of [' ', "'", '"', '`', '~']) {
      expect(pool).not.toContain(c)
    }
  })

  it('produces a deduplicated pool', () => {
    const pool = buildCharset(DEFAULT_CHARSET)
    expect(new Set(pool).size).toBe(pool.length)
  })
})

describe('generatePassword', () => {
  it('returns a string of the requested length', () => {
    const pw = generatePassword(20, DEFAULT_CHARSET)
    expect(pw).toHaveLength(20)
  })

  it('clamps length to the [MIN, MAX] range', () => {
    expect(generatePassword(0, DEFAULT_CHARSET)).toHaveLength(MIN_LENGTH)
    expect(generatePassword(1000, DEFAULT_CHARSET)).toHaveLength(MAX_LENGTH)
  })

  it('produces only characters from the requested pool', () => {
    const charset = {
      ...DEFAULT_CHARSET,
      uppercase: false,
      symbols: false,
      noSimilar: true,
    }
    const pool = new Set(buildCharset(charset))
    const pw = generatePassword(64, charset)
    for (const c of pw) {
      expect(pool.has(c)).toBe(true)
    }
  })

  it('honors noSimilar — none of 0/O/o/1/l/I appear', () => {
    const pw = generatePassword(64, { ...DEFAULT_CHARSET, noSimilar: true })
    for (const c of pw) {
      expect('0Oo1lI').not.toContain(c)
    }
  })

  it('honors noAmbiguous — no spaces, quotes, backticks, tildes', () => {
    const pw = generatePassword(64, { ...DEFAULT_CHARSET, noAmbiguous: true })
    for (const c of pw) {
      expect([' ', "'", '"', '`', '~']).not.toContain(c)
    }
  })

  it('regenerates a different password each call (sanity)', () => {
    const a = generatePassword(32, DEFAULT_CHARSET)
    const b = generatePassword(32, DEFAULT_CHARSET)
    expect(a).not.toBe(b)
  })

  it('uses crypto.getRandomValues — never Math.random', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues')
    const mathSpy = vi.spyOn(Math, 'random')
    generatePassword(16, DEFAULT_CHARSET)
    expect(spy).toHaveBeenCalled()
    expect(mathSpy).not.toHaveBeenCalled()
    spy.mockRestore()
    mathSpy.mockRestore()
  })
})
