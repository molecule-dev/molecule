/**
 * React-free settings metadata — the single source of truth for every
 * user-controllable agent setting the `/settings` view shows.
 *
 * Mirrors {@link module:./command-metadata}: this module deliberately imports
 * **nothing that pulls in React** (only TYPES — the `CommandId` *type* from the
 * sibling command registry and the i18n function types, both erased from the
 * emitted JS — and the pure auto-commit default constant), so it
 * can be consumed on *either* side of the api/app boundary. The IDE `/settings` card derives its rows from
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

import type { InterpolationValues, TranslateFunction } from '@molecule/app-i18n'

import type { CommandId } from './command-metadata.js'
import { DEFAULT_AUTO_COMMIT_SECONDS } from './components/chat-autocommit-utilities.js'

/** Stable ids for each user-controllable setting (also the i18n key suffix). */
export type SettingKey =
  | 'model'
  | 'planModel'
  | 'executeModel'
  | 'commitModel'
  | 'compactModel'
  | 'mode'
  | 'effort'
  | 'maxLoops'
  | 'autoFix'
  | 'autoCommit'
  | 'hooks'
  | 'autoApproveCommands'
  | 'sounds'
  | 'timestamps'

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
    id: 'commitModel',
    label: 'Commit-message model',
    description: 'The model that writes commit messages. Falls back to a fast default when unset.',
    editCommand: 'model',
    editInput: '/model --commit',
  },
  {
    id: 'compactModel',
    label: 'Compaction model',
    description:
      'The model that summarizes older messages when the conversation nears its context limit. Falls back to a fast default when unset.',
    editCommand: 'model',
    editInput: '/model --compact',
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
    description: `Automatically commit your work a set number of seconds after the last file change — on by default (${DEFAULT_AUTO_COMMIT_SECONDS}s; 0 = off), and it waits until {{agentName}} finishes its turn before committing. Each change restarts the countdown, then it pauses after committing so a clean tree is never re-committed.`,
    editCommand: 'autocommit',
  },
  {
    id: 'hooks',
    label: 'Hooks',
    description:
      "Shell commands that run before tool actions and can gate them — for example previewing a change before {{agentName}} overwrites or deletes a file. Configure them in your project's agent settings file.",
  },
  {
    id: 'autoApproveCommands',
    label: 'Auto-approve commands',
    description:
      "Skip the 'Proceed?' confirmation before {{agentName}} runs a bulk/destructive command (a hard reset, a recursive delete, an in-place edit). Network access still follows the project's allowlist unless Full access is on.",
    editCommand: 'autoapprove',
  },
  {
    id: 'sounds',
    label: 'Notification sounds',
    description: 'Per-event notification sounds for responses, errors, file changes, and more.',
    editCommand: 'sounds',
  },
  {
    id: 'timestamps',
    label: 'Timestamps',
    description:
      'Show the time on every chat message and event. Off by default; your own messages and critical events always show it. This device only.',
    editCommand: 'timestamps',
  },
] as const

/**
 * The localized label of a user-controllable setting (the
 * `ide.chat.settings.<id>.label` keys), through the CALLER's translate function
 * so a framework port and a live locale switch both get their own text. One
 * literal `t()` call per {@link SettingKey}, chosen by a switch exhaustive over
 * the union: adding a setting to {@link SETTINGS} without adding its case here
 * is a compile error, so a setting can never ship with no translation site.
 * Each `defaultValue` equals that setting's `label` field, so the English
 * output is identical either way.
 *
 * @param t - The caller's translate function (React passes `useTranslation()`'s `t`).
 * @param id - The setting id.
 * @returns The localized label.
 */
export function settingLabel(t: TranslateFunction, id: SettingKey): string {
  switch (id) {
    case 'model':
      return t('ide.chat.settings.model.label', undefined, { defaultValue: 'Default model' })
    case 'planModel':
      return t('ide.chat.settings.planModel.label', undefined, {
        defaultValue: 'Plan-mode model',
      })
    case 'executeModel':
      return t('ide.chat.settings.executeModel.label', undefined, {
        defaultValue: 'Execute-mode model',
      })
    case 'commitModel':
      return t('ide.chat.settings.commitModel.label', undefined, {
        defaultValue: 'Commit-message model',
      })
    case 'compactModel':
      return t('ide.chat.settings.compactModel.label', undefined, {
        defaultValue: 'Compaction model',
      })
    case 'mode':
      return t('ide.chat.settings.mode.label', undefined, { defaultValue: 'Mode' })
    case 'effort':
      return t('ide.chat.settings.effort.label', undefined, { defaultValue: 'Reasoning effort' })
    case 'maxLoops':
      return t('ide.chat.settings.maxLoops.label', undefined, {
        defaultValue: 'Max tool iterations',
      })
    case 'autoFix':
      return t('ide.chat.settings.autoFix.label', undefined, { defaultValue: 'Auto-fix' })
    case 'autoCommit':
      return t('ide.chat.settings.autoCommit.label', undefined, { defaultValue: 'Auto-commit' })
    case 'hooks':
      return t('ide.chat.settings.hooks.label', undefined, { defaultValue: 'Hooks' })
    case 'autoApproveCommands':
      return t('ide.chat.settings.autoApproveCommands.label', undefined, {
        defaultValue: 'Auto-approve commands',
      })
    case 'sounds':
      return t('ide.chat.settings.sounds.label', undefined, { defaultValue: 'Notification sounds' })
    case 'timestamps':
      return t('ide.chat.settings.timestamps.label', undefined, { defaultValue: 'Timestamps' })
  }
}

