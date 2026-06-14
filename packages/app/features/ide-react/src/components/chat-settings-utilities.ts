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
 * wraps each `label`/`description` in `t('ide.chat.settings.<id>.…', …,
 * { defaultValue })` at render time. The `value` is the already-formatted,
 * display-ready current value supplied by the caller (so dynamic,
 * possibly-localized fragments stay out of this pure layer).
 *
 * @module
 */

import type { SettingKey, SettingMeta } from '../settings-metadata.js'
import { SETTINGS } from '../settings-metadata.js'

/** Notification-sound mode for a single event (mirrors ChatPanel's `SoundMode`). */
export type SoundEventMode = 'off' | 'whenNotFocused' | 'always'

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
