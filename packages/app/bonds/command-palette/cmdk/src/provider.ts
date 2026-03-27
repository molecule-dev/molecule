/**
 * cmdk-style implementation of the molecule CommandPaletteProvider.
 *
 * Provides a headless command palette state manager following cmdk patterns.
 * Framework bindings (React, Vue, etc.) use the extended
 * {@link CmdkPaletteInstance} internal methods to sync DOM interactions
 * with provider state.
 *
 * @module
 */

import type {
  CommandGroup,
  CommandItem,
  CommandPage,
  CommandPaletteInstance,
  CommandPaletteOptions,
  CommandPaletteProvider,
} from '@molecule/app-command-palette'

import type { CmdkConfig, CmdkPaletteInstance } from './types.js'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Default fuzzy matching score function. Matches if all query characters
 * appear in order within the target, case-insensitive.
 *
 * @param query - Search query.
 * @param target - Target string to match against.
 * @returns Score > 0 if matched (higher = better), 0 if not matched.
 */
function defaultFuzzyScore(query: string, target: string): number {
  if (query.length === 0) return 1
  const lowerQuery = query.toLowerCase()
  const lowerTarget = target.toLowerCase()

  // Exact substring match scores highest
  if (lowerTarget.includes(lowerQuery)) {
    return 2 + lowerQuery.length / lowerTarget.length
  }

  // Fuzzy: all chars in order
  let qi = 0
  for (let ti = 0; ti < lowerTarget.length && qi < lowerQuery.length; ti++) {
    if (lowerTarget[ti] === lowerQuery[qi]) {
      qi++
    }
  }

  return qi === lowerQuery.length ? 1 : 0
}

/**
 * Scores a command item against a query.
 *
 * @param query - Search query.
 * @param item - The command item.
 * @returns Score > 0 if matched, 0 if not.
 */
function scoreItem(query: string, item: CommandItem): number {
  let best = defaultFuzzyScore(query, item.label)

  if (item.keywords) {
    for (const keyword of item.keywords) {
      const score = defaultFuzzyScore(query, keyword)
      if (score > best) best = score
    }
  }

  return best
}

/**
 * Clones a command group deeply (commands are cloned by spread).
 *
 * @param group - Group to clone.
 * @returns A cloned group.
 */
function cloneGroup(group: CommandGroup): CommandGroup {
  return {
    ...group,
    commands: group.commands.map((c) => ({ ...c })),
  }
}

/**
 * Sorts groups by priority descending.
 *
 * @param groups - Groups to sort.
 * @returns Sorted groups array.
 */
function sortGroups(groups: CommandGroup[]): CommandGroup[] {
  return [...groups].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
}

/**
 * Sorts commands within a group by priority descending.
 *
 * @param commands - Commands to sort.
 * @returns Sorted commands array.
 */
function sortCommands(commands: CommandItem[]): CommandItem[] {
  return [...commands].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
}

// ---------------------------------------------------------------------------
// Palette instance
// ---------------------------------------------------------------------------

/**
 * Creates a CmdkPaletteInstance managing command palette state in memory.
 *
 * @param options - Command palette configuration from the core interface.
 * @param config - Optional cmdk-specific configuration.
 * @returns A CmdkPaletteInstance backed by in-memory state.
 */
