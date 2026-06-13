/**
 * Pure helpers backing the `/settings` view.
 *
 * Enumerates every user-controllable Synthase setting that ChatPanel keeps in
 * client state (model, mode, max tool loops, auto-fix, notification sounds)
 * into a flat, declarative list of {@link SettingDescriptor}s. Splitting the
 * enumeration out of the React component lets it be unit tested without
 * rendering, and ties each setting to the slash command that edits it so the
 * settings card and the command menu can never drift apart.
 *
 * All prose here is the English default; the {@link SettingsCard} wraps each
 * `label`/`description` in `t('ide.chat.settings.<id>.…', …, { defaultValue })`
 * at render time. The `value` is the already-formatted, display-ready current
 * value supplied by the caller (so dynamic, possibly-localized fragments stay
 * out of this pure layer).
 *
 * @module
 */

import type { CommandId } from './chat-commands.js'

/** Notification-sound mode for a single event (mirrors ChatPanel's `SoundMode`). */
export type SoundEventMode = 'off' | 'whenNotFocused' | 'always'

/** Describes a single user-controllable setting for the `/settings` view. */
export interface SettingDescriptor {
  /** Stable id (also the i18n key suffix, e.g. `'maxLoops'`). */
  id: string
  /** Human-readable label (English default). */
  label: string
  /** One-line explanation of what the setting does (English default). */
  description: string
  /** The formatted, display-ready current value (already localized by caller). */
  value: string
  /**
   * The slash command that edits this setting client-side, if any. Drives the
   * inline "Edit" affordance. Omitted for read-only settings.
   */
  editCommand?: CommandId
}

/**
 * Display-ready current values for the user-controllable settings. The caller
 * resolves these (model label from the catalog, on/off and mode words via
 * `t()`, sounds summary via {@link summarizeSounds}) so this layer stays pure.
 */
export interface SettingsDisplayValues {
  /** Current chat model's display label (or its id as a fallback). */
  model: string
  /** Current conversation mode, e.g. `'Plan'` or `'Execute'`. */
  mode: string
  /** Max tool iterations per turn, formatted as a string. */
  maxLoops: string
  /** Auto-fix state, e.g. `'On'` or `'Off'`. */
  autoFix: string
  /** Notification-sounds summary, e.g. `'3 of 9 events enabled'`. */
  sounds: string
}

/**
 * Builds the ordered list of user-controllable Synthase settings, each tagged
 * with the slash command that edits it. Reflects the values passed in so the
 * `/settings` card always shows the live state.
 *
 * @param values - Display-ready current values for each setting.
 * @returns One {@link SettingDescriptor} per controllable setting, in display order.
 */
export function buildSettingsList(values: SettingsDisplayValues): SettingDescriptor[] {
  return [
    {
      id: 'model',
      label: 'Model',
      description: 'The AI model Synthase uses to plan and write code.',
      value: values.model,
      editCommand: 'model',
    },
    {
      id: 'mode',
      label: 'Mode',
      description:
        'Plan mode researches and proposes without editing files; execute mode writes code.',
      value: values.mode,
      editCommand: 'plan',
    },
    {
      id: 'maxLoops',
      label: 'Max tool iterations',
      description:
        'Upper bound on the tool calls Synthase runs in one turn before it pauses for you.',
      value: values.maxLoops,
      editCommand: 'maxloops',
    },
    {
      id: 'autoFix',
      label: 'Auto-fix',
      description:
        'After AI edits, re-run type-check and lint and feed any errors back so Synthase fixes them.',
      value: values.autoFix,
      editCommand: 'autofix',
    },
    {
      id: 'sounds',
      label: 'Notification sounds',
      description: 'Per-event notification sounds for responses, errors, file changes, and more.',
      value: values.sounds,
      editCommand: 'sounds',
    },
  ]
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
