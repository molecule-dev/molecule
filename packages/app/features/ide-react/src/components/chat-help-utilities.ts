/**
 * `/help` text generation.
 *
 * The help body is built from the {@link COMMANDS} registry rather than a
 * hand-maintained string, so a newly-added command can never be missing from
 * `/help`. It enumerates every command grouped by category, explains the three
 * conversation modes (discovery / plan / execute), and lists efficiency tips.
 *
 * All prose is i18n-ready via `t(key, values, { defaultValue })`.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import { type AgentIdentity, DEFAULT_AGENT_IDENTITY } from '@molecule/app-react'

import type { CommandCategory, CommandDef } from './chat-commands.js'
import { COMMAND_CATEGORIES, COMMANDS } from './chat-commands.js'

/**
 * Builds the `/help` body listing every command grouped by category, the
 * conversation modes, and efficiency tips. Generated from the command registry
 * so it stays in sync automatically.
 *
 * @param identity - Agent/product display identity used to interpolate the
 *   `{{agentName}}` / `{{productName}}` tokens in the help copy (defaults to the
 *   neutral {@link DEFAULT_AGENT_IDENTITY} so the shared package never hardcodes
 *   a product name).
 * @param commands - Command registry to enumerate (defaults to {@link COMMANDS}).
 * @param categories - Ordered categories used as section headings (defaults to {@link COMMAND_CATEGORIES}).
 * @returns The fully-formatted, newline-delimited help text.
 */
export function buildHelpText(
  identity: AgentIdentity = DEFAULT_AGENT_IDENTITY,
  commands: readonly CommandDef[] = COMMANDS,
  categories: readonly CommandCategory[] = COMMAND_CATEGORIES,
): string {
  const { agentName, productName } = identity
  const lines: string[] = []

  lines.push(
    t('ide.chat.help.introHeading', undefined, { defaultValue: '── Getting Started ──' }),
    t(
      'ide.chat.help.intro',
      { agentName, productName },
      {
        defaultValue:
          "{{agentName}} is {{productName}}'s AI coding agent. Describe what you want to build and it will scaffold, code, and iterate with you.",
      },
    ),
    '',
  )

  // ── Commands, grouped by category, generated from the registry ──
  lines.push(t('ide.chat.help.commandsHeading', undefined, { defaultValue: '── Commands ──' }))
  for (const category of categories) {
    const inCategory = commands.filter((c) => c.category === category.key)
    if (inCategory.length === 0) continue
    lines.push(
      t(`ide.chat.help.category.${category.key}`, undefined, { defaultValue: category.label }),
    )
    for (const cmd of inCategory) {
      const description = t(
        `ide.chat.cmd.${cmd.id}.desc`,
        { agentName },
        {
          defaultValue: cmd.description,
        },
      )
      lines.push(`  ${cmd.label} — ${description}`)
    }
    lines.push('')
  }

  // ── Modes ──
  lines.push(
    t('ide.chat.help.modesHeading', undefined, { defaultValue: '── Modes ──' }),
    t(
      'ide.chat.help.modeDiscovery',
      { agentName },
      {
        defaultValue:
          'Discovery — new conversations start here. {{agentName}} asks clarifying questions to nail down requirements before writing any code.',
      },
    ),
    t(
      'ide.chat.help.modePlan',
      { agentName },
      {
        defaultValue:
          'Plan — {{agentName}} researches the codebase and proposes a plan WITHOUT editing files. Toggle with /plan. Best for big or risky changes.',
      },
    ),
    t(
      'ide.chat.help.modeExecute',
      { agentName },
      {
        defaultValue:
          'Execute — the default working mode. {{agentName}} writes code, runs tools, and applies changes, then verifies them.',
      },
    ),
    '',
  )

  // ── Efficiency tips ──
  lines.push(
    t('ide.chat.help.tipsHeading', undefined, { defaultValue: '── Tips ──' }),
    t('ide.chat.help.tipMention', undefined, {
      defaultValue:
        '• Type @filename to attach a project file as context (or drag & drop any file).',
    }),
    t('ide.chat.help.tipSlash', undefined, {
      defaultValue: '• Type / to browse every command above.',
    }),
    t(
      'ide.chat.help.tipPlan',
      { agentName },
      {
        defaultValue: '• Use /plan to have {{agentName}} research before making changes.',
      },
    ),
    t('ide.chat.help.tipUndo', undefined, {
      defaultValue: "• Use /undo to revert the last AI turn's file changes if it goes off track.",
    }),
    t('ide.chat.help.tipCompact', undefined, {
      defaultValue: '• Use /compact to compress context when the conversation gets long.',
    }),
    t('ide.chat.help.tipSpecific', undefined, {
      defaultValue:
        '• Be specific — "Add a login page with email/password and Google OAuth" beats "add auth".',
    }),
    '',
    t('ide.chat.help.shortcuts', undefined, {
      defaultValue: 'Press Cmd+/ (Ctrl+/ on Windows/Linux) to view all keyboard shortcuts.',
    }),
  )

  return lines.join('\n')
}
