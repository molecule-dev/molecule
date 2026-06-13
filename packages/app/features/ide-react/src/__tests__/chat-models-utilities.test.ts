/**
 * Tests for the `/models` table sort helpers.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { AppModelDefinition } from '@molecule/app-ai-models'

import {
  compareModels,
  modelSpeedTier,
  modelTotalCost,
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
  freeTier: true,
})
const mid = model({
  id: 'mid',
  label: 'Balanced Mid',
  contextWindow: 400_000,
  inputPricePerMTok: 3,
  outputPricePerMTok: 15,
  freeTier: false,
})
const expensive = model({
  id: 'pricey',
  label: 'Apex Powerful',
  contextWindow: 1_000_000,
  inputPricePerMTok: 15,
  outputPricePerMTok: 75,
  freeTier: false,
})

const all = [mid, expensive, cheapFree]

describe('modelTotalCost', () => {
  it('sums input and output price per million tokens', () => {
    expect(modelTotalCost(cheapFree)).toBe(2.5)
    expect(modelTotalCost(expensive)).toBe(90)
  })
})

describe('modelSpeedTier', () => {
  it('classifies by input price into Fast / Balanced / Powerful', () => {
    expect(modelSpeedTier(cheapFree)).toEqual({ rank: 0, label: 'Fast' })
    expect(modelSpeedTier(mid)).toEqual({ rank: 1, label: 'Balanced' })
    expect(modelSpeedTier(expensive)).toEqual({ rank: 2, label: 'Powerful' })
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

  it('orders by tier ascending (Fast before Powerful)', () => {
    expect(compareModels(cheapFree, expensive, 'tier')).toBeLessThan(0)
    expect(compareModels(mid, cheapFree, 'tier')).toBeGreaterThan(0)
  })

  it('orders free-tier models first ascending', () => {
    expect(compareModels(cheapFree, mid, 'free')).toBeLessThan(0)
    expect(compareModels(mid, cheapFree, 'free')).toBeGreaterThan(0)
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
})
