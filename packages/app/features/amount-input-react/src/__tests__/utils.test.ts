import { describe, expect, it } from 'vitest'

import { formatCurrency } from '../utils.js'

describe('formatCurrency', () => {
  it('formats USD/en-US with $1,234.50 shape', () => {
    expect(formatCurrency(1234.5, 'USD', 'en-US')).toBe('$1,234.50')
  })

  it('defaults to USD when currency omitted', () => {
    expect(formatCurrency(99, undefined, 'en-US')).toBe('$99.00')
  })

  it('emits two decimal places for USD even on whole dollars', () => {
    expect(formatCurrency(100, 'USD', 'en-US')).toBe('$100.00')
  })

  it('respects locale separators (de-DE: dot thousands, comma decimal)', () => {
    const out = formatCurrency(1234.5, 'EUR', 'de-DE')
    expect(out).toContain('1.234,50')
    expect(out).toContain('€')
  })

  it('emits 0-decimal currencies (JPY) without a decimal point', () => {
    const out = formatCurrency(1234, 'JPY', 'en-US')
    expect(out).toContain('1,234')
    expect(out).not.toMatch(/\.\d/)
  })

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD', 'en-US')).toBe('$0.00')
  })

  it('handles negative amounts (shape varies by locale)', () => {
    const out = formatCurrency(-12.34, 'USD', 'en-US')
    // en-US uses either '-$12.34' or '($12.34)' — verify negativity rendered.
    expect(out).toMatch(/-?\$?\(?12\.34\)?/)
    expect(out).toMatch(/-|\(/)
  })

  it('rounds to 2dp (banker / half-even handled by Intl)', () => {
    // 1.005 → could round to 1.00 or 1.01 depending on engine; assert
    // exactly 2 decimal digits and a currency prefix.
    expect(formatCurrency(1.005, 'USD', 'en-US')).toMatch(/^\$1\.\d{2}$/)
  })
})
