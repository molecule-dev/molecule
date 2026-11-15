import { describe, expect, it } from 'vitest'

import { formatRelativeTime } from '../formatRelativeTime.js'

const NOW = Date.UTC(2026, 4, 13, 12, 0, 0) // 2026-05-13T12:00:00Z

describe('formatRelativeTime — past times', () => {
  it('< 1 minute → "N seconds ago" (numeric=auto)', () => {
    expect(formatRelativeTime(NOW - 5_000, NOW, 'en-US')).toBe('5 seconds ago')
  })

  it('exact diff=0 → "now" (numeric=auto)', () => {
    expect(formatRelativeTime(NOW, NOW, 'en-US')).toBe('now')
  })

  it('5 minutes ago', () => {
    expect(formatRelativeTime(NOW - 5 * 60_000, NOW, 'en-US')).toBe('5 minutes ago')
  })

  it('1 minute ago (singular)', () => {
    expect(formatRelativeTime(NOW - 60_000, NOW, 'en-US')).toBe('1 minute ago')
  })

  it('2 hours ago', () => {
    expect(formatRelativeTime(NOW - 2 * 3_600_000, NOW, 'en-US')).toBe('2 hours ago')
  })

  it('1 day ago → "yesterday" (numeric=auto)', () => {
    expect(formatRelativeTime(NOW - 86_400_000, NOW, 'en-US')).toBe('yesterday')
  })

  it('3 days ago', () => {
    expect(formatRelativeTime(NOW - 3 * 86_400_000, NOW, 'en-US')).toBe('3 days ago')
  })

  it('1 week ago → "last week"', () => {
    expect(formatRelativeTime(NOW - 7 * 86_400_000, NOW, 'en-US')).toBe('last week')
  })

  it('1 month ago → "last month"', () => {
    expect(formatRelativeTime(NOW - 31 * 86_400_000, NOW, 'en-US')).toBe('last month')
  })

  it('1 year ago → "last year"', () => {
    expect(formatRelativeTime(NOW - 366 * 86_400_000, NOW, 'en-US')).toBe('last year')
  })
})

describe('formatRelativeTime — future times', () => {
  it('5 minutes from now → "in 5 minutes"', () => {
    expect(formatRelativeTime(NOW + 5 * 60_000, NOW, 'en-US')).toBe('in 5 minutes')
  })

  it('1 hour from now → "in 1 hour"', () => {
    expect(formatRelativeTime(NOW + 3_600_000, NOW, 'en-US')).toBe('in 1 hour')
  })

  it('1 day from now → "tomorrow" (numeric=auto)', () => {
    expect(formatRelativeTime(NOW + 86_400_000, NOW, 'en-US')).toBe('tomorrow')
  })

  it('1 week from now → "next week"', () => {
    expect(formatRelativeTime(NOW + 7 * 86_400_000, NOW, 'en-US')).toBe('next week')
  })

  it('1 year from now → "next year"', () => {
    expect(formatRelativeTime(NOW + 366 * 86_400_000, NOW, 'en-US')).toBe('next year')
  })
})

describe('formatRelativeTime — input shapes', () => {
  it('accepts numeric epoch-ms', () => {
    expect(formatRelativeTime(NOW - 60_000, NOW, 'en-US')).toBe('1 minute ago')
  })

  it('accepts Date instances', () => {
    expect(formatRelativeTime(new Date(NOW - 60_000), NOW, 'en-US')).toBe('1 minute ago')
  })

  it('accepts ISO strings', () => {
    const isoPast = new Date(NOW - 60_000).toISOString()
    expect(formatRelativeTime(isoPast, NOW, 'en-US')).toBe('1 minute ago')
  })

  it('accepts Date for `now` argument', () => {
    expect(formatRelativeTime(NOW - 60_000, new Date(NOW), 'en-US')).toBe('1 minute ago')
  })

  it('defaults `now` to Date.now() when omitted', () => {
    // Use a value 60s in the past from real now — output should be "1 minute ago".
    const oneMinAgo = Date.now() - 60_000
    expect(formatRelativeTime(oneMinAgo, undefined, 'en-US')).toBe('1 minute ago')
  })
})

describe('formatRelativeTime — locale support', () => {
  it('honours the supplied locale (fr "il y a")', () => {
    const out = formatRelativeTime(NOW - 5 * 60_000, NOW, 'fr')
    expect(out.toLowerCase()).toContain('il y a')
  })

  it('honours the supplied locale (es "hace")', () => {
    const out = formatRelativeTime(NOW - 5 * 60_000, NOW, 'es')
    expect(out.toLowerCase()).toContain('hace')
  })
})

describe('formatRelativeTime — unit boundaries', () => {
  it('59 seconds → second unit (now / a few seconds ago shape)', () => {
    const out = formatRelativeTime(NOW - 59_000, NOW, 'en-US')
    expect(out).toMatch(/now|second/i) // numeric=auto produces "now"
  })

  it('60 seconds → minute unit', () => {
    expect(formatRelativeTime(NOW - 60_000, NOW, 'en-US')).toContain('minute')
  })

  it('3599 seconds → minutes unit (boundary just under 1 hour)', () => {
    const out = formatRelativeTime(NOW - 3599_000, NOW, 'en-US')
    expect(out).toMatch(/60 minutes|minutes ago/)
  })

  it('3600 seconds → hour unit', () => {
    expect(formatRelativeTime(NOW - 3_600_000, NOW, 'en-US')).toContain('hour')
  })
})
