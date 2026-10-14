/**
 * Tests for the per-mode model helpers (`/model --plan`, `/model --execute`):
 * command parsing, settings-field mapping, back-compat resolution, and the
 * free-tier clamp.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { AppModelDefinition } from '@molecule/app-ai-models'

import { COMMANDS } from '../components/chat-commands.js'
import {
  effectiveModeModelId,
  freeTierLockReason,
  freeTierModeModelId,
  freeTierUsableMode,
  isModeModelLocked,
  modeSettingKey,
  parseModelModeCommand,
  resolveModeModel,
} from '../components/chat-model-mode-utilities.js'

/**
 * Builds a minimal model definition for testing, overriding only the fields a
 * given assertion cares about.
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

const opus = model({ id: 'claude-opus-4-6', provider: 'anthropic', label: 'Opus' })
const sonnet = model({ id: 'claude-sonnet-4-6', provider: 'anthropic', label: 'Sonnet' })

describe('parseModelModeCommand', () => {
  it('parses --plan and --execute, case-insensitively', () => {
    expect(parseModelModeCommand('/model --plan')).toEqual({ mode: 'plan', query: '' })
    expect(parseModelModeCommand('/model --execute')).toEqual({ mode: 'execute', query: '' })
    expect(parseModelModeCommand('  /MODEL  --PLAN  ')).toEqual({ mode: 'plan', query: '' })
  })

  it('captures a trailing filter query after the flag', () => {
    expect(parseModelModeCommand('/model --plan sonnet')).toEqual({ mode: 'plan', query: 'sonnet' })
    expect(parseModelModeCommand('/model --execute deep')).toEqual({
      mode: 'execute',
      query: 'deep',
    })
  })

  it('parses the auxiliary --commit and --compact flags with an optional query', () => {
    expect(parseModelModeCommand('/model --commit')).toEqual({ mode: 'commit', query: '' })
    expect(parseModelModeCommand('/model --compact haiku')).toEqual({
      mode: 'compact',
      query: 'haiku',
    })
  })

  it('returns null for a plain /model or a model name (not a mode flag)', () => {
    expect(parseModelModeCommand('/model')).toBeNull()
    expect(parseModelModeCommand('/model claude-opus-4-6')).toBeNull()
    expect(parseModelModeCommand('/model --planner')).toBeNull()
    expect(parseModelModeCommand('/model --committer')).toBeNull()
  })
})

describe('modeSettingKey', () => {
  it('maps mode to the settings field', () => {
    expect(modeSettingKey('plan')).toBe('planModel')
    expect(modeSettingKey('execute')).toBe('executeModel')
    expect(modeSettingKey('commit')).toBe('commitModel')
    expect(modeSettingKey('compact')).toBe('compactModel')
  })
})

describe('resolveModeModel — back-compat', () => {
  it('prefers the per-mode field when set', () => {
    expect(resolveModeModel({ planModel: 'p', executeModel: 'e', chatModel: 'c' }, 'plan')).toBe(
      'p',
    )
    expect(resolveModeModel({ planModel: 'p', executeModel: 'e', chatModel: 'c' }, 'execute')).toBe(
      'e',
    )
  })

  it('falls back to the legacy chatModel when the per-mode field is unset', () => {
    expect(resolveModeModel({ chatModel: 'legacy' }, 'plan')).toBe('legacy')
    expect(resolveModeModel({ chatModel: 'legacy' }, 'execute')).toBe('legacy')
    expect(resolveModeModel({ planModel: 'p', chatModel: 'legacy' }, 'execute')).toBe('legacy')
  })

  it('returns undefined when nothing is configured', () => {
    expect(resolveModeModel({}, 'plan')).toBeUndefined()
  })

  it('aux modes (commit/compact) never fall back to chatModel — the server owns their default', () => {
    expect(resolveModeModel({ commitModel: 'cm', chatModel: 'legacy' }, 'commit')).toBe('cm')
    expect(resolveModeModel({ compactModel: 'xm', chatModel: 'legacy' }, 'compact')).toBe('xm')
    expect(resolveModeModel({ chatModel: 'legacy' }, 'commit')).toBeUndefined()
    expect(resolveModeModel({ chatModel: 'legacy' }, 'compact')).toBeUndefined()
  })
})

// Arbitrary ids on purpose: the clamp must never depend on a model's name.
const paidA = model({ id: 'paid-a', provider: 'vendor-a', label: 'Paid A' })
const paidB = model({ id: 'paid-b', provider: 'vendor-b', label: 'Paid B' })
const freeModel = model({ id: 'free-x', provider: 'vendor-c', label: 'Free X', freeTier: true })
const clampCatalog = [opus, sonnet, paidA, paidB, freeModel]
// What the server sends a free user today: every mode on the free model.
const freeDefaults = { plan: 'free-x', execute: 'free-x', commit: 'free-x', compact: 'free-x' }

describe('freeTierModeModelId — server-driven, no hardcoded ids', () => {
  it('uses the server-sent default for the mode', () => {
    const defaults = { plan: 'paid-a', execute: 'free-x' }
    expect(freeTierModeModelId(clampCatalog, 'plan', 'fb', defaults)).toBe('paid-a')
    expect(freeTierModeModelId(clampCatalog, 'execute', 'fb', defaults)).toBe('free-x')
  })

  it('falls back to the catalog freeTier model, then the supplied fallback', () => {
    expect(freeTierModeModelId(clampCatalog, 'plan', 'fb')).toBe('free-x')
    expect(freeTierModeModelId([opus, sonnet], 'execute', 'fb')).toBe('fb')
  })

  it('never picks a model by provider or name pattern', () => {
    const lookalikes = [
      model({ id: 'deepseek-v4-pro', provider: 'deepseek', label: 'DS Pro' }),
      model({ id: 'deepseek-v4-flash', provider: 'deepseek', label: 'DS Flash' }),
    ]
    expect(freeTierModeModelId([...lookalikes, freeModel], 'plan', 'fb')).toBe('free-x')
    expect(freeTierModeModelId([...lookalikes, freeModel], 'execute', 'fb')).toBe('free-x')
  })
})

describe('isModeModelLocked', () => {
  it('never locks Pro users', () => {
    expect(isModeModelLocked('paid-a', 'plan', false, clampCatalog)).toBe(false)
  })

  it('free users: the freeTier model is open in every mode, paid models are locked', () => {
    for (const mode of ['plan', 'execute', 'commit', 'compact'] as const) {
      expect(isModeModelLocked('free-x', mode, true, clampCatalog, freeDefaults)).toBe(false)
      expect(isModeModelLocked('paid-a', mode, true, clampCatalog, freeDefaults)).toBe(true)
    }
  })

  it('free users: a server-sent per-mode default is open in that mode only', () => {
    const defaults = { ...freeDefaults, plan: 'paid-a' }
    expect(isModeModelLocked('paid-a', 'plan', true, clampCatalog, defaults)).toBe(false)
    expect(isModeModelLocked('paid-a', 'execute', true, clampCatalog, defaults)).toBe(true)
  })

  it('never locks custom (bring-your-own AI) models, even for free users', () => {
    const custom = model({
      id: 'custom/mine/some-model',
      provider: 'custom',
      label: 'Mine',
      inputPricePerMTok: 0,
      outputPricePerMTok: 0,
      cacheReadPricePerMTok: 0,
      cacheWritePricePerMTok: 0,
      knowledgeCutoff: '',
    })
    for (const mode of ['plan', 'execute', 'commit', 'compact'] as const) {
      expect(
        isModeModelLocked(custom.id, mode, true, [...clampCatalog, custom], freeDefaults),
      ).toBe(false)
    }
  })
})

describe('freeTierLockReason', () => {
  it('returns null for pro users and for free-allowed models', () => {
    expect(freeTierLockReason('paid-a', 'plan', false, clampCatalog)).toBeNull()
    expect(freeTierLockReason('free-x', 'plan', true, clampCatalog, freeDefaults)).toBeNull()
    expect(freeTierLockReason('free-x', 'commit', true, clampCatalog)).toBeNull()
  })

  it("returns 'mode' for a model the free tier uses only in a different mode", () => {
    const defaults = { ...freeDefaults, execute: 'paid-b' }
    expect(freeTierLockReason('paid-b', 'plan', true, clampCatalog, defaults)).toBe('mode')
  })

  it("returns 'paid' for genuinely paid models in every scope", () => {
    for (const mode of ['plan', 'execute', 'commit', 'compact'] as const) {
      expect(freeTierLockReason('paid-a', mode, true, clampCatalog, freeDefaults)).toBe('paid')
    }
  })

  it('a non-free model is never free just because of its name (regression: hardcoded V4 Pro clamp)', () => {
    const dsPro = model({ id: 'deepseek-v4-pro', provider: 'deepseek', label: 'DS Pro' })
    const withPro = [...clampCatalog, dsPro]
    expect(freeTierLockReason('deepseek-v4-pro', 'plan', true, withPro, freeDefaults)).toBe('paid')
  })

  it('stays the single source of truth for isModeModelLocked', () => {
    for (const mode of ['plan', 'execute', 'commit', 'compact'] as const) {
      for (const id of ['paid-a', 'paid-b', 'free-x']) {
        expect(isModeModelLocked(id, mode, true, clampCatalog, freeDefaults)).toBe(
          freeTierLockReason(id, mode, true, clampCatalog, freeDefaults) !== null,
        )
      }
    }
  })
})

describe('freeTierUsableMode', () => {
  it('names the mode the server lets the free tier use a model in', () => {
    expect(freeTierUsableMode('paid-a', clampCatalog, { ...freeDefaults, execute: 'paid-a' })).toBe(
      'execute',
    )
    expect(freeTierUsableMode('paid-a', clampCatalog, { ...freeDefaults, compact: 'paid-a' })).toBe(
      'commit',
    )
    expect(freeTierUsableMode('free-x', clampCatalog, freeDefaults)).toBe('plan')
    expect(freeTierUsableMode('paid-a', clampCatalog, freeDefaults)).toBeNull()
  })
})

describe('command registry wiring', () => {
  it('advertises the per-mode flags in the /model usage', () => {
    const cmd = COMMANDS.find((c) => c.id === 'model')
    expect(cmd?.usage).toContain('--plan')
    expect(cmd?.usage).toContain('--execute')
  })
})

describe('effectiveModeModelId — what a mode ACTUALLY uses (display truth)', () => {
  it('unset settings resolve to the SERVER per-mode default', () => {
    const defaults = { plan: 'paid-a', execute: 'free-x' }
    expect(effectiveModeModelId('plan', {}, defaults, false, clampCatalog, 'fb')).toBe('paid-a')
    expect(effectiveModeModelId('execute', {}, defaults, true, clampCatalog, 'fb')).toBe('free-x')
  })

  it('a per-mode setting wins over everything', () => {
    expect(
      effectiveModeModelId(
        'plan',
        { planModel: 'paid-a', chatModel: 'paid-b' },
        freeDefaults,
        false,
        clampCatalog,
        'fb',
      ),
    ).toBe('paid-a')
  })

  it('a SAVED chatModel outranks the server default (mirrors selection precedence)', () => {
    expect(
      effectiveModeModelId(
        'plan',
        { chatModel: 'paid-b' },
        freeDefaults,
        false,
        clampCatalog,
        'fb',
      ),
    ).toBe('paid-b')
  })

  it('a free user with a stale paid plan save sees the model the server actually uses', () => {
    // The 2026-10-14 bug: a saved planModel for a no-longer-free model showed
    // as the active plan model while the server clamped to the free model.
    const dsPro = model({ id: 'deepseek-v4-pro', provider: 'deepseek', label: 'DS Pro' })
    expect(
      effectiveModeModelId(
        'plan',
        { planModel: 'deepseek-v4-pro' },
        freeDefaults,
        true,
        [...clampCatalog, dsPro],
        'fb',
      ),
    ).toBe('free-x')
  })

  it('falls back to the catalog freeTier model when the server sent no defaults', () => {
    expect(effectiveModeModelId('plan', {}, undefined, true, clampCatalog, 'fb')).toBe('free-x')
    expect(effectiveModeModelId('execute', {}, undefined, true, clampCatalog, 'fb')).toBe('free-x')
  })

  it('honors a bring-your-own custom model on the free tier', () => {
    const custom = model({ id: 'custom/openai/gpt-6', provider: 'custom', label: 'BYO' })
    expect(
      effectiveModeModelId(
        'plan',
        { planModel: 'custom/openai/gpt-6' },
        freeDefaults,
        true,
        [...clampCatalog, custom],
        'fb',
      ),
    ).toBe('custom/openai/gpt-6')
  })
})
