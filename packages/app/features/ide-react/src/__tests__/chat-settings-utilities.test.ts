/**
 * Tests for the `/settings` enumeration helpers and the registry-driven
 * command grouping that backs the settings command reference.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
  COMMAND_CATEGORIES,
  COMMANDS,
  groupCommandsByCategory,
} from '../components/chat-commands.js'
import {
  buildSettingsList,
  type SettingsDisplayValues,
  type SoundEventMode,
  summarizeSounds,
} from '../components/chat-settings-utilities.js'

const sampleValues: SettingsDisplayValues = {
  model: 'Claude Opus 4.6',
  mode: 'Execute',
  maxLoops: '100',
  autoFix: 'On',
  sounds: '3 of 9 events enabled',
}

describe('buildSettingsList', () => {
  const settings = buildSettingsList(sampleValues)

  it('enumerates every user-controllable setting in display order', () => {
    expect(settings.map((s) => s.id)).toEqual(['model', 'mode', 'maxLoops', 'autoFix', 'sounds'])
  })

  it('wires each setting to the slash command that edits it', () => {
    const byId = Object.fromEntries(settings.map((s) => [s.id, s.editCommand]))
    expect(byId).toEqual({
      model: 'model',
      mode: 'plan',
      maxLoops: 'maxloops',
      autoFix: 'autofix',
      sounds: 'sounds',
    })
  })

  it('every edit command resolves to a real registered command', () => {
    const ids = new Set(COMMANDS.map((c) => c.id))
    for (const setting of settings) {
      if (setting.editCommand) expect(ids.has(setting.editCommand)).toBe(true)
    }
  })

  it('reflects the supplied current values', () => {
    const byId = Object.fromEntries(settings.map((s) => [s.id, s.value]))
    expect(byId.model).toBe('Claude Opus 4.6')
    expect(byId.mode).toBe('Execute')
    expect(byId.maxLoops).toBe('100')
    expect(byId.autoFix).toBe('On')
    expect(byId.sounds).toBe('3 of 9 events enabled')
  })

  it('gives every setting a non-empty label and description', () => {
    for (const setting of settings) {
      expect(setting.label.length).toBeGreaterThan(0)
      expect(setting.description.length).toBeGreaterThan(0)
    }
  })
})

describe('summarizeSounds', () => {
  it('counts events that are not off as enabled', () => {
    const sounds: Record<string, SoundEventMode> = {
      done: 'whenNotFocused',
      error: 'always',
      tool_result: 'off',
      file_diff: 'off',
    }
    expect(summarizeSounds(sounds)).toEqual({ enabled: 2, total: 4 })
  })

  it('reports zero enabled when every event is off', () => {
    const sounds: Record<string, SoundEventMode> = { done: 'off', error: 'off' }
    expect(summarizeSounds(sounds)).toEqual({ enabled: 0, total: 2 })
  })

  it('handles an empty config', () => {
    expect(summarizeSounds({})).toEqual({ enabled: 0, total: 0 })
  })
})

describe('groupCommandsByCategory', () => {
  const groups = groupCommandsByCategory()

  it('includes EVERY command from the registry (no command dropped)', () => {
    const grouped = groups.flatMap((g) => g.commands)
    expect(grouped).toHaveLength(COMMANDS.length)
    for (const cmd of COMMANDS) {
      expect(grouped.some((c) => c.id === cmd.id)).toBe(true)
    }
  })

  it('places /settings under the settings category', () => {
    const settingsGroup = groups.find((g) => g.category.key === 'settings')
    expect(settingsGroup?.commands.some((c) => c.id === 'settings')).toBe(true)
  })

  it('preserves category order and drops empty categories', () => {
    const keys = groups.map((g) => g.category.key)
    // Each emitted key appears in the canonical order, and only non-empty categories are emitted.
    const canonical = COMMAND_CATEGORIES.map((c) => c.key).filter((key) =>
      COMMANDS.some((c) => c.category === key),
    )
    expect(keys).toEqual(canonical)
    for (const group of groups) {
      expect(group.commands.length).toBeGreaterThan(0)
    }
  })

  it('reflects a custom registry (cannot drift)', () => {
    const custom = groupCommandsByCategory(
      [
        {
          id: 'frobnicate',
          label: '/frobnicate',
          description: 'do the thing',
          category: 'support',
        },
      ],
      COMMAND_CATEGORIES,
    )
    expect(custom).toHaveLength(1)
    expect(custom[0].category.key).toBe('support')
    expect(custom[0].commands[0].id).toBe('frobnicate')
  })
})
