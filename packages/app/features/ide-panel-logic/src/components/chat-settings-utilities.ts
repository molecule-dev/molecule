/**
 * Pure helpers backing the `/settings` view.
 *
 * The list of user-controllable settings itself now lives in the React-free
 * {@link module:../settings-metadata | settings-metadata} module at the package
 * root — the **single source of truth** that can be imported on either side of
 * the api/app boundary (the IDE `/settings` card here, and the molecule.dev API
 * system prompt's "User-Controllable Settings" section via the package's
 * `./settings-metadata` subpath export). This module adds no settings of its
 * own; it zips that canonical metadata together with the already-formatted,
 * display-ready current values into a flat list of {@link SettingDescriptor}s
 * the React {@link SettingsCard} renders. Splitting the value-binding out of the
 * component lets it be unit tested without rendering, and deriving from the
 * shared metadata is what keeps the settings card and the canonical list (and
 * the command menu) from ever drifting apart — the SYN11 fix.
 *
 * All prose in the metadata is the English default; the {@link SettingsCard}
 * wraps each `label`/`description` in the `settingLabel`/`settingDescription`
 * helpers (literal keys, one per setting) at render time. The `value` is the
 * already-formatted, display-ready current value supplied by the caller (so
 * dynamic, possibly-localized fragments stay out of this pure layer).
 *
 * This module also owns the notification-sound tables (the event list, the
 * mode cycle types and the English mode labels) and the label helpers for
 * them, so every framework's chat panel reads the SAME sound vocabulary — and
 * so every sound label is a literal `t()` call the i18n gate can check, never
 * a runtime-built `ide.chat.soundEvent.${event}` key. The same module parses
 * and cycles the per-device sounds preference and owns the notification tone
 * (`playTone`, with an injectable AudioContext factory) and the focus-aware
 * {@link shouldPlaySound} gate, so every port plays the same tones on the same
 * events.
 *
 * @module
 */

import type { EffortLevel } from '@molecule/app-ai-models'
import type { InterpolationValues, TranslateFunction } from '@molecule/app-i18n'

import type { SettingKey, SettingMeta } from '../settings-metadata.js'
import { SETTINGS } from '../settings-metadata.js'
import type { EffortMode } from './chat-effort-utilities.js'
import { MODEL_REGION_FLAGS } from './chat-models-utilities.js'

/** Notification-sound mode for a single event (mirrors ChatPanel's `SoundMode`). */
export type SoundEventMode = 'off' | 'whenNotFocused' | 'always'

/**
 * ChatPanel's notification-sound mode — the same union as
 * {@link SoundEventMode} under the name the chat panel's state uses.
 */
export type SoundMode = SoundEventMode

/**
 * A canonical {@link SettingMeta} paired with its display-ready current value —
 * what the `/settings` card renders for one row.
 */
export type SettingDescriptor = SettingMeta & {
  /** The formatted, display-ready current value (already localized by caller). */
  value: string
}

/**
 * Display-ready current values for the user-controllable settings, keyed by the
 * canonical {@link SettingKey}. The caller resolves these (model labels from the
 * catalog, on/off and mode words via `t()`, the effort label, the sounds summary
 * via {@link summarizeSounds}) so this layer stays pure.
 */
export type SettingsDisplayValues = Record<SettingKey, string>

/**
 * The per-project chat settings the chat panel hydrates from
 * `GET /projects/:id` `settings`. Each field is present only when the stored
 * value passed that field's type check; `undefined` means "leave the current
 * React state alone".
 */
export interface ParsedChatProjectSettings {
  /** The persisted legacy chat model id (may be an empty string). */
  chatModel?: string
  /** The plan-mode model id. */
  planModel?: string
  /** The execute-mode model id. */
  executeModel?: string
  /** The commit-message model id. */
  commitModel?: string
  /** The conversation-compaction model id. */
  compactModel?: string
  /** The legacy single reasoning-effort value (only non-empty strings). */
  effortLevel?: string
  /** The per-mode effort map (present when the stored shape is a valid object). */
  effortByMode?: Partial<Record<EffortMode, EffortLevel>>
  /** The per-model processing-region map (known regions only). */
  modelRegions?: Record<string, string>
  /** The max tool-iterations setting. */
  maxToolLoops?: number
  /** Whether auto-fix is enabled. */
  autoFix?: boolean
  /** Whether destructive-command auto-approve is enabled. */
  autoApproveCommands?: boolean
}

