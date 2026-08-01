/**
 * Tests for the `/models` table sort helpers.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { AppModelDefinition } from '@molecule/app-ai-models'

import {
  compareModels,
  effectiveModelRegion,
  modelTotalCost,
  modelUsageRate,
  sortModels,
} from '../components/chat-models-utilities.js'

/**
 * Builds a minimal model definition for testing, overriding only the fields
 * relevant to a given assertion.
 * @param overrides - Partial fields to override on the base model.
 * @returns A complete `AppModelDefinition`.
 */
function model(overrides: Partial<AppModelDefinition>): AppModelDefinition {
  return {
    id: overrides.id ?? 'm',
    provider: 'anthropic',
    label: 'Model',
    description: 'desc',
    contextWindow: 100_000,
    maxOutputTokens: 8_000,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    cacheReadPricePerMTok: 0.3,
    cacheWritePricePerMTok: 3.75,
    knowledgeCutoff: '2025-01-01',
    ...overrides,
  }
}

const cheapFree = model({
  id: 'cheap',
  label: 'Cheap Fast',
  contextWindow: 200_000,
  inputPricePerMTok: 0.5,
  outputPricePerMTok: 2,
  knowledgeCutoff: '2024-04-01',
  freeTier: true,
})
const mid = model({
  id: 'mid',
  label: 'Balanced Mid',
  contextWindow: 400_000,
  inputPricePerMTok: 3,
  outputPricePerMTok: 15,
  knowledgeCutoff: '2024-10-01',
  freeTier: false,
})
const expensive = model({
  id: 'pricey',
  label: 'Apex Powerful',
  contextWindow: 1_000_000,
  inputPricePerMTok: 15,
  outputPricePerMTok: 75,
  knowledgeCutoff: '2025-06-01',
  freeTier: false,
})

const all = [mid, expensive, cheapFree]

describe('modelTotalCost', () => {
  it('sums input and output price per million tokens', () => {
    expect(modelTotalCost(cheapFree)).toBe(2.5)
    expect(modelTotalCost(expensive)).toBe(90)
  })
})

describe('modelUsageRate', () => {
  it('rates against the cheapest model with a non-zero price', () => {
    expect(modelUsageRate(cheapFree, all)).toBe(1)
    expect(modelUsageRate(expensive, all)).toBe(36)
  })

  it('stays finite for all-zero-price custom (bring-your-own AI) models', () => {
    const custom = model({
      id: 'custom/mine/some-model',
      provider: 'custom',
      label: 'Mine',
      inputPricePerMTok: 0,
      outputPricePerMTok: 0,
    })
    // The zero-price model never becomes the base rate (which would divide by
    // zero) and its own rate clamps to ×1, never NaN/Infinity.
    expect(modelUsageRate(custom, [...all, custom])).toBe(1)
    expect(modelUsageRate(expensive, [...all, custom])).toBe(36)
    // A catalog of only zero-price models also degrades safely.
    expect(modelUsageRate(custom, [custom])).toBe(1)
  })
})

describe('effectiveModelRegion + region pricing', () => {
  const cnDefault = model({
    id: 'cn-default',
    label: 'Cn Default',
    provider: 'deepseek',
    regions: ['cn', 'us'],
    inputPricePerMTok: 0.435,
    outputPricePerMTok: 0.87,
    regionPricing: { us: { inputPricePerMTok: 1.3, outputPricePerMTok: 2.6 } },
  })

  it('defaults to the first listed region and honors only offered choices', () => {
    expect(effectiveModelRegion(cnDefault)).toBe('cn')
    expect(effectiveModelRegion(cnDefault, 'us')).toBe('us')
    // A region the model does not offer falls back to its default.
    expect(effectiveModelRegion(cnDefault, 'eu')).toBe('cn')
    // No regions declared → the US platform default.
    expect(effectiveModelRegion(model({ id: 'plain' }))).toBe('us')
  })

  it('prices totals at the effective region', () => {
    // CN default bills the base (native) rates; US bills the override.
    expect(modelTotalCost(cnDefault)).toBeCloseTo(1.305)
    expect(modelTotalCost(cnDefault, 'us')).toBeCloseTo(3.9)
  })

  it('rates a model at the given region against a default-region base', () => {
    const cheapest = model({
      id: 'cheapest',
      label: 'Cheapest',
      inputPricePerMTok: 0.14,
      outputPricePerMTok: 0.28,
    })
    const models = [cnDefault, cheapest]
    expect(modelUsageRate(cnDefault, models)).toBeCloseTo(3.1)
    expect(modelUsageRate(cnDefault, models, 'us')).toBeCloseTo(9.3)
  })
})

