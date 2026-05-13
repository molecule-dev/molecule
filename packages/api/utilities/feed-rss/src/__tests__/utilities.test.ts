import { describe, expect, it } from 'vitest'

import { FeedSerializeError, type Feed } from '../types.js'
import {
  assertFeedShape,
  indent,
  looksLikeHttpUrl,
  toHhMmSs,
  toIso,
  toRfc822,
} from '../utilities.js'

describe('toIso', () => {
  it('returns undefined for null / undefined', () => {
    expect(toIso(null)).toBeUndefined()
    expect(toIso(undefined)).toBeUndefined()
  })

  it('returns undefined for empty / whitespace string', () => {
    expect(toIso('')).toBeUndefined()
    expect(toIso('   ')).toBeUndefined()
  })

  it('returns ISO 8601 for a valid Date', () => {
    const date = new Date('2026-05-13T10:00:00Z')
    expect(toIso(date)).toBe('2026-05-13T10:00:00.000Z')
  })

  it('returns undefined for invalid Date', () => {
    expect(toIso(new Date('not-a-date'))).toBeUndefined()
  })

  it('parses RFC 822 string', () => {
    expect(toIso('Mon, 28 Apr 2026 15:00:00 GMT')).toBe('2026-04-28T15:00:00.000Z')
  })

  it('parses ISO 8601 string', () => {
    expect(toIso('2026-05-13T10:00:00Z')).toBe('2026-05-13T10:00:00.000Z')
  })

  it('returns undefined for unparseable string', () => {
    expect(toIso('not a date')).toBeUndefined()
  })
})

describe('toRfc822', () => {
  it('returns undefined for null / undefined / empty', () => {
    expect(toRfc822(null)).toBeUndefined()
    expect(toRfc822(undefined)).toBeUndefined()
    expect(toRfc822('')).toBeUndefined()
  })

  it('formats valid Date in RFC 822 GMT shape', () => {
    const date = new Date(Date.UTC(2026, 3, 28, 15, 0, 0))
    expect(toRfc822(date)).toBe('Tue, 28 Apr 2026 15:00:00 GMT')
  })

  it('pads single-digit day/hour/minute/second', () => {
    const date = new Date(Date.UTC(2026, 0, 5, 9, 8, 7))
    expect(toRfc822(date)).toBe('Mon, 05 Jan 2026 09:08:07 GMT')
  })

  it('formats month name correctly across the year', () => {
    expect(toRfc822(new Date(Date.UTC(2026, 11, 25)))).toContain(' Dec ')
  })

  it('accepts ISO string input', () => {
    expect(toRfc822('2026-05-13T10:00:00Z')).toBe('Wed, 13 May 2026 10:00:00 GMT')
  })

  it('returns undefined for invalid Date', () => {
    expect(toRfc822(new Date('not-a-date'))).toBeUndefined()
  })

  it('returns undefined for unparseable string', () => {
    expect(toRfc822('garbage')).toBeUndefined()
  })
})

describe('toHhMmSs', () => {
  it('returns undefined for null / undefined', () => {
    expect(toHhMmSs(null)).toBeUndefined()
    expect(toHhMmSs(undefined)).toBeUndefined()
  })

  it('returns undefined for non-finite (NaN / Infinity)', () => {
    expect(toHhMmSs(Number.NaN)).toBeUndefined()
    expect(toHhMmSs(Number.POSITIVE_INFINITY)).toBeUndefined()
  })

  it('returns undefined for negative input', () => {
    expect(toHhMmSs(-5)).toBeUndefined()
  })

  it('formats whole seconds as 00:00:0X', () => {
    expect(toHhMmSs(5)).toBe('00:00:05')
  })

  it('formats minutes', () => {
    expect(toHhMmSs(90)).toBe('00:01:30')
  })

  it('formats hours', () => {
    expect(toHhMmSs(3723)).toBe('01:02:03')
  })

  it('handles double-digit components', () => {
    expect(toHhMmSs(36123)).toBe('10:02:03')
  })

  it('truncates fractional seconds', () => {
    expect(toHhMmSs(5.9)).toBe('00:00:05')
  })

  it('handles zero', () => {
    expect(toHhMmSs(0)).toBe('00:00:00')
  })
})

