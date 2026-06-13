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

  it('returns null for a plain /model or a model name (not a mode flag)', () => {
    expect(parseModelModeCommand('/model')).toBeNull()
    expect(parseModelModeCommand('/model claude-opus-4-6')).toBeNull()
    expect(parseModelModeCommand('/model --planner')).toBeNull()
  })
})

describe('modeSettingKey', () => {
  it('maps mode to the settings field', () => {
    expect(modeSettingKey('plan')).toBe('planModel')
    expect(modeSettingKey('execute')).toBe('executeModel')
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
})

describe('freeTierModeModelId — clamp', () => {
  it('clamps plan mode to a Sonnet-class model', () => {
    expect(freeTierModeModelId(catalog, 'plan', 'fallback')).toBe('claude-sonnet-4-6')
  })

  it('prefers a free-tier Sonnet when one exists', () => {
    const freeSonnet = model({ id: 'claude-sonnet-free', label: 'Sonnet Free', freeTier: true })
    expect(freeTierModeModelId([sonnet, freeSonnet], 'plan', 'fallback')).toBe('claude-sonnet-free')
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

  it('locks free users to the mode clamp (plan → sonnet)', () => {
    expect(isModeModelLocked('claude-opus-4-6', 'plan', true, catalog, 'fallback')).toBe(true)
    expect(isModeModelLocked('claude-sonnet-4-6', 'plan', true, catalog, 'fallback')).toBe(false)
  })

  it('locks free users to the mode clamp (execute → deepseek-v4-flash)', () => {
    expect(isModeModelLocked('claude-sonnet-4-6', 'execute', true, catalog, 'fallback')).toBe(true)
    expect(isModeModelLocked('deepseek-v4-flash', 'execute', true, catalog, 'fallback')).toBe(false)
  })
})

describe('command registry wiring', () => {
  it('advertises the per-mode flags in the /model usage', () => {
    const cmd = COMMANDS.find((c) => c.id === 'model')
    expect(cmd?.usage).toContain('--plan')
    expect(cmd?.usage).toContain('--execute')
  })
})