describe('compareModels', () => {
  it('orders by name ascending', () => {
    // 'Apex Powerful' < 'Balanced Mid' < 'Cheap Fast'
    expect(compareModels(expensive, mid, 'name')).toBeLessThan(0)
    expect(compareModels(cheapFree, mid, 'name')).toBeGreaterThan(0)
  })

  it('orders by context window ascending', () => {
    expect(compareModels(cheapFree, mid, 'context')).toBeLessThan(0)
    expect(compareModels(expensive, mid, 'context')).toBeGreaterThan(0)
  })

  it('orders by total cost ascending', () => {
    expect(compareModels(cheapFree, expensive, 'cost')).toBeLessThan(0)
    expect(compareModels(expensive, cheapFree, 'cost')).toBeGreaterThan(0)
  })

  it('orders by knowledge cutoff ascending (oldest training data first)', () => {
    // cheapFree (2024-04) < mid (2024-10) < expensive (2025-06)
    expect(compareModels(cheapFree, expensive, 'cutoff')).toBeLessThan(0)
    expect(compareModels(mid, cheapFree, 'cutoff')).toBeGreaterThan(0)
  })

  it('orders free-tier models first ascending', () => {
    expect(compareModels(cheapFree, mid, 'free')).toBeLessThan(0)
    expect(compareModels(mid, cheapFree, 'free')).toBeGreaterThan(0)
  })

  it('orders US-processed models first ascending for the region column', () => {
    const us = model({ id: 'us-model', label: 'Us Model' })
    const cn = model({ id: 'cn-model', label: 'Cn Model', provider: 'deepseek' })
    const regionOf = (m: AppModelDefinition) => (m.id === 'cn-model' ? 'cn' : 'us')
    expect(compareModels(us, cn, 'region', regionOf)).toBeLessThan(0)
    expect(compareModels(cn, us, 'region', regionOf)).toBeGreaterThan(0)
    // Without a resolver every model is treated as US → label tiebreak decides.
    expect(compareModels(us, cn, 'region')).toBeGreaterThan(0)
  })

  it('orders arbitrary non-US regions alphabetically after US', () => {
    const us = model({ id: 'a-us', label: 'A Us' })
    const cn = model({ id: 'b-cn', label: 'B Cn' })
    const eu = model({ id: 'c-eu', label: 'C Eu' })
    const regions: Record<string, string> = { 'a-us': 'us', 'b-cn': 'cn', 'c-eu': 'eu' }
    const regionOf = (m: AppModelDefinition) => regions[m.id]
    // us first, then cn < eu alphabetically — no assumption of exactly two regions.
    expect(compareModels(us, eu, 'region', regionOf)).toBeLessThan(0)
    expect(compareModels(cn, eu, 'region', regionOf)).toBeLessThan(0)
    expect(compareModels(eu, cn, 'region', regionOf)).toBeGreaterThan(0)
  })

  it('is deterministic for equal primaries via the label tiebreak', () => {
    const a = model({ id: 'a', label: 'Alpha', contextWindow: 1000 })
    const b = model({ id: 'b', label: 'Beta', contextWindow: 1000 })
    expect(compareModels(a, b, 'context')).toBeLessThan(0)
    expect(compareModels(b, a, 'context')).toBeGreaterThan(0)
    expect(compareModels(a, a, 'context')).toBe(0)
  })
})

describe('sortModels', () => {
  it('sorts by name ascending without mutating the input', () => {
    const sorted = sortModels(all, 'name', 'asc')
    expect(sorted.map((m) => m.id)).toEqual(['pricey', 'mid', 'cheap'])
    // input untouched
    expect(all.map((m) => m.id)).toEqual(['mid', 'pricey', 'cheap'])
  })

  it('descending is the exact reverse of ascending', () => {
    const asc = sortModels(all, 'context', 'asc').map((m) => m.id)
    const desc = sortModels(all, 'context', 'desc').map((m) => m.id)
    expect(asc).toEqual(['cheap', 'mid', 'pricey'])
    expect(desc).toEqual([...asc].reverse())
  })

  it('sorts free-tier models to the top ascending', () => {
    expect(sortModels(all, 'free', 'asc')[0].freeTier).toBe(true)
    expect(sortModels(all, 'free', 'desc').at(-1)?.freeTier).toBe(true)
  })

  it('sorts by effective region via the resolver, label-tiebroken within a region', () => {
    const regionOf = (m: AppModelDefinition) => (m.id === 'mid' ? ('cn' as const) : 'us')
    expect(sortModels(all, 'region', 'asc', regionOf).map((m) => m.id)).toEqual([
      'pricey',
      'cheap',
      'mid',
    ])
    expect(sortModels(all, 'region', 'desc', regionOf)[0].id).toBe('mid')
  })
})
