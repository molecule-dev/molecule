/**
 * Tree-view file browser with multi-select, keyboard navigation, and drag-and-drop.
 *
 * @module
 */

import { getIcon } from 'material-file-icons'
import type { JSX } from 'react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useThemeMode } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { FileExplorerProps, FileNode } from '../types.js'
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
// Expand state — persisted to localStorage
// ---------------------------------------------------------------------------

interface ExpandState {
  expanded: Set<string>
  collapsed: Set<string>
}

/**
 * Loads persisted expand/collapse state from localStorage.
 * @param persistKey - The localStorage key to read from.
 * @returns The deserialized expand state, or a fresh empty state if none found.
 */
function loadExpandState(persistKey: string): ExpandState {
  try {
    const raw = localStorage.getItem(persistKey)
    if (raw) {
      const parsed = JSON.parse(raw) as { expanded: string[]; collapsed: string[] }
      return { expanded: new Set(parsed.expanded), collapsed: new Set(parsed.collapsed) }
    }
  } catch {
    /* ignored */
  }
  return { expanded: new Set(), collapsed: new Set() }
}

/**
 * Persists expand/collapse state to localStorage.
 * @param persistKey - The localStorage key to write to.
 * @param state - The expand state to serialize and store.
 */
function saveExpandState(persistKey: string, state: ExpandState): void {
  try {
    localStorage.setItem(
      persistKey,
      JSON.stringify({ expanded: [...state.expanded], collapsed: [...state.collapsed] }),
    )
  } catch {
    /* ignored */
  }
}

/**
 * Determines whether a directory path should be expanded based on persisted state.
 * @param state - The current expand/collapse state.
 * @param path - The directory path to check.
 * @param depth - The nesting depth (directories at depth 0 default to expanded).
 * @returns True if the directory should be shown expanded.
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

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

/**
 * Chevron icon — points right when collapsed, down when expanded.
 * @param root0 - Component props.
 * @param root0.isOpen - Whether the chevron should point downward (expanded).
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
 * @param root0 - Component props.
 * @param root0.name - The filename to resolve an icon for.
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
// FileTreeItem
// ---------------------------------------------------------------------------

/**
 * Max total FileTreeItems to render in a single FileExplorer pass.
 * Prevents symlink cycles from freezing the browser without imposing
 * any depth limit on legitimate projects.
 */
const MAX_RENDERED_NODES = 10_000

