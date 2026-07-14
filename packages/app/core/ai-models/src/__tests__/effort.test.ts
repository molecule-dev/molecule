/**
 * Tests for the per-model effort helpers: options, defaults, and resolving a
 * persisted value to the model's own native level.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { defaultEffortForModel, effortOptionsForModel, nativeEffortName } from '../effort.js'
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

// A native-effort model (Claude-family shape).
const claude = model({
  supportsThinking: true,
  thinkingBudgetTokens: 16_000,
  thinkingConfigurable: true,
  supportedEffortLevels: ['low', 'high', 'xhigh', 'max'],
  defaultEffortLevel: 'high',
})
// A budget-configurable model (Haiku-family shape).
const haiku = model({
  supportsThinking: true,
  thinkingBudgetTokens: 8_000,
  thinkingConfigurable: true,
  supportedEffortLevels: ['4K', '8K', '16K', '32K'],
  defaultEffortLevel: '8K',
  effortBudgetTokens: { '4K': 4000, '8K': 8000, '16K': 16000, '32K': 32000 },
})

describe('effortOptionsForModel', () => {
  it("surfaces the model's own native values", () => {
    expect(effortOptionsForModel(claude)).toEqual([
      { value: 'low' },
      { value: 'high' },
      { value: 'xhigh' },
      { value: 'max' },
    ])
  })

  it('surfaces budget labels for budget-configurable models', () => {
    expect(effortOptionsForModel(haiku).map((o) => o.value)).toEqual(['4K', '8K', '16K', '32K'])
  })

  it('returns nothing for fixed-reasoning models or an unknown model', () => {
    expect(effortOptionsForModel(model({}))).toEqual([])
    expect(effortOptionsForModel(undefined)).toEqual([])
  })
})

describe('defaultEffortForModel', () => {
  it("returns the model's declared default", () => {
    expect(defaultEffortForModel(claude)).toBe('high')
    expect(defaultEffortForModel(haiku)).toBe('8K')
  })

  it('returns null for a fixed / unknown model', () => {
    expect(defaultEffortForModel(model({}))).toBeNull()
    expect(defaultEffortForModel(undefined)).toBeNull()
  })
})

describe('nativeEffortName', () => {
  it('returns an exact member as-is', () => {
    expect(nativeEffortName(claude, 'xhigh')).toBe('xhigh')
    expect(nativeEffortName(haiku, '16K')).toBe('16K')
  })

  it("defaults to the model's default when unset", () => {
    expect(nativeEffortName(claude, undefined)).toBe('high')
    expect(nativeEffortName(claude, '')).toBe('high')
  })

  it('migrates a legacy S/M/L/XL by position', () => {
    expect(nativeEffortName(claude, 'S')).toBe('low')
    expect(nativeEffortName(claude, 'XL')).toBe('max')
    expect(nativeEffortName(haiku, 'M')).toBe('8K')
  })

  it('degrades an unsupported native value to the nearest by rank', () => {
    const gemini = model({
      supportsThinking: true,
      thinkingConfigurable: true,
      supportedEffortLevels: ['low', 'medium', 'high'],
      defaultEffortLevel: 'medium',
    })
    // 'xhigh' (rank 5) → nearest of low/medium/high is 'high' (rank 4).
    expect(nativeEffortName(gemini, 'xhigh')).toBe('high')
  })

  it('returns null for fixed-reasoning models', () => {
    expect(nativeEffortName(model({}), 'high')).toBeNull()
  })
})
