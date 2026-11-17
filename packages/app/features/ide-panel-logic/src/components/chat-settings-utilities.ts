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
 * a runtime-built `ide.chat.soundEvent.${event}` key.
 *
 * @module
 */

import type { InterpolationValues, TranslateFunction } from '@molecule/app-i18n'

import type { SettingKey, SettingMeta } from '../settings-metadata.js'
import { SETTINGS } from '../settings-metadata.js'

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
