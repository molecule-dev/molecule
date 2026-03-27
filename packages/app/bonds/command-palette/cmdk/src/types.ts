/**
 * cmdk-specific configuration types.
 *
 * @module
 */

/**
 * Provider-specific configuration for the cmdk command palette provider.
 */
export interface CmdkConfig {
  /**
   * Whether to use built-in fuzzy matching or defer to the consumer's
   * custom `filter` function. Defaults to `true` (built-in fuzzy).
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
  getFilteredGroups(): import('@molecule/app-command-palette').CommandGroup[]
  pushPage(pageId: string): void
  popPage(): boolean
  getPageStack(): string[]
  getCurrentPage(): string
  setGroups(groups: import('@molecule/app-command-palette').CommandGroup[]): void
  addGroup(group: import('@molecule/app-command-palette').CommandGroup): void
  removeGroup(groupId: string): void
  addCommand(groupId: string, command: import('@molecule/app-command-palette').CommandItem): void
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
