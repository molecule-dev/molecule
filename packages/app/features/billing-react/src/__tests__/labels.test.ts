import { describe, expect, it } from 'vitest'

import type { BillingPeriod, BillingTranslate } from '../labels.js'
import {
  billingBilledLabel,
  billingLimitLabel,
  billingLimitValue,
  billingPeriodLabel,
} from '../labels.js'

/**
 * A `t` stand-in that returns a marker built from the key it was called
 * with, so each assertion proves the label helpers resolved the value
 * through a LITERAL key (never a runtime-built one) with the expected
 * English default.
 */
const markerT: BillingTranslate = (key, _values, options) => {
  void _values
  return `${key}::${options?.defaultValue ?? ''}`
}

const PERIOD_CASES: [BillingPeriod, string][] = [
  ['month', 'billing.pricing.period.month::per month'],
  ['year', 'billing.pricing.period.year::per year'],
]

const BILLED_CASES: [BillingPeriod, string][] = [
  ['month', 'billing.pricing.billed.month::Billed monthly'],
  ['year', 'billing.pricing.billed.year::Billed annually'],
]

describe('billing label helpers resolve every value through literal keys', () => {
  it.each(PERIOD_CASES)('period label for %s', (period, expected) => {
    expect(billingPeriodLabel(period, markerT)).toBe(expected)
  })

  it.each(BILLED_CASES)('billed label for %s', (period, expected) => {
    expect(billingBilledLabel(period, markerT)).toBe(expected)
  })

  it('covers every period the price type allows', () => {
    // Exhaustiveness: the switches in labels.ts accept exactly these values.
    const all: Parameters<typeof billingPeriodLabel>[0][] = ['month', 'year']
    for (const period of all) expect(billingPeriodLabel(period, markerT)).toContain('billing.')
  })
})

describe('billing default limit text goes through i18n', () => {
  it('limit label for maxProjects', () => {
    expect(billingLimitLabel('maxProjects', markerT)).toBe(
      'billing.pricing.limit.maxProjects::Max projects',
    )
  })

  it('limit label for canExport', () => {
    expect(billingLimitLabel('canExport', markerT)).toBe(
      'billing.pricing.limit.canExport::Can export',
    )
  })

  it('limit label falls back to the humanized key', () => {
    expect(billingLimitLabel('maxSeatsPerTier', markerT)).toBe(
      'billing.pricing.limit.maxSeatsPerTier::Max seats per tier',
    )
  })

  it('limit value for the unlimited sentinel goes through t', () => {
    expect(billingLimitValue(1_000_000, markerT)).toBe('billing.pricing.unlimited::Unlimited')
    expect(billingLimitValue(999_999, markerT)).toBe('billing.pricing.unlimited::Unlimited')
  })

  it('limit value keeps numbers, booleans, strings, objects and null as display strings', () => {
    expect(billingLimitValue(12500, markerT)).toBe((12500).toLocaleString())
    expect(billingLimitValue(true, markerT)).toBe('✓')
    expect(billingLimitValue(false, markerT)).toBe('—')
    expect(billingLimitValue(null, markerT)).toBe('—')
    expect(billingLimitValue('priority', markerT)).toBe('priority')
    expect(billingLimitValue({ audit: true }, markerT)).toBe('{"audit":true}')
  })
})