/**
 * The localized one-line explanation of a user-controllable setting (the
 * `ide.chat.settings.<id>.desc` keys), through the CALLER's translate function.
 * One literal `t()` call per {@link SettingKey}, exhaustive over the union (see
 * {@link settingLabel}). Each `defaultValue` equals that setting's `description`
 * field, so the English output is identical either way; the descriptions
 * interpolate `{{agentName}}`, filled from the caller's agent identity.
 *
 * @param t - The caller's translate function.
 * @param id - The setting id.
 * @param values - Interpolation values (the descriptions interpolate `{{agentName}}`).
 * @returns The localized description.
 */
export function settingDescription(
  t: TranslateFunction,
  id: SettingKey,
  values?: InterpolationValues,
): string {
  switch (id) {
    case 'model':
      return t('ide.chat.settings.model.desc', values, {
        defaultValue: "The model {{agentName}} uses when a mode-specific model isn't set.",
      })
    case 'planModel':
      return t('ide.chat.settings.planModel.desc', values, {
        defaultValue: 'The model used in plan mode. Falls back to the default model when unset.',
      })
    case 'executeModel':
      return t('ide.chat.settings.executeModel.desc', values, {
        defaultValue: 'The model used in execute mode. Falls back to the default model when unset.',
      })
    case 'commitModel':
      return t('ide.chat.settings.commitModel.desc', values, {
        defaultValue:
          'The model that writes commit messages. Falls back to a fast default when unset.',
      })
    case 'compactModel':
      return t('ide.chat.settings.compactModel.desc', values, {
        defaultValue:
          'The model that summarizes older messages when the conversation nears its context limit. Falls back to a fast default when unset.',
      })
    case 'mode':
      return t('ide.chat.settings.mode.desc', values, {
        defaultValue:
          'Plan mode researches and proposes without editing files; execute mode writes code.',
      })
    case 'effort':
      return t('ide.chat.settings.effort.desc', values, {
        defaultValue:
          "How hard {{agentName}} thinks, set per mode using each mode's model-native levels (e.g. high/xhigh); also scales the agent loop budget.",
      })
    case 'maxLoops':
      return t('ide.chat.settings.maxLoops.desc', values, {
        defaultValue:
          'Upper bound on the tool calls {{agentName}} runs in one turn before it pauses for you.',
      })
    case 'autoFix':
      return t('ide.chat.settings.autoFix.desc', values, {
        defaultValue:
          'After AI edits, re-run type-check and lint and feed any errors back so {{agentName}} fixes them.',
      })
    case 'autoCommit':
      // Literal, not built from DEFAULT_AUTO_COMMIT_SECONDS: a translation
      // default must be one literal English text (the i18n gate refuses a
      // default built in code). The 5 here IS that default — if the constant
      // moves, this text and the bond's move with it.
      return t('ide.chat.settings.autoCommit.desc', values, {
        defaultValue:
          'Automatically commit your work a set number of seconds after the last file change — on by default (5s; 0 = off), and it waits until {{agentName}} finishes its turn before committing. Each change restarts the countdown, then it pauses after committing so a clean tree is never re-committed.',
      })
    case 'hooks':
      return t('ide.chat.settings.hooks.desc', values, {
        defaultValue:
          "Shell commands that run before tool actions and can gate them — for example previewing a change before {{agentName}} overwrites or deletes a file. Configure them in your project's agent settings file.",
      })
    case 'autoApproveCommands':
      return t('ide.chat.settings.autoApproveCommands.desc', values, {
        defaultValue:
          "Skip the 'Proceed?' confirmation before {{agentName}} runs a bulk/destructive command (a hard reset, a recursive delete, an in-place edit). Network access still follows the project's allowlist unless Full access is on.",
      })
    case 'sounds':
      return t('ide.chat.settings.sounds.desc', values, {
        defaultValue:
          'Per-event notification sounds for responses, errors, file changes, and more.',
      })
    case 'timestamps':
      return t('ide.chat.settings.timestamps.desc', values, {
        defaultValue:
          'Show the time on every chat message and event. Off by default; your own messages and critical events always show it. This device only.',
      })
  }
}
