/**
 * Slash-command registry for the chat panel.
 *
 * Single source of truth for every `/command` the user can run. The command
 * menu, the keyboard dispatcher, AND the `/help` output are all generated from
 * this array so they can never drift out of sync. Add a new command here (plus
 * a branch in `executeCommand`) and it shows up everywhere automatically.
 *
 * @module
 */

/** Category keys used to group commands in the menu and in `/help`. */
export type CommandCategoryKey = 'context' | 'code' | 'model' | 'settings' | 'support'

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
  /** Short description shown in the menu and in `/help` (English default). */
  description: string
  /** Category this command is grouped under. */
  category: CommandCategoryKey
}

/**
 * Every available slash command, grouped by category order. This is the
 * authoritative list — the menu, key handling, and `/help` all read from it.
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

  // Code
  { id: 'commit', label: '/commit', description: 'Commit current changes', category: 'code' },
  { id: 'diff', label: '/diff', description: 'Show uncommitted changes', category: 'code' },
  {
    id: 'explain',
    label: '/explain',
    description: 'Explain code (e.g. /explain @file)',
    category: 'code',
  },
  { id: 'lint', label: '/lint', description: 'Run linter and fix issues', category: 'code' },
  { id: 'test', label: '/test', description: 'Run project test suite', category: 'code' },
  {
    id: 'undo',
    label: '/undo',
    description: "Revert last AI turn's file changes",
    category: 'code',
  },

  // Model
  { id: 'model', label: '/model', description: 'Switch model...', category: 'model' },
  {
    id: 'models',
    label: '/models',
    description: 'Compare available models in a sortable table',
    category: 'model',
  },
  { id: 'plan', label: '/plan', description: 'Toggle plan/execute mode', category: 'model' },
  { id: 'maxloops', label: '/maxloops', description: 'Set max tool iterations', category: 'model' },

  // Settings
  {
    id: 'autofix',
    label: '/autofix',
    description: 'Toggle auto-fix after AI file changes',
    category: 'settings',
  },
  { id: 'sounds', label: '/sounds', description: 'Notification sounds', category: 'settings' },

  // Support
  { id: 'help', label: '/help', description: 'Workflow guide & tips', category: 'support' },
] as const

/** Union of all command ids (loosely `string`, since {@link CommandDef.id} is a string). */
export type CommandId = CommandDef['id']
