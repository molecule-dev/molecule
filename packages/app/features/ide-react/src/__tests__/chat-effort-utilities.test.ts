/**
 * Tests for the `/effort` command: level parsing, the `?` status path,
 * validation, and the "which models support it" selector.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { AppModelDefinition } from '@molecule/app-ai-models'

import { COMMANDS } from '../components/chat-commands.js'
import {
  DEFAULT_EFFORT_LEVEL,
  EFFORT_LEVEL_LABELS,
  EFFORT_LEVELS,
  isEffortLevel,
  modelsSupportingEffort,
  parseEffortCommand,
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

describe('parseEffortCommand — set', () => {
  it('parses each level case-insensitively', () => {
    expect(parseEffortCommand('/effort S')).toEqual({ kind: 'set', level: 'S' })
    expect(parseEffortCommand('/effort m')).toEqual({ kind: 'set', level: 'M' })
    expect(parseEffortCommand('/effort l')).toEqual({ kind: 'set', level: 'L' })
    expect(parseEffortCommand('  /EFFORT  xl ')).toEqual({ kind: 'set', level: 'XL' })
  })
})

describe('parseEffortCommand — query', () => {
  it('treats /effort and /effort ? as a status request', () => {
    expect(parseEffortCommand('/effort')).toEqual({ kind: 'query' })
    expect(parseEffortCommand('/effort ?')).toEqual({ kind: 'query' })
    expect(parseEffortCommand('  /effort   ?  ')).toEqual({ kind: 'query' })
  })
})

describe('parseEffortCommand — invalid / non-command', () => {
  it('reports an unrecognized argument as invalid', () => {
    expect(parseEffortCommand('/effort high')).toEqual({ kind: 'invalid', arg: 'high' })
    expect(parseEffortCommand('/effort XXL')).toEqual({ kind: 'invalid', arg: 'XXL' })
  })

  it('returns null for non-effort input', () => {
    expect(parseEffortCommand('/efforts')).toBeNull()
    expect(parseEffortCommand('effort S')).toBeNull()
    expect(parseEffortCommand('/effortless')).toBeNull()
  })
})

describe('levels metadata', () => {
  it('exposes the four levels in ascending order with a sane default', () => {
    expect(EFFORT_LEVELS).toEqual(['S', 'M', 'L', 'XL'])
    expect(EFFORT_LEVELS).toContain(DEFAULT_EFFORT_LEVEL)
  })

  it('has a label for every level', () => {
    for (const level of EFFORT_LEVELS) {
      expect(EFFORT_LEVEL_LABELS[level]).toBeTruthy()
    }
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

describe('command registry wiring', () => {
  it('registers /effort under the model category', () => {
    const cmd = COMMANDS.find((c) => c.id === 'effort')
    expect(cmd).toMatchObject({ label: '/effort', category: 'model', usage: '/effort <S|M|L|XL>' })
  })
})
