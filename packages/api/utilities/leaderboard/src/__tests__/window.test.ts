import { describe, expect, it } from 'vitest'

import { isInWindow, resolveWindow } from '../window.js'

describe('resolveWindow — named windows', () => {
  it('daily: [start of UTC day, +24h)', () => {
    const now = new Date('2026-05-13T15:30:00.000Z')
    const w = resolveWindow('daily', now)
    expect(w.start?.toISOString()).toBe('2026-05-13T00:00:00.000Z')
    expect(w.end?.toISOString()).toBe('2026-05-14T00:00:00.000Z')
  })

  it('weekly: Monday 00:00 UTC + 7 days (ISO week)', () => {
    // 2026-05-13 is a Wednesday → ISO week starts on Mon 2026-05-11.
    const now = new Date('2026-05-13T15:30:00.000Z')
    const w = resolveWindow('weekly', now)
    expect(w.start?.toISOString()).toBe('2026-05-11T00:00:00.000Z')
    expect(w.end?.toISOString()).toBe('2026-05-18T00:00:00.000Z')
  })

  it('weekly: when reference is Sunday, snaps to the *prior* Monday (not next)', () => {
    // 2026-05-17 is a Sunday → ISO week began Mon 2026-05-11.
    const now = new Date('2026-05-17T12:00:00.000Z')
    const w = resolveWindow('weekly', now)
    expect(w.start?.toISOString()).toBe('2026-05-11T00:00:00.000Z')
  })

  it('weekly: when reference is Monday, returns the same day at 00:00', () => {
    const now = new Date('2026-05-11T20:00:00.000Z')
    const w = resolveWindow('weekly', now)
    expect(w.start?.toISOString()).toBe('2026-05-11T00:00:00.000Z')
  })

  it('monthly: first of month [00:00, first of next month 00:00)', () => {
    const now = new Date('2026-05-13T15:30:00.000Z')
    const w = resolveWindow('monthly', now)
    expect(w.start?.toISOString()).toBe('2026-05-01T00:00:00.000Z')
    expect(w.end?.toISOString()).toBe('2026-06-01T00:00:00.000Z')
  })

  it('monthly: end-of-year rollover', () => {
    const now = new Date('2026-12-31T23:59:59.999Z')
    const w = resolveWindow('monthly', now)
    expect(w.start?.toISOString()).toBe('2026-12-01T00:00:00.000Z')
    expect(w.end?.toISOString()).toBe('2027-01-01T00:00:00.000Z')
  })

  it('all-time: both edges null (unbounded)', () => {
    expect(resolveWindow('all-time')).toEqual({ start: null, end: null })
  })

  it('throws on unknown named window', () => {
    expect(() => resolveWindow('yearly' as never)).toThrow('Unknown window')
  })
})

describe('resolveWindow — custom windows', () => {
  it('returns the custom window unchanged when valid', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    const end = new Date('2026-02-01T00:00:00Z')
    const w = resolveWindow({ start, end })
    expect(w).toEqual({ start, end })
  })

  it('throws when start is not a Date', () => {
    expect(() =>
      resolveWindow({ start: 'not-a-date' as unknown as Date, end: new Date() }),
    ).toThrow('CustomWindow.start must be a valid Date')
  })

  it('throws when start is an invalid Date', () => {
    expect(() => resolveWindow({ start: new Date('invalid'), end: new Date() })).toThrow(
      'CustomWindow.start must be a valid Date',
    )
  })

  it('throws when end is not a Date', () => {
    expect(() =>
      resolveWindow({ start: new Date(), end: 'not-a-date' as unknown as Date }),
    ).toThrow('CustomWindow.end must be a valid Date')
  })

  it('throws when end is an invalid Date', () => {
    expect(() => resolveWindow({ start: new Date(), end: new Date('invalid') })).toThrow(
      'CustomWindow.end must be a valid Date',
    )
  })

  it('throws when end <= start (strict inequality)', () => {
    const t = new Date('2026-01-01T00:00:00Z')
    expect(() => resolveWindow({ start: t, end: t })).toThrow('strictly after start')
    expect(() => resolveWindow({ start: t, end: new Date('2025-12-31T23:59:59.999Z') })).toThrow(
      'strictly after start',
    )
  })
})

describe('isInWindow', () => {
  const start = new Date('2026-05-01T00:00:00Z')
  const end = new Date('2026-06-01T00:00:00Z')

  it('true when when ∈ [start, end)', () => {
    expect(isInWindow(new Date('2026-05-15T12:00:00Z'), { start, end })).toBe(true)
  })

  it('true at exactly start (inclusive)', () => {
    expect(isInWindow(start, { start, end })).toBe(true)
  })

  it('false at exactly end (exclusive)', () => {
    expect(isInWindow(end, { start, end })).toBe(false)
  })

  it('false before start', () => {
    expect(isInWindow(new Date('2026-04-30T23:59:59.999Z'), { start, end })).toBe(false)
  })

  it('false after end', () => {
    expect(isInWindow(new Date('2026-06-15T00:00:00Z'), { start, end })).toBe(false)
  })

  it('null start → unbounded below', () => {
    expect(isInWindow(new Date('1970-01-01T00:00:00Z'), { start: null, end })).toBe(true)
  })

  it('null end → unbounded above', () => {
    expect(isInWindow(new Date('2099-01-01T00:00:00Z'), { start, end: null })).toBe(true)
  })

  it('both null → all events match (all-time semantics)', () => {
    expect(isInWindow(new Date(), { start: null, end: null })).toBe(true)
  })
})
