/**
 * React-free slash-command metadata — the single source of truth for every
 * `/command` the user can run.
 *
 * This module deliberately imports **nothing** (no React, no app-ui, no i18n)
 * so it can be consumed on *either* side of the api/app boundary. The IDE chat
 * surfaces (command menu, keyboard dispatcher, `/help`, the `/settings` card)
 * all read from {@link COMMANDS} here, AND the molecule.dev API system prompt
 * can import the same array (via the package's `./command-metadata` subpath
 * export) to render Synthase's "Available Commands" section. One list, two
 * consumers — so the agent can never claim a shipped command (e.g. `/share`)
 * does not exist, and the prompt can never drift behind the registry.
 *
 * Add a new command here (plus a branch in `executeCommand`) and it shows up
 * everywhere automatically — menu, `/help`, `/settings`, and the system prompt.
 *
 * @module
 */

/** Category keys used to group commands in the menu and in `/help`. */
export type CommandCategoryKey =
  | 'context'
  | 'code'
  | 'collaborate'
  | 'model'
  | 'settings'
  | 'support'

/** A command category with its display label. */
export interface CommandCategory {
  /** Stable category key referenced by {@link CommandDef.category}. */
  key: CommandCategoryKey
  /** Human-readable category heading (English default; wrapped in `t()` at render). */
  label: string
}

/** Ordered list of command categories used as section headings. */
export const COMMAND_CATEGORIES: readonly CommandCategory[] = [
  { key: 'context', label: 'Context' },
  { key: 'code', label: 'Code' },
  { key: 'collaborate', label: 'Collaborate' },
  { key: 'model', label: 'Model' },
  { key: 'settings', label: 'Settings' },
  { key: 'support', label: 'Support' },
] as const

/** Metadata describing a single slash command. */
export interface CommandDef {
  /** Command id (the part after the slash, e.g. `'help'`). */
  id: string
  /** Display label including the leading slash (e.g. `'/help'`). */
  label: string
  /**
   * Short description shown in the menu and in `/help` (English default). May
   * contain the `{{agentName}}` interpolation token, filled in by the render
   * sites (command menu, `/help`, `/settings` card) from the host's agent
   * identity (neutral default: "the assistant").
   */
  description: string
  /** Category this command is grouped under. */
  category: CommandCategoryKey
  /**
   * Argument syntax for commands that take options, shown in the `/settings`
   * command reference (English default). `[…]` = optional, `<…>` = required.
   * Omit for commands that take no arguments.
   */
  usage?: string
}

/**
 * Every available slash command, grouped by category order. This is the
 * authoritative list — the menu, key handling, `/help`, AND the system prompt's
 * "Available Commands" section all read from it.
 */
export const COMMANDS: readonly CommandDef[] = [
  // Context
  { id: 'clear', label: '/clear', description: 'Clear conversation', category: 'context' },
  {
    id: 'compact',
    label: '/compact',
    description: 'Compress context to free space',
    category: 'context',
  },
  {
    id: 'cost',
    label: '/cost',
    description: 'Show token usage & estimated cost',
    category: 'context',
  },
  {
    id: 'skills',
    label: '/skills',
    description: 'Browse & load project skills',
    category: 'context',
    usage: '/skills [query]',
  },
  {
    id: 'newskill',
    label: '/newskill',
    description: 'Create a new project skill',
    category: 'context',
    usage: '/newskill [name]',
  },

  // Code
  { id: 'commit', label: '/commit', description: 'Commit current changes', category: 'code' },
  {
    id: 'explain',
    label: '/explain',
    description: 'Explain code (e.g. /explain @file)',
    category: 'code',
    usage: '/explain [@file | topic]',
  },
  {
    id: 'lint',
    label: '/lint',
    description: 'Run linter and fix issues',
    category: 'code',
    usage: '/lint [path]',
  },
  {
    id: 'test',
    label: '/test',
    description: 'Run project test suite',
    category: 'code',
    usage: '/test [args]',
  },
  {
    id: 'undo',
    label: '/undo',
    description: "Revert last AI turn's file changes",
    category: 'code',
  },
  {
    id: 'scripts',
    label: '/scripts',
    description: 'Browse & run saved project scripts',
    category: 'code',
    usage: '/scripts [query]',
  },
  {
    id: 'run',
    label: '/run',
    description: 'Run a saved script by name',
    category: 'code',
    usage: '/run <name>',
  },
  {
    id: 'autocommit',
    label: '/autocommit',
    description: 'Auto-commit N seconds after the last file change (0 cancels)',
    category: 'code',
    usage: '/autocommit <seconds>',
  },

  // Collaborate
  {
    id: 'share',
    label: '/share',
    description: 'Create a public share link for this project',
    category: 'collaborate',
    usage: '/share [viewer | commenter | editor | owner]',
  },

  // Model
  {
    id: 'model',
    label: '/model',
    description: 'Switch model (use --plan / --execute for per-mode models)',
    category: 'model',
    usage: '/model [name | --plan | --execute]',
  },
  { id: 'plan', label: '/plan', description: 'Toggle plan/execute mode', category: 'model' },
  {
    id: 'maxloops',
    label: '/maxloops',
    description: 'Set max tool iterations',
    category: 'model',
    usage: '/maxloops <n>',
  },
  {
    id: 'effort',
    label: '/effort',
    description: 'Set reasoning effort (S/M/L/XL); /effort ? shows current',
    category: 'model',
    usage: '/effort <S|M|L|XL>',
  },

  // Settings
  {
    id: 'settings',
    label: '/settings',
    description: "View & change {{agentName}}'s settings",
    category: 'settings',
  },
  {
    id: 'autofix',
    label: '/autofix',
    description: 'Toggle auto-fix after AI file changes',
    category: 'settings',
  },
  { id: 'sounds', label: '/sounds', description: 'Notification sounds', category: 'settings' },

  // Support
  { id: 'help', label: '/help', description: 'Workflow guide & tips', category: 'support' },
  {
    id: 'report',
    label: '/report',
    description: 'Report a bug or send feedback',
    category: 'support',
    usage: '/report [title]',
  },
  {
    id: 'bug',
    label: '/bug',
    description: 'Report a bug (alias for /report)',
    category: 'support',
    usage: '/bug [title]',
  },
] as const

/** Union of all command ids (loosely `string`, since {@link CommandDef.id} is a string). */
export type CommandId = CommandDef['id']

/** A category paired with the commands that belong to it. */
export interface CommandGroup {
  /** The category metadata (key + label). */
  category: CommandCategory
  /** Commands in this category, in registry order. */
  commands: CommandDef[]
}

/**
 * Groups commands under their categories, preserving category and command
 * order and dropping empty categories. Used by the `/settings` command
 * reference (and any other view that lists commands by section) so the
 * grouping stays in sync with the registry automatically.
 *
 * @param commands - Command registry to group (defaults to {@link COMMANDS}).
 * @param categories - Ordered categories (defaults to {@link COMMAND_CATEGORIES}).
 * @returns One {@link CommandGroup} per non-empty category, in category order.
 */
export function groupCommandsByCategory(
  commands: readonly CommandDef[] = COMMANDS,
  categories: readonly CommandCategory[] = COMMAND_CATEGORIES,
): CommandGroup[] {
  const groups: CommandGroup[] = []
  for (const category of categories) {
    const inCategory = commands.filter((c) => c.category === category.key)
    if (inCategory.length > 0) groups.push({ category, commands: inCategory })
  }
  return groups
}