/**
 * Parses the chat-related settings out of a project's `settings` bag — the
 * untrusted JSON an initialized project stores. Both the mount hydration and
 * the change-signal re-read run this exact parse, so they can never drift.
 *
 * @param raw - The project's `settings` bag (or `undefined` when absent).
 * @returns The values that parsed cleanly, keyed by settings field.
 */
export function parseChatProjectSettings(
  raw: Record<string, unknown> | undefined,
): ParsedChatProjectSettings {
  const parsed: ParsedChatProjectSettings = {}
  if (typeof raw?.chatModel === 'string') {
    parsed.chatModel = raw.chatModel
  }
  if (typeof raw?.planModel === 'string') parsed.planModel = raw.planModel
  if (typeof raw?.executeModel === 'string') parsed.executeModel = raw.executeModel
  if (typeof raw?.commitModel === 'string') parsed.commitModel = raw.commitModel
  if (typeof raw?.compactModel === 'string') parsed.compactModel = raw.compactModel
  // The persisted value is the model's own native level — accept any non-empty
  // string; it's resolved against the active model at use time.
  if (typeof raw?.effortLevel === 'string' && raw.effortLevel) {
    parsed.effortLevel = raw.effortLevel
  }
  // Per-mode effort map — accept each string entry (untrusted JSON bag).
  if (
    raw?.effortByMode &&
    typeof raw.effortByMode === 'object' &&
    !Array.isArray(raw.effortByMode)
  ) {
    const next: Partial<Record<EffortMode, EffortLevel>> = {}
    for (const m of ['plan', 'execute'] as const) {
      const value = (raw.effortByMode as Record<string, unknown>)[m]
      if (typeof value === 'string' && value) next[m] = value
    }
    parsed.effortByMode = next
  }
  // Per-model processing region map — accept each known-region entry
  // (untrusted JSON bag), mirroring effortByMode above.
  if (
    raw?.modelRegions &&
    typeof raw.modelRegions === 'object' &&
    !Array.isArray(raw.modelRegions)
  ) {
    const nextRegions: Record<string, string> = {}
    for (const [id, value] of Object.entries(raw.modelRegions as Record<string, unknown>)) {
      if (typeof value === 'string' && value in MODEL_REGION_FLAGS) nextRegions[id] = value
    }
    parsed.modelRegions = nextRegions
  }
  if (typeof raw?.maxToolLoops === 'number') parsed.maxToolLoops = raw.maxToolLoops
  if (typeof raw?.autoFix === 'boolean') parsed.autoFix = raw.autoFix
  if (typeof raw?.autoApproveCommands === 'boolean') {
    parsed.autoApproveCommands = raw.autoApproveCommands
  }
  return parsed
}

/**
 * Builds the ordered list of user-controllable agent settings by zipping the
 * canonical {@link SETTINGS} metadata together with the supplied display-ready
 * values, so the `/settings` card always shows the live state AND can never
 * drift from the shared single source of truth.
 *
 * Each `description` may contain the `{{agentName}}` interpolation token; the
 * caller ({@link SettingsCard}) fills it in from the host's agent identity
 * (neutral default: "the assistant") at render time.
 *
 * @param values - Display-ready current values for each setting, keyed by {@link SettingKey}.
 * @returns One {@link SettingDescriptor} per setting in {@link SETTINGS}, in display order.
 */
export function buildSettingsList(values: SettingsDisplayValues): SettingDescriptor[] {
  return SETTINGS.map((meta) => ({ ...meta, value: values[meta.id] }))
}

/** Aggregate enabled/total counts for a notification-sounds config. */
export interface SoundsSummary {
  /** Number of events set to anything other than `'off'`. */
  enabled: number
  /** Total number of sound events. */
  total: number
}

/**
 * Summarizes a notification-sounds config into enabled/total counts. Pure and
 * deterministic; the component turns the counts into a localized string.
 *
 * @param sounds - Per-event sound modes (event name → mode).
 * @returns The number of enabled events and the total event count.
 */
export function summarizeSounds(sounds: Record<string, SoundEventMode>): SoundsSummary {
  const modes = Object.values(sounds)
  return {
    enabled: modes.filter((mode) => mode !== 'off').length,
    total: modes.length,
  }
}

