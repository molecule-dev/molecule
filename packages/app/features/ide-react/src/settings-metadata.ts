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
 * This closes the SYN11 inconsistency: the panel previously hid settings while
 * listing their commands in the very same card. The Effort setting was hidden
 * while its `/effort` command was shown; the per-mode plan/execute models were
 * collapsed into a single "Model" row; the Auto-commit setting had its
 * `/autocommit` command shown with no matching row; and Hooks were enumerated in
 * the spec but absent entirely — so a user's actual configuration was
 * understated. Listing EVERY setting here (the per-mode models split out, plus
 * Effort, Auto-commit, and Hooks) makes the panel a faithful, complete view;
 * sourcing both the panel and the prompt from this one array makes the parity
 * structural rather than hand-maintained.
 *
 * Add a setting here (plus its display value in the card and a branch wherever
 * it is persisted) and it shows up in the `/settings` panel automatically — and
 * in the system prompt once that consumer reads this array. Because the consuming
 * side keys an exhaustive `Record<SettingKey, …>` off this union (the IDE card's
 * display values, the API's `project.settings` storage keys), adding a key here
 * fails those builds until each consumer binds the new setting — the compile-time
 * guarantee the lists can never silently drift.
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
  | 'autoCommit'
  | 'hooks'
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
 * into one "Model" row); `effort`, `autoCommit`, and `hooks` are each listed
 * alongside (or in `hooks`' case, instead of) the command the panel references —
 * so a user's actual configuration is never understated and the panel never
 * shows a command for a setting it hides.
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
      "How hard {{agentName}} thinks, set per mode using each mode's model-native levels (e.g. high/xhigh); also scales the agent loop budget.",
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
    id: 'autoCommit',
    label: 'Auto-commit',
    description:
      'Automatically commit your work a set number of seconds after the last file change (0 = off). Each change restarts the countdown, then it pauses after committing so a clean tree is never re-committed.',
    editCommand: 'autocommit',
  },
  {
    id: 'hooks',
    label: 'Hooks',
    description:
      "Shell commands that run before tool actions and can gate them — for example previewing a change before {{agentName}} overwrites or deletes a file. Configure them in your project's agent settings file.",
  },
  {
    id: 'sounds',
    label: 'Notification sounds',
    description: 'Per-event notification sounds for responses, errors, file changes, and more.',
    editCommand: 'sounds',
  },
] as const
