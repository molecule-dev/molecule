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
  DEFAULT_EFFORT_LEVEL,
  EFFORT_LEVELS,
  effortLevelsForModel,
  effortOptionsForModel,
  isEffortLevel,
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
  supportedEffortLevels: ['S', 'M', 'L', 'XL'],
  effortNativeByLevel: { S: 'low', M: 'high', L: 'xhigh', XL: 'max' },
})

/** A budget-scaled model shaped like Claude Haiku 4.5 (no native level names). */
const budgetLike = model({
  id: 'budget-like',
  maxOutputTokens: 64_000,
  supportsThinking: true,
  thinkingBudgetTokens: 8_000,
  thinkingConfigurable: true,
  supportedEffortLevels: ['S', 'M', 'L', 'XL'],
})

/** A fixed-reasoning model shaped like the DeepSeek executors. */
const fixedLike = model({ id: 'fixed-like', supportedEffortLevels: ['M'] })

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

  it('resolves the model-native names case-insensitively', () => {
    expect(resolveEffortArg('xhigh', options)).toBe('L')
    expect(resolveEffortArg('HIGH', options)).toBe('M')
    expect(resolveEffortArg('max', options)).toBe('XL')
  })

  it('still accepts the legacy abstract letters as aliases', () => {
    expect(resolveEffortArg('xl', options)).toBe('XL')
    expect(resolveEffortArg('s', options)).toBe('S')
  })

  it('resolves budget sizes on budget-scaled models', () => {
    const budgetOptions = effortOptionsForModel(budgetLike)
    expect(budgetOptions.map((o) => o.native)).toEqual(['4K', '8K', '16K', '32K'])
    expect(resolveEffortArg('16k', budgetOptions)).toBe('L')
  })

  it('returns null for unknown values', () => {
    expect(resolveEffortArg('turbo', options)).toBeNull()
    expect(resolveEffortArg('XXL', options)).toBeNull()
  })
})

describe('effortOptionsForModel / nativeEffortName', () => {
  it('returns native names for mapped models and nothing for fixed models', () => {
    expect(effortOptionsForModel(claudeLike).map((o) => o.native)).toEqual([
      'low',
      'high',
      'xhigh',
      'max',
    ])
    expect(effortOptionsForModel(fixedLike)).toEqual([])
  })

  it('names the persisted level in the model’s own terms (with nearest-clamping)', () => {
    expect(nativeEffortName(claudeLike, 'M')).toBe('high')
    const subset = model({
      ...claudeLike,
      supportedEffortLevels: ['S', 'M'],
      effortNativeByLevel: { S: 'low', M: 'high' },
    })
    // Persisted XL degrades to the nearest supported option (M → 'high').
    expect(nativeEffortName(subset, 'XL')).toBe('high')
    // Fixed models have nothing to display.
    expect(nativeEffortName(fixedLike, 'M')).toBeNull()
  })
})

describe('levels metadata', () => {
  it('exposes the four abstract levels in ascending order with a sane default', () => {
    expect(EFFORT_LEVELS).toEqual(['S', 'M', 'L', 'XL'])
    expect(EFFORT_LEVELS).toContain(DEFAULT_EFFORT_LEVEL)
  })

  it('isEffortLevel guards correctly', () => {
    expect(isEffortLevel('S')).toBe(true)
    expect(isEffortLevel('XL')).toBe(true)
    expect(isEffortLevel('s')).toBe(false)
    expect(isEffortLevel('XXL')).toBe(false)
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
  it('returns the model-declared supported levels (full scale or a subset)', () => {
    expect(effortLevelsForModel(model({ supportedEffortLevels: ['S', 'M', 'L', 'XL'] }))).toEqual([
      'S',
      'M',
      'L',
      'XL',
    ])
    // A fixed-reasoning model (e.g. grok-code-fast-1) declares only the default.
    expect(effortLevelsForModel(model({ supportedEffortLevels: ['M'] }))).toEqual(['M'])
  })

  it('falls back to the full scale when the field is absent or empty (back-compat)', () => {
    expect(effortLevelsForModel(model({}))).toEqual(EFFORT_LEVELS)
    expect(effortLevelsForModel(model({ supportedEffortLevels: [] }))).toEqual(EFFORT_LEVELS)
  })

  it('falls back to the full scale for an unknown (undefined) model', () => {
    expect(effortLevelsForModel(undefined)).toEqual(EFFORT_LEVELS)
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