/** All stream event types that can trigger a notification sound. */
export const SOUND_EVENTS = [
  'message',
  'done',
  'error',
  'tool_result',
  'file_diff',
  'commit_suggestion',
  'mode',
  'loop_limit_reached',
  'verification_result',
  'preview_error',
] as const

/** A stream event type that can trigger a notification sound. */
export type SoundEventType = (typeof SOUND_EVENTS)[number]

/** Mode cycle order. */
export const SOUND_MODES: SoundMode[] = ['off', 'whenNotFocused', 'always']

/** The per-event sound modes, keyed by {@link SoundEventType}. */
export type SoundsConfig = Record<SoundEventType, SoundMode>

/** Per-device sounds preference (see the soundsConfig state comment). */
export const SOUNDS_STORAGE_KEY = 'molecule.ide.sounds'

/** The sound modes a device starts with, before any local preference is stored. */
export const DEFAULT_SOUNDS_CONFIG: SoundsConfig = {
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
}

/**
 * Whether a value is one of the {@link SOUND_MODES}.
 *
 * @param value - Any value, such as one read from storage.
 * @returns True for `'off'`, `'whenNotFocused'` or `'always'`.
 */
export const isSoundMode = (value: unknown): value is SoundMode =>
  SOUND_MODES.some((mode) => mode === value)

/**
 * Parses the stored per-device sounds preference, filling any missing event
 * from {@link DEFAULT_SOUNDS_CONFIG}. A missing or corrupt stored value keeps
 * the defaults, so an unreadable preference never silences the panel; so does
 * an entry that is not a known event with a known mode (a value stored by an
 * older or newer build), which is dropped rather than copied in.
 *
 * @param raw - The raw localStorage value (or `null` when nothing is stored).
 * @returns The parsed sound modes, every event present.
 */
export function parseSoundsConfig(raw: string | null): SoundsConfig {
  if (!raw) return { ...DEFAULT_SOUNDS_CONFIG }
  let stored: unknown
  try {
    stored = JSON.parse(raw)
  } catch (_error) {
    // Bad JSON: the defaults stand.
    return { ...DEFAULT_SOUNDS_CONFIG }
  }
  return mergeSoundsConfig(DEFAULT_SOUNDS_CONFIG, stored)
}

/**
 * Overlays a stored sounds value on `base`: each known event whose stored mode is a
 * known mode replaces the base's, and everything else (a non-object, an unknown event
 * or mode) is ignored, as a project's legacy `settings.sounds` needs.
 *
 * @param base - The sound modes to start from.
 * @param stored - The stored value, of any shape.
 * @returns A new config, every event present.
 */
export function mergeSoundsConfig(base: SoundsConfig, stored: unknown): SoundsConfig {
  const config = { ...base }
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return config
  for (const event of SOUND_EVENTS) {
    const mode: unknown = Reflect.get(stored, event)
    if (isSoundMode(mode)) config[event] = mode
  }
  return config
}

/**
 * Cycles one sound event's mode to the next entry in {@link SOUND_MODES}, or
 * every event at once when `eventType` is `'all'` — what the sounds picker
 * applies on a row click.
 *
 * @param config - The current per-event sound modes.
 * @param eventType - The event to cycle, or `'all'` for every event.
 * @returns The updated config (a new object; the input is not mutated).
 */
export function cycleSoundsConfig(
  config: SoundsConfig,
  eventType: SoundEventType | 'all',
): SoundsConfig {
  if (eventType === 'all') {
    const current = config[SOUND_EVENTS[0]]
    const nextIdx = (SOUND_MODES.indexOf(current) + 1) % SOUND_MODES.length
    const next = SOUND_MODES[nextIdx]
    return Object.fromEntries(SOUND_EVENTS.map((e) => [e, next])) as SoundsConfig
  }
  const current = config[eventType]
  const nextIdx = (SOUND_MODES.indexOf(current) + 1) % SOUND_MODES.length
  const next = SOUND_MODES[nextIdx]
  return { ...config, [eventType]: next }
}

/**
 * Check if a sound should play based on the mode and current page focus.
 *
 * @param mode - The sound mode for the event.
 * @param hasFocus - Whether the page currently has focus (the caller reads it, e.g. `document.hasFocus()`).
 * @returns Whether the sound should play.
 */
export function shouldPlaySound(mode: SoundMode, hasFocus: boolean): boolean {
  if (mode === 'off') return false
  if (mode === 'always') return true
  return !hasFocus
}

/** A connectable tone node — the gain node, or the context's output destination. */
export type ToneAudioNode = object

