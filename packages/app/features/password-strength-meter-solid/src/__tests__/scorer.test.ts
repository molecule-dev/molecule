import { describe, expect, it } from 'vitest'

import { COMMON_PASSWORDS, scorePassword } from '../scorer.js'

describe('COMMON_PASSWORDS', () => {
  it('contains a non-empty list of known leaked passwords', () => {
    expect(COMMON_PASSWORDS.length).toBeGreaterThan(20)
  })

  it('includes the canonical worst offenders', () => {
    expect(COMMON_PASSWORDS).toContain('password')
    expect(COMMON_PASSWORDS).toContain('123456')
    expect(COMMON_PASSWORDS).toContain('qwerty')
    expect(COMMON_PASSWORDS).toContain('admin')
  })

  it('every entry is lowercase (case-folded for case-insensitive match)', () => {
    for (const p of COMMON_PASSWORDS) {
      expect(p).toBe(p.toLowerCase())
    }
  })
})

describe('scorePassword — empty input', () => {
  it('returns score 0 + 0 entropy + all-false checklist (except noCommon)', () => {
    const r = scorePassword('')
    expect(r.score).toBe(0)
    expect(r.entropyBits).toBe(0)
    expect(r.checklist.length).toBe(false)
    expect(r.checklist.upper).toBe(false)
    expect(r.checklist.lower).toBe(false)
    expect(r.checklist.digit).toBe(false)
    expect(r.checklist.symbol).toBe(false)
    expect(r.checklist.noCommon).toBe(true) // empty contains nothing
  })
})

describe('scorePassword — checklist correctness', () => {
  it('length flag triggers at ≥12 chars', () => {
    expect(scorePassword('a'.repeat(11)).checklist.length).toBe(false)
    expect(scorePassword('a'.repeat(12)).checklist.length).toBe(true)
  })

  it('upper / lower / digit / symbol flags', () => {
    expect(scorePassword('abc').checklist.lower).toBe(true)
    expect(scorePassword('abc').checklist.upper).toBe(false)
    expect(scorePassword('ABC').checklist.upper).toBe(true)
    expect(scorePassword('abc123').checklist.digit).toBe(true)
    expect(scorePassword('abc!').checklist.symbol).toBe(true)
    expect(scorePassword('abc').checklist.symbol).toBe(false)
  })

  it('noCommon=false when password contains a known-leak substring', () => {
    expect(scorePassword('mypassword42').checklist.noCommon).toBe(false)
    expect(scorePassword('qwerty12345').checklist.noCommon).toBe(false)
  })

  it('noCommon=true for high-entropy random-looking strings', () => {
    expect(scorePassword('Tr0ub4dor&3xy!').checklist.noCommon).toBe(true)
  })
})

describe('scorePassword — score buckets (entropy thresholds)', () => {
  it('score 0 for very short passwords (< 6 chars), even with character diversity', () => {
    expect(scorePassword('aB1!').score).toBe(0) // 4 chars
    expect(scorePassword('aB1!2').score).toBe(0) // 5 chars
  })

  it('score 1 (weak) for moderate-length all-lowercase', () => {
    // 8 lowercase chars: 8 * log2(26) ≈ 37.6 bits → bucket 2 at ≥36
    // Use 7 chars: 7 * log2(26) ≈ 32.9 → bucket 1 at ≥28
    expect(scorePassword('abcdefg').score).toBe(1)
  })

  it('score 2 (fair) at ≥36 bits', () => {
    // 8 chars lower+digit pool 36 → ~41 bits. Choose a non-dictionary
    // mix so the common-password penalty doesn't fire.
    expect(scorePassword('xfqz9wnh').score).toBe(2)
  })

  it('score 3 (good) at ≥60 bits', () => {
    // 13 chars across upper+lower+digit pool 62 → ~77 bits.
    // Non-dictionary string.
    expect(scorePassword('XfQz9wNhPmR4j').score).toBeGreaterThanOrEqual(3)
  })

  it('score 4 (strong) at ≥80 bits', () => {
    // 14 chars across all 4 classes → pool 94, entropy ~91 bits
    expect(scorePassword('Tr0ub4dor&3XyZ').score).toBe(4)
  })
})

describe('scorePassword — common-password penalty', () => {
  it('caps score at 1 when password matches a common dictionary entry', () => {
    expect(scorePassword('Password1!').score).toBeLessThanOrEqual(1)
  })

  it('forces score to 0 when ≤8 chars AND contains common substring', () => {
    expect(scorePassword('admin!').score).toBe(0)
    expect(scorePassword('letmein').score).toBe(0)
  })

  it('penalises even when the password also has diverse classes', () => {
    // 'Iloveyou1!' is 10 chars with all 4 classes (entropy ~65 bits = bucket 3)
    // but contains 'iloveyou' → capped at 1.
    expect(scorePassword('Iloveyou1!').score).toBeLessThanOrEqual(1)
  })

  it('bigram match: derivatives like "passw0rd2024" still flagged', () => {
    expect(scorePassword('passw0rd2024').checklist.noCommon).toBe(false)
  })

  it('case-insensitive match: "PASSWORD" still flagged', () => {
    expect(scorePassword('PASSWORD123').checklist.noCommon).toBe(false)
  })

  it('does NOT flag innocuous substrings that happen to overlap', () => {
    // Random high-entropy phrase that shouldn't trigger the dictionary.
    expect(scorePassword('NebulaQuilt7$Fox').checklist.noCommon).toBe(true)
  })
})

describe('scorePassword — entropyBits', () => {
  it('returns 0 for empty', () => {
    expect(scorePassword('').entropyBits).toBe(0)
  })

  it('returns a positive finite number for any non-empty input', () => {
    const out = scorePassword('aB1!aB1!')
    expect(out.entropyBits).toBeGreaterThan(0)
    expect(Number.isFinite(out.entropyBits)).toBe(true)
  })

  it('longer passwords with identical pool size yield higher entropy', () => {
    const a = scorePassword('abcdefgh').entropyBits
    const b = scorePassword('abcdefghij').entropyBits
    expect(b).toBeGreaterThan(a)
  })

  it('larger pool size (more classes) yields higher entropy at fixed length', () => {
    const onlyLower = scorePassword('aaaaaaaa').entropyBits
    const allFour = scorePassword('aB1!aB1!').entropyBits
    expect(allFour).toBeGreaterThan(onlyLower)
  })
})

describe('scorePassword — return-shape invariants', () => {
  it('score is always in {0,1,2,3,4}', () => {
    const inputs = ['', 'a', 'aB1!aB1!', 'Tr0ub4dor&3XyZ', 'password']
    for (const p of inputs) {
      const { score } = scorePassword(p)
      expect([0, 1, 2, 3, 4]).toContain(score)
    }
  })

  it('checklist always has all 6 keys (no undefined)', () => {
    const out = scorePassword('something')
    expect(Object.keys(out.checklist).sort()).toEqual([
      'digit',
      'length',
      'lower',
      'noCommon',
      'symbol',
      'upper',
    ])
  })
})
