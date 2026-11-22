/**
 * The file explorer's tree derivations and its touch long-press recognizer —
 * the Svelte counterpart of the module-local helpers in
 * `@molecule/app-ide-react`'s `FileExplorer` (see that file for the design
 * notes). They are view derivations (sorted rows, the visible list, ancestor
 * paths), not the framework-neutral panel logic `@molecule/app-ide-panel-logic`
 * owns, so they live beside the component that renders them.
 *
 * @module
 */

import { onDestroy } from 'svelte'

import type { FileNode } from '@molecule/app-ide-panel-logic'
import type { ExpandState } from '@molecule/app-ide-panel-logic/panels'

/** Git status → filename color — dark/light variants for readability. */
export const DARK_GIT_COLORS: Record<string, string> = {
  modified: '#e2c08d',
  added: '#73c991',
  untracked: '#73c991',
  deleted: '#c74e39',
}

/** The light theme's variants of {@link DARK_GIT_COLORS}. */
export const LIGHT_GIT_COLORS: Record<string, string> = {
  modified: '#8a6010',
  added: '#1a7030',
  untracked: '#1a7030',
  deleted: '#a03020',
}

/** Priority order for propagating the most important status to parent directories. */
const STATUS_PRIORITY: Record<string, number> = {
  deleted: 3,
  modified: 2,
  added: 1,
  untracked: 1,
}

/** How long a touch must hold still before it counts as a long-press. */
export const LONG_PRESS_MS = 500

/** Finger drift beyond this many pixels cancels a pending long-press. */
const LONG_PRESS_MOVE_TOLERANCE_PX = 10

/** Max total FileTreeItems to render in a single FileExplorer pass. */
export const MAX_RENDERED_NODES = 10_000

/**
 * Compute the highest-priority git status color for a directory by checking
 * all entries in fileStatuses whose paths start with the directory path.
 * @param dirPath - The directory path to check.
 * @param fileStatuses - Map of file paths to git status strings.
 * @param colors - Map of git status names to CSS color values.
 * @returns The color string for the highest-priority child status, or undefined.
 */
export function getDirColor(
  dirPath: string,
  fileStatuses: Record<string, string>,
  colors: Record<string, string>,
): string | undefined {
  let bestPriority = 0
  let bestStatus: string | undefined
  const prefix = dirPath + '/'
  for (const [path, status] of Object.entries(fileStatuses)) {
    if (path.startsWith(prefix)) {
      const p = STATUS_PRIORITY[status] ?? 0
      if (p > bestPriority) {
        bestPriority = p
        bestStatus = status
      }
    }
  }
  return bestStatus ? colors[bestStatus] : undefined
}

/**
 * Determines whether a directory path should be expanded based on persisted state.
 * @param state - The current expand/collapse state.
 * @param path - The directory path to check.
 * @param depth - The nesting depth (directories at depth 0 default to expanded).
 * @returns True when the directory should be shown expanded.
 */
export function isExpandedFromState(state: ExpandState, path: string, depth: number): boolean {
  if (state.expanded.has(path)) return true
  if (state.collapsed.has(path)) return false
  return depth < 1
}

/**
 * Returns the ancestor directory paths for a given file path (e.g. "a/b/c.ts" → ["a", "a/b"]).
 * @param filePath - The full file path to extract ancestors from.
 * @returns An array of ancestor directory paths, from shallowest to deepest.
 */
export function getAncestorPaths(filePath: string): string[] {
  const parts = filePath.split('/')
  const ancestors: string[] = []
  for (let i = 1; i < parts.length; i++) {
    ancestors.push(parts.slice(0, i).join('/'))
  }
  return ancestors
}

/**
 * Find a node and its depth in the file tree by path.
 * @param nodes - The tree nodes to search through.
 * @param targetPath - The path to find.
 * @param depth - The current tree depth (used for recursion).
 * @returns The matching node and its depth, or null if not found.
 */
export function findNodeByPath(
  nodes: FileNode[],
  targetPath: string,
  depth = 0,
): { node: FileNode; depth: number } | null {
  for (const node of nodes) {
    if (node.path === targetPath) return { node, depth }
    if (node.children) {
      const found = findNodeByPath(node.children, targetPath, depth + 1)
      if (found) return found
    }
  }
  return null
}

/**
 * Resolve a symlink target to an absolute path relative to the symlink's parent directory.
 * @param symlinkPath - The path of the symlink itself.
 * @param target - The symlink's target value (relative or absolute).
 * @returns The resolved absolute path of the symlink target.
 */
export function resolveSymlinkTarget(symlinkPath: string, target: string): string {
  if (target.startsWith('/')) return target
  const parentDir = symlinkPath.slice(0, symlinkPath.lastIndexOf('/'))
  return `${parentDir}/${target}`
}

/**
 * Scroll to and briefly highlight a tree item by path.
 * @param container - The scrollable container element.
 * @param path - The file path to scroll to and highlight.
 */
export function scrollAndHighlight(container: HTMLElement | null, path: string): void {
  if (!container) return
  const el = Array.from(container.querySelectorAll<HTMLElement>('[data-explorer-path]')).find(
    (e) => e.dataset.explorerPath === path,
  )
  if (!el) return
  el.scrollIntoView({ block: 'nearest' })
  el.style.transition = 'background 0s'
  el.style.background = 'rgba(128,128,128,0.25)'
  requestAnimationFrame(() => {
    el.style.transition = 'background 600ms ease-out'
    el.style.background = ''
  })
}

/**
 * Sort nodes: directories first, then files, each group alphabetically.
 * @param nodes - The nodes to sort.
 * @returns A new sorted array.
 */
export function sortNodes(nodes: FileNode[]): FileNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