interface FileTreeItemProps {
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
  onItemClick: (path: string, modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => void
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
  /** Shared mutable counter — tracks total rendered items to prevent runaway recursion. */
  renderCount: { current: number }
  dropTargetPath: string | null
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
  renderCount,
  dropTargetPath,
}: FileTreeItemProps): JSX.Element {
  renderCount.current++
  const cm = getClassMap()
  const isDir = node.type === 'directory'

  // Load children whenever this dir is expanded but hasn't been fetched yet.
  // `undefined` means not yet loaded; `[]` means loaded but empty — only fetch
  // for the former to avoid infinite loops on empty/errored directories.
  useEffect(() => {
    if (isExpanded && isDir && node.children === undefined && onDirExpand) {
      onDirExpand(node.path)
    }
  }, [isExpanded, isDir, node.children, node.path, onDirExpand])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey
      if (hasModifier) {
        // Modifier clicks: pure selection, no open/toggle
        onItemClick(node.path, { ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey })
      } else {
        // No modifier: select single + perform action
        onItemClick(node.path, { ctrlKey: false, metaKey: false, shiftKey: false })
        if (node.symlinkTarget && onSymlinkClick) {
          onSymlinkClick(node.path, node.symlinkTarget)
        } else if (isDir) {
          onTogglePath(node.path, !isExpanded)
        } else {
          onFileSelect(node.path)
        }
      }
    },
    [node.path, node.symlinkTarget, isDir, isExpanded, onItemClick, onFileSelect, onTogglePath, onSymlinkClick],
  )

  // Directories before files, each group sorted alphabetically
  const sortedChildren = node.children ? sortNodes(node.children) : undefined

  // Compute background color: dropTarget > selection > activeFile > transparent
  let background = 'transparent'
  if (isDropTarget) {
    background = 'rgba(0,100,200,0.15)'
  } else if (isSelected) {
    background = 'rgba(0,100,200,0.2)'
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
    <div>
      <button
        type="button"
        onClick={handleClick}
        onDoubleClick={() => {
          if (!isDir && onFileDoubleClick) onFileDoubleClick(node.path)
        }}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.preventDefault()
            e.stopPropagation()
            onContextMenu({ x: e.clientX, y: e.clientY }, node)
          }
        }}
        draggable
        onDragStart={(e) => onDragStart(node.path, e)}
        onDragOver={(e) => onDragOver(node.path, e)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(node.path, e)}
        data-explorer-path={node.path}
        className={cm.w('full')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          paddingLeft: `${depth * 12}px`,
          paddingTop: '1px',
          paddingBottom: '1px',
          paddingRight: '6px',
          border: 'none',
          background,
          outline: isDropTarget
            ? '1px solid rgba(0,100,200,0.4)'
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
      </button>

      {isDir && isExpanded && sortedChildren && renderCount.current < MAX_RENDERED_NODES && (
        <div style={{ position: 'relative' }}>
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
          {sortedChildren.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              isExpanded={isExpandedFromState(expandState, child.path, depth + 1)}
              activeFile={activeFile}
              isSelected={selectedPaths.has(child.path)}
              isCut={clipboardOperation === 'cut' && clipboardPaths !== null && clipboardPaths.has(child.path)}
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
              renderCount={renderCount}
              dropTargetPath={dropTargetPath}
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
 * @param root0 - The component props.
 * @param root0.files - The root file nodes to display.
 * @param root0.onFileSelect - Callback invoked when a file is selected.
 * @param root0.onFileDoubleClick - Callback invoked when a file is double-clicked (pin tab).
 * @param root0.onDirExpand - Callback invoked when a directory is expanded.
 * @param root0.onRename - Callback invoked for the "Rename" context menu action.
 * @param root0.onDelete - Callback invoked for the "Delete" context menu action.
 * @param root0.onDeleteMultiple - Callback invoked for bulk delete.
 * @param root0.onMoveFiles - Callback invoked when files are moved via drag-and-drop or cut+paste.
 * @param root0.onNewFile - Callback invoked for the "New File" context menu action.
 * @param root0.onNewFolder - Callback invoked for the "New Folder" context menu action.
 * @param root0.onCollapseAll - Callback invoked for the "Collapse All" context menu action.
 * @param root0.className - Optional CSS class name for the container.
 * @param root0.persistKey - localStorage key for persisting expand/collapse state.
 * @param root0.activeFile - The currently active file path for highlighting.
 * @param root0.fileStatuses - Git status map keyed by file path.
 * @returns The rendered file explorer element.
 */
export function FileExplorer({
  files,
  onFileSelect,
  onFileDoubleClick,
  onDirExpand,
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
  const cm = getClassMap()
  const gitColors = useThemeMode() === 'light' ? LIGHT_GIT_COLORS : DARK_GIT_COLORS
  const containerRef = useRef<HTMLDivElement>(null)
  // When set, the next render after DOM update will scroll this path into view
  const scrollTargetRef = useRef<string | null>(null)
  // When set, briefly flash a highlight on this path after scrolling
  const highlightTargetRef = useRef<string | null>(null)

  const [expandState, setExpandState] = useState<ExpandState>(() =>
    persistKey ? loadExpandState(persistKey) : { expanded: new Set(), collapsed: new Set() },
  )

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
  const visibleItems = useMemo(
    () => getVisibleItems(files, expandState),
    [files, expandState],
  )

  // Prune stale selections when the file tree changes
  useEffect(() => {
    const treePaths = collectAllPaths(files)
    setSelectedPaths((prev) => {
      const next = new Set<string>()
      for (const p of prev) {
        if (treePaths.has(p)) next.add(p)
      }
      return next.size === prev.size ? prev : next
    })
  }, [files])

  // When activeFile changes, expand all ancestor directories and queue a scroll
  useEffect(() => {
    if (!activeFile) return
    const ancestors = getAncestorPaths(activeFile)
    if (ancestors.length > 0) {
      setExpandState((prev) => {
        const needsUpdate = ancestors.some((p) => !prev.expanded.has(p))
        if (!needsUpdate) return prev
        const next: ExpandState = {
          expanded: new Set(prev.expanded),
          collapsed: new Set(prev.collapsed),
        }
        for (const ancestor of ancestors) {
          next.expanded.add(ancestor)
          next.collapsed.delete(ancestor)
        }
        if (persistKey) saveExpandState(persistKey, next)
        return next
      })
    }
    scrollTargetRef.current = activeFile
  }, [activeFile, persistKey])

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

  const handleTogglePath = useCallback(
    (path: string, nowExpanded: boolean) => {
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
        if (persistKey) saveExpandState(persistKey, next)
        return next
      })
    },
    [persistKey],
  )

  const handleSymlinkClick = useCallback(
    (symlinkPath: string, target: string) => {
      const resolvedPath = resolveSymlinkTarget(symlinkPath, target)
      const found = findNodeByPath(files, resolvedPath)

      if (found && found.node.type === 'directory') {
        // Ensure ancestors are expanded so the target is visible
        const ancestors = getAncestorPaths(resolvedPath)
        setExpandState((prev) => {
          const needsUpdate = ancestors.some((p) => !prev.expanded.has(p))
          if (!needsUpdate) {
            // Already visible — scroll and highlight directly
            scrollAndHighlight(containerRef.current, resolvedPath)
            return prev
          }
          const next: ExpandState = {
            expanded: new Set(prev.expanded),
            collapsed: new Set(prev.collapsed),
          }
          for (const a of ancestors) {
            next.expanded.add(a)
            next.collapsed.delete(a)
          }
          if (persistKey) saveExpandState(persistKey, next)
          return next
        })
        scrollTargetRef.current = resolvedPath
        highlightTargetRef.current = resolvedPath
      } else {
        // File symlink (or target not in tree) — select the real file
        onFileSelect(resolvedPath)
      }
    },
    [files, persistKey, onFileSelect],
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

  const handleBackgroundContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setSelectedPaths(new Set())
    setContextMenu({ position: { x: e.clientX, y: e.clientY }, node: null })
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const handleCollapseAll = useCallback(() => {
    setExpandState({ expanded: new Set(), collapsed: new Set(['__all_collapsed__']) })
    if (persistKey)
      saveExpandState(persistKey, {
        expanded: new Set(),
        collapsed: new Set(['__all_collapsed__']),
      })
    onCollapseAll?.()
  }, [persistKey, onCollapseAll])

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
          if (node) navigator.clipboard.writeText(node.path).catch(() => {})
          break
        case 'copyPaths': {
          const paths = Array.from(selectedPaths).join('\n')
          navigator.clipboard.writeText(paths).catch(() => {})
          break
        }
        case 'copyRelativePath':
          if (node) {
            const rel = node.path.replace(/^\/workspace\//, '')
            navigator.clipboard.writeText(rel).catch(() => {})
          }
          break
        case 'copyRelativePaths': {
          const rels = Array.from(selectedPaths)
            .map((p) => p.replace(/^\/workspace\//, ''))
            .join('\n')
          navigator.clipboard.writeText(rels).catch(() => {})
          break
        }
        case 'cut':
          if (selectedPaths.size > 0) {
            setClipboard({ paths: new Set(selectedPaths), operation: 'cut' })
            navigator.clipboard
              .writeText(Array.from(selectedPaths).join('\n'))
              .catch(() => {})
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
        if (found?.node.type === 'directory' && isExpandedFromState(expandState, focusedPath, found.depth)) {
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

      // Ctrl/Cmd+C: copy paths
      if (isMod && e.key === 'c' && selectedPaths.size > 0) {
        e.preventDefault()
        const paths = Array.from(selectedPaths).join('\n')
        navigator.clipboard.writeText(paths).catch(() => {})
        setClipboard({ paths: new Set(selectedPaths), operation: 'copy' })
        return
      }

      // Ctrl/Cmd+X: cut
      if (isMod && e.key === 'x' && selectedPaths.size > 0) {
        e.preventDefault()
        setClipboard({ paths: new Set(selectedPaths), operation: 'cut' })
        navigator.clipboard
          .writeText(Array.from(selectedPaths).join('\n'))
          .catch(() => {})
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

  // Shared mutable counter — reset each render, incremented by each FileTreeItem.
  // Prevents symlink cycles from freezing the browser by capping total rendered nodes.
  const renderCountRef = useRef({ current: 0 })
  renderCountRef.current.current = 0

  return (
    <div
      ref={containerRef}
      className={cm.cn(cm.sp('py', 1), cm.sp('pl', 1), className)}
      style={{ overflowY: 'auto', outline: 'none' }}
      role="tree"
      tabIndex={0}
      onKeyDown={handleTreeKeyDown}
      onContextMenu={handleBackgroundContextMenu}
      onDragOver={handleBackgroundDragOver}
      onDrop={handleBackgroundDrop}
      onDragEnd={handleDragEnd}
    >
      {files.length === 0 && (
        <div className={cm.cn(cm.textMuted, cm.textSize('sm'), cm.sp('p', 3))}>
          {t('ide.files.empty')}
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
          renderCount={renderCountRef.current}
          dropTargetPath={dropTargetPath}
        />
      ))}
      {contextMenu && (
        <FileExplorerContextMenu
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
