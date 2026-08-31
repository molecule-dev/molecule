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
  modelHasPeakPricing,
  modelPeakMultiplier,
  modelPeakWindowLabels,
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
  cacheReadPricePerMTok: 0.05,
  knowledgeCutoff: '2024-04-01',
  freeTier: true,
})
const mid = model({
  id: 'mid',
  label: 'Balanced Mid',
  contextWindow: 400_000,
  inputPricePerMTok: 3,
  outputPricePerMTok: 15,
  cacheReadPricePerMTok: 0.3,
  knowledgeCutoff: '2024-10-01',
  freeTier: false,
})
const expensive = model({
  id: 'pricey',
  label: 'Apex Powerful',
  contextWindow: 1_000_000,
  inputPricePerMTok: 15,
  outputPricePerMTok: 75,
  cacheReadPricePerMTok: 1.5,
  knowledgeCutoff: '2025-06-01',
  freeTier: false,
})

const all = [mid, expensive, cheapFree]

describe('modelTotalCost', () => {
  it('weights a representative agentic turn, not a bare input+output sum', () => {
    // 47k cache reads + 3k fresh input + 800 output (AGENTIC_TOKEN_MIX). Cache
    // reads dominate real traffic, so pricing input+output alone overstated
    // cache-friendly models by up to ~2.5x.
    expect(modelTotalCost(cheapFree)).toBeCloseTo(0.00545, 8)
    expect(modelTotalCost(expensive)).toBeCloseTo(0.1755, 8)
  })

  it('counts the cache-read rate, not just input and output', () => {
    // Same input/output, 10x the cache-read rate: the old sum could not tell
    // these apart, and the difference is most of a real bill.
    const cheapCache = model({
      id: 'a',
      inputPricePerMTok: 1,
      outputPricePerMTok: 1,
      cacheReadPricePerMTok: 0.01,
    })
    const dearCache = model({
      id: 'b',
      inputPricePerMTok: 1,
      outputPricePerMTok: 1,
      cacheReadPricePerMTok: 0.1,
    })
    expect(modelTotalCost(dearCache)).toBeGreaterThan(modelTotalCost(cheapCache) * 1.5)
  })
})

