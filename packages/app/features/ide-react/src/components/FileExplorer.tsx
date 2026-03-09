/**
 * Tree-view file browser.
 *
 * @module
 */

import { getIcon } from 'material-file-icons'
import type { JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useThemeMode } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { FileExplorerProps, FileNode } from '../types.js'

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
 * @param dirPath
 * @param fileStatuses
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
 *
 * @param persistKey
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
 *
 * @param persistKey
 * @param state
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
 *
 * @param state
 * @param path
 * @param depth
 */
function isExpandedFromState(state: ExpandState, path: string, depth: number): boolean {
  if (state.expanded.has(path)) return true
  if (state.collapsed.has(path)) return false
  return depth < 1
}

/**
 * Returns the ancestor directory paths for a given file path (e.g. "a/b/c.ts" → ["a", "a/b"]).
 * @param filePath
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
 * @param nodes
 * @param targetPath
 * @param depth
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
 * @param symlinkPath
 * @param target
 */
function resolveSymlinkTarget(symlinkPath: string, target: string): string {
  if (target.startsWith('/')) return target
  const parentDir = symlinkPath.slice(0, symlinkPath.lastIndexOf('/'))
  return `${parentDir}/${target}`
}

/**
 * Scroll to and briefly highlight a tree item by path.
 * @param container
 * @param path
 */
function scrollAndHighlight(container: HTMLElement | null, path: string): void {
  if (!container) return
  const el = Array.from(
    container.querySelectorAll<HTMLElement>('[data-explorer-path]'),
  ).find((e) => e.dataset.explorerPath === path)
  if (!el) return
  el.scrollIntoView({ block: 'nearest' })
  el.style.transition = 'background 0s'
  el.style.background = 'rgba(128,128,128,0.25)'
  requestAnimationFrame(() => {
    el.style.transition = 'background 600ms ease-out'
    el.style.background = ''
  })
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

/**
 * Chevron icon — points right when collapsed, down when expanded.
 * @param root0
 * @param root0.isOpen
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
 * @param root0
 * @param root0.name
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

interface FileTreeItemProps {
  node: FileNode
  depth: number
  isExpanded: boolean
  activeFile?: string | null
  onFileSelect: (path: string) => void
  onFileDoubleClick?: (path: string) => void
  onDirExpand?: (path: string) => void
  onTogglePath: (path: string, nowExpanded: boolean) => void
  onSymlinkClick?: (symlinkPath: string, target: string) => void
  expandState: ExpandState
  fileStatuses?: Record<string, string>
  gitColors: Record<string, string>
}

/**
 *
 * @param root0
 * @param root0.node
 * @param root0.depth
 * @param root0.isExpanded
 * @param root0.activeFile
 * @param root0.onFileSelect
 * @param root0.onFileDoubleClick
 * @param root0.onDirExpand
 * @param root0.onTogglePath
 * @param root0.onSymlinkClick
 * @param root0.expandState
 * @param root0.fileStatuses
 */
function FileTreeItem({
  node,
  depth,
  isExpanded,
  activeFile,
  onFileSelect,
  onFileDoubleClick,
  onDirExpand,
  onTogglePath,
  onSymlinkClick,
  expandState,
  fileStatuses,
  gitColors,
}: FileTreeItemProps): JSX.Element {
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

  const toggle = useCallback(() => {
    if (node.symlinkTarget && onSymlinkClick) {
      onSymlinkClick(node.path, node.symlinkTarget)
      return
    }
    if (isDir) {
      onTogglePath(node.path, !isExpanded)
      // onDirExpand is handled by the effect above when isExpanded becomes true
    } else {
      onFileSelect(node.path)
    }
  }, [isDir, isExpanded, node.path, node.symlinkTarget, onFileSelect, onTogglePath, onSymlinkClick])

  // Directories before files, each group sorted alphabetically
  const sortedChildren = node.children
    ? [...node.children].sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    : undefined

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        onDoubleClick={() => {
          if (!isDir && onFileDoubleClick) onFileDoubleClick(node.path)
        }}
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
          background: node.path === activeFile ? 'rgba(128,128,128,0.15)' : 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
          opacity: node.isDimmed ? 0.35 : 1,
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
              : node.gitStatus
                ? gitColors[node.gitStatus]
                : undefined,
            opacity: node.symlinkTarget ? 0.55 : undefined,
          }}
        >
          {node.name}
          {node.symlinkTarget && (
            ' \u2192 ' + node.symlinkTarget.split('/').pop()
          )}
        </span>
      </button>

      {isDir && isExpanded && sortedChildren && (
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
              onFileSelect={onFileSelect}
              onFileDoubleClick={onFileDoubleClick}
              onDirExpand={onDirExpand}
              onTogglePath={onTogglePath}
              onSymlinkClick={onSymlinkClick}
              expandState={expandState}
              fileStatuses={fileStatuses}
              gitColors={gitColors}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FileExplorer
// ---------------------------------------------------------------------------

/**
 * Tree-view file explorer component for browsing project files.
 * @param root0 - The component props.
 * @param root0.files - The root file nodes to display.
 * @param root0.onFileSelect - Callback invoked when a file is selected.
 * @param root0.onFileDoubleClick
 * @param root0.onDirExpand - Callback invoked when a directory is expanded.
 * @param root0.className - Optional CSS class name for the container.
 * @param root0.persistKey - localStorage key for persisting expand/collapse state.
 * @param root0.activeFile
 * @param root0.fileStatuses
 * @returns The rendered file explorer element.
 */
export function FileExplorer({
  files,
  onFileSelect,
  onFileDoubleClick,
  onDirExpand,
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

  // Sort root-level entries: directories first, then files, alphabetically
  const sortedFiles = [...files].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div
      ref={containerRef}
      className={cm.cn(cm.sp('py', 1), cm.sp('pl', 1), className)}
      style={{ overflowY: 'auto' }}
      role="tree"
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
          onFileSelect={onFileSelect}
          onFileDoubleClick={onFileDoubleClick}
          onDirExpand={onDirExpand}
          onTogglePath={handleTogglePath}
          onSymlinkClick={handleSymlinkClick}
          expandState={expandState}
          fileStatuses={fileStatuses}
          gitColors={gitColors}
        />
      ))}
    </div>
  )
}

FileExplorer.displayName = 'FileExplorer'
