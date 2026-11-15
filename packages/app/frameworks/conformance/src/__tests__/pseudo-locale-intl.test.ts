import { describe, expect, it } from 'vitest'

import { installPseudoLocaleIntl } from '../ui/pseudo-locale-intl.js'

installPseudoLocaleIntl('en-XA')

const march = new Date(Date.UTC(2026, 2, 15, 12))
const monthYear = { month: 'long', year: 'numeric', timeZone: 'UTC' } as const

describe('installPseudoLocaleIntl', () => {
  it('brackets a date formatter made for the pseudo-locale', () => {
    expect(new Intl.DateTimeFormat('en-XA', monthYear).format(march)).toBe('⟦March 2026⟧')
    expect(new Intl.DateTimeFormat(['en-XA', 'en'], monthYear).format(march)).toBe('⟦March 2026⟧')
  })

  it('leaves every other locale as Intl formats it', () => {
    expect(new Intl.DateTimeFormat('en', monthYear).format(march)).toBe('March 2026')
    expect(new Intl.DateTimeFormat('en-US', monthYear).format(march)).toBe('March 2026')
    expect(new Intl.DateTimeFormat('fr', monthYear).format(march)).toBe('mars 2026')
    expect(new Intl.DateTimeFormat(undefined, monthYear).format(march)).not.toContain('⟦')
  })

  it('brackets relative times and lists', () => {
    expect(new Intl.RelativeTimeFormat('en-XA').format(-5, 'minute')).toBe('⟦5 minutes ago⟧')
    expect(new Intl.RelativeTimeFormat('en').format(-5, 'minute')).toBe('5 minutes ago')
    expect(new Intl.ListFormat('en-XA').format(['A', 'B', 'C'])).toBe('⟦A, B, and C⟧')
  })

  it('brackets the Date methods that format through Intl', () => {
    expect(march.toLocaleDateString('en-XA', monthYear)).toBe('⟦March 2026⟧')
    expect(march.toLocaleString('en-XA', monthYear)).toBe('⟦March 2026⟧')
    expect(march.toLocaleTimeString('en-XA', { timeZone: 'UTC' })).toBe('⟦12:00:00 PM⟧')
    expect(march.toLocaleDateString('en-US', monthYear)).toBe('March 2026')
  })

  it('keeps the formatter a working Intl formatter', () => {
    const formatter = new Intl.DateTimeFormat('en-XA', monthYear)
    expect(formatter).toBeInstanceOf(Intl.DateTimeFormat)
    expect(formatter.resolvedOptions().month).toBe('long')
    expect(
      formatter
        .formatToParts(march)
        .map((part) => part.value)
        .join(''),
    ).toBe('March 2026')
    // Called without `new`, as the spec allows.
    expect(Intl.DateTimeFormat('en-XA', monthYear).format(march)).toBe('⟦March 2026⟧')
  })

  it('leaves numbers alone', () => {
    expect(new Intl.NumberFormat('en-XA').format(1234.5)).toBe('1,234.5')
  })
})
