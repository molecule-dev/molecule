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
  freeTierModeModelId,
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
const deepseekFlash = model({
  id: 'deepseek-v4-flash',
  provider: 'deepseek',
  label: 'DeepSeek Flash',
})
const catalog = [opus, sonnet, deepseekFlash]

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

describe('freeTierModeModelId — clamp', () => {
  // The clamp ids mirror the server's FREE_TIER_MODELS (model-selection.ts):
  // plan → deepseek-v4-pro, execute → deepseek-v4-flash. A stale Sonnet-plan
  // assumption here once highlighted the wrong "current" model in the picker.
  it('clamps plan mode to deepseek-v4-pro by exact id', () => {
    const deepseekPro = model({ id: 'deepseek-v4-pro', provider: 'deepseek', label: 'DS Pro' })
    expect(freeTierModeModelId([...catalog, deepseekPro], 'plan', 'fallback')).toBe(
      'deepseek-v4-pro',
    )
  })

  it('falls back to a deepseek pro model by provider when the exact id is absent', () => {
    const otherPro = model({ id: 'deepseek-x-pro', provider: 'deepseek', label: 'X Pro' })
    expect(freeTierModeModelId([opus, sonnet, otherPro], 'plan', 'fallback')).toBe('deepseek-x-pro')
  })

  it('falls back to any deepseek model for plan mode before the supplied fallback', () => {
    expect(freeTierModeModelId(catalog, 'plan', 'fallback')).toBe('deepseek-v4-flash')
  })

  it('clamps execute mode to deepseek-v4-flash by exact id', () => {
    expect(freeTierModeModelId(catalog, 'execute', 'fallback')).toBe('deepseek-v4-flash')
  })

  it('falls back to a deepseek flash model by provider when the exact id is absent', () => {
    const otherFlash = model({ id: 'deepseek-x-flash', provider: 'deepseek', label: 'X' })
    expect(freeTierModeModelId([opus, otherFlash], 'execute', 'fallback')).toBe('deepseek-x-flash')
  })

  it('falls back to the supplied fallback when no clamp match exists', () => {
    expect(freeTierModeModelId([opus], 'plan', 'fallback')).toBe('fallback')
    expect(freeTierModeModelId([opus], 'execute', 'fallback')).toBe('fallback')
  })
})

describe('isModeModelLocked', () => {
  it('never locks Pro users', () => {
    expect(isModeModelLocked('claude-opus-4-6', 'plan', false, catalog, 'fallback')).toBe(false)
  })

  it('locks free users to the mode clamp (plan → deepseek-v4-pro)', () => {
    const deepseekPro = model({ id: 'deepseek-v4-pro', provider: 'deepseek', label: 'DS Pro' })
    const withPro = [...catalog, deepseekPro]
    expect(isModeModelLocked('claude-opus-4-6', 'plan', true, withPro, 'fallback')).toBe(true)
    expect(isModeModelLocked('claude-sonnet-4-6', 'plan', true, withPro, 'fallback')).toBe(true)
    expect(isModeModelLocked('deepseek-v4-pro', 'plan', true, withPro, 'fallback')).toBe(false)
  })

  it('locks free users to the mode clamp (execute → deepseek-v4-flash)', () => {
    expect(isModeModelLocked('claude-sonnet-4-6', 'execute', true, catalog, 'fallback')).toBe(true)
    expect(isModeModelLocked('deepseek-v4-flash', 'execute', true, catalog, 'fallback')).toBe(false)
  })

  it('aux modes (commit/compact): free users may pick any free-tier-flagged model', () => {
    const freeFlash = model({
      id: 'free-flash',
      provider: 'deepseek',
      label: 'Free Flash',
      freeTier: true,
    })
    const withFree = [...catalog, freeFlash]
    // Pro users are never locked.
    expect(isModeModelLocked('claude-opus-4-6', 'commit', false, withFree, 'fallback')).toBe(false)
    // Free users: free-tier-flagged models are selectable, paid ones are not.
    expect(isModeModelLocked('free-flash', 'commit', true, withFree, 'fallback')).toBe(false)
    expect(isModeModelLocked('free-flash', 'compact', true, withFree, 'fallback')).toBe(false)
    expect(isModeModelLocked('claude-opus-4-6', 'commit', true, withFree, 'fallback')).toBe(true)
    expect(isModeModelLocked('claude-sonnet-4-6', 'compact', true, withFree, 'fallback')).toBe(true)
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
    const withCustom = [...catalog, custom]
    expect(isModeModelLocked('custom/mine/some-model', 'plan', true, withCustom, 'fallback')).toBe(
      false,
    )
    expect(
      isModeModelLocked('custom/mine/some-model', 'execute', true, withCustom, 'fallback'),
    ).toBe(false)
    // The aux modes honor the same exemption (checked before their free-tier rule).
    expect(
      isModeModelLocked('custom/mine/some-model', 'commit', true, withCustom, 'fallback'),
    ).toBe(false)
    expect(
      isModeModelLocked('custom/mine/some-model', 'compact', true, withCustom, 'fallback'),
    ).toBe(false)
  })
})

describe('command registry wiring', () => {
  it('advertises the per-mode flags in the /model usage', () => {
    const cmd = COMMANDS.find((c) => c.id === 'model')
    expect(cmd?.usage).toContain('--plan')
    expect(cmd?.usage).toContain('--execute')
  })
})
