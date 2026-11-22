/**
 * Tests for the `/settings` enumeration helpers and the registry-driven
 * command grouping that backs the settings command reference.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  COMMAND_CATEGORIES,
  COMMANDS,
  groupCommandsByCategory,
} from '../components/chat-commands.js'
import {
  buildSettingsList,
  cycleSoundsConfig,
  DEFAULT_SOUNDS_CONFIG,
  mergeSoundsConfig,
  parseChatProjectSettings,
  parseSoundsConfig,
  type SettingsDisplayValues,
  shouldPlaySound,
  SOUND_EVENTS,
  SOUND_MODES,
  type SoundEventMode,
  SOUNDS_STORAGE_KEY,
  type SoundsConfig,
  summarizeSounds,
  type ToneAudioContext,
  type ToneGain,
  type ToneOscillator,
} from '../components/chat-settings-utilities.js'
import { SETTINGS } from '../settings-metadata.js'

const sampleValues: SettingsDisplayValues = {
  model: 'Claude Opus 4.6',
  planModel: 'Claude Sonnet 4.6',
  executeModel: 'DeepSeek V4 Flash',
  commitModel: 'Fast default',
  compactModel: 'Fast default',
  mode: 'Execute',
  effort: 'Balanced (M)',
  maxLoops: '100',
  autoFix: 'On',
  autoCommit: 'Every 60s',
  hooks: 'In project settings',
  autoApproveCommands: 'Off',
  sounds: '3 of 9 events enabled',
  timestamps: 'On',
}

describe('buildSettingsList', () => {
  const settings = buildSettingsList(sampleValues)

  it('enumerates every user-controllable setting in display order', () => {
    // SYN11: Effort is surfaced (no longer hidden while its /effort command is
    // listed), the per-mode plan/execute models are split out from the single
    // default-model row rather than collapsed into it, and Auto-commit + Hooks —
    // previously absent from the panel — are now listed (Auto-commit's
    // /autocommit command was shown with no matching row; Hooks had no row at all).
    expect(settings.map((s) => s.id)).toEqual([
      'model',
      'planModel',
      'executeModel',
      'commitModel',
      'compactModel',
      'mode',
      'effort',
      'maxLoops',
      'autoFix',
      'autoCommit',
      'hooks',
      'autoApproveCommands',
      'sounds',
      'timestamps',
    ])
  })

  it('wires each setting to the slash command that edits it', () => {
    const byId = Object.fromEntries(settings.map((s) => [s.id, s.editCommand]))
    expect(byId).toEqual({
      model: 'model',
      planModel: 'model',
      executeModel: 'model',
      commitModel: 'model',
      compactModel: 'model',
      mode: 'plan',
      effort: 'effort',
      maxLoops: 'maxloops',
      autoFix: 'autofix',
      autoCommit: 'autocommit',
      // Hooks are configured in a file, not via a slash command — a command-less
      // row (SettingsCard omits its Edit affordance).
      hooks: undefined,
      autoApproveCommands: 'autoapprove',
      sounds: 'sounds',
      timestamps: 'timestamps',
    })
  })

  it('scopes the per-mode model rows to their mode via a prefilled command input', () => {
    // Both run the `model` command, but each carries the exact mode-scoped input
    // so editing "Plan-mode model" opens the plan picker (not the generic one).
    expect(settings.find((s) => s.id === 'planModel')?.editInput).toBe('/model --plan')
    expect(settings.find((s) => s.id === 'executeModel')?.editInput).toBe('/model --execute')
    expect(settings.find((s) => s.id === 'commitModel')?.editInput).toBe('/model --commit')
    expect(settings.find((s) => s.id === 'compactModel')?.editInput).toBe('/model --compact')
    // Non-per-mode rows need no scoped input — the bare command suffices.
    expect(settings.find((s) => s.id === 'effort')?.editInput).toBeUndefined()
    expect(settings.find((s) => s.id === 'model')?.editInput).toBeUndefined()
  })

  it('every edit command resolves to a real registered command', () => {
    // `CommandId` is loosely `string` (hosts add their own commands), so the
    // registry set is checked as strings, not as the written-id union.
    const ids = new Set<string>(COMMANDS.map((c) => c.id))
    for (const setting of settings) {
      if (setting.editCommand) expect(ids.has(setting.editCommand)).toBe(true)
    }
  })

  it('reflects the supplied current values', () => {
    const byId = Object.fromEntries(settings.map((s) => [s.id, s.value]))
    expect(byId.model).toBe('Claude Opus 4.6')
    expect(byId.planModel).toBe('Claude Sonnet 4.6')
    expect(byId.executeModel).toBe('DeepSeek V4 Flash')
    expect(byId.mode).toBe('Execute')
    expect(byId.effort).toBe('Balanced (M)')
    expect(byId.maxLoops).toBe('100')
    expect(byId.autoFix).toBe('On')
    expect(byId.autoCommit).toBe('Every 60s')
    expect(byId.hooks).toBe('In project settings')
    expect(byId.sounds).toBe('3 of 9 events enabled')
    expect(byId.timestamps).toBe('On')
  })

  it('gives every setting a non-empty label and description', () => {
    for (const setting of settings) {
      expect(setting.label.length).toBeGreaterThan(0)
      expect(setting.description.length).toBeGreaterThan(0)
    }
  })
})

describe('the settings view is derived from the shared SETTINGS metadata (SYN11 parity)', () => {
  const settings = buildSettingsList(sampleValues)

  it('emits exactly one row per canonical setting, in metadata order', () => {
    // The view cannot drift from the single source of truth: same ids, same
    // order, no row dropped (the bug) and none invented.
    expect(settings.map((s) => s.id)).toEqual(SETTINGS.map((m) => m.id))
  })

  it('carries the canonical label/description/editCommand for every row (no fork)', () => {
    for (const meta of SETTINGS) {
      const row = settings.find((s) => s.id === meta.id)
      expect(row, `row for ${meta.id}`).toBeDefined()
      expect(row?.label).toBe(meta.label)
      expect(row?.description).toBe(meta.description)
      expect(row?.editCommand).toBe(meta.editCommand)
      expect(row?.editInput).toBe(meta.editInput)
    }
  })

  it('only adds the display-ready value on top of the canonical metadata', () => {
    for (const row of settings) {
      // The row is the metadata entry plus exactly one extra field: `value`.
      const { value, ...meta } = row
      expect(typeof value).toBe('string')
      expect(SETTINGS).toContainEqual(meta)
    }
  })

  it('lists Auto-commit and Hooks (the two rows the panel previously omitted)', () => {
    // The autocommit row is the inconsistency SYN11 targets: the panel listed the
    // `/autocommit` command in its command reference but had NO matching setting
    // row. Hooks had no row at all despite being enumerated in the spec.
    const autoCommit = settings.find((s) => s.id === 'autoCommit')
    expect(autoCommit, 'the Auto-commit setting must have a row').toBeDefined()
    expect(autoCommit?.editCommand).toBe('autocommit')
    const hooks = settings.find((s) => s.id === 'hooks')
    expect(hooks, 'the Hooks setting must have a row').toBeDefined()
    // Hooks is configured in a file, not a slash command — a command-less row.
    expect(hooks?.editCommand).toBeUndefined()
  })

  it('has a setting row for EVERY listed command that edits a setting (no orphan command)', () => {
    // The structural guard for the SYN11 inconsistency: a command shown in the
    // settings card whose sole purpose is to change a user-controllable setting
    // must have a corresponding row, or the panel "shows a command for a hidden
    // setting" again. `/autocommit` is the case that regressed before this fix.
    const editedByARow = new Set(
      settings.map((s) => s.editCommand).filter((id): id is NonNullable<typeof id> => Boolean(id)),
    )
    const settingChangingCommands: ReadonlyArray<(typeof COMMANDS)[number]['id']> = [
      'model',
      'plan',
      'maxloops',
      'effort',
      'autofix',
      'autocommit',
      'sounds',
      'timestamps',
    ]
    for (const id of settingChangingCommands) {
      expect(
        COMMANDS.some((c) => c.id === id),
        `${id} must be a real registered command`,
      ).toBe(true)
      expect(editedByARow.has(id), `command /${id} is listed but has no settings row`).toBe(true)
    }
  })
})

describe('parseChatProjectSettings', () => {
  it('parses every well-typed settings field the chat panel hydrates', () => {
    expect(
      parseChatProjectSettings({
        chatModel: 'saved-model',
        planModel: 'plan-model',
        executeModel: 'execute-model',
        commitModel: 'commit-model',
        compactModel: 'compact-model',
        effortLevel: 'xhigh',
        effortByMode: { plan: 'high', execute: 'max' },
        modelRegions: { 'saved-model': 'us', 'plan-model': 'cn' },
        maxToolLoops: 250,
        autoFix: false,
        autoApproveCommands: true,
      }),
    ).toEqual({
      chatModel: 'saved-model',
      planModel: 'plan-model',
      executeModel: 'execute-model',
      commitModel: 'commit-model',
      compactModel: 'compact-model',
      effortLevel: 'xhigh',
      effortByMode: { plan: 'high', execute: 'max' },
      modelRegions: { 'saved-model': 'us', 'plan-model': 'cn' },
      maxToolLoops: 250,
      autoFix: false,
      autoApproveCommands: true,
    })
  })

  it('returns an empty result for an absent settings bag', () => {
    expect(parseChatProjectSettings(undefined)).toEqual({})
    expect(parseChatProjectSettings({})).toEqual({})
  })

  it('ignores values of the wrong type instead of coercing them', () => {
    expect(
      parseChatProjectSettings({
        chatModel: 42,
        planModel: null,
        executeModel: ['x'],
        commitModel: {},
        compactModel: true,
        maxToolLoops: '100',
        autoFix: 'yes',
        autoApproveCommands: 1,
      }),
    ).toEqual({})
  })

  it('keeps an empty persisted chat model (a real persisted state) but drops an empty effort level', () => {
    // `typeof chatModel === 'string'` accepted '' before the move; the effort
    // level required a non-empty string. Both behaviours are preserved.
    expect(parseChatProjectSettings({ chatModel: '', effortLevel: '' })).toEqual({ chatModel: '' })
  })

  it('accepts only string entries of the per-mode effort map', () => {
    expect(
      parseChatProjectSettings({ effortByMode: { plan: 'high', execute: '', commit: 3 } }),
    ).toEqual({ effortByMode: { plan: 'high' } })
    // The map's presence is itself reported: a valid-but-empty object clears the
    // React state, exactly as the original inline parse did.
    expect(parseChatProjectSettings({ effortByMode: {} })).toEqual({ effortByMode: {} })
    // Arrays and non-objects are ignored.
    expect(parseChatProjectSettings({ effortByMode: ['x'] })).toEqual({})
    expect(parseChatProjectSettings({ effortByMode: 'x' })).toEqual({})
  })

  it('keeps only known processing-region codes in the region map', () => {
    // MODEL_REGION_FLAGS is the closed set of regions the picker knows.
    expect(
      parseChatProjectSettings({
        modelRegions: { a: 'us', b: 'cn', c: 'eu', d: 7 },
      }),
    ).toEqual({ modelRegions: { a: 'us', b: 'cn' } })
    expect(parseChatProjectSettings({ modelRegions: {} })).toEqual({ modelRegions: {} })
    expect(parseChatProjectSettings({ modelRegions: ['us'] })).toEqual({})
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

describe('the notification-sound tables', () => {
  it('cycles modes in off → whenNotFocused → always order', () => {
    expect(SOUND_MODES).toEqual(['off', 'whenNotFocused', 'always'])
  })

  it('stores the preference under the same per-device key React always used', () => {
    expect(SOUNDS_STORAGE_KEY).toBe('molecule.ide.sounds')
  })

  it('defaults every event to the modes the chat panel shipped with', () => {
    expect(DEFAULT_SOUNDS_CONFIG).toEqual({
      message: 'always',
      done: 'whenNotFocused',
      error: 'whenNotFocused',
      tool_result: 'off',
      file_diff: 'off',
      commit_suggestion: 'off',
      mode: 'whenNotFocused',
      loop_limit_reached: 'whenNotFocused',
      verification_result: 'whenNotFocused',
      preview_error: 'whenNotFocused',
    })
    expect(Object.keys(DEFAULT_SOUNDS_CONFIG).sort()).toEqual([...SOUND_EVENTS].sort())
  })
})

describe('parseSoundsConfig', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(parseSoundsConfig(null)).toEqual(DEFAULT_SOUNDS_CONFIG)
    expect(parseSoundsConfig('')).toEqual(DEFAULT_SOUNDS_CONFIG)
  })

  it('returns the defaults for corrupt JSON instead of throwing', () => {
    expect(() => parseSoundsConfig('{not json')).not.toThrow()
    expect(parseSoundsConfig('{not json')).toEqual(DEFAULT_SOUNDS_CONFIG)
  })

  it('keeps only known events with known modes, and the defaults for anything else', () => {
    // A JSON string or array spread its index keys into the config, and an unknown mode
    // reached shouldPlaySound, while the type said every value was a SoundMode.
    expect(parseSoundsConfig('"x"')).toEqual(DEFAULT_SOUNDS_CONFIG)
    expect(parseSoundsConfig('[1]')).toEqual(DEFAULT_SOUNDS_CONFIG)
    expect(parseSoundsConfig('null')).toEqual(DEFAULT_SOUNDS_CONFIG)
    expect(
      parseSoundsConfig(JSON.stringify({ done: 'loud', retired_event: 'always', error: 'off' })),
    ).toEqual({ ...DEFAULT_SOUNDS_CONFIG, error: 'off' })
  })

  it('merges a legacy project value onto the current modes without dropping them', () => {
    const current = { ...DEFAULT_SOUNDS_CONFIG, message: 'off' as const }
    expect(mergeSoundsConfig(current, { done: 'always', message: 42 })).toEqual({
      ...current,
      done: 'always',
    })
    expect(mergeSoundsConfig(current, 'always')).toEqual(current)
  })

  it('overlays a partial stored config on the defaults', () => {
    expect(parseSoundsConfig(JSON.stringify({ done: 'always', preview_error: 'off' }))).toEqual({
      ...DEFAULT_SOUNDS_CONFIG,
      done: 'always',
      preview_error: 'off',
    })
  })

  it('returns a fresh object so a caller cannot mutate the shared defaults', () => {
    const parsed = parseSoundsConfig(null)
    parsed.message = 'off'
    expect(DEFAULT_SOUNDS_CONFIG.message).toBe('always')
    expect(parseSoundsConfig(null).message).toBe('always')
  })
})

describe('cycleSoundsConfig', () => {
  it('advances a single event through the full cycle', () => {
    const base: SoundsConfig = { ...DEFAULT_SOUNDS_CONFIG, tool_result: 'off' }
    const first = cycleSoundsConfig(base, 'tool_result')
    expect(first.tool_result).toBe('whenNotFocused')
    const second = cycleSoundsConfig(first, 'tool_result')
    expect(second.tool_result).toBe('always')
    const third = cycleSoundsConfig(second, 'tool_result')
    expect(third.tool_result).toBe('off')
  })

  it('leaves every other event untouched and does not mutate the input', () => {
    const base: SoundsConfig = { ...DEFAULT_SOUNDS_CONFIG }
    const next = cycleSoundsConfig(base, 'tool_result')
    expect(next.done).toBe(base.done)
    expect(next.message).toBe(base.message)
    expect(base.tool_result).toBe('off')
  })

  it("sets every event to the first event's next mode for 'all'", () => {
    // DEFAULT_SOUNDS_CONFIG.message is 'always', the last entry — so the whole
    // table wraps to 'off' in one click, exactly like the picker's All row.
    const allOff = cycleSoundsConfig({ ...DEFAULT_SOUNDS_CONFIG }, 'all')
    expect(Object.values(allOff)).toEqual(SOUND_EVENTS.map(() => 'off'))
    expect(Object.keys(allOff).sort()).toEqual([...SOUND_EVENTS].sort())

    const fromNotFocused: SoundsConfig = { ...DEFAULT_SOUNDS_CONFIG, message: 'whenNotFocused' }
    const allAlways = cycleSoundsConfig(fromNotFocused, 'all')
    expect(Object.values(allAlways)).toEqual(SOUND_EVENTS.map(() => 'always'))
  })
})

describe('shouldPlaySound', () => {
  it('never plays when the event is off, focused or not', () => {
    expect(shouldPlaySound('off', true)).toBe(false)
    expect(shouldPlaySound('off', false)).toBe(false)
  })

  it('always plays when the event is always, focused or not', () => {
    expect(shouldPlaySound('always', true)).toBe(true)
    expect(shouldPlaySound('always', false)).toBe(true)
  })

  it('plays the when-not-focused mode only while the page is unfocused', () => {
    expect(shouldPlaySound('whenNotFocused', true)).toBe(false)
    expect(shouldPlaySound('whenNotFocused', false)).toBe(true)
  })
})

/** A ToneAudioContext double that records everything {@link playTone} does to it. */
function fakeToneContext(): {
  context: ToneAudioContext
  connected: object[]
  gainSet: Array<[number, number]>
  gainRamp: Array<[number, number]>
  oscillator: ToneOscillator
  started: Array<number | undefined>
  stopped: Array<number | undefined>
} {
  const connected: object[] = []
  const gainSet: Array<[number, number]> = []
  const gainRamp: Array<[number, number]> = []
  const started: Array<number | undefined> = []
  const stopped: Array<number | undefined> = []
  const oscillator: ToneOscillator = {
    type: '',
    frequency: { value: 0 },
    connect: (destination) => {
      connected.push(destination)
    },
    start: (when) => {
      started.push(when)
    },
    stop: (when) => {
      stopped.push(when)
    },
  }
  const gain: ToneGain = {
    gain: {
      setValueAtTime: (value, when) => {
        gainSet.push([value, when])
      },
      exponentialRampToValueAtTime: (value, when) => {
        gainRamp.push([value, when])
      },
    },
    connect: (destination) => {
      connected.push(destination)
    },
  }
  const destination = {}
  return {
    context: {
      currentTime: 100,
      destination,
      createOscillator: () => oscillator,
      createGain: () => gain,
    },
    connected,
    gainSet,
    gainRamp,
    oscillator,
    started,
    stopped,
  }
}

