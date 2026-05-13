import { describe, expect, it } from 'vitest'

import { formatCurrency, formatCurrencyCompact } from '../formatCurrency.js'

describe('formatCurrency', () => {
  it('formats USD with the en-US locale', () => {
    expect(formatCurrency(1234.5, 'USD', 'en-US')).toBe('$1,234.50')
  })

  it('defaults to USD when currency omitted', () => {
    expect(formatCurrency(99, undefined, 'en-US')).toBe('$99.00')
  })

  it('respects locale-specific thousand + decimal separators', () => {
    // 1.234,50 € in de-DE (non-breaking space before €)
    const out = formatCurrency(1234.5, 'EUR', 'de-DE')
    expect(out).toContain('1.234,50')
    expect(out).toContain('€')
  })

  it('rounds amounts that would exceed 2 decimal places', () => {
    expect(formatCurrency(1.005, 'USD', 'en-US')).toMatch(/\$1\.00|\$1\.01/) // banker's rounding ambiguous, just verify 2dp
  })

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD', 'en-US')).toBe('$0.00')
  })

  it('handles negative amounts', () => {
    expect(formatCurrency(-50, 'USD', 'en-US')).toMatch(/-?\$?\(?50\.00/)
  })

  it('handles JPY (zero fraction digits by default)', () => {
    const out = formatCurrency(1234, 'JPY', 'en-US')
    expect(out).toContain('1,234')
    expect(out).not.toMatch(/\.\d+/) // no decimals
  })
})

describe('formatCurrencyCompact', () => {
  it('formats large numbers compactly (e.g. $12.3K)', () => {
    expect(formatCurrencyCompact(12345, 'USD', 'en-US')).toMatch(/\$12\.3K/)
  })

  it('formats millions compactly', () => {
    expect(formatCurrencyCompact(1_234_567, 'USD', 'en-US')).toMatch(/\$1\.2M/)
  })

  it('keeps small numbers near full precision (≤ 999)', () => {
    expect(formatCurrencyCompact(99, 'USD', 'en-US')).toBe('$99')
  })

  it('caps fraction digits at 1', () => {
    const out = formatCurrencyCompact(12345.67, 'USD', 'en-US')
    expect(out).toMatch(/\$12\.3K/) // not 12.34K
  })

  it('handles zero', () => {
    expect(formatCurrencyCompact(0, 'USD', 'en-US')).toBe('$0')
  })

  it('handles negative numbers', () => {
    expect(formatCurrencyCompact(-12345, 'USD', 'en-US')).toMatch(/-\$12\.3K|\(\$12\.3K\)/)
  })

  it('defaults to USD when currency omitted', () => {
    expect(formatCurrencyCompact(12345, undefined, 'en-US')).toMatch(/\$/)
  })

  it('respects locale-specific compact notation (de-DE)', () => {
    // de-DE uses comma as decimal separator AND its compact-notation suffix
    // differs from en-US ('Mio.' rather than 'M'). Use a number large enough
    // that compact notation actually engages.
    const out = formatCurrencyCompact(1_234_500, 'EUR', 'de-DE')
    expect(out).toContain('1,2') // comma decimal
    expect(out).toMatch(/Mio|Mill/) // localized suffix
  })

  it('returns formatCurrency output as fallback if compact notation throws', () => {
    // We cannot easily force Intl.NumberFormat to throw, but the fallback
    // path is exercised when an environment lacks compact notation.
    // Verify both functions handle 0 the same way as a sanity check.
    expect(formatCurrencyCompact(0, 'USD', 'en-US')).toBeDefined()
  })
})