/** The oscillator members {@link playTone} drives (a subset of the DOM `OscillatorNode`). */
export interface ToneOscillator {
  /** Waveform shape. */
  type: string
  /** Oscillator frequency in Hz. */
  frequency: { value: number }
  /** Routes this oscillator into the tone's gain node. */
  connect(destination: ToneAudioNode): void
  /** Starts the tone at the given context time. */
  start(when?: number): void
  /** Stops the tone at the given context time. */
  stop(when?: number): void
}

/** The gain members {@link playTone} drives (a subset of the DOM `GainNode`). */
export interface ToneGain {
  /** The gain envelope the tone's volume is shaped with. */
  gain: {
    /** Pins the gain to `value` at context time `when`. */
    setValueAtTime(value: number, when: number): void
    /** Ramps the gain exponentially to `value` at context time `when`. */
    exponentialRampToValueAtTime(value: number, when: number): void
  }
  /** Routes this gain into a destination node. */
  connect(destination: ToneAudioNode): void
}

/** The AudioContext members {@link playTone} uses (a subset of the DOM `AudioContext`). */
export interface ToneAudioContext {
  /** The context's current time in seconds. */
  currentTime: number
  /** The output node the tone is routed to. */
  destination: ToneAudioNode
  /** Creates the tone's oscillator. */
  createOscillator(): ToneOscillator
  /** Creates the tone's gain node. */
  createGain(): ToneGain
}

/** Creates the notification tone's audio context. Injectable so hosts and tests can substitute one. */
export type AudioContextFactory = () => ToneAudioContext

/** The lazily-created AudioContext shared by every {@link playTone} call. */
let audioCtx: ToneAudioContext | null = null

/** The default AudioContext factory: the browser's own `new AudioContext()`. */
const createDefaultAudioContext: AudioContextFactory = () => new AudioContext()

/**
 * Play a short notification tone using the Web Audio API.
 * Creates the AudioContext lazily on first call (after user interaction).
 *
 * The default variant is a single 660 Hz blip (status events). The `team`
 * variant is the SAME blip an octave up (1320 Hz) — recognizably "a message,
 * not a status event" while staying consistent with the sound family.
 * @param variant - Which tone to play.
 * @param createAudioContext - Factory for the lazily-created AudioContext (defaults to `new AudioContext()`).
 */
export function playTone(
  variant: 'default' | 'team' = 'default',
  createAudioContext: AudioContextFactory = createDefaultAudioContext,
): void {
  try {
    if (!audioCtx) audioCtx = createAudioContext()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.type = 'sine'
    osc.frequency.value = variant === 'team' ? 1320 : 660
    // Equal-loudness compensation: hearing is far more sensitive near 1–4 kHz
    // than at 660 Hz, so the octave-up tone needs roughly half the amplitude
    // to sound the same volume as the default blip.
    const peak = variant === 'team' ? 0.08 : 0.15
    gain.gain.setValueAtTime(peak, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15)
    osc.start(audioCtx.currentTime)
    osc.stop(audioCtx.currentTime + 0.15)
  } catch (_error) {
    // AudioContext not available in this environment — silently skip
  }
}

/**
 * English label per sound mode (also each key's `defaultValue` in
 * {@link soundModeLabel}). Kept as a table because the chat panel spells the
 * mode word directly into non-translated suffixes (the `/sounds` command's
 * inline state suffix); the translated path goes through {@link soundModeLabel}.
 */
export const SOUND_MODE_LABELS: Record<SoundMode, string> = {
  off: 'off',
  whenNotFocused: 'when not focused',
  always: 'always',
}

/**
 * The localized label of a notification-sound EVENT (the
 * `ide.chat.soundEvent.<event>` keys), through the CALLER's translate function.
 * One literal `t()` call per {@link SoundEventType}, chosen by a switch
 * exhaustive over the union: adding an event to {@link SOUND_EVENTS} without
 * adding its case here is a compile error, so an event can never ship with no
 * translation site. Each `defaultValue` is the event's English label.
 *
 * @param t - The caller's translate function (React passes `useTranslation()`'s `t`).
 * @param event - The sound event type.
 * @returns The localized event label.
 */
