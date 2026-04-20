import { describe, expect, it } from 'vitest'

import { createSeededRandom } from '../fixtures/seed.js'
import { applySemanticRules } from '../fixtures/semantic-generator.js'

describe('applySemanticRules', () => {
  it('generates a UUID for id fields', () => {
    const rng = createSeededRandom(42)
    const result = applySemanticRules('id', rng, 0)
    expect(typeof result).toBe('string')
    expect(result as string).toMatch(/^[0-9a-f-]+$/)
  })

  it('generates a UUID for _id suffix fields', () => {
    const rng = createSeededRandom(42)
    const result = applySemanticRules('account_id', rng, 0)
    expect(typeof result).toBe('string')
    expect(result as string).toMatch(/^[0-9a-f-]+$/)
  })

  it('generates a realistic name for name fields', () => {
    const rng = createSeededRandom(42)
    const result = applySemanticRules('name', rng, 0) as string
    expect(typeof result).toBe('string')
    expect(result.split(' ')).toHaveLength(2) // First + Last
  })

  it('generates an email for email fields', () => {
    const rng = createSeededRandom(42)
    const result = applySemanticRules('email', rng, 0) as string
    expect(result).toMatch(/@/)
    expect(result).toMatch(/\.com$/)
  })

  it('generates a dollar amount for amount fields', () => {
    const rng = createSeededRandom(42)
    const result = applySemanticRules('amount', rng, 0)
    expect(typeof result).toBe('number')
    expect(result as number).toBeGreaterThan(0)
  })

  it('generates a merchant name for description fields', () => {
    const rng = createSeededRandom(42)
    const result = applySemanticRules('description', rng, 0) as string
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(2)
  })

  it('returns USD for currency fields', () => {
    const rng = createSeededRandom(42)
    expect(applySemanticRules('currency', rng, 0)).toBe('USD')
  })

  it('returns active for status fields', () => {
    const rng = createSeededRandom(42)
    expect(applySemanticRules('status', rng, 0)).toBe('active')
  })

  it('generates a date string for date fields', () => {
    const rng = createSeededRandom(42)
    const result = applySemanticRules('created_at', rng, 0) as string
    expect(new Date(result).toISOString()).toBe(result)
  })

  it('returns undefined for unrecognized field names', () => {
    const rng = createSeededRandom(42)
    const result = applySemanticRules('zzz_unknown_field', rng, 0)
    expect(result).toBeUndefined()
  })

  it('generates a color hex code for color fields', () => {
    const rng = createSeededRandom(42)
    const result = applySemanticRules('color', rng, 0) as string
    expect(result).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  it('generates an icon name for icon fields', () => {
    const rng = createSeededRandom(42)
    const result = applySemanticRules('icon', rng, 0) as string
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('generates an address for line1 fields', () => {
    const rng = createSeededRandom(42)
    const result = applySemanticRules('line1', rng, 0) as string
    expect(typeof result).toBe('string')
    // Should be like "1234 Main St"
    expect(result).toMatch(/^\d+ .+$/)
  })

  it('is deterministic for the same seed and field', () => {
    const rng1 = createSeededRandom(42)
    const rng2 = createSeededRandom(42)
    expect(applySemanticRules('name', rng1, 0)).toBe(applySemanticRules('name', rng2, 0))
    expect(applySemanticRules('email', rng1, 0)).toBe(applySemanticRules('email', rng2, 0))
    expect(applySemanticRules('amount', rng1, 0)).toBe(applySemanticRules('amount', rng2, 0))
  })

  it('has rules for common financial fields', () => {
    const rng = createSeededRandom(42)
    expect(applySemanticRules('institution', rng, 0)).toBeTruthy()
    expect(applySemanticRules('category', rng, 0)).toBeTruthy()
    expect(applySemanticRules('account_number', rng, 0)).toBeTruthy()
  })
})
