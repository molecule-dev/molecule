/**
 * Tree-view file browser with multi-select, keyboard navigation, and drag-and-drop.
 *
 * @module
 */

import { getIcon } from 'material-file-icons'
import type { JSX } from 'react'
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { FileExplorerProps, FileNode } from '@molecule/app-ide-panel-logic'
import {
  type ExpandState,
  loadExpandState,
  saveExpandState,
  watchExpandState,
} from '@molecule/app-ide-panel-logic/panels'
import { useThemeMode, useTranslation } from '@molecule/app-react'
import { useStableCallback } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer } from '../hooks/useViewport.js'
import type { ContextMenuAction } from './FileExplorerContextMenu.js'
import { FileExplorerContextMenu } from './FileExplorerContextMenu.js'

// Git status → filename color — dark/light variants for readability
const DARK_GIT_COLORS: Record<string, string> = {
  modified: '#e2c08d',
  added: '#73c991',
  untracked: '#73c991',
  deleted: '#c74e39',
}
const LIGHT_GIT_COLORS: Record<string, string> = {
  modified: '#8a6010',
  added: '#1a7030',
  untracked: '#1a7030',
  deleted: '#a03020',
}

// Priority order for propagating the most important status to parent directories
const STATUS_PRIORITY: Record<string, number> = {
  deleted: 3,
  modified: 2,
  added: 1,
  untracked: 1,
}

/**
 * Compute the highest-priority git status color for a directory by checking
 * all entries in fileStatuses whose paths start with the directory path.
 * @param dirPath - The directory path to check.
 * @param fileStatuses - Map of file paths to git status strings.
 * @param colors - Map of git status names to CSS color values.
 * @returns The color string for the highest-priority child status, or undefined.
 */