export function soundEventLabel(t: TranslateFunction, event: SoundEventType): string {
  switch (event) {
    case 'message':
      return t('ide.chat.soundEvent.message', undefined, { defaultValue: 'Team message' })
    case 'done':
      return t('ide.chat.soundEvent.done', undefined, { defaultValue: 'Response complete' })
    case 'error':
      return t('ide.chat.soundEvent.error', undefined, { defaultValue: 'Error' })
    case 'tool_result':
      return t('ide.chat.soundEvent.tool_result', undefined, { defaultValue: 'Tool finished' })
    case 'file_diff':
      return t('ide.chat.soundEvent.file_diff', undefined, { defaultValue: 'File changed' })
    case 'commit_suggestion':
      return t('ide.chat.soundEvent.commit_suggestion', undefined, {
        defaultValue: 'Commit suggested',
      })
    case 'mode':
      return t('ide.chat.soundEvent.mode', undefined, { defaultValue: 'Mode changed' })
    case 'loop_limit_reached':
      return t('ide.chat.soundEvent.loop_limit_reached', undefined, {
        defaultValue: 'Loop limit reached',
      })
    case 'verification_result':
      return t('ide.chat.soundEvent.verification_result', undefined, {
        defaultValue: 'Verification result',
      })
    case 'preview_error':
      return t('ide.chat.soundEvent.preview_error', undefined, { defaultValue: 'Preview error' })
  }
}

/**
 * The localized one-line description of a notification-sound event (the
 * `ide.chat.soundEventDesc.<event>` keys), through the CALLER's translate
 * function. One literal `t()` call per {@link SoundEventType}, exhaustive (see
 * {@link soundEventLabel}). The `done` and `commit_suggestion` descriptions
 * interpolate `{{agentName}}`, filled from the caller's agent identity.
 *
 * @param t - The caller's translate function.
 * @param event - The sound event type.
 * @param values - Interpolation values (`{{agentName}}`).
 * @returns The localized event description.
 */
export function soundEventDescription(
  t: TranslateFunction,
  event: SoundEventType,
  values?: InterpolationValues,
): string {
  switch (event) {
    case 'message':
      return t('ide.chat.soundEventDesc.message', values, {
        defaultValue: 'A teammate posted a team-only note',
      })
    case 'done':
      return t('ide.chat.soundEventDesc.done', values, {
        defaultValue: '{{agentName}} finished responding',
      })
    case 'error':
      return t('ide.chat.soundEventDesc.error', values, {
        defaultValue: 'Something went wrong during a response',
      })
    case 'tool_result':
      return t('ide.chat.soundEventDesc.tool_result', values, {
        defaultValue: 'A tool call (file read, command, etc.) completed',
      })
    case 'file_diff':
      return t('ide.chat.soundEventDesc.file_diff', values, {
        defaultValue: 'A file was created or modified',
      })
    case 'commit_suggestion':
      return t('ide.chat.soundEventDesc.commit_suggestion', values, {
        defaultValue: '{{agentName}} is suggesting files to commit',
      })
    case 'mode':
      return t('ide.chat.soundEventDesc.mode', values, {
        defaultValue: 'Switched between plan mode and execute mode',
      })
    case 'loop_limit_reached':
      return t('ide.chat.soundEventDesc.loop_limit_reached', values, {
        defaultValue: 'Hit the max tool iterations limit',
      })
    case 'verification_result':
      return t('ide.chat.soundEventDesc.verification_result', values, {
        defaultValue: 'Lint or type-check finished running',
      })
    case 'preview_error':
      return t('ide.chat.soundEventDesc.preview_error', values, {
        defaultValue: 'The live preview encountered an error',
      })
  }
}

/**
 * The localized label of a notification-sound MODE (the
 * `ide.chat.soundMode.<mode>` keys), through the CALLER's translate function.
 * One literal `t()` call per {@link SoundMode}, exhaustive over the union. The
 * mixed state (events set to different modes) has its own `mixed` key — the
 * caller picks it; this function only labels a single mode.
 *
 * @param t - The caller's translate function.
 * @param mode - The sound mode.
 * @returns The localized mode label.
 */
export function soundModeLabel(t: TranslateFunction, mode: SoundMode): string {
  switch (mode) {
    case 'off':
      return t('ide.chat.soundMode.off', undefined, { defaultValue: 'off' })
    case 'whenNotFocused':
      return t('ide.chat.soundMode.whenNotFocused', undefined, {
        defaultValue: 'when not focused',
      })
    case 'always':
      return t('ide.chat.soundMode.always', undefined, { defaultValue: 'always' })
  }
}
