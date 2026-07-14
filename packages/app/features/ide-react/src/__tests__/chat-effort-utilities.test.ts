/**
 * Tests for the `/effort` command: syntactic parsing (incl. per-mode
 * `--plan` / `--execute` flags), native-value resolution against a model's
 * options, and the per-model selectors.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { AppModelDefinition } from '@molecule/app-ai-models'

import { COMMANDS } from '../components/chat-commands.js'
import {
  effortLevelsForModel,
  effortOptionsForModel,
  modelsSupportingEffort,
  nativeEffortName,
  parseEffortCommand,
  resolveEffortArg,
} from '../components/chat-effort-utilities.js'

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

/** A native-effort model shaped like current Claude entries. */
const claudeLike = model({
  id: 'claude-like',
  supportsThinking: true,
  thinkingBudgetTokens: 16_000,
  thinkingConfigurable: true,
  supportedEffortLevels: ['low', 'high', 'xhigh', 'max'],
  defaultEffortLevel: 'high',
})

/** A budget-configurable model shaped like Claude Haiku 4.5 (no native level names). */
const budgetLike = model({
  id: 'budget-like',
  maxOutputTokens: 64_000,
  supportsThinking: true,
  thinkingBudgetTokens: 8_000,
  thinkingConfigurable: true,
  supportedEffortLevels: ['4K', '8K', '16K', '32K'],
  defaultEffortLevel: '8K',
  effortBudgetTokens: { '4K': 4000, '8K': 8000, '16K': 16000, '32K': 32000 },
})

/** A fixed-reasoning model shaped like the DeepSeek executors. */
const fixedLike = model({ id: 'fixed-like' })

describe('parseEffortCommand — syntax', () => {
  it('parses a set with the raw arg (resolution happens against the model later)', () => {
    expect(parseEffortCommand('/effort xhigh')).toEqual({
      kind: 'set',
      arg: 'xhigh',
      mode: undefined,
    })
    expect(parseEffortCommand('  /EFFORT  16K ')).toEqual({
      kind: 'set',
      arg: '16K',
      mode: undefined,
    })
  })

  it('parses --plan / --execute mode flags in any position', () => {
    expect(parseEffortCommand('/effort --plan xhigh')).toEqual({
      kind: 'set',
      arg: 'xhigh',
      mode: 'plan',
    })
    expect(parseEffortCommand('/effort max --execute')).toEqual({
      kind: 'set',
      arg: 'max',
      mode: 'execute',
    })
    expect(parseEffortCommand('/effort --plan')).toEqual({ kind: 'query', mode: 'plan' })
    expect(parseEffortCommand('/effort --execute ?')).toEqual({ kind: 'query', mode: 'execute' })
  })

  it('treats /effort and /effort ? as a status request', () => {
    expect(parseEffortCommand('/effort')).toEqual({ kind: 'query', mode: undefined })
    expect(parseEffortCommand('/effort ?')).toEqual({ kind: 'query', mode: undefined })
  })

  it('reports extra arguments as invalid', () => {
    expect(parseEffortCommand('/effort high low')).toEqual({ kind: 'invalid', arg: 'high low' })
  })

  it('returns null for non-effort input', () => {
    expect(parseEffortCommand('/efforts')).toBeNull()
    expect(parseEffortCommand('effort S')).toBeNull()
    expect(parseEffortCommand('/effortless')).toBeNull()
  })
})

describe('resolveEffortArg — native values per model', () => {
  const options = effortOptionsForModel(claudeLike)

  it("resolves the model's native names case-insensitively to the canonical value", () => {
    expect(resolveEffortArg('xhigh', options)).toBe('xhigh')
    expect(resolveEffortArg('HIGH', options)).toBe('high')
    expect(resolveEffortArg('max', options)).toBe('max')
  })

  it('resolves budget labels on budget-configurable models', () => {
    const budgetOptions = effortOptionsForModel(budgetLike)
    expect(budgetOptions.map((o) => o.value)).toEqual(['4K', '8K', '16K', '32K'])
    expect(resolveEffortArg('16k', budgetOptions)).toBe('16K')
  })

  it('returns null for values the model does not offer', () => {
    expect(resolveEffortArg('turbo', options)).toBeNull()
    // Legacy letters are no longer accepted by the command (native values only).
    expect(resolveEffortArg('XL', options)).toBeNull()
  })
})

describe('effortOptionsForModel / nativeEffortName', () => {
  it("returns the model's native values, and nothing for fixed models", () => {
    expect(effortOptionsForModel(claudeLike).map((o) => o.value)).toEqual([
      'low',
      'high',
      'xhigh',
      'max',
    ])
    expect(effortOptionsForModel(fixedLike)).toEqual([])
  })

  it('resolves the persisted value against the model (default + nearest degrade)', () => {
    expect(nativeEffortName(claudeLike, 'xhigh')).toBe('xhigh')
    // Unset → the model's own default.
    expect(nativeEffortName(claudeLike, undefined)).toBe('high')
    const subset = model({
      ...claudeLike,
      supportedEffortLevels: ['low', 'high'],
      defaultEffortLevel: 'high',
    })
    // Persisted 'max' degrades to the nearest offered ('high').
    expect(nativeEffortName(subset, 'max')).toBe('high')
    // Fixed models have nothing to display.
    expect(nativeEffortName(fixedLike, 'high')).toBeNull()
  })
})

describe('modelsSupportingEffort', () => {
  it('selects only models with a configurable reasoning budget', () => {
    const configurable = model({ id: 'a', supportsThinking: true, thinkingConfigurable: true })
    const thinksButFixed = model({ id: 'b', supportsThinking: true, thinkingConfigurable: false })
    const noThinking = model({ id: 'c', supportsThinking: false, thinkingConfigurable: true })
    const result = modelsSupportingEffort([configurable, thinksButFixed, noThinking])
    expect(result.map((m) => m.id)).toEqual(['a'])
  })

  it('returns an empty array when none support it', () => {
    expect(modelsSupportingEffort([model({ id: 'x' })])).toEqual([])
  })
})

describe('effortLevelsForModel', () => {
  it("returns the model's own native levels", () => {
    expect(
      effortLevelsForModel(model({ supportedEffortLevels: ['low', 'high', 'xhigh', 'max'] })),
    ).toEqual(['low', 'high', 'xhigh', 'max'])
  })

  it('returns an empty list for a fixed / unknown model (no effort choice)', () => {
    expect(effortLevelsForModel(model({}))).toEqual([])
    expect(effortLevelsForModel(model({ supportedEffortLevels: [] }))).toEqual([])
    expect(effortLevelsForModel(undefined)).toEqual([])
  })
})

describe('command registry wiring', () => {
  it('registers /effort under the model category with mode-flag usage', () => {
    const cmd = COMMANDS.find((c) => c.id === 'effort')
    expect(cmd).toMatchObject({
      label: '/effort',
      category: 'model',
      usage: '/effort [--plan|--execute] <level>',
    })
  })
})