function getDirColor(
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

// ---------------------------------------------------------------------------
// Expand state — persisted to the bonded storage provider
// ---------------------------------------------------------------------------

/**
 * Determines whether a directory path should be expanded based on persisted state.
 * @param state - The current expand/collapse state.
 * @param path - The directory path to check.
 * @param depth - The nesting depth (directories at depth 0 default to expanded).
 * @returns True when the directory should be shown expanded.
 */
function isExpandedFromState(state: ExpandState, path: string, depth: number): boolean {
  if (state.expanded.has(path)) return true
  if (state.collapsed.has(path)) return false
  return depth < 1
}

/**
 * Returns the ancestor directory paths for a given file path (e.g. "a/b/c.ts" → ["a", "a/b"]).
 * @param filePath - The full file path to extract ancestors from.
 * @returns An array of ancestor directory paths, from shallowest to deepest.
 */
function getAncestorPaths(filePath: string): string[] {
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
function findNodeByPath(
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
function resolveSymlinkTarget(symlinkPath: string, target: string): string {
  if (target.startsWith('/')) return target
  const parentDir = symlinkPath.slice(0, symlinkPath.lastIndexOf('/'))
  return `${parentDir}/${target}`
}

/**
 * Scroll to and briefly highlight a tree item by path.
 * @param container - The scrollable container element.
 * @param path - The file path to scroll to and highlight.
 */
function scrollAndHighlight(container: HTMLElement | null, path: string): void {
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
function sortNodes(nodes: FileNode[]): FileNode[] {
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
function getVisibleItems(nodes: FileNode[], expandState: ExpandState, depth = 0): string[] {
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
function collectAllPaths(nodes: FileNode[]): Set<string> {
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
function getParentDir(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx > 0 ? path.slice(0, idx) : '/workspace'
}

/**
 * Whether two expand states hold the same open and closed directory paths.
 * @param a - One expand state.
 * @param b - The other expand state.
 * @returns True when both hold exactly the same paths.
 */
function sameExpandState(a: ExpandState, b: ExpandState): boolean {
  if (a.expanded.size !== b.expanded.size || a.collapsed.size !== b.collapsed.size) return false
  for (const path of a.expanded) if (!b.expanded.has(path)) return false
  for (const path of a.collapsed) if (!b.collapsed.has(path)) return false
  return true
}

/**
 * `state` with every path in `paths` opened, or `state` itself when they all
 * already are. Pure: builds a new state and never mutates the argument.
 * @param state - The current expand/collapse state.
 * @param paths - The directory paths to open.
 * @returns The state with those paths expanded.
 */
function withExpandedPaths(state: ExpandState, paths: readonly string[]): ExpandState {
  if (!paths.some((path) => !state.expanded.has(path))) return state
  const next: ExpandState = {
    expanded: new Set(state.expanded),
    collapsed: new Set(state.collapsed),
  }
  for (const path of paths) {
    next.expanded.add(path)
    next.collapsed.delete(path)
  }
  return next
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

/**
 * Chevron icon — points right when collapsed, down when expanded.
 * @param props - Component props (see {@link FileTreeItemProps}).
 * @returns The rendered SVG chevron icon.
 */
function ChevronIcon({ isOpen }: { isOpen: boolean }): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      style={{
        display: 'block',
        flexShrink: 0,
        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 100ms',
        opacity: 0.65,
      }}
    >
      {/* Right-pointing chevron (V rotated): collapses/expands via CSS rotation */}
      <polyline
        points="6,4 10,8 6,12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * File icon resolved from material-file-icons based on the filename.
 *
 * Uses dangerouslySetInnerHTML to render SVG from the material-file-icons library.
 * This is safe because the SVG content comes from a trusted static icon library,
 * not from user input.
 * @param props - Component props (see {@link FileTreeItemProps}).
 * @returns The rendered file type icon element.
 */
function FileTypeIcon({ name }: { name: string }): JSX.Element {
  const { svg } = getIcon(name)
  return (
    <span
      style={{ display: 'inline-flex', flexShrink: 0, width: '16px', height: '16px' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// ---------------------------------------------------------------------------
// Long-press → context menu (touch)
// ---------------------------------------------------------------------------

/** How long a touch must hold still before it counts as a long-press. */
const LONG_PRESS_MS = 500

/** Finger drift beyond this many pixels cancels a pending long-press. */
const LONG_PRESS_MOVE_TOLERANCE_PX = 10

/** Pointer/touch handlers returned by {@link useLongPress}, spread onto the target element. */
interface LongPressHandlers {
  /** Arms the long-press timer (touch/pen pointers only). */
  onPointerDown: (e: React.PointerEvent) => void
  /** Cancels the pending long-press once the finger drifts past the tolerance. */
  onPointerMove: (e: React.PointerEvent) => void
  /** Cancels the pending long-press on release. */
  onPointerUp: (e: React.PointerEvent) => void
  /** Cancels the pending long-press when the browser takes over (e.g. scroll). */
  onPointerCancel: (e: React.PointerEvent) => void
  /**
   * Suppresses the compatibility mouse events (mousedown/mouseup/click) the
   * browser synthesizes at finger-lift AFTER a fired long-press — those would
   * otherwise instantly close the just-opened menu or activate whatever sits
   * under the finger.
   */
  onTouchEnd: (e: React.TouchEvent) => void
  /**
   * Returns whether a long-press just fired, and resets the flag. Call from the
   * target's `onClick` so a fired long-press never ALSO selects/opens the item
   * (belt-and-braces for browsers where the `onTouchEnd` suppression fails).
   */
  consumeFired: () => boolean
}

/**
 * Recognizes a touch long-press (~500ms hold within a ~10px radius) and invokes
 * `onLongPress` with the press position — the same `{ x, y }` shape the
 * `contextmenu` handlers take. iOS Safari never fires the `contextmenu` DOM
 * event, so this is the only path to the file-explorer context menu on touch
 * devices. Mouse pointers are ignored entirely (they right-click), so desktop
 * behavior is untouched; pass `enabled: false` (fine pointer) to disable it.
 * @param enabled - Whether the recognizer is active (coarse pointers only).
 * @param onLongPress - Invoked with the press position when the hold fires.
 * @returns Handlers to spread on the target element (see {@link LongPressHandlers}).
 */
function useLongPress(
  enabled: boolean,
  onLongPress: (position: { x: number; y: number }) => void,
): LongPressHandlers {
  const timerRef = useRef<number | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const firedRef = useRef(false)
  // The timer below fires from a pointer event, long after the render that
  // armed it. A stable callback that always runs the latest committed
  // `onLongPress` keeps it off a stale closure (node/props change) without a
  // ref written while rendering.
  const fireLongPress = useStableCallback(onLongPress)

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    startRef.current = null
  }, [])

  // Never let a pending timer fire after unmount.
  useEffect(() => clear, [clear])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // A new press always invalidates any stale "just fired" flag.
      firedRef.current = false
      if (!enabled || e.pointerType === 'mouse') return
      const { clientX, clientY } = e
      clear()
      startRef.current = { x: clientX, y: clientY }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        firedRef.current = true
        fireLongPress({ x: clientX, y: clientY })
      }, LONG_PRESS_MS)
    },
    [enabled, clear, fireLongPress],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (timerRef.current === null || !startRef.current) return
      const dx = e.clientX - startRef.current.x
      const dy = e.clientY - startRef.current.y
      if (dx * dx + dy * dy > LONG_PRESS_MOVE_TOLERANCE_PX * LONG_PRESS_MOVE_TOLERANCE_PX) {
        clear()
      }
    },
    [clear],
  )

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (firedRef.current) e.preventDefault()
  }, [])

  const consumeFired = useCallback(() => {
    const fired = firedRef.current
    firedRef.current = false
    return fired
  }, [])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: clear,
    onPointerCancel: clear,
    onTouchEnd,
    consumeFired,
  }
}

// ---------------------------------------------------------------------------
// FileTreeItem
// ---------------------------------------------------------------------------

/**
 * Max total FileTreeItems to render in a single FileExplorer pass.
 * Prevents symlink cycles from freezing the browser without imposing
 * any depth limit on legitimate projects.
 */
const MAX_RENDERED_NODES = 10_000

/** Props for a single rendered file-tree row. */
export interface FileTreeItemProps {
  node: FileNode
  depth: number
  isExpanded: boolean
  activeFile?: string | null
  isSelected: boolean
  isCut: boolean
  isFocused: boolean
  isDropTarget: boolean
  onFileSelect: (path: string) => void
  onFileDoubleClick?: (path: string) => void
  onDirExpand?: (path: string) => void
  onTogglePath: (path: string, nowExpanded: boolean) => void
  onSymlinkClick?: (symlinkPath: string, target: string) => void
  onContextMenu?: (position: { x: number; y: number }, node: FileNode) => void
  onItemClick: (
    path: string,
    modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
  ) => void
  onDragStart: (path: string, e: React.DragEvent) => void
  onDragOver: (path: string, e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (path: string, e: React.DragEvent) => void
  expandState: ExpandState
  fileStatuses?: Record<string, string>
  gitColors: Record<string, string>
  selectedPaths: Set<string>
  clipboardPaths: Set<string> | null
  clipboardOperation: 'cut' | 'copy' | null
  /**
   * The paths this pass renders (the tree's first {@link MAX_RENDERED_NODES}
   * visible rows). A directory only renders children inside this set, so a
   * symlink cycle or an implausibly large expanded tree cannot freeze the
   * browser. Computed once per pass by the root, never mutated while rendering.
   */
  renderedPaths: ReadonlySet<string>
  dropTargetPath: string | null
  /** Touch-first device — rows get a ≥36px min-height so they're comfortably tappable. */
  isCoarse: boolean
  /**
   * Prefix (one `useId()` at the tree root) for the rows' DOM ids — the tree
   * container points `aria-activedescendant` at the focused row's id.
   */
  rowIdPrefix: string
  /** Each visible path's 1-based render-order position, keying the rows' ids. */
  rowIndex: ReadonlyMap<string, number>
  /** Arms the tree container's long-press click suppression (see handleTreeClick). */
  onLongPressFired: () => void
}

/**
 * Recursive tree item for a single file or directory node.
 * @param props - Component props.
 * @returns The rendered tree item element.
 */
const FileTreeItem = memo(function FileTreeItem({
  node,
  depth,
  isExpanded,
  activeFile,
  isSelected,
  isCut,
  isFocused,
  isDropTarget,
  onFileSelect,
  onFileDoubleClick,
  onDirExpand,
  onTogglePath,
  onSymlinkClick,
  onContextMenu,
  onItemClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  expandState,
  fileStatuses,
  gitColors,
  selectedPaths,
  clipboardPaths,
  clipboardOperation,
  renderedPaths,
  dropTargetPath,
  isCoarse,
  rowIdPrefix,
  rowIndex,
  onLongPressFired,
}: FileTreeItemProps): JSX.Element {
  const cm = getClassMap()
  const isDir = node.type === 'directory'
  // This row's position in render order (1-based) — the tree container names
  // the focused row via `aria-activedescendant` with the same numbering. The
  // position comes from the root's visible-items map, not this render's
  // counter, because a memoized row skips re-rendering and would otherwise
  // take another row's number (two rows, one id).
  const rowId = `${rowIdPrefix}-${rowIndex.get(node.path) ?? 0}`

  // Load children whenever this dir is expanded but hasn't been fetched yet.
  // `undefined` means not yet loaded; `[]` means loaded but empty — only fetch
  // for the former to avoid infinite loops on empty/errored directories.
  useEffect(() => {
    if (isExpanded && isDir && node.children === undefined && onDirExpand) {
      onDirExpand(node.path)
    }
  }, [isExpanded, isDir, node.children, node.path, onDirExpand])

  // iOS Safari never fires 'contextmenu', so on coarse pointers a ~500ms
  // long-press opens the SAME menu the right-click path does. (The handlers
  // returned by the hook are referentially stable across renders.)
  const {
    onPointerDown: onLongPressPointerDown,
    onPointerMove: onLongPressPointerMove,
    onPointerUp: onLongPressPointerUp,
    onPointerCancel: onLongPressPointerCancel,
    onTouchEnd: onLongPressTouchEnd,
  } = useLongPress(isCoarse && !!onContextMenu, (position) => {
    // Arm the tree container's synthesized-click suppression (see
    // handleTreeClick) — the recognizer's own touchend preventDefault is the
    // first line of defense.
    onLongPressFired()
    onContextMenu?.(position, node)
  })

  // Directories before files, each group sorted alphabetically
  const sortedChildren = node.children ? sortNodes(node.children) : undefined

  // Compute background color: dropTarget > selection > activeFile > transparent
  // Drop/selection tints follow the theme primary (a rebranded app tints its own
  // tree), never a literal blue; the hex is only the CSS-var fallback.
  let background = 'transparent'
  if (isDropTarget) {
    background = 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 15%, transparent)'
  } else if (isSelected) {
    background = 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 20%, transparent)'
  } else if (node.path === activeFile) {
    background = 'rgba(128,128,128,0.15)'
  }

  // Compute opacity: cut > dimmed > normal
  let opacity = 1
  if (isCut) {
    opacity = 0.4
  } else if (node.isDimmed) {
    opacity = 0.35
  }

  return (
    <div role="none">
      <div
        role="treeitem"
        id={rowId}
        aria-level={depth + 1}
        aria-expanded={isDir ? isExpanded : undefined}
        aria-selected={isSelected}
        // Focus stays on the tree container (the tree pattern: one tab stop,
        // keys and the focused row's drawing live there, and it points
        // aria-activedescendant at this row) — so the row itself is only
        // programmatically focusable.
        tabIndex={-1}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.preventDefault()
            e.stopPropagation()
            onContextMenu({ x: e.clientX, y: e.clientY }, node)
          }
        }}
        onPointerDown={onLongPressPointerDown}
        onPointerMove={onLongPressPointerMove}
        onPointerUp={onLongPressPointerUp}
        onPointerCancel={onLongPressPointerCancel}
        onTouchEnd={onLongPressTouchEnd}
        // On touch devices a draggable element hijacks the long-press to start a
        // native drag (firing pointercancel, which kills the context-menu timer),
        // so rows are only draggable on fine pointers. Desktop drag-move is untouched.
        draggable={!isCoarse}
        onDragStart={(e) => onDragStart(node.path, e)}
        onDragOver={(e) => onDragOver(node.path, e)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(node.path, e)}
        data-explorer-path={node.path}
        className={cm.cn(cm.w('full'), cm.touchTargetCompact)}
        /* mol-bespoke-button: a file-TREE row — depth-indented, drag/drop and
           long-press aware, a list item rather than a CTA. A `treeitem` div,
           not a `<button>` (HTML does not allow `role="treeitem"` on one), so
           the tree it belongs to has the `treeitem` children `role="tree"`
           requires; focus stays on the tree container, which draws the focused
           row and handles its keys. Its selection and drop tints are theme
           tokens, and its ≥36px coarse floor comes from the ClassMap (the
           compact ~24px pointer row is unchanged). */
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          paddingLeft: `${depth * 12}px`,
          paddingTop: '1px',
          paddingBottom: '1px',
          paddingRight: '6px',
          // Keep the native text-selection/callout from fighting the long-press
          // gesture on touch devices; fine-pointer rows are untouched.
          WebkitUserSelect: isCoarse ? 'none' : undefined,
          userSelect: isCoarse ? 'none' : undefined,
          WebkitTouchCallout: isCoarse ? 'none' : undefined,
          border: 'none',
          background,
          outline: isDropTarget
            ? '1px solid color-mix(in srgb, var(--mol-color-primary, #4070e0) 40%, transparent)'
            : isFocused
              ? '1px dotted rgba(128,128,128,0.5)'
              : 'none',
          outlineOffset: '-1px',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
          opacity,
          fontSize: '13px',
          lineHeight: '22px',
        }}
      >
        {/* Icon column — chevron for dirs, file-type icon for files; always 16px so names align */}
        <span style={{ display: 'flex', alignItems: 'center', width: '16px', flexShrink: 0 }}>
          {isDir ? <ChevronIcon isOpen={isExpanded} /> : <FileTypeIcon name={node.name} />}
        </span>

        {/* Label */}
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: isDir
              ? fileStatuses
                ? getDirColor(node.path, fileStatuses, gitColors)
                : undefined
              : fileStatuses?.[node.path]
                ? gitColors[fileStatuses[node.path]]
                : undefined,
            opacity: node.symlinkTarget ? 0.55 : undefined,
          }}
        >
          {node.name}
          {node.symlinkTarget && ' \u2192 ' + node.symlinkTarget.split('/').pop()}
        </span>
      </div>

      {isDir && isExpanded && sortedChildren && (
        <div role="group" style={{ position: 'relative' }}>
          {/* Guide line — 1px at center of parent chevron (paddingLeft + half icon width) */}
          <span
            style={{
              position: 'absolute',
              left: `${depth * 12 + 8}px`,
              top: 0,
              bottom: 0,
              width: '1px',
              background: 'rgba(128,128,128,0.15)',
              pointerEvents: 'none',
            }}
          />
          {sortedChildren
            .filter((child) => renderedPaths.has(child.path))
            .map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                isExpanded={isExpandedFromState(expandState, child.path, depth + 1)}
                activeFile={activeFile}
                isSelected={selectedPaths.has(child.path)}
                isCut={
                  clipboardOperation === 'cut' &&
                  clipboardPaths !== null &&
                  clipboardPaths.has(child.path)
                }
                isFocused={false}
                isDropTarget={dropTargetPath === child.path}
                onFileSelect={onFileSelect}
                onFileDoubleClick={onFileDoubleClick}
                onDirExpand={onDirExpand}
                onTogglePath={onTogglePath}
                onSymlinkClick={onSymlinkClick}
                onContextMenu={onContextMenu}
                onItemClick={onItemClick}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                expandState={expandState}
                fileStatuses={fileStatuses}
                gitColors={gitColors}
                selectedPaths={selectedPaths}
                clipboardPaths={clipboardPaths}
                clipboardOperation={clipboardOperation}
                renderedPaths={renderedPaths}
                dropTargetPath={dropTargetPath}
                isCoarse={isCoarse}
                rowIdPrefix={rowIdPrefix}
                rowIndex={rowIndex}
                onLongPressFired={onLongPressFired}
              />
            ))}
        </div>
      )}
    </div>
  )
})