function createPaletteInstance(
  options: CommandPaletteOptions,
  config: CmdkConfig = {},
): CmdkPaletteInstance {
  let groups = options.groups.map(cloneGroup)
  const pages: Map<string, CommandPage> = new Map()
  let pageStack: string[] = ['root']
  let query = ''
  let opened = false
  const loop = options.loop ?? config.defaultLoop ?? true
  const useFuzzy = config.defaultFuzzyMatch ?? true

  // Register pages
  if (options.pages) {
    for (const page of options.pages) {
      pages.set(page.id, {
        ...page,
        groups: page.groups.map(cloneGroup),
      })
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Returns the groups for the current page.
   *
   * @returns Groups of the current page.
   */
  function currentGroups(): CommandGroup[] {
    const currentPageId = pageStack[pageStack.length - 1]
    if (currentPageId === 'root') return groups
    const page = pages.get(currentPageId)
    return page ? page.groups : []
  }

  /**
   * Finds a command across all current groups.
   *
   * @param commandId - The command id.
   * @returns The found command or undefined.
   */
  function findCommand(commandId: string): CommandItem | undefined {
    for (const group of currentGroups()) {
      const cmd = group.commands.find((c) => c.id === commandId)
      if (cmd) return cmd
    }
    return undefined
  }

  // -------------------------------------------------------------------------
  // Instance
  // -------------------------------------------------------------------------

  const instance: CmdkPaletteInstance = {
    // -- Open / Close ------------------------------------------------------

    open(): void {
      if (!opened) {
        opened = true
        query = ''
        options.onOpen?.()
      }
    },

    close(): void {
      if (opened) {
        opened = false
        query = ''
        pageStack = ['root']
        options.onClose?.()
      }
    },

    toggle(): void {
      if (opened) {
        instance.close()
      } else {
        instance.open()
      }
    },

    isOpen(): boolean {
      return opened
    },

    // -- Search ------------------------------------------------------------

    getQuery(): string {
      return query
    },

    setQuery(q: string): void {
      query = q
      options.onSearch?.(q)
    },

    getFilteredGroups(): CommandGroup[] {
      const src = currentGroups()

      if (query.length === 0) {
        return sortGroups(src).map((g) => ({
          ...g,
          commands: sortCommands(g.commands),
        }))
      }

      const customFilter = options.filter
      const result: CommandGroup[] = []

      for (const group of sortGroups(src)) {
        const scored: Array<{ cmd: CommandItem; score: number }> = []

        for (const cmd of group.commands) {
          let score: number
          if (customFilter && !useFuzzy) {
            score = customFilter(query, cmd)
          } else if (customFilter) {
            score = customFilter(query, cmd)
          } else {
            score = scoreItem(query, cmd)
          }
          if (score > 0) {
            scored.push({ cmd, score })
          }
        }

        if (scored.length > 0) {
          scored.sort((a, b) => b.score - a.score)
          result.push({
            ...group,
            commands: scored.map((s) => s.cmd),
          })
        }
      }

      return result
    },

    // -- Page navigation ---------------------------------------------------

    pushPage(pageId: string): void {
      if (pages.has(pageId)) {
        pageStack.push(pageId)
        query = ''
      }
    },

    popPage(): boolean {
      if (pageStack.length <= 1) return false
      pageStack.pop()
      query = ''
      return true
    },

    getPageStack(): string[] {
      return [...pageStack]
    },

    getCurrentPage(): string {
      return pageStack[pageStack.length - 1]
    },

    // -- Commands ----------------------------------------------------------

    setGroups(newGroups: CommandGroup[]): void {
      groups = newGroups.map(cloneGroup)
    },

    addGroup(group: CommandGroup): void {
      const existing = groups.find((g) => g.id === group.id)
      if (existing) {
        // Merge commands, avoiding duplicates
        const existingIds = new Set(existing.commands.map((c) => c.id))
        for (const cmd of group.commands) {
          if (!existingIds.has(cmd.id)) {
            existing.commands.push({ ...cmd })
          }
        }
      } else {
        groups.push(cloneGroup(group))
      }
    },

    removeGroup(groupId: string): void {
      groups = groups.filter((g) => g.id !== groupId)
    },

    addCommand(groupId: string, command: CommandItem): void {
      const group = groups.find((g) => g.id === groupId)
      if (group) {
        group.commands.push({ ...command })
      }
    },

    removeCommand(commandId: string): void {
      for (const group of groups) {
        group.commands = group.commands.filter((c) => c.id !== commandId)
      }
    },

    // -- Lifecycle ---------------------------------------------------------

    destroy(): void {
      groups = []
      pages.clear()
      pageStack = ['root']
      query = ''
      opened = false
    },

    // -- Internal methods for framework bindings ---------------------------

    _getConfig(): CmdkConfig {
      return { ...config }
    },

    _getLoop(): boolean {
      return loop
    },

    _getPlaceholder(): string | undefined {
      const currentPageId = pageStack[pageStack.length - 1]
      if (currentPageId === 'root') return options.placeholder
      const page = pages.get(currentPageId)
      return page?.placeholder ?? options.placeholder
    },

    _executeCommand(commandId: string): void {
      const cmd = findCommand(commandId)
      if (!cmd || cmd.disabled) return
      const result = cmd.onSelect()
      if (typeof result === 'string') {
        instance.pushPage(result)
      }
    },
  }

  return instance
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Creates a cmdk-style command palette provider.
 *
 * @param config - Optional cmdk-specific configuration.
 * @returns A `CommandPaletteProvider` backed by cmdk-style state management.
 *
 * @example
 * ```typescript
 * import { createCmdkProvider } from '@molecule/app-command-palette-cmdk'
 * import { setProvider } from '@molecule/app-command-palette'
 *
 * setProvider(createCmdkProvider())
 * ```
 */
export function createCmdkProvider(config: CmdkConfig = {}): CommandPaletteProvider {
  return {
    createPalette(options: CommandPaletteOptions): CommandPaletteInstance {
      return createPaletteInstance(options, config)
    },
  }
}

/** Default cmdk command palette provider instance. */
export const provider: CommandPaletteProvider = createCmdkProvider()
