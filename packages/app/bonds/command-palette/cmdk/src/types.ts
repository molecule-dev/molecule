/**
 * cmdk-specific configuration types.
 *
 * @module
 */

import type { CommandGroup, CommandItem } from '@molecule/app-command-palette'

/**
 * Provider-specific configuration for the cmdk command palette provider.
 */
export interface CmdkConfig {
  /**
   * Whether the built-in matcher performs fuzzy (in-order subsequence)
   * matching in addition to exact substring matching. When `false`, only
   * exact case-insensitive substring matches are returned. A per-call
   * `options.filter` always takes precedence over the built-in matcher.
   * Defaults to `true` (fuzzy enabled).
   */
  defaultFuzzyMatch?: boolean

  /**
   * Default loop setting for keyboard navigation when no explicit
   * `loop` option is provided. Defaults to `true`.
   */
  defaultLoop?: boolean
}

/**
 * Extended command palette instance with cmdk-specific internal methods
 * used by framework bindings.
 */
export interface CmdkPaletteInstance {
  // -- Public API (from CommandPaletteInstance) --------------------------------
  open(): void
  close(): void
  toggle(): void
  isOpen(): boolean
  getQuery(): string
  setQuery(query: string): void
  getFilteredGroups(): CommandGroup[]
  pushPage(pageId: string): void
  popPage(): boolean
  getPageStack(): string[]
  getCurrentPage(): string
  setGroups(groups: CommandGroup[]): void
  addGroup(group: CommandGroup): void
  removeGroup(groupId: string): void
  addCommand(groupId: string, command: CommandItem): void
  removeCommand(commandId: string): void
  destroy(): void

  // -- Internal methods for framework bindings --------------------------------

  /** Returns the cmdk-specific config. */
  _getConfig(): CmdkConfig

  /** Returns whether keyboard navigation should loop. */
  _getLoop(): boolean

  /** Returns the placeholder for the current page. */
  _getPlaceholder(): string | undefined

  /**
   * Executes a command by id, handling page navigation returns.
   *
   * @param commandId - The id of the command to execute.
   */
  _executeCommand(commandId: string): void
}