// ---------------------------------------------------------------------------
// FileExplorer
// ---------------------------------------------------------------------------

/**
 * Tree-view file explorer component with multi-select, keyboard navigation, and drag-and-drop.
 * @param props - Component props (see {@link FileTreeItemProps}).
 * @returns The rendered file explorer element.
 */
export function FileExplorer({
  files,
  onFileSelect,
  onFileDoubleClick,
  onDirExpand,
  readOnly,
  onRename,
  onDelete,
  onDeleteMultiple,
  onMoveFiles,
  onNewFile,
  onNewFolder,
  onCollapseAll,
  className,
  persistKey,
  activeFile,
  fileStatuses,
}: FileExplorerProps): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  const gitColors = useThemeMode() === 'light' ? LIGHT_GIT_COLORS : DARK_GIT_COLORS
  // One id prefix for every row: the container points aria-activedescendant at
  // `<prefix>-<render position>` of the focused row (see FileTreeItem).
  const rowIdPrefix = useId().replace(/[:]/g, '')
  const isCoarse = useCoarsePointer()
  const containerRef = useRef<HTMLDivElement>(null)
  // When set, the next render after DOM update will scroll this path into view
  const scrollTargetRef = useRef<string | null>(null)
  // A row long-press just fired: the click the browser synthesizes at
  // finger-lift must not ALSO select/open that row (the touchend suppression
  // in the row's recognizer is the first line of defense; this is the second).
  const suppressNextRowClickRef = useRef(false)
  // When set, briefly flash a highlight on this path after scrolling
  const highlightTargetRef = useRef<string | null>(null)

  const [expandState, setExpandState] = useState<ExpandState>(() => {
    const stored = persistKey
      ? loadExpandState(persistKey)
      : { expanded: new Set<string>(), collapsed: new Set<string>() }
    // Mount with a file already open: its ancestors must be open too (the
    // prop-change branch below keeps that true for later changes).
    return activeFile ? withExpandedPaths(stored, getAncestorPaths(activeFile)) : stored
  })

  // The inputs the tree's saved state follows: the storage key (another
  // project) and the active file (open its ancestor directories). Both are prop
  // changes answered in the SAME render that sees them — React's "adjust state
  // when a prop changes" pattern. Doing it from an effect would commit a frame
  // showing the old project's directories, or the active file hidden inside a
  // collapsed one, before correcting itself.
  const [expandInputs, setExpandInputs] = useState({ persistKey, activeFile })
  if (expandInputs.persistKey !== persistKey || expandInputs.activeFile !== activeFile) {
    setExpandInputs({ persistKey, activeFile })
    const base =
      expandInputs.persistKey !== persistKey
        ? persistKey
          ? loadExpandState(persistKey)
          : { expanded: new Set<string>(), collapsed: new Set<string>() }
        : expandState
    const next = activeFile ? withExpandedPaths(base, getAncestorPaths(activeFile)) : base
    if (next !== expandState) setExpandState(next)
  }

  // Follow the bonded provider for this key. A synchronous provider's value is
  // already in `expandState`; an asynchronous one hydrates later and updates
  // this SAME tree (never a remount), as does a change from another tab.
  useEffect(() => {
    if (!persistKey) return
    return watchExpandState(persistKey, setExpandState)
  }, [persistKey])

  // Persist every committed expand state — a row/dir toggle, Collapse All, or
  // the auto-expansion above. Writing an external system from an effect is what
  // an effect is for; writing it from the render that computes it would store a
  // value a discarded render may never commit.
  //
  // The store echoes a write back to this component's own subscription (a
  // fresh but identical state object), so a value the store already holds is
  // not written again — that is what keeps this from looping.
  useEffect(() => {
    if (!persistKey) return
    if (sameExpandState(expandState, loadExpandState(persistKey))) return
    saveExpandState(persistKey, expandState)
  }, [persistKey, expandState])

  // ---------------------------------------------------------------------------
  // Selection state
  // ---------------------------------------------------------------------------

  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [lastClickedPath, setLastClickedPath] = useState<string | null>(null)
  const [focusedPath, setFocusedPath] = useState<string | null>(null)

  // Clipboard for cut/copy (internal)
  const [clipboard, setClipboard] = useState<{
    paths: Set<string>
    operation: 'cut' | 'copy'
  } | null>(null)

  // Drag-and-drop state
  const [draggedPaths, setDraggedPaths] = useState<Set<string> | null>(null)
  const [dropTargetPath, setDropTargetPath] = useState<string | null>(null)

  // Memoized visible items list — used for shift-click range and keyboard nav
  const visibleItems = useMemo(() => getVisibleItems(files, expandState), [files, expandState])
  // Each visible path's 1-based render-order position — the number in every
  // row's id and in the container's aria-activedescendant (see FileTreeItem).
  const rowIndexById = useMemo(
    () => new Map(visibleItems.map((path, i) => [path, i + 1] as const)),
    [visibleItems],
  )

  // Prune selections whose paths left the tree, in the render that receives the
  // new tree: an effect would keep a vanished path selected (and shift-click
  // ranges built on it) for one committed frame. Nothing is set while the
  // selection is already inside the tree, so a clean selection never re-renders
  // and a host that rebuilds `files` on every render cannot loop here.
  const treePaths = useMemo(() => collectAllPaths(files), [files])
  if (selectedPaths.size > 0) {
    let pruned: Set<string> | null = null
    for (const path of selectedPaths) {
      if (treePaths.has(path)) continue
      pruned ??= new Set(selectedPaths)
      pruned.delete(path)
    }
    if (pruned) setSelectedPaths(pruned)
  }

  // Queue the scroll to the newly active file; the render guard above has
  // already opened its ancestors and persisted them.
  useEffect(() => {
    if (!activeFile) return
    scrollTargetRef.current = activeFile
  }, [activeFile])

  // After every render, attempt the pending scroll (retries until element is in the DOM)
  useEffect(() => {
    if (!scrollTargetRef.current || !containerRef.current) return
    const target = scrollTargetRef.current
    const shouldHighlight = highlightTargetRef.current === target
    const el = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('[data-explorer-path]'),
    ).find((e) => e.dataset.explorerPath === target)
    if (el) {
      scrollTargetRef.current = null
      if (shouldHighlight) {
        highlightTargetRef.current = null
        scrollAndHighlight(containerRef.current, target)
      } else {
        el.scrollIntoView({ block: 'nearest' })
      }
    }
  })

  const handleTogglePath = useCallback((path: string, nowExpanded: boolean) => {
    setExpandState((prev) => {
      const next: ExpandState = {
        expanded: new Set(prev.expanded),
        collapsed: new Set(prev.collapsed),
      }
      if (nowExpanded) {
        next.expanded.add(path)
        next.collapsed.delete(path)
      } else {
        next.collapsed.add(path)
        next.expanded.delete(path)
      }
      return next
    })
  }, [])

  const handleSymlinkClick = useCallback(
    (symlinkPath: string, target: string) => {
      const resolvedPath = resolveSymlinkTarget(symlinkPath, target)
      const found = findNodeByPath(files, resolvedPath)

      if (found && found.node.type === 'directory') {
        // Ensure ancestors are expanded so the target is visible
        const ancestors = getAncestorPaths(resolvedPath)
        setExpandState((prev) => withExpandedPaths(prev, ancestors))
        if (ancestors.every((path) => expandState.expanded.has(path))) {
          // Already visible — scroll and highlight directly
          scrollAndHighlight(containerRef.current, resolvedPath)
        } else {
          scrollTargetRef.current = resolvedPath
          highlightTargetRef.current = resolvedPath
        }
      } else {
        // File symlink (or target not in tree) — select the real file
        onFileSelect(resolvedPath)
      }
    },
    [files, expandState, onFileSelect],
  )

  // ---------------------------------------------------------------------------
  // Selection click handler
  // ---------------------------------------------------------------------------

  const handleItemClick = useCallback(
    (path: string, modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => {
      const isToggle = modifiers.ctrlKey || modifiers.metaKey

      if (modifiers.shiftKey && lastClickedPath) {
        // Shift+Click: range select
        const startIdx = visibleItems.indexOf(lastClickedPath)
        const endIdx = visibleItems.indexOf(path)
        if (startIdx !== -1 && endIdx !== -1) {
          const lo = Math.min(startIdx, endIdx)
          const hi = Math.max(startIdx, endIdx)
          const range = new Set(visibleItems.slice(lo, hi + 1))
          // When shift is combined with ctrl/cmd, add to existing selection
          if (isToggle) {
            setSelectedPaths((prev) => {
              const next = new Set(prev)
              for (const p of range) next.add(p)
              return next
            })
          } else {
            setSelectedPaths(range)
          }
        }
        setFocusedPath(path)
        // Don't update lastClickedPath on shift-click to preserve the anchor
      } else if (isToggle) {
        // Ctrl/Cmd+Click: toggle single item
        setSelectedPaths((prev) => {
          const next = new Set(prev)
          if (next.has(path)) {
            next.delete(path)
          } else {
            next.add(path)
          }
          return next
        })
        setLastClickedPath(path)
        setFocusedPath(path)
      } else {
        // Plain click: select single
        setSelectedPaths(new Set([path]))
        setLastClickedPath(path)
        setFocusedPath(path)
      }
    },
    [lastClickedPath, visibleItems],
  )

  // ---------------------------------------------------------------------------
  // Context menu
  // ---------------------------------------------------------------------------

  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number }
    node: FileNode | null
  } | null>(null)

  const handleItemContextMenu = useCallback(
    (position: { x: number; y: number }, node: FileNode) => {
      // If right-clicked item is already selected, keep multi-selection
      if (!selectedPaths.has(node.path)) {
        setSelectedPaths(new Set([node.path]))
        setLastClickedPath(node.path)
      }
      setFocusedPath(node.path)
      setContextMenu({ position, node })
    },
    [selectedPaths],
  )

  // Shared by right-click AND touch long-press — the long-press path has no
  // MouseEvent to hand over, only a position, so the opener takes the position.
  const openBackgroundContextMenu = useCallback((position: { x: number; y: number }) => {
    setSelectedPaths(new Set())
    setContextMenu({ position, node: null })
  }, [])

  const handleBackgroundContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      openBackgroundContextMenu({ x: e.clientX, y: e.clientY })
    },
    [openBackgroundContextMenu],
  )

  // Touch path to the background menu (New File / New Folder / Collapse All) —
  // iOS Safari never fires 'contextmenu', so a long-press on the empty tree
  // area opens it instead. Presses that start on a row are excluded at the
  // container's onPointerDown (the row recognizer owns those).
  const backgroundLongPress = useLongPress(isCoarse, openBackgroundContextMenu)

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleCollapseAll = useCallback(() => {
    setExpandState({ expanded: new Set(), collapsed: new Set(['__all_collapsed__']) })
    onCollapseAll?.()
  }, [onCollapseAll])

  // A row's click reaches the tree CONTAINER — the tree pattern's one tab stop
  // owns the keyboard handling, so the click handling lives beside it (and the
  // row itself carries no onClick). The pressed row resolves by its path and
  // runs the same select / toggle / open logic it always did.
  const handleTreeClick = useCallback(
    (e: React.MouseEvent) => {
      if (suppressNextRowClickRef.current) {
        suppressNextRowClickRef.current = false
        return
      }
      const row = (e.target as Element).closest('[data-explorer-path]') as HTMLElement | null
      const path = row?.dataset.explorerPath
      if (!path) return
      const found = findNodeByPath(files, path)
      if (!found) return
      const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey
      if (hasModifier) {
        // Modifier clicks: pure selection, no open/toggle
        handleItemClick(path, { ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey })
        return
      }
      // No modifier: select single + perform action
      handleItemClick(path, { ctrlKey: false, metaKey: false, shiftKey: false })
      if (found.node.symlinkTarget) {
        handleSymlinkClick(path, found.node.symlinkTarget)
      } else if (found.node.type === 'directory') {
        handleTogglePath(path, !isExpandedFromState(expandState, path, found.depth))
      } else {
        onFileSelect(path)
      }
    },
    [files, expandState, handleItemClick, handleSymlinkClick, handleTogglePath, onFileSelect],
  )

  // A row's double-click (files only) — delegated the same way.
  const handleTreeDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const row = (e.target as Element).closest('[data-explorer-path]') as HTMLElement | null
      const path = row?.dataset.explorerPath
      if (!path) return
      const found = findNodeByPath(files, path)
      if (found?.node.type !== 'file') return
      onFileDoubleClick?.(path)
    },
    [files, onFileDoubleClick],
  )

  /**
   * Execute a paste operation: move clipboard items to the target directory.
   * @param targetDir - The directory to move items into.
   */
  const executePaste = useCallback(
    (targetDir: string) => {
      if (!clipboard || clipboard.operation !== 'cut') return
      const moves: Array<{ oldPath: string; newPath: string }> = []
      for (const oldPath of clipboard.paths) {
        const fileName = oldPath.split('/').pop()!
        const newPath = `${targetDir}/${fileName}`
        if (newPath !== oldPath) {
          moves.push({ oldPath, newPath })
        }
      }
      if (moves.length > 0) onMoveFiles?.(moves)
      setClipboard(null)
      setSelectedPaths(new Set())
    },
    [clipboard, onMoveFiles],
  )

  const handleContextMenuAction = useCallback(
    (action: ContextMenuAction) => {
      const node = contextMenu?.node
      switch (action) {
        case 'open':
          if (node) onFileSelect(node.path)
          break
        case 'rename':
          if (node) onRename?.(node.path)
          break
        case 'delete':
          if (node) onDelete?.(node.path)
          break
        case 'deleteMultiple':
          if (selectedPaths.size > 0) onDeleteMultiple?.(Array.from(selectedPaths))
          break
        case 'newFile': {
          const dir = node?.type === 'directory' ? node.path : '/workspace'
          onNewFile?.(dir)
          break
        }
        case 'newFolder': {
          const dir = node?.type === 'directory' ? node.path : '/workspace'
          onNewFolder?.(dir)
          break
        }
        case 'copyPath':
          // A copy can fail (insecure context, permission); copyTextWithFallback
          // resolves false instead of throwing, and the in-app selection still works.
          if (node) void copyTextWithFallback(node.path)
          break
        case 'copyPaths': {
          const paths = Array.from(selectedPaths).join('\n')
          void copyTextWithFallback(paths)
          break
        }
        case 'copyRelativePath':
          if (node) {
            const rel = node.path.replace(/^\/workspace\//, '')
            void copyTextWithFallback(rel)
          }
          break
        case 'copyRelativePaths': {
          const rels = Array.from(selectedPaths)
            .map((p) => p.replace(/^\/workspace\//, ''))
            .join('\n')
          void copyTextWithFallback(rels)
          break
        }
        case 'cut':
          if (selectedPaths.size > 0) {
            setClipboard({ paths: new Set(selectedPaths), operation: 'cut' })
            void copyTextWithFallback(Array.from(selectedPaths).join('\n'))
          }
          break
        case 'paste': {
          // Paste into the right-clicked directory, or the directory of the right-clicked file
          const targetDir = node
            ? node.type === 'directory'
              ? node.path
              : getParentDir(node.path)
            : '/workspace'
          executePaste(targetDir)
          break
        }
        case 'collapseAll':
          handleCollapseAll()
          break
      }
    },
    [
      contextMenu,
      selectedPaths,
      onFileSelect,
      onRename,
      onDelete,
      onDeleteMultiple,
      onNewFile,
      onNewFolder,
      handleCollapseAll,
      executePaste,
    ],
  )

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  const handleTreeKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey

      // Navigate up/down
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIdx = focusedPath ? visibleItems.indexOf(focusedPath) : -1
        const nextIdx =
          e.key === 'ArrowDown'
            ? Math.min(currentIdx + 1, visibleItems.length - 1)
            : Math.max(currentIdx - 1, 0)
        if (nextIdx < 0 || nextIdx >= visibleItems.length) return
        const nextPath = visibleItems[nextIdx]
        setFocusedPath(nextPath)

        if (e.shiftKey) {
          // Shift+Arrow: extend selection
          setSelectedPaths((prev) => {
            const next = new Set(prev)
            next.add(nextPath)
            return next
          })
        } else if (!isMod) {
          setSelectedPaths(new Set([nextPath]))
          setLastClickedPath(nextPath)
        }

        // Scroll focused item into view
        if (containerRef.current) {
          const el = containerRef.current.querySelector(
            `[data-explorer-path="${CSS.escape(nextPath)}"]`,
          )
          el?.scrollIntoView({ block: 'nearest' })
        }
        return
      }

      // Expand directory / move to first child
      if (e.key === 'ArrowRight' && focusedPath) {
        e.preventDefault()
        const found = findNodeByPath(files, focusedPath)
        if (found?.node.type === 'directory') {
          if (!isExpandedFromState(expandState, focusedPath, found.depth)) {
            handleTogglePath(focusedPath, true)
          } else if (found.node.children && found.node.children.length > 0) {
            const sorted = sortNodes(found.node.children)
            setFocusedPath(sorted[0].path)
            setSelectedPaths(new Set([sorted[0].path]))
            setLastClickedPath(sorted[0].path)
          }
        }
        return
      }

      // Collapse directory / move to parent
      if (e.key === 'ArrowLeft' && focusedPath) {
        e.preventDefault()
        const found = findNodeByPath(files, focusedPath)
        if (
          found?.node.type === 'directory' &&
          isExpandedFromState(expandState, focusedPath, found.depth)
        ) {
          handleTogglePath(focusedPath, false)
        } else {
          const parent = getParentDir(focusedPath)
          if (parent !== '/workspace' && parent.startsWith('/workspace')) {
            setFocusedPath(parent)
            setSelectedPaths(new Set([parent]))
            setLastClickedPath(parent)
          }
        }
        return
      }

      // Enter: open file / toggle directory
      if (e.key === 'Enter' && focusedPath) {
        e.preventDefault()
        const found = findNodeByPath(files, focusedPath)
        if (found?.node.type === 'directory') {
          handleTogglePath(focusedPath, !isExpandedFromState(expandState, focusedPath, found.depth))
        } else {
          onFileSelect(focusedPath)
        }
        return
      }

      // Space: toggle selection on focused item
      if (e.key === ' ' && focusedPath) {
        e.preventDefault()
        setSelectedPaths((prev) => {
          const next = new Set(prev)
          if (next.has(focusedPath)) {
            next.delete(focusedPath)
          } else {
            next.add(focusedPath)
          }
          return next
        })
        return
      }

      // Delete/Backspace: delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPaths.size > 0) {
        e.preventDefault()
        if (selectedPaths.size === 1) {
          onDelete?.(Array.from(selectedPaths)[0])
        } else {
          onDeleteMultiple?.(Array.from(selectedPaths))
        }
        return
      }

      // F2: rename (single selection only)
      if (e.key === 'F2' && selectedPaths.size === 1) {
        e.preventDefault()
        onRename?.(Array.from(selectedPaths)[0])
        return
      }

      // Escape: clear selection + clipboard
      if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedPaths(new Set())
        setClipboard(null)
        setFocusedPath(null)
        return
      }

      // Ctrl/Cmd+A: select all visible
      if (isMod && e.key === 'a') {
        e.preventDefault()
        setSelectedPaths(new Set(visibleItems))
        return
      }

      // Ctrl/Cmd+C: copy paths (OS-clipboard write is best-effort; the in-app
      // clipboard state below still tracks the selection for Ctrl/Cmd+V)
      if (isMod && e.key === 'c' && selectedPaths.size > 0) {
        e.preventDefault()
        const paths = Array.from(selectedPaths).join('\n')
        void copyTextWithFallback(paths)
        setClipboard({ paths: new Set(selectedPaths), operation: 'copy' })
        return
      }

      // Ctrl/Cmd+X: cut (same best-effort OS-clipboard write)
      if (isMod && e.key === 'x' && selectedPaths.size > 0) {
        e.preventDefault()
        setClipboard({ paths: new Set(selectedPaths), operation: 'cut' })
        void copyTextWithFallback(Array.from(selectedPaths).join('\n'))
        return
      }

      // Ctrl/Cmd+V: paste (move cut items to focused directory)
      if (isMod && e.key === 'v' && clipboard?.operation === 'cut') {
        e.preventDefault()
        let targetDir = '/workspace'
        if (focusedPath) {
          const found = findNodeByPath(files, focusedPath)
          targetDir = found?.node.type === 'directory' ? focusedPath : getParentDir(focusedPath)
        }
        executePaste(targetDir)
        return
      }
    },
    [
      focusedPath,
      visibleItems,
      files,
      expandState,
      selectedPaths,
      clipboard,
      handleTogglePath,
      onFileSelect,
      onDelete,
      onDeleteMultiple,
      onRename,
      executePaste,
    ],
  )

  // ---------------------------------------------------------------------------
  // Drag and drop
  // ---------------------------------------------------------------------------

  const handleDragStart = useCallback(
    (path: string, e: React.DragEvent) => {
      let paths: Set<string>
      if (selectedPaths.has(path)) {
        paths = new Set(selectedPaths)
      } else {
        // Dragging unselected item — select it alone
        paths = new Set([path])
        setSelectedPaths(paths)
      }
      setDraggedPaths(paths)
      e.dataTransfer.setData('text/plain', [...paths].join('\n'))
      e.dataTransfer.effectAllowed = 'move'

      // Custom drag image
      const badge = document.createElement('div')
      badge.textContent = paths.size === 1 ? (path.split('/').pop() ?? '') : `${paths.size} items`
      badge.style.cssText =
        'padding:4px 8px;background:#2a6fc9;color:#fff;border-radius:4px;font-size:12px;position:absolute;top:-1000px'
      document.body.appendChild(badge)
      e.dataTransfer.setDragImage(badge, 0, 0)
      requestAnimationFrame(() => {
        if (badge.parentNode) document.body.removeChild(badge)
      })
    },
    [selectedPaths],
  )

  const handleDragOver = useCallback(
    (path: string, e: React.DragEvent) => {
      if (!draggedPaths) return
      e.preventDefault()
      e.stopPropagation()

      // Resolve drop target to a directory
      const found = findNodeByPath(files, path)
      const targetDir = found?.node.type === 'directory' ? path : getParentDir(path)

      // Validate: cannot drop into self or descendant of any dragged path
      for (const dragPath of draggedPaths) {
        if (targetDir === dragPath || targetDir.startsWith(dragPath + '/')) {
          e.dataTransfer.dropEffect = 'none'
          setDropTargetPath(null)
          return
        }
      }

      e.dataTransfer.dropEffect = 'move'
      setDropTargetPath(targetDir)
    },
    [draggedPaths, files],
  )

  const handleItemDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we're truly leaving (not entering a child element)
    const related = e.relatedTarget as Node | null
    if (containerRef.current && related && containerRef.current.contains(related)) return
    setDropTargetPath(null)
  }, [])

  const handleDrop = useCallback(
    (path: string, e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!draggedPaths || draggedPaths.size === 0) {
        setDraggedPaths(null)
        setDropTargetPath(null)
        return
      }

      const found = findNodeByPath(files, path)
      const targetDir = found?.node.type === 'directory' ? path : getParentDir(path)

      const moves: Array<{ oldPath: string; newPath: string }> = []
      for (const oldPath of draggedPaths) {
        const fileName = oldPath.split('/').pop()!
        const newPath = `${targetDir}/${fileName}`
        if (newPath !== oldPath) {
          moves.push({ oldPath, newPath })
        }
      }

      if (moves.length > 0) onMoveFiles?.(moves)

      setDraggedPaths(null)
      setDropTargetPath(null)
      setSelectedPaths(new Set())
    },
    [draggedPaths, files, onMoveFiles],
  )

  const handleBackgroundDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!draggedPaths) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDropTargetPath('/workspace')
    },
    [draggedPaths],
  )

  const handleBackgroundDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!draggedPaths || draggedPaths.size === 0) {
        setDraggedPaths(null)
        setDropTargetPath(null)
        return
      }

      const moves: Array<{ oldPath: string; newPath: string }> = []
      for (const oldPath of draggedPaths) {
        const fileName = oldPath.split('/').pop()!
        const newPath = `/workspace/${fileName}`
        if (newPath !== oldPath) {
          moves.push({ oldPath, newPath })
        }
      }

      if (moves.length > 0) onMoveFiles?.(moves)

      setDraggedPaths(null)
      setDropTargetPath(null)
      setSelectedPaths(new Set())
    },
    [draggedPaths, onMoveFiles],
  )

  const handleDragEnd = useCallback(() => {
    setDraggedPaths(null)
    setDropTargetPath(null)
  }, [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Sort root-level entries: directories first, then files, alphabetically
  const sortedFiles = sortNodes(files)

  // The rows this pass renders: the tree's first MAX_RENDERED_NODES visible
  // paths, in render order. Each directory renders only children inside this
  // set, so a symlink cycle or an implausibly large expanded tree cannot freeze
  // the browser. Computed here, once, from the visible list the tree already
  // uses — a counter incremented by each row while rendering would be a
  // render-time side effect (and skips rows that memoization didn't re-render).
  const renderedPaths = useMemo(
    () => new Set(visibleItems.slice(0, MAX_RENDERED_NODES)),
    [visibleItems],
  )

  return (
    <div
      ref={containerRef}
      className={cm.cn(cm.sp('py', 1), cm.sp('pl', 1), className)}
      style={{ overflowY: 'auto', outline: 'none' }}
      // An empty tree has no `treeitem` children, and `role="tree"` requires
      // them (axe `aria-required-children`): with no items the container is
      // plain chrome around the empty-state text.
      role={files.length === 0 ? undefined : 'tree'}
      tabIndex={0}
      aria-activedescendant={
        files.length === 0 || !focusedPath || !rowIndexById.has(focusedPath)
          ? undefined
          : `${rowIdPrefix}-${rowIndexById.get(focusedPath)}`
      }
      onKeyDown={handleTreeKeyDown}
      onClick={handleTreeClick}
      onDoubleClick={handleTreeDoubleClick}
      onContextMenu={handleBackgroundContextMenu}
      onPointerDown={(e) => {
        // Row presses bubble here too — those belong to the row's own
        // long-press recognizer, so only arm the background one for presses
        // that start on the empty tree area.
        // A new press invalidates any stale long-press click suppression.
        suppressNextRowClickRef.current = false
        if ((e.target as HTMLElement).closest('[data-explorer-path]')) return
        backgroundLongPress.onPointerDown(e)
      }}
      onPointerMove={backgroundLongPress.onPointerMove}
      onPointerUp={backgroundLongPress.onPointerUp}
      onPointerCancel={backgroundLongPress.onPointerCancel}
      onTouchEnd={backgroundLongPress.onTouchEnd}
      onDragOver={handleBackgroundDragOver}
      onDrop={handleBackgroundDrop}
      onDragEnd={handleDragEnd}
    >
      {files.length === 0 && (
        <div className={cm.cn(cm.textMuted, cm.textSize('sm'), cm.sp('p', 3))}>
          {t('ide.files.empty', undefined, { defaultValue: 'No files' })}
        </div>
      )}
      {sortedFiles.map((node) => (
        <FileTreeItem
          key={node.path}
          node={node}
          depth={0}
          isExpanded={isExpandedFromState(expandState, node.path, 0)}
          activeFile={activeFile}
          isSelected={selectedPaths.has(node.path)}
          isCut={clipboard?.operation === 'cut' && clipboard.paths.has(node.path)}
          isFocused={focusedPath === node.path}
          isDropTarget={dropTargetPath === node.path}
          onFileSelect={onFileSelect}
          onFileDoubleClick={onFileDoubleClick}
          onDirExpand={onDirExpand}
          onTogglePath={handleTogglePath}
          onSymlinkClick={handleSymlinkClick}
          onContextMenu={handleItemContextMenu}
          onItemClick={handleItemClick}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleItemDragLeave}
          onDrop={handleDrop}
          expandState={expandState}
          fileStatuses={fileStatuses}
          gitColors={gitColors}
          selectedPaths={selectedPaths}
          clipboardPaths={clipboard?.paths ?? null}
          clipboardOperation={clipboard?.operation ?? null}
          renderedPaths={renderedPaths}
          dropTargetPath={dropTargetPath}
          isCoarse={isCoarse}
          rowIdPrefix={rowIdPrefix}
          rowIndex={rowIndexById}
          onLongPressFired={() => {
            suppressNextRowClickRef.current = true
          }}
        />
      ))}
      {contextMenu && (
        <FileExplorerContextMenu
          readOnly={readOnly}
          position={contextMenu.position}
          node={contextMenu.node}
          selectedCount={selectedPaths.size}
          canPaste={clipboard?.operation === 'cut' && clipboard.paths.size > 0}
          onAction={handleContextMenuAction}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  )
}

FileExplorer.displayName = 'FileExplorer'
