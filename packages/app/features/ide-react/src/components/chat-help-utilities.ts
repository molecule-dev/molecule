/**
 * `/help` content model + plain-text generation.
 *
 * The help content is a concise high-level guide built from the structured
 * {@link HELP_MODES} / {@link HELP_TIPS} constants below — never a
 * hand-maintained string — so the rich {@link module:./HelpCard | HelpCard} and
 * this plain-text fallback can never drift (both read the SAME constants). It
 * explains the three conversation modes (discovery / plan / execute) and lists
 * efficiency tips. It deliberately does NOT relist the slash commands — typing
 * `/` opens the command menu, which does that better.
 *
 * `buildHelpText` is the i18n plain-text fallback (used as the system card's
 * copy/screen-reader text and in any non-React consumer); `HelpCard` renders the
 * same model as a card matching the `/settings` / `/skills` cards.
 *
 * All prose is i18n-ready via `t(key, values, { defaultValue })`.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import { type AgentIdentity, DEFAULT_AGENT_IDENTITY } from '@molecule/app-react'

/**
 * The `/help` intro paragraph (i18n key + English default). Shared by the
 * plain-text {@link buildHelpText} fallback and the rich `HelpCard`. May
 * interpolate the `{{agentName}}` / `{{productName}}` tokens.
 */
export const HELP_INTRO = {
  /** i18n key for the intro paragraph. */
  key: 'ide.chat.help.intro',
  /** English default for {@link HELP_INTRO.key}. */
  defaultValue:
    "{{agentName}} is {{productName}}'s AI coding agent. Describe what you want to build and it will scaffold, code, and iterate with you.",
} as const

/** A conversation mode shown in `/help`, with its icon-set glyph and i18n copy. */
export interface HelpMode {
  /** Mode id (also the `data-mol-id` suffix in the card). */
  id: 'discovery' | 'plan' | 'execute'
  /**
   * Icon-set glyph name rendered beside the mode in the rich `HelpCard`
   * (ignored by the plain-text {@link buildHelpText} fallback).
   */
  icon: string
  /** i18n key for the one-line mode description (may interpolate `{{agentName}}`). */
  key: string
  /** English default for {@link HelpMode.key}. */
  defaultValue: string
}

/**
 * The three conversation modes, in the order shown in `/help`. The single
 * source of truth for both the plain-text fallback and the `HelpCard`.
 */
export const HELP_MODES: readonly HelpMode[] = [
  {
    id: 'discovery',
    icon: 'question',
    key: 'ide.chat.help.modeDiscovery',
    defaultValue:
      'Discovery — new conversations start here. {{agentName}} asks clarifying questions to nail down requirements before writing any code.',
  },
  {
    id: 'plan',
    icon: 'search',
    key: 'ide.chat.help.modePlan',
    defaultValue:
      'Plan — {{agentName}} researches the codebase and proposes a plan WITHOUT editing files. Toggle with /plan. Best for big or risky changes.',
  },
  {
    id: 'execute',
    icon: 'pencil',
    key: 'ide.chat.help.modeExecute',
    defaultValue:
      'Execute — the default working mode. {{agentName}} writes code, runs tools, and applies changes, then verifies them.',
  },
] as const

/** An efficiency tip shown in `/help`. */
export interface HelpTip {
  /** Tip id (also the `data-mol-id` suffix in the card). */
  id: string
  /** i18n key for the tip (may interpolate `{{agentName}}`). */
  key: string
  /**
   * English default for {@link HelpTip.key}, INCLUDING the leading `•` bullet so
   * it matches the values shipped in the companion locale bonds (and so the
   * plain-text fallback stays byte-identical).
   */
  defaultValue: string
}

/** The efficiency tips, in the order shown in `/help`. */
export const HELP_TIPS: readonly HelpTip[] = [
  {
    id: 'mention',
    key: 'ide.chat.help.tipMention',
    defaultValue: '• Type @filename to attach a project file as context (or drag & drop any file).',
  },
  {
    id: 'slash',
    key: 'ide.chat.help.tipSlash',
    defaultValue: '• Type / to browse every command.',
  },
  {
    id: 'plan',
    key: 'ide.chat.help.tipPlan',
    defaultValue: '• Use /plan to have {{agentName}} research before making changes.',
  },
  {
    id: 'undo',
    key: 'ide.chat.help.tipUndo',
    defaultValue: "• Use /undo to revert the last AI turn's file changes if it goes off track.",
  },
  {
    id: 'compact',
    key: 'ide.chat.help.tipCompact',
    defaultValue: '• Use /compact to compress context when the conversation gets long.',
  },
  {
    id: 'specific',
    key: 'ide.chat.help.tipSpecific',
    defaultValue:
      '• Be specific — "Add a login page with email/password and Google OAuth" beats "add auth".',
  },
] as const

/** The keyboard-shortcuts footer line shown at the end of `/help`. */
export const HELP_SHORTCUTS = {
  /** i18n key for the shortcuts footer. */
  key: 'ide.chat.help.shortcuts',
  /** English default for {@link HELP_SHORTCUTS.key}. */
  defaultValue: 'Press Cmd+/ (Ctrl+/ on Windows/Linux) to view all keyboard shortcuts.',
} as const

/**
 * Builds the `/help` body — a concise high-level guide covering the conversation
 * modes and efficiency tips. It deliberately does NOT relist the slash commands;
 * typing `/` opens the command menu, which does that better. Generated from the
 * shared {@link HELP_MODES} / {@link HELP_TIPS} constants so it stays in sync
 * automatically — and never drifts from the rich `HelpCard`, which renders the
 * same model.
 *
 * @param identity - Agent/product display identity used to interpolate the
 *   `{{agentName}}` / `{{productName}}` tokens in the help copy (defaults to the
 *   neutral {@link DEFAULT_AGENT_IDENTITY} so the shared package never hardcodes
 *   a product name).
 * @returns The fully-formatted, newline-delimited help text.
 */
export function buildHelpText(identity: AgentIdentity = DEFAULT_AGENT_IDENTITY): string {
  const { agentName, productName } = identity
  const values = { agentName, productName }
  const lines: string[] = []

  // ── Getting started ──
  lines.push(
    t('ide.chat.help.introHeading', undefined, { defaultValue: '── Getting Started ──' }),
    t(HELP_INTRO.key, values, { defaultValue: HELP_INTRO.defaultValue }),
    '',
  )

  // ── Modes ──
  lines.push(t('ide.chat.help.modesHeading', undefined, { defaultValue: '── Modes ──' }))
  for (const helpMode of HELP_MODES) {
    lines.push(t(helpMode.key, values, { defaultValue: helpMode.defaultValue }))
  }
  lines.push('')

  // ── Efficiency tips ──
  lines.push(t('ide.chat.help.tipsHeading', undefined, { defaultValue: '── Tips ──' }))
  for (const tip of HELP_TIPS) {
    lines.push(t(tip.key, values, { defaultValue: tip.defaultValue }))
  }
  lines.push('', t(HELP_SHORTCUTS.key, undefined, { defaultValue: HELP_SHORTCUTS.defaultValue }))

  return lines.join('\n')
}