describe('modelUsageRate', () => {
  it('rates against the cheapest model with a non-zero price', () => {
    expect(modelUsageRate(cheapFree, all)).toBe(1)
    expect(modelUsageRate(expensive, all)).toBe(32)
  })

  it('stays finite for all-zero-price custom (bring-your-own AI) models', () => {
    const custom = model({
      id: 'custom/mine/some-model',
      provider: 'custom',
      label: 'Mine',
      inputPricePerMTok: 0,
      outputPricePerMTok: 0,
      // Zero on EVERY rate, which is what a bring-your-own-key model is: the
      // turn costs the platform nothing. Leaving the factory's default cache
      // rate here made the fixture only look zero-priced — invisible while the
      // cost figure read input+output alone, and cache reads now dominate it.
      cacheReadPricePerMTok: 0,
      cacheWritePricePerMTok: 0,
    })
    // The zero-price model never becomes the base rate (which would divide by
    // zero) and its own rate clamps to ×1, never NaN/Infinity. (The picker shows
    // custom models as "your key" rather than a rate, so this is the safety
    // property, not the displayed value.)
    expect(modelUsageRate(custom, [...all, custom])).toBe(1)
    expect(modelUsageRate(expensive, [...all, custom])).toBe(32)
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
    cacheReadPricePerMTok: 0.003625,
    regionPricing: {
      us: { inputPricePerMTok: 1.3, outputPricePerMTok: 2.6, cacheReadPricePerMTok: 0.1 },
    },
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
    expect(modelTotalCost(cnDefault)).toBeCloseTo(0.00217138, 8)
    expect(modelTotalCost(cnDefault, 'us')).toBeCloseTo(0.01068, 8)
  })

  it('rates a model at the given region against a default-region base', () => {
    const cheapest = model({
      id: 'cheapest',
      label: 'Cheapest',
      inputPricePerMTok: 0.14,
      outputPricePerMTok: 0.28,
      cacheReadPricePerMTok: 0.0028,
    })
    const models = [cnDefault, cheapest]
    // CN is only ~2.8x the cheapest on the agentic mix (its cache reads are
    // nearly free); the US re-host is 14x, driven by a 28x cache-read rate that
    // an input+output sum could not see at all.
    expect(modelUsageRate(cnDefault, models)).toBeCloseTo(2.8)
    expect(modelUsageRate(cnDefault, models, 'us')).toBeCloseTo(14)
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

describe('peak-hour pricing', () => {
  // DeepSeek's native windows: 01:00-04:00 and 06:00-10:00 UTC, a flat 2x.
  const peak = { windows: [{ startMinuteUtc: 60, endMinuteUtc: 240 }], multiplier: 2 }
  const native = model({
    id: 'native',
    inputPricePerMTok: 1,
    outputPricePerMTok: 1,
    cacheReadPricePerMTok: 0.01,
    peakPricing: peak,
  })
  const rehosted = model({
    id: 'rehosted',
    inputPricePerMTok: 1,
    outputPricePerMTok: 1,
    cacheReadPricePerMTok: 0.01,
    peakPricing: peak,
    regions: ['cn', 'us'],
    regionPricing: {
      us: { inputPricePerMTok: 2, outputPricePerMTok: 2, cacheReadPricePerMTok: 0.5 },
    },
  })

  it('applies the multiplier only inside a window', () => {
    expect(modelPeakMultiplier(native, undefined, new Date('2026-08-17T02:00:00Z'))).toBe(2)
    // Half-open: the end minute is already off-peak.
    expect(modelPeakMultiplier(native, undefined, new Date('2026-08-17T04:00:00Z'))).toBe(1)
    expect(modelPeakMultiplier(native, undefined, new Date('2026-08-17T12:00:00Z'))).toBe(1)
  })

  it('never applies a native surcharge to a re-hosted region', () => {
    // The re-host bills its own flat card; charging the native provider's peak
    // on top would overstate the cost of the region the user is actually on.
    expect(modelPeakMultiplier(rehosted, 'cn', new Date('2026-08-17T02:00:00Z'))).toBe(2)
    expect(modelPeakMultiplier(rehosted, 'us', new Date('2026-08-17T02:00:00Z'))).toBe(1)
    expect(modelHasPeakPricing(rehosted, 'cn')).toBe(true)
    expect(modelHasPeakPricing(rehosted, 'us')).toBe(false)
  })

  it('moves the displayed usage rate with the window', () => {
    // The figure has to track the hour, or it is wrong for 7 hours a day.
    const models = [
      native,
      model({
        id: 'base',
        inputPricePerMTok: 1,
        outputPricePerMTok: 1,
        cacheReadPricePerMTok: 0.01,
      }),
    ]
    const off = modelUsageRate(native, models, undefined, new Date('2026-08-17T12:00:00Z'))
    const on = modelUsageRate(native, models, undefined, new Date('2026-08-17T02:00:00Z'))
    expect(off).toBe(1)
    expect(on).toBe(2)
  })

  it('reports no peak pricing for a model without windows', () => {
    expect(modelHasPeakPricing(model({ id: 'flat' }))).toBe(false)
    expect(
      modelPeakMultiplier(model({ id: 'flat' }), undefined, new Date('2026-08-17T02:00:00Z')),
    ).toBe(1)
  })

  it('honors a window restricted to certain UTC weekdays', () => {
    // DeepSeek's card qualifies its windows "Monday through Friday", so a
    // Saturday inside the hours is NOT charged the 2× — showing one would
    // overstate the cost for two days a week.
    const weekdays = model({
      id: 'weekdays',
      peakPricing: {
        windows: [{ startMinuteUtc: 60, endMinuteUtc: 240, daysOfWeekUtc: [1, 2, 3, 4, 5] }],
        multiplier: 2,
      },
    })
    expect(modelPeakMultiplier(weekdays, undefined, new Date('2026-08-17T02:00:00Z'))).toBe(2)
    expect(modelPeakMultiplier(weekdays, undefined, new Date('2026-08-21T02:00:00Z'))).toBe(2)
    expect(modelPeakMultiplier(weekdays, undefined, new Date('2026-08-22T02:00:00Z'))).toBe(1)
    expect(modelPeakMultiplier(weekdays, undefined, new Date('2026-08-23T02:00:00Z'))).toBe(1)
  })

  it('matches a wrapping window against the day it started on', () => {
    const wrap = model({
      id: 'wrap',
      peakPricing: {
        windows: [{ startMinuteUtc: 1380, endMinuteUtc: 120, daysOfWeekUtc: [5] }],
        multiplier: 2,
      },
    })
    expect(modelPeakMultiplier(wrap, undefined, new Date('2026-08-21T23:30:00Z'))).toBe(2)
    expect(modelPeakMultiplier(wrap, undefined, new Date('2026-08-22T00:30:00Z'))).toBe(2)
    expect(modelPeakMultiplier(wrap, undefined, new Date('2026-08-22T23:30:00Z'))).toBe(1)
  })
})

describe('peak window labels', () => {
  // Asserted structurally rather than against literal day/time strings: the
  // labels are formatted in the RUNNER's locale and time zone, so pinning
  // "Mon–Fri 04:00–07:00" would only pass on the machine that wrote it.
  const withWindow = (window: {
    startMinuteUtc: number
    endMinuteUtc: number
    daysOfWeekUtc?: number[]
  }): AppModelDefinition => model({ id: 'w', peakPricing: { windows: [window], multiplier: 2 } })

  const HOURS = { startMinuteUtc: 60, endMinuteUtc: 240 }

  it('shows hours alone when the window applies every day', () => {
    const hours = modelPeakWindowLabels(withWindow(HOURS))[0]
    expect(hours).toMatch(/^\d/)
    // An empty or complete day list means the same thing as no list at all.
    expect(modelPeakWindowLabels(withWindow({ ...HOURS, daysOfWeekUtc: [] }))[0]).toBe(hours)
    expect(
      modelPeakWindowLabels(withWindow({ ...HOURS, daysOfWeekUtc: [0, 1, 2, 3, 4, 5, 6] }))[0],
    ).toBe(hours)
  })

  it('prefixes the weekdays when the window does not apply every day', () => {
    const hours = modelPeakWindowLabels(withWindow(HOURS))[0]
    const weekdays = modelPeakWindowLabels(
      withWindow({ ...HOURS, daysOfWeekUtc: [1, 2, 3, 4, 5] }),
    )[0]
    expect(weekdays).not.toBe(hours)
    expect(weekdays.endsWith(hours)).toBe(true)
    // A contiguous run collapses to a single `X–Y` range, not a five-item list.
    expect(weekdays.slice(0, weekdays.length - hours.length)).not.toContain(',')

    const single = modelPeakWindowLabels(withWindow({ ...HOURS, daysOfWeekUtc: [3] }))[0]
    const singlePrefix = single.slice(0, single.length - hours.length)
    expect(singlePrefix.trim().length).toBeGreaterThan(0)
    expect(singlePrefix).not.toContain('–')

    // A non-contiguous set has to list its days; collapsing it to a range would
    // claim peak hours on days the provider prices off-peak.
    const split = modelPeakWindowLabels(withWindow({ ...HOURS, daysOfWeekUtc: [1, 4] }))[0]
    expect(split.slice(0, split.length - hours.length)).toContain(',')
  })

  it('returns nothing for a model without peak windows', () => {
    expect(modelPeakWindowLabels(model({ id: 'flat' }))).toEqual([])
  })
})
