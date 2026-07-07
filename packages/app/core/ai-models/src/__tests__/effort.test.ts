/**
 * Tests for the native effort-option helpers: per-model options (native levels,
 * scaled budgets, fixed), and native display names with clamping.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  DEFAULT_EFFORT_LEVEL,
  EFFORT_LEVELS,
  effortOptionsForModel,
  nativeEffortName,
} from '../effort.js'
import type { AppModelDefinition } from '../types.js'

/**
 * Builds a minimal model definition for testing.
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
    maxOutputTokens: 64_000,
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

describe('effortOptionsForModel', () => {
  it('surfaces the catalog-declared native values for native-level models', () => {
    const claude = model({
      supportsThinking: true,
      thinkingBudgetTokens: 16_000,
      thinkingConfigurable: true,
      supportedEffortLevels: ['S', 'M', 'L', 'XL'],
      effortNativeByLevel: { S: 'low', M: 'high', L: 'xhigh', XL: 'max' },
    })
    expect(effortOptionsForModel(claude)).toEqual([
      { level: 'S', native: 'low' },
      { level: 'M', native: 'high' },
      { level: 'L', native: 'xhigh' },
      { level: 'XL', native: 'max' },
    ])
  })

  it('respects a subset scale (e.g. Gemini has no fourth tier)', () => {
    const gemini = model({
      supportsThinking: true,
      thinkingBudgetTokens: 10_000,
      thinkingConfigurable: true,
      supportedEffortLevels: ['S', 'M', 'L'],
      effortNativeByLevel: { S: 'low', M: 'medium', L: 'high' },
    })
    expect(effortOptionsForModel(gemini).map((o) => o.native)).toEqual(['low', 'medium', 'high'])
  })

  it('surfaces scaled thinking budgets on budget-scaled models (mirrors the server math)', () => {
    const haiku = model({
      supportsThinking: true,
      thinkingBudgetTokens: 8_000,
      thinkingConfigurable: true,
      supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    })
    expect(effortOptionsForModel(haiku).map((o) => o.native)).toEqual(['4K', '8K', '16K', '32K'])
  })

  it('clamps scaled budgets below maxOutputTokens and at/above the provider minimum', () => {
    const tiny = model({
      maxOutputTokens: 2_000,
      supportsThinking: true,
      thinkingBudgetTokens: 1_500,
      thinkingConfigurable: true,
      supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    })
    // S: 750 → clamped up to 1024 (→ '1K'); L/XL: 3000/6000 → clamped to 1999 (→ '2K').
    expect(effortOptionsForModel(tiny).map((o) => o.native)).toEqual(['1K', '2K', '2K', '2K'])
  })

  it('returns nothing for fixed-reasoning models', () => {
    expect(effortOptionsForModel(model({ supportedEffortLevels: ['M'] }))).toEqual([])
    expect(
      effortOptionsForModel(model({ supportsThinking: true, thinkingConfigurable: false })),
    ).toEqual([])
  })

  it('falls back to the abstract levels for an unknown model', () => {
    expect(effortOptionsForModel(undefined).map((o) => o.native)).toEqual([...EFFORT_LEVELS])
  })
})

describe('nativeEffortName', () => {
  const claude = model({
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    effortNativeByLevel: { S: 'low', M: 'high', L: 'xhigh', XL: 'max' },
  })

  it('resolves the persisted level to the model-native name', () => {
    expect(nativeEffortName(claude, 'M')).toBe('high')
    expect(nativeEffortName(claude, 'XL')).toBe('max')
  })

  it('clamps an out-of-set level to the nearest supported option', () => {
    const subset = model({
      supportsThinking: true,
      thinkingBudgetTokens: 8_000,
      thinkingConfigurable: true,
      supportedEffortLevels: ['S', 'M'],
      effortNativeByLevel: { S: 'minimal', M: 'high' },
    })
    expect(nativeEffortName(subset, 'XL')).toBe('high')
    expect(nativeEffortName(subset, DEFAULT_EFFORT_LEVEL)).toBe('high')
  })

  it('returns null for fixed-reasoning models', () => {
    expect(nativeEffortName(model({ supportedEffortLevels: ['M'] }), 'M')).toBeNull()
  })
})
