/**
 * React-free settings metadata — the single source of truth for every
 * user-controllable agent setting the `/settings` view shows.
 *
 * Mirrors {@link module:./command-metadata}: this module deliberately imports
 * **nothing** that pulls in React or i18n (only the `CommandId` *type* from the
 * sibling command registry), so it can be consumed on *either* side of the
 * api/app boundary. The IDE `/settings` card derives its rows from
 * {@link SETTINGS} here (zipping in live, display-ready values via
 * `buildSettingsList`), and the molecule.dev API system prompt can import the
 * SAME array through the package's `./settings-metadata` subpath export to
 * render its "User-Controllable Settings" section. One list, two consumers — so
 * the settings the agent claims to respect can never drift from the settings
 * the panel actually shows.
 *
 * This closes the SYN11 inconsistency: the panel previously hid the Effort
 * setting while listing its `/effort` command in the very same card, and
 * collapsed the per-mode plan/execute models into a single "Model" row — so a
 * user's actual configuration was understated. Splitting the default model from
 * the per-mode `planModel` / `executeModel` rows and adding the Effort row makes
 * the panel a faithful, complete view; sourcing both the panel and the prompt
 * from this one array makes the parity structural rather than hand-maintained.
 *
 * Add a setting here (plus its display value in the card and a branch wherever
 * it is persisted) and it shows up in the `/settings` panel automatically — and
 * in the system prompt once that consumer reads this array.
 *
 * @module
 */

import type { CommandId } from './command-metadata.js'

/** Stable ids for each user-controllable setting (also the i18n key suffix). */
export type SettingKey =
  | 'model'
  | 'planModel'
  | 'executeModel'
  | 'mode'
  | 'effort'
  | 'maxLoops'
  | 'autoFix'
  | 'sounds'

/** Canonical, value-free metadata for a single user-controllable setting. */
export interface SettingMeta {
  /** Stable id (also the i18n key suffix, e.g. `'effort'`). */
  id: SettingKey
  /** Human-readable label (English default; wrapped in `t()` at render). */
  label: string
  /**
   * One-line explanation of what the setting does (English default). May
   * contain the `{{agentName}}` interpolation token, filled in at render from
   * the host's agent identity (neutral default: "the assistant").
   */
  description: string
  /**
   * The slash command that edits this setting client-side. Drives the inline
   * "Edit" affordance and cross-links the setting to its command. Omitted only
   * for read-only settings.
   */
  editCommand?: CommandId
  /**
   * The exact slash-command input to prefill when editing, for settings whose
   * bare {@link SettingMeta.editCommand} is not specific enough — e.g. the
   * per-mode model rows both run the `model` command but must scope it to a
   * mode (`/model --plan`, `/model --execute`). Omit when running the bare
   * command suffices.
   */
  editInput?: string
}

/**
 * Every user-controllable setting, in display order. The authoritative list —
 * the `/settings` view (via `buildSettingsList`) and the system prompt both read
 * from it, so they cannot drift. The default `model` and the per-mode
 * `planModel` / `executeModel` rows are kept distinct (rather than collapsed
 * into one "Model" row), and the `effort` setting is listed alongside the
 * `/effort` command the panel already references — so a user's actual
 * configuration is never understated.
 */
export const SETTINGS: readonly SettingMeta[] = [
  {
    id: 'model',
    label: 'Default model',
    description: "The model {{agentName}} uses when a mode-specific model isn't set.",
    editCommand: 'model',
  },
  {
    id: 'planModel',
    label: 'Plan-mode model',
    description: 'The model used in plan mode. Falls back to the default model when unset.',
    editCommand: 'model',
    editInput: '/model --plan',
  },
  {
    id: 'executeModel',
    label: 'Execute-mode model',
    description: 'The model used in execute mode. Falls back to the default model when unset.',
    editCommand: 'model',
    editInput: '/model --execute',
  },
  {
    id: 'mode',
    label: 'Mode',
    description:
      'Plan mode researches and proposes without editing files; execute mode writes code.',
    editCommand: 'plan',
  },
  {
    id: 'effort',
    label: 'Reasoning effort',
    description:
      'How hard {{agentName}} thinks (S/M/L/XL): scales the reasoning budget on models that expose one, and always scales the agent loop budget.',
    editCommand: 'effort',
  },
  {
    id: 'maxLoops',
    label: 'Max tool iterations',
    description:
      'Upper bound on the tool calls {{agentName}} runs in one turn before it pauses for you.',
    editCommand: 'maxloops',
  },
  {
    id: 'autoFix',
    label: 'Auto-fix',
    description:
      'After AI edits, re-run type-check and lint and feed any errors back so {{agentName}} fixes them.',
    editCommand: 'autofix',
  },
  {
    id: 'sounds',
    label: 'Notification sounds',
    description: 'Per-event notification sounds for responses, errors, file changes, and more.',
    editCommand: 'sounds',
  },
] as const