describe('assertFeedShape', () => {
  function baseFeed(overrides: Partial<Feed> = {}): Feed {
    return {
      title: 'My Feed',
      link: 'https://example.test',
      description: 'A feed',
      items: [],
      ...overrides,
    } as Feed
  }

  it('passes for a valid feed', () => {
    expect(() => assertFeedShape(baseFeed(), 'atom-1.0')).not.toThrow()
  })

  it('throws when feed is not an object', () => {
    expect(() => assertFeedShape(null as unknown as Feed, 'atom-1.0')).toThrow(FeedSerializeError)
  })

  it('throws when title is missing/empty', () => {
    expect(() => assertFeedShape(baseFeed({ title: '' }), 'atom-1.0')).toThrow(/title is required/)
  })

  it('throws when link is missing/empty', () => {
    expect(() => assertFeedShape(baseFeed({ link: '' }), 'atom-1.0')).toThrow(/link is required/)
  })

  it('throws when items is not an array', () => {
    expect(() =>
      assertFeedShape(baseFeed({ items: 'nope' as unknown as Feed['items'] }), 'atom-1.0'),
    ).toThrow(/items must be an array/)
  })

  it('RSS 2.0 requires description; atom does not', () => {
    expect(() => assertFeedShape(baseFeed({ description: '' }), 'rss-2.0')).toThrow(
      /description is required for RSS 2\.0/,
    )
    expect(() => assertFeedShape(baseFeed({ description: '' }), 'atom-1.0')).not.toThrow()
  })

  it('validates each item has id + title', () => {
    expect(() =>
      assertFeedShape(
        baseFeed({ items: [{ id: '', title: 'x' } as Feed['items'][number]] }),
        'atom-1.0',
      ),
    ).toThrow(/items\[0\]\.id is required/)
    expect(() =>
      assertFeedShape(baseFeed({ items: [{ id: 'a' } as Feed['items'][number]] }), 'atom-1.0'),
    ).toThrow(/items\[0\]\.title must be a string/)
  })

  it('throws FeedSerializeError (typed) with the format echo-ed', () => {
    try {
      assertFeedShape(null as unknown as Feed, 'rss-2.0')
    } catch (err) {
      expect(err).toBeInstanceOf(FeedSerializeError)
      expect((err as FeedSerializeError).format).toBe('rss-2.0')
    }
  })
})

describe('indent', () => {
  it('returns empty string for empty input', () => {
    expect(indent('', 4)).toBe('')
  })

  it('prepends `pad` spaces to each non-empty line', () => {
    expect(indent('foo\nbar', 2)).toBe('  foo\n  bar')
  })

  it('leaves empty lines empty (no trailing whitespace)', () => {
    expect(indent('foo\n\nbar', 2)).toBe('  foo\n\n  bar')
  })

  it('handles pad=0 as identity', () => {
    expect(indent('foo\nbar', 0)).toBe('foo\nbar')
  })
})

describe('looksLikeHttpUrl', () => {
  it('true for http://', () => {
    expect(looksLikeHttpUrl('http://x.test')).toBe(true)
  })

  it('true for https://', () => {
    expect(looksLikeHttpUrl('https://x.test')).toBe(true)
  })

  it('true regardless of case (HTTP / Https)', () => {
    expect(looksLikeHttpUrl('HTTP://x.test')).toBe(true)
    expect(looksLikeHttpUrl('Https://x.test')).toBe(true)
  })

  it('trims surrounding whitespace before checking', () => {
    expect(looksLikeHttpUrl('  https://x.test  ')).toBe(true)
  })

  it('false for non-HTTP schemes', () => {
    expect(looksLikeHttpUrl('ftp://x.test')).toBe(false)
    expect(looksLikeHttpUrl('mailto:a@b')).toBe(false)
    expect(looksLikeHttpUrl('urn:uuid:abc')).toBe(false)
  })

  it('false for null / undefined / empty / non-string', () => {
    expect(looksLikeHttpUrl(undefined)).toBe(false)
    expect(looksLikeHttpUrl(null)).toBe(false)
    expect(looksLikeHttpUrl('')).toBe(false)
  })
})
