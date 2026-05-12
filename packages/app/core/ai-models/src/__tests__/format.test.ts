import { describe, expect, it } from 'vitest'

import { formatTokenCount } from '../format.js'

describe('formatTokenCount', () => {
  it('formats exact millions', () => {
    expect(formatTokenCount(1_000_000)).toBe('1M')
    expect(formatTokenCount(2_000_000)).toBe('2M')
  })

  it('rounds fractional millions to one decimal', () => {
    expect(formatTokenCount(1_048_576)).toBe('1M')
    expect(formatTokenCount(1_500_000)).toBe('1.5M')
  })

  it('formats exact thousands', () => {
    expect(formatTokenCount(200_000)).toBe('200K')
    expect(formatTokenCount(64_000)).toBe('64K')
  })

  it('rounds fractional thousands to nearest integer', () => {
    expect(formatTokenCount(65_536)).toBe('66K')
    expect(formatTokenCount(327_680)).toBe('328K')
    expect(formatTokenCount(196_608)).toBe('197K')
    expect(formatTokenCount(202_752)).toBe('203K')
  })

  it('returns raw number for values under 1000', () => {
    expect(formatTokenCount(500)).toBe('500')
    expect(formatTokenCount(0)).toBe('0')
  })
})