describe('playTone', () => {
  // The shared AudioContext is module-level and created once, so each test
  // imports a fresh module instance — that is the only way to reach both the
  // "no context yet" and the "context already cached" branches.
  beforeEach(() => {
    vi.resetModules()
  })

  it('does not throw when the environment has no AudioContext', async () => {
    const { playTone } = await import('../components/chat-settings-utilities.js')
    // node's test environment has no AudioContext: `new AudioContext()` throws
    // and the helper swallows it, exactly like the React version did.
    expect(() => playTone()).not.toThrow()
  })

  it('swallows a factory that throws instead of propagating', async () => {
    const { playTone } = await import('../components/chat-settings-utilities.js')
    const factory = (): ToneAudioContext => {
      throw new Error('audio unavailable')
    }
    expect(() => playTone('default', factory)).not.toThrow()
  })

  it('creates the context lazily and plays the default 660 Hz blip', async () => {
    const { playTone } = await import('../components/chat-settings-utilities.js')
    const fake = fakeToneContext()
    let factoryCalls = 0
    const factory = (): ToneAudioContext => {
      factoryCalls += 1
      return fake.context
    }

    expect(factoryCalls).toBe(0)
    playTone('default', factory)
    expect(factoryCalls).toBe(1)

    expect(fake.oscillator.type).toBe('sine')
    expect(fake.oscillator.frequency.value).toBe(660)
    expect(fake.gainSet).toEqual([[0.15, 100]])
    expect(fake.gainRamp).toHaveLength(1)
    expect(fake.gainRamp[0][0]).toBe(0.001)
    expect(fake.gainRamp[0][1]).toBeCloseTo(100.15)
    expect(fake.started).toEqual([100])
    expect(fake.stopped).toHaveLength(1)
    expect(fake.stopped[0]).toBeCloseTo(100.15)
    // oscillator → gain → destination
    expect(fake.connected).toHaveLength(2)
    expect(fake.connected[1]).toBe(fake.context.destination)
  })

  it('reuses the cached context and plays the team variant an octave up', async () => {
    const { playTone } = await import('../components/chat-settings-utilities.js')
    const fake = fakeToneContext()
    let factoryCalls = 0
    const factory = (): ToneAudioContext => {
      factoryCalls += 1
      return fake.context
    }

    playTone('default', factory)
    playTone('team', factory)

    expect(factoryCalls).toBe(1)
    expect(fake.oscillator.frequency.value).toBe(1320)
    expect(fake.gainSet).toEqual([
      [0.15, 100],
      [0.08, 100],
    ])
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