/**
 * Flatten the file tree into a list of visible paths respecting expand/collapse state.
 * @param nodes - The tree nodes.
 * @param expandState - Current expand/collapse state.
 * @param depth - Current depth (for default expansion).
 * @returns Ordered array of visible file paths.
 */
export function getVisibleItems(nodes: FileNode[], expandState: ExpandState, depth = 0): string[] {
  const result: string[] = []
  const sorted = sortNodes(nodes)
  for (const node of sorted) {
    result.push(node.path)
    if (
      node.type === 'directory' &&
      isExpandedFromState(expandState, node.path, depth) &&
      node.children
    ) {
      result.push(...getVisibleItems(node.children, expandState, depth + 1))
    }
  }
  return result
}

/**
 * Collect all paths in a tree (used for pruning stale selections).
 * @param nodes - The tree nodes.
 * @returns Set of all paths in the tree.
 */
export function collectAllPaths(nodes: FileNode[]): Set<string> {
  const paths = new Set<string>()
  for (const node of nodes) {
    paths.add(node.path)
    if (node.children) {
      for (const p of collectAllPaths(node.children)) paths.add(p)
    }
  }
  return paths
}

/**
 * Get the parent directory path of a file path.
 * @param path - The file path.
 * @returns The parent directory path.
 */
export function getParentDir(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx > 0 ? path.slice(0, idx) : '/workspace'
}

/** Pointer event fields the long-press recognizer reads (React's `PointerEvent`). */
interface LongPressPointerEvent {
  pointerType?: string
  clientX: number
  clientY: number
}

/** Pointer/touch handlers returned by {@link createLongPress}, spread onto the target element. */
export interface LongPressHandlers {
  /** Arms the long-press timer (touch/pen pointers only). */
  onPointerDown: (e: LongPressPointerEvent) => void
  /** Cancels the pending long-press once the finger drifts past the tolerance. */
  onPointerMove: (e: LongPressPointerEvent) => void
  /** Cancels the pending long-press on release. */
  onPointerUp: () => void
  /** Cancels the pending long-press when the browser takes over (e.g. scroll). */
  onPointerCancel: () => void
  /** Suppresses the compatibility mouse events synthesized after a fired long-press. */
  onTouchEnd: (e: Event) => void
  /** Returns whether a long-press just fired, and resets the flag. */
  consumeFired: () => boolean
}

/**
 * Recognizes a touch long-press (~500ms hold within a ~10px radius) and invokes
 * `onLongPress` with the press position — the same `{ x, y }` shape the
 * `contextmenu` handlers take. iOS Safari never fires the `contextmenu` DOM
 * event, so this is the only path to the file-explorer context menu on touch
 * devices. Mouse pointers are ignored entirely (they right-click), so desktop
 * behavior is untouched; pass a false `enabled` (fine pointer) to disable it.
 * Call during component initialization: the pending timer is cleared on destroy.
 * @param enabled - Whether the recognizer is active (coarse pointers only).
 * @param onLongPress - Invoked with the press position when the hold fires.
 * @returns Handlers to spread on the target element (see {@link LongPressHandlers}).
 */
export function createLongPress(
  enabled: () => boolean,
  onLongPress: (position: { x: number; y: number }) => void,
): LongPressHandlers {
  let timer: number | null = null
  let start: { x: number; y: number } | null = null
  let fired = false

  /** Cancels any pending timer and forgets the press origin (idempotent). */
  const clear = (): void => {
    if (timer !== null) {
      window.clearTimeout(timer)
      timer = null
    }
    start = null
  }

  // Never let a pending timer fire after unmount.
  onDestroy(clear)

  const onPointerDown = (e: LongPressPointerEvent): void => {
    // A new press always invalidates any stale "just fired" flag.
    fired = false
    if (!enabled() || e.pointerType === 'mouse') return
    const clientX = e.clientX
    const clientY = e.clientY
    clear()
    start = { x: clientX, y: clientY }
    timer = window.setTimeout(() => {
      timer = null
      fired = true
      onLongPress({ x: clientX, y: clientY })
    }, LONG_PRESS_MS)
  }

  const onPointerMove = (e: LongPressPointerEvent): void => {
    if (timer === null || !start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (dx * dx + dy * dy > LONG_PRESS_MOVE_TOLERANCE_PX * LONG_PRESS_MOVE_TOLERANCE_PX) {
      clear()
    }
  }

  const onTouchEnd = (e: Event): void => {
    if (fired) e.preventDefault()
  }

  const consumeFired = (): boolean => {
    const hadFired = fired
    fired = false
    return hadFired
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerCancel: clear,
    onTouchEnd,
    consumeFired,
  }
}

/** One element's inline style, as the row writes it. */
export type StyleValues = Record<string, string | number | undefined>

/**
 * Writes an element's inline style property by property, the way React does:
 * only the values that changed are written, and a property that disappears is
 * removed. Writing through the CSSOM (and never through a `style` attribute
 * string) keeps the DOM's serialization identical to React's — jsdom parses
 * explicit longhands in a cssText in the wrong order, so a component that hands
 * the browser one style string ends up with a rotated `padding`.
 * @returns The writer, remembering what it wrote per element.
 */
export function createStyleWriter(): (
  el: HTMLElement | null | undefined,
  next: StyleValues,
) => void {
  let last: StyleValues = {}
  return (el, next) => {
    if (!el) {
      last = {}
      return
    }
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) continue
      if (last[key] === value) continue
      el.style.setProperty(key, String(value))
    }
    for (const key of Object.keys(last)) {
      if (next[key] === undefined) el.style.removeProperty(key)
    }
    last = { ...next }
  }
}
