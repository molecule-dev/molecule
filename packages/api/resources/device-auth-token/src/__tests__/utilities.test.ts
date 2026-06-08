/**
 * Tests for the device auth token utilities (hash, generate, mask, constant-time-compare).
 */

import { describe, expect, it } from 'vitest'

import {
  constantTimeEqual,
  DEFAULT_PREFIX,
  generatePlaintextToken,
  hashPlaintextToken,
  MASKED_TAIL_LENGTH,
  maskPlaintextToken,
  PLAINTEXT_BYTES,
} from '../utilities.js'

describe('hashPlaintextToken', () => {
  it('produces a deterministic SHA-256 hex digest for the same input', () => {
    const a = hashPlaintextToken('dvt_test_abc123')
    const b = hashPlaintextToken('dvt_test_abc123')
    expect(a).toBe(b)
    expect(a).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces a different digest for different inputs', () => {
    expect(hashPlaintextToken('dvt_a')).not.toBe(hashPlaintextToken('dvt_b'))
  })
})

describe('generatePlaintextToken', () => {
  it('uses the default prefix when none is provided', () => {
    const token = generatePlaintextToken()
    expect(token.startsWith(DEFAULT_PREFIX)).toBe(true)
  })

  it('honours a custom prefix', () => {
    const token = generatePlaintextToken('dvt_live_')
    expect(token.startsWith('dvt_live_')).toBe(true)
  })

  it('produces unique tokens (entropy check)', () => {
    const samples = new Set<string>()
    for (let i = 0; i < 200; i++) samples.add(generatePlaintextToken())
    expect(samples.size).toBe(200)
  })

  it('encodes the configured number of random bytes (base64url, ~43 chars per 32 bytes)', () => {
    const token = generatePlaintextToken('p_')
    const random = token.slice('p_'.length)
    // base64url length for N bytes is ceil(N * 4 / 3) without padding
    const expectedMin = Math.ceil((PLAINTEXT_BYTES * 4) / 3) - 2
    expect(random.length).toBeGreaterThanOrEqual(expectedMin)
  })
})

describe('maskPlaintextToken', () => {
  it('keeps the prefix and last 4 characters', () => {
    const masked = maskPlaintextToken('dvt_live_HelloWorldABCD', 'dvt_live_')
    expect(masked).toBe(`dvt_live_…ABCD`)
    expect(masked.endsWith('ABCD')).toBe(true)
    expect(masked.length).toBeLessThan('dvt_live_HelloWorldABCD'.length)
  })

  it('infers the prefix when not provided', () => {
    const masked = maskPlaintextToken('dvt_test_HelloWorldXYZW')
    expect(masked.startsWith('dvt_test_')).toBe(true)
    expect(masked.endsWith('XYZW')).toBe(true)
  })

  it('falls back to the default prefix when there is no underscore', () => {
    const masked = maskPlaintextToken('rawtoken1234')
    expect(masked.startsWith(DEFAULT_PREFIX)).toBe(true)
    expect(masked.endsWith('1234')).toBe(true)
  })

  it('exposes only the last MASKED_TAIL_LENGTH characters', () => {
    const masked = maskPlaintextToken('dvt_live_VERYLONGTOKEN1234')
    const tail = masked.slice(-MASKED_TAIL_LENGTH)
    expect(tail).toBe('1234')
  })
})

describe('constantTimeEqual (timing-safe compare)', () => {
  it('returns true for equal strings', () => {
    expect(constantTimeEqual('abcdef', 'abcdef')).toBe(true)
  })

  it('returns false for differing strings of equal length', () => {
    expect(constantTimeEqual('abcdef', 'abcdeg')).toBe(false)
  })

  it('returns false for strings of different lengths', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false)
    expect(constantTimeEqual('abcdef', 'abc')).toBe(false)
  })

  it('handles empty strings', () => {
    expect(constantTimeEqual('', '')).toBe(true)
    expect(constantTimeEqual('', 'a')).toBe(false)
  })

  it('rejects a token whose hash differs from the stored hash (wrong-token-rejection contract)', () => {
    const a = hashPlaintextToken('dvt_correct_TOKEN')
    const b = hashPlaintextToken('dvt_wrong_TOKEN')
    expect(constantTimeEqual(a, b)).toBe(false)
  })
})
