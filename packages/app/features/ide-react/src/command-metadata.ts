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
  'context' | 'code' | 'collaborate' | 'model' | 'settings' | 'support'

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
  /**
   * Alternate short forms (WITHOUT the slash) that also invoke this command —
   * e.g. `['t']` lets `/t <message>` invoke `/teamsay`. Matched by the chat
   * input's command dispatch alongside {@link id}.
   */
  aliases?: string[]
  /**
   * True for a human-only side-channel command handled by the HOST's server
   * (e.g. a team-chat note the agent never sees): the raw `/command` text is
   * sent to the backend, but NO optimistic user bubble is rendered — the server
   * emits the canonical `message` stream event (see the `ChatStreamEvent`
   * union), which IS the visible message, persisted and fanned out live to
   * every project member.
   */
  sideChannel?: boolean
  /**
   * True for commands a read-only project VIEWER may run — the ones that only
   * read, open a view-only surface, or set a per-user/per-device preference
   * (`/cost`, `/settings`, `/help`, `/mic`, …). Everything else writes shared
   * project state or triggers a Synthase turn (which the server 403s for a
   * viewer), so it is **default-denied** for viewers: omitting this flag means a
   * viewer cannot run the command, which is the safe default for any command
   * added later. Host side-channel commands (`sideChannel`, e.g. `/teamsay`) are
   * team communication, not project mutation — they set this so viewers can talk.
   */
  viewerSafe?: boolean
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
    description: "Show token usage & share of the project's AI allowance",
    category: 'context',
    viewerSafe: true,
  },
  {
    id: 'skills',
    label: '/skills',
    description: 'Browse & load project skills',
    category: 'context',
    usage: '/skills [query]',
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
    description: 'Browse & run saved scripts and built-in actions',
    category: 'code',
    usage: '/scripts [query]',
  },
  {
    id: 'run',
    label: '/run',
    description: 'Run a saved script or built-in by name',
    category: 'code',
    usage: '/run <name> [--option value]',
  },
  {
    id: 'autocommit',
    label: '/autocommit',
    description: 'Auto-commit N seconds after the last file change (0 cancels)',
    category: 'code',
    usage: '/autocommit <seconds>',
  },
  {
    id: 'autofix',
    label: '/autofix',
    description: 'Toggle auto-fix after AI file changes',
    category: 'code',
  },
  {
    id: 'autoapprove',
    label: '/autoapprove',
    description: 'Toggle auto-approving destructive commands (skip the Proceed confirm)',
    category: 'code',
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
    description: 'Switch the model for any mode (plan, execute, commit messages, compaction)',
    category: 'model',
    usage: '/model [name | --plan | --execute | --commit | --compact]',
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
    description: "Pick reasoning effort per mode from the model's own levels",
    category: 'model',
    usage: '/effort [--plan|--execute] [level]',
  },

  // Settings
  {
    id: 'settings',
    label: '/settings',
    description: "View & change {{agentName}}'s settings",
    category: 'settings',
    // The settings modal renders read-only for a viewer (every write control is
    // disabled), so opening it to look is fine.
    viewerSafe: true,
  },
  {
    id: 'sounds',
    label: '/sounds',
    description: 'Notification sounds',
    category: 'settings',
    // Per-user, per-device preference (localStorage) — nothing project-shared.
    viewerSafe: true,
  },
  {
    id: 'mic',
    label: '/mic',
    description: 'Choose the dictation engine (on-device / browser native)',
    category: 'settings',
    viewerSafe: true,
  },
  {
    id: 'dictate',
    label: '/dictate',
    description: 'Choose the dictation engine (alias for /mic)',
    category: 'settings',
    viewerSafe: true,
  },

  // Support
  {
    id: 'help',
    label: '/help',
    description: 'Workflow guide & tips',
    category: 'support',
    viewerSafe: true,
  },
  {
    id: 'report',
    label: '/report',
    description: 'Report a bug or send feedback',
    category: 'support',
    usage: '/report [title]',
    viewerSafe: true,
  },
  {
    id: 'bug',
    label: '/bug',
    description: 'Report a bug (alias for /report)',
    category: 'support',
    usage: '/bug [title]',
    viewerSafe: true,
  },
  {
    id: 'version',
    label: '/version',
    // Host-neutral: carries NO version number (the registry is also rendered into
    // the molecule.dev API system prompt, which can't reach the IDE's version). The
    // IDE menu appends the live version as an inline suffix at its render site —
    // same mechanism as /model's `(Claude)` / /maxloops's `(50)`. See ChatPanel.
    description: 'Show the app version',
    category: 'support',
    viewerSafe: true,
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

/**
 * True when `text` invokes a side-channel command ({@link CommandDef.sideChannel})
 * from `defs`, matched against the leading `/token` by command id or alias
 * (case-insensitive). Used by the chat input's dispatch AND the auto-send
 * (initialMessage) path so a side-channel send never renders an optimistic
 * "/command …" echo — the server's emitted `message` stream event is the one
 * visible message.
 *
 * @param defs - The command registry to consult (e.g. shared ∪ host commands).
 * @param text - The raw outgoing message text.
 * @returns Whether the text invokes a side-channel command.
 */
export function matchesSideChannelCommand(
  defs: readonly CommandDef[] | undefined,
  text: string,
): boolean {
  const token = text
    .trim()
    .match(/^\/(\S+)(?:\s|$)/)?.[1]
    ?.toLowerCase()
  if (!token) return false
  return !!defs?.some(
    (c) => c.sideChannel && (c.id.toLowerCase() === token || c.aliases?.includes(token)),
  )
}
