import { resolve, sep } from 'node:path'

import { describe, expect, it } from 'vitest'

import { assertSafePathComponent, assertSegmentIndex, resolveWithinBase } from '../validate.js'

describe('assertSafePathComponent', () => {
  it('accepts allow-listed components', () => {
    for (const value of ['hls-123', '720p', 'index.m3u8', 'A_b-1.2']) {
      expect(assertSafePathComponent(value, 'x')).toBe(value)
    }
  })

  it('rejects traversal, separators, NUL, and shell metacharacters', () => {
    for (const value of [
      '',
      '.',
      '..',
      '../etc',
      'a/b',
      'a\\b',
      'a\0b',
      '720p; rm -rf /',
      'a b',
      '$(id)',
      'a|b',
      '`whoami`',
    ]) {
      expect(() => assertSafePathComponent(value, 'stream id')).toThrow(/Invalid stream id/)
    }
  })
})

describe('assertSegmentIndex', () => {
  it('accepts non-negative integers', () => {
    expect(assertSegmentIndex(0)).toBe(0)
    expect(assertSegmentIndex(42)).toBe(42)
  })

  it('rejects negatives, floats, and NaN', () => {
    for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => assertSegmentIndex(value)).toThrow(/Invalid segment index/)
    }
  })
})

describe('resolveWithinBase', () => {
  it('resolves descendants of the base', () => {
    const base = resolve('/tmp/streams')
    expect(resolveWithinBase(base, 'hls-1', 'seg-000.ts')).toBe(
      `${base}${sep}hls-1${sep}seg-000.ts`,
    )
  })

  it('allows the base itself', () => {
    const base = resolve('/tmp/streams')
    expect(resolveWithinBase(base)).toBe(base)
  })

  it('rejects a path that escapes the base', () => {
    const base = resolve('/tmp/streams')
    expect(() => resolveWithinBase(base, '..', '..', 'etc', 'passwd')).toThrow(
      /escapes the output directory/,
    )
  })
})
