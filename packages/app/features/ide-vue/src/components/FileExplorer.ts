/**
 * Tree-view file browser with multi-select, keyboard navigation, and drag-and-drop.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `FileExplorer` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. Directories render before files, each group
 * alphabetically; a directory at the root opens by default and any other opens
 * from the state persisted under `persistKey`; an expanded directory that has
 * no `children` yet asks for them once through `onDirExpand`; the active file
 * opens its ancestors and is tinted; git statuses color a file and roll the
 * highest-priority one up to its directory; a symlink shows its target and a
 * directory symlink reveals and flashes that target; selection follows plain,
 * ctrl/meta, shift, shift+ctrl and space, the arrow keys move a focus and
 * extend the selection, Delete/Backspace and F2 hand the selection over, and
 * the row menu, the background menu and a coarse pointer's long-press all open
 * the same `FileExplorerContextMenu` the React component portals.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express, written through the CSSOM exactly the way React
 * writes them (the drag tints and the highlight restore are property writes,
 * not one style string). All user-facing text goes through `t()`.
 *
 * @module
 */

import { getIcon } from 'material-file-icons'
import {
  computed,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  onUpdated,
  type PropType,
  ref,
  useId,
  type VNodeChild,
  watch,
} from 'vue'

import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { FileNode } from '@molecule/app-ide-panel-logic'
import {
  type ExpandState,
  loadExpandState,
  saveExpandState,
  watchExpandState,
} from '@molecule/app-ide-panel-logic/panels'
import { getClassMap } from '@molecule/app-ui'
import { useThemeMode, useTranslation } from '@molecule/app-vue'

import { useCoarsePointer } from '../hooks/useViewport.js'
import {
  type ContextMenuAction,
  FileExplorerContextMenu,
} from '../parts/FileExplorerContextMenu.js'

/** Git status → filename color — dark/light variants for readability. */
const DARK_GIT_COLORS: Record<string, string> = {
  modified: '#e2c08d',
  added: '#73c991',
  untracked: '#73c991',
  deleted: '#c74e39',
}

/** The light theme's variants of {@link DARK_GIT_COLORS}. */
const LIGHT_GIT_COLORS: Record<string, string> = {
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
const LONG_PRESS_MS = 500

/** Finger drift beyond this many pixels cancels a pending long-press. */
const LONG_PRESS_MOVE_TOLERANCE_PX = 10

/** Max total FileTreeItems to render in a single FileExplorer pass. */
const MAX_RENDERED_NODES = 10_000

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
 * Chevron icon — points right when collapsed, down when expanded.
 * @param isOpen - Whether the directory is open.
 * @returns The rendered SVG chevron icon.
 */
function chevronIcon(isOpen: boolean): VNodeChild {
  return h(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      viewBox: '0 0 16 16',
      width: '16',
      height: '16',
      style: {
        display: 'block',
        flexShrink: 0,
        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 100ms',
        opacity: 0.65,
      },
    },
    [
      // Right-pointing chevron (V rotated): collapses/expands via CSS rotation.
      h('polyline', {
        points: '6,4 10,8 6,12',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '1.5',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      }),
    ],
  )
}

/**
 * File icon resolved from material-file-icons based on the filename: the SVG the
 * library returns is injected as the span's content, the way React writes it
 * with `dangerouslySetInnerHTML`. Safe for the same reason: the markup comes
 * from a trusted static icon library, not from user input.
 * @param name - The file name to resolve an icon for.
 * @returns The rendered file type icon element.
 */
function fileTypeIcon(name: string): VNodeChild {
  return h('span', {
    style: { display: 'inline-flex', flexShrink: 0, width: '16px', height: '16px' },
    innerHTML: getIcon(name).svg,
  })
}

/** Pointer event fields the long-press recognizer reads (React's `PointerEvent`). */
interface LongPressPointerEvent {
  pointerType?: string
  clientX: number
  clientY: number
}

/** Pointer/touch handlers returned by {@link useLongPress}, spread onto the target element. */
interface LongPressHandlers {
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
 * @param enabled - Whether the recognizer is active (coarse pointers only).
 * @param onLongPress - Invoked with the press position when the hold fires.
 * @returns Handlers to spread on the target element (see {@link LongPressHandlers}).
 */
function useLongPress(
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
  onUnmounted(clear)

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

/**
 * Recursive tree item for a single file or directory node — React's
 * `FileTreeItem`, module-local there and here (a file explorer renders it, the
 * package does not export it).
 */
const FileTreeItem = defineComponent({
  name: 'FileTreeItem',
  inheritAttrs: false,
  props: {
    /** The file or directory this row renders. */
    node: { type: Object as PropType<FileNode>, required: true },
    /** The row's nesting depth (drives the indent and the guide line). */
    depth: { type: Number, required: true },
    /** Whether a directory row is open. */
    isExpanded: { type: Boolean, required: true },
    /** The active file's path, tinted when it matches this row. */
    activeFile: { type: [String, null] as PropType<string | null>, required: false, default: null },
    /** Whether this row is part of the selection. */
    isSelected: { type: Boolean, required: true },
    /** Whether this row was cut (it dims). */
    isCut: { type: Boolean, required: true },
    /** Whether this row holds the keyboard focus. */
    isFocused: { type: Boolean, required: true },
    /** Whether this row's directory is the drop target. */
    isDropTarget: { type: Boolean, required: true },
    /** Opens a file from a click with no modifier. */
    onFileSelect: { type: Function as PropType<(path: string) => void>, required: true },
    /** Opens a file from a double-click. */
    onFileDoubleClick: {
      type: Function as PropType<(path: string) => void>,
      required: false,
      default: undefined,
    },
    /** Asks the host for a directory's children the first time it opens. */
    onDirExpand: {
      type: Function as PropType<(path: string) => void>,
      required: false,
      default: undefined,
    },
    /** Opens or closes a directory. */
    onTogglePath: {
      type: Function as PropType<(path: string, nowExpanded: boolean) => void>,
      required: true,
    },
    /** Follows a symlink with no modifier. */
    onSymlinkClick: {
      type: Function as PropType<(symlinkPath: string, target: string) => void>,
      required: false,
      default: undefined,
    },
    /** Opens this row's context menu. */
    onContextMenu: {
      type: Function as PropType<(position: { x: number; y: number }, node: FileNode) => void>,
      required: false,
      default: undefined,
    },
    /** Applies a click's modifiers to the selection. */
    onItemClick: {
      type: Function as PropType<
        (path: string, modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => void
      >,
      required: true,
    },
    /** Starts dragging this row. */
    onDragStart: {
      type: Function as PropType<(path: string, e: DragEvent) => void>,
      required: true,
    },
    /** Drags over this row. */
    onDragOver: {
      type: Function as PropType<(path: string, e: DragEvent) => void>,
      required: true,
    },
    /** Leaves this row while dragging. */
    onDragLeave: { type: Function as PropType<(e: DragEvent) => void>, required: true },
    /** Drops onto this row. */
    onDrop: { type: Function as PropType<(path: string, e: DragEvent) => void>, required: true },
    /** The tree's expand/collapse state, for the children's defaults. */
    expandState: { type: Object as PropType<ExpandState>, required: true },
    /** Git statuses, coloring file names and rolling up to directories. */
    fileStatuses: {
      type: Object as PropType<Record<string, string>>,
      required: false,
      default: undefined,
    },
    /** The theme's status colors. */
    gitColors: { type: Object as PropType<Record<string, string>>, required: true },
    /** Every selected path. */
    selectedPaths: { type: Object as PropType<Set<string>>, required: true },
    /** The cut/copy clipboard's paths, or null. */
    clipboardPaths: {
      type: Object as PropType<Set<string> | null>,
      required: true,
    },
    /** The clipboard's operation, or null. */
    clipboardOperation: {
      type: String as PropType<'cut' | 'copy' | null>,
      required: true,
    },
    /** Shared mutable counter — caps the total rendered items. */
    renderCount: { type: Object as PropType<{ current: number }>, required: true },
    /** The directory the drag would drop into, if any. */
    dropTargetPath: { type: String as PropType<string | null>, required: true },
    /** Touch-first device — rows get a ≥36px min-height so they're comfortably tappable. */
    isCoarse: { type: Boolean, required: true },
    /**
     * Prefix (one id at the tree root) for the rows' DOM ids — the tree
     * container points `aria-activedescendant` at the focused row's id.
     */
    rowIdPrefix: { type: String, required: true },
    /** Each visible path's 1-based render-order position, keying the rows' ids. */
    rowIndex: { type: Object as PropType<ReadonlyMap<string, number>>, required: true },
    /**
     * The expansion each directory had in the last committed render — a second
     * click inside one render pass reads THIS value, the way React's batched
     * render leaves it looking at the props of the render that produced the
     * row (so a double-click on a directory collapses it, not collapse-then-expand).
     */
    committedOpen: { type: Object as PropType<Map<string, boolean>>, required: true },
    /** Arms the tree container's long-press click suppression (see its click). */
    onLongPressFired: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const cm = getClassMap()

    // Load children whenever this dir is expanded but hasn't been fetched yet.
    // `undefined` means not yet loaded; `[]` means loaded but empty — only fetch
    // for the former to avoid infinite loops on empty/errored directories.
    const loadChildren = (): void => {
      const isDir = props.node.type === 'directory'
      if (props.isExpanded && isDir && props.node.children === undefined && props.onDirExpand) {
        props.onDirExpand(props.node.path)
      }
    }
    onMounted(loadChildren)
    watch(
      [
        () => props.isExpanded,
        () => props.node.children,
        () => props.node.path,
        () => props.onDirExpand,
      ],
      loadChildren,
    )

    // iOS Safari never fires 'contextmenu', so on coarse pointers a ~500ms
    // long-press opens the SAME menu the right-click path does. (The handlers
    // returned by the hook are referentially stable across renders.)
    const longPress = useLongPress(
      () => props.isCoarse && !!props.onContextMenu,
      (position) => {
        // Arm the tree container's synthesized-click suppression (its click
        // handler consumes it) — the recognizer's own touchend preventDefault
        // is the first line of defense.
        props.onLongPressFired()
        props.onContextMenu?.(position, props.node)
      },
    )

    /** Opens this row's menu at the pointer, or swallows the browser's. */
    const handleContextMenu = (e: MouseEvent): void => {
      if (props.onContextMenu) {
        e.preventDefault()
        e.stopPropagation()
        props.onContextMenu({ x: e.clientX, y: e.clientY }, props.node)
      }
    }

    return (): VNodeChild => {
      props.renderCount.current++
      const isDir = props.node.type === 'directory'
      const isSubTreeOpen =
        isDir && props.isExpanded && props.renderCount.current < MAX_RENDERED_NODES
      if (isDir) props.committedOpen.set(props.node.path, props.isExpanded)
      // This row's position in render order (1-based) — the tree container
      // names the focused row via `aria-activedescendant` with the same
      // numbering. The position comes from the root's visible-items map, not
      // this render's counter, because a memoized row skips re-rendering and
      // would otherwise take another row's number (two rows, one id).
      const rowId = `${props.rowIdPrefix}-${props.rowIndex.get(props.node.path) ?? 0}`

      // Directories before files, each group sorted alphabetically
      const sortedChildren = props.node.children ? sortNodes(props.node.children) : undefined

      // Compute background color: dropTarget > selection > activeFile > transparent
      // Drop/selection tints follow the theme primary (a rebranded app tints its
      // own tree), never a literal blue; the hex is only the CSS-var fallback.
      let background = 'transparent'
      if (props.isDropTarget) {
        background = 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 15%, transparent)'
      } else if (props.isSelected) {
        background = 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 20%, transparent)'
      } else if (props.node.path === props.activeFile) {
        background = 'rgba(128,128,128,0.15)'
      }

      // Compute opacity: cut > dimmed > normal
      let opacity = 1
      if (props.isCut) {
        opacity = 0.4
      } else if (props.node.isDimmed) {
        opacity = 0.35
      }

      const rowStyle: Record<string, unknown> = {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        paddingLeft: `${props.depth * 12}px`,
        paddingTop: '1px',
        paddingBottom: '1px',
        paddingRight: '6px',
        // Keep the native text-selection/callout from fighting the long-press
        // gesture on touch devices; fine-pointer rows are untouched.
        border: 'none',
        background,
        outline: props.isDropTarget
          ? '1px solid color-mix(in srgb, var(--mol-color-primary, #4070e0) 40%, transparent)'
          : props.isFocused
            ? '1px dotted rgba(128,128,128,0.5)'
            : 'none',
        outlineOffset: '-1px',
        color: 'inherit',
        cursor: 'pointer',
        textAlign: 'left',
        opacity,
        fontSize: '13px',
        lineHeight: '22px',
      }
      if (props.isCoarse) {
        rowStyle['-webkit-user-select'] = 'none'
        rowStyle.userSelect = 'none'
      }

      const labelStyle: Record<string, unknown> = {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }
      const labelColor = isDir
        ? props.fileStatuses
          ? getDirColor(props.node.path, props.fileStatuses, props.gitColors)
          : undefined
        : props.fileStatuses?.[props.node.path]
          ? props.gitColors[props.fileStatuses[props.node.path]]
          : undefined
      if (labelColor !== undefined) labelStyle.color = labelColor
      if (props.node.symlinkTarget) labelStyle.opacity = 0.55

      return h('div', { role: 'none' }, [
        h(
          'div',
          {
            role: 'treeitem',
            id: rowId,
            'aria-level': props.depth + 1,
            'aria-expanded': isDir ? (props.isExpanded ? 'true' : 'false') : undefined,
            'aria-selected': props.isSelected ? 'true' : 'false',
            // Focus stays on the tree container (the tree pattern: one tab
            // stop, keys and the focused row's drawing live there, and it
            // points aria-activedescendant at this row) — so the row itself
            // is only programmatically focusable.
            tabindex: -1,
            onContextmenu: handleContextMenu,
            onPointerdown: longPress.onPointerDown,
            onPointermove: longPress.onPointerMove,
            onPointerup: longPress.onPointerUp,
            onPointercancel: longPress.onPointerCancel,
            onTouchend: longPress.onTouchEnd,
            // On touch devices a draggable element hijacks the long-press to
            // start a native drag (firing pointercancel, which kills the
            // context-menu timer), so rows are only draggable on fine pointers.
            draggable: !props.isCoarse,
            onDragstart: (e: DragEvent) => props.onDragStart(props.node.path, e),
            onDragover: (e: DragEvent) => props.onDragOver(props.node.path, e),
            onDragleave: props.onDragLeave,
            onDrop: (e: DragEvent) => props.onDrop(props.node.path, e),
            'data-explorer-path': props.node.path,
            class: cm.cn(cm.w('full'), cm.touchTargetCompact),
            /* mol-bespoke-button: a file-TREE row — depth-indented, drag/drop
               and long-press aware, a list item rather than a CTA. A
               `treeitem` div, not a `<button>` (HTML does not allow
               role="treeitem" on one), so the tree it belongs to has the
               `treeitem` children role="tree" requires; focus stays on the
               tree container, which draws the focused row and handles its
               keys. Its selection and drop tints are theme tokens, and its
               ≥36px coarse floor comes from the ClassMap (the compact ~24px
               pointer row is unchanged). */
            style: rowStyle,
          },
          [
            // Icon column — chevron for dirs, file-type icon for files; always 16px so names align
            h(
              'span',
              { style: { display: 'flex', alignItems: 'center', width: '16px', flexShrink: 0 } },
              [isDir ? chevronIcon(props.isExpanded) : fileTypeIcon(props.node.name)],
            ),
            // Label
            h('span', { style: labelStyle }, [
              props.node.name,
              props.node.symlinkTarget
                ? ' → ' + (props.node.symlinkTarget.split('/').pop() ?? '')
                : '',
            ]),
          ],
        ),
        isSubTreeOpen && sortedChildren
          ? h('div', { role: 'group', style: { position: 'relative' } }, [
              // Guide line — 1px at center of parent chevron (paddingLeft + half icon width)
              h('span', {
                style: {
                  position: 'absolute',
                  left: `${props.depth * 12 + 8}px`,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  background: 'rgba(128,128,128,0.15)',
                  pointerEvents: 'none',
                },
              }),
              ...sortedChildren.map((child) =>
                h(FileTreeItem, {
                  key: child.path,
                  node: child,
                  depth: props.depth + 1,
                  isExpanded: isExpandedFromState(props.expandState, child.path, props.depth + 1),
                  activeFile: props.activeFile,
                  isSelected: props.selectedPaths.has(child.path),
                  isCut:
                    props.clipboardOperation === 'cut' &&
                    props.clipboardPaths !== null &&
                    props.clipboardPaths.has(child.path),
                  isFocused: false,
                  isDropTarget: props.dropTargetPath === child.path,
                  onFileSelect: props.onFileSelect,
                  onFileDoubleClick: props.onFileDoubleClick,
                  onDirExpand: props.onDirExpand,
                  onTogglePath: props.onTogglePath,
                  onSymlinkClick: props.onSymlinkClick,
                  onContextMenu: props.onContextMenu,
                  onItemClick: props.onItemClick,
                  onDragStart: props.onDragStart,
                  onDragOver: props.onDragOver,
                  onDragLeave: props.onDragLeave,
                  onDrop: props.onDrop,
                  expandState: props.expandState,
                  fileStatuses: props.fileStatuses,
                  gitColors: props.gitColors,
                  selectedPaths: props.selectedPaths,
                  clipboardPaths: props.clipboardPaths,
                  clipboardOperation: props.clipboardOperation,
                  renderCount: props.renderCount,
                  dropTargetPath: props.dropTargetPath,
                  isCoarse: props.isCoarse,
                  rowIdPrefix: props.rowIdPrefix,
                  rowIndex: props.rowIndex,
                  committedOpen: props.committedOpen,
                  onLongPressFired: props.onLongPressFired,
                }),
              ),
            ])
          : null,
      ])
    }
  },
})

/**
 * Tree-view file explorer component with multi-select, keyboard navigation, and
 * drag-and-drop. React renders it under the same name.
 *
 * @param props - The file explorer props (React's own contract).
 * @returns The rendered file explorer element.
 */
export const FileExplorer = defineComponent({
  name: 'FileExplorer',
  inheritAttrs: false,
  props: {
    /** Read-only mode (a project viewer): the context menu omits every mutating entry. */
    readOnly: { type: Boolean, required: false, default: false },
    /** The tree to render. */
    files: { type: Array as PropType<FileNode[]>, required: true },
    /** Opens a file. */
    onFileSelect: { type: Function as PropType<(path: string) => void>, required: true },
    /** Opens a file on a double-click. */
    onFileDoubleClick: {
      type: Function as PropType<(path: string) => void>,
      required: false,
      default: undefined,
    },
    /** Asks the host for a directory's children the first time it opens. */
    onDirExpand: {
      type: Function as PropType<(path: string) => void>,
      required: false,
      default: undefined,
    },
    /** Renames the chosen node. */
    onRename: {
      type: Function as PropType<(path: string) => void>,
      required: false,
      default: undefined,
    },
    /** Deletes the chosen node. */
    onDelete: {
      type: Function as PropType<(path: string) => void>,
      required: false,
      default: undefined,
    },
    /** Deletes every selected node. */
    onDeleteMultiple: {
      type: Function as PropType<(paths: string[]) => void>,
      required: false,
      default: undefined,
    },
    /** Moves files by drag-and-drop or cut+paste. */
    onMoveFiles: {
      type: Function as PropType<(moves: Array<{ oldPath: string; newPath: string }>) => void>,
      required: false,
      default: undefined,
    },
    /** Creates a file in the chosen directory. */
    onNewFile: {
      type: Function as PropType<(dirPath: string) => void>,
      required: false,
      default: undefined,
    },
    /** Creates a folder in the chosen directory. */
    onNewFolder: {
      type: Function as PropType<(dirPath: string) => void>,
      required: false,
      default: undefined,
    },
    /** Collapses every directory. */
    onCollapseAll: { type: Function as PropType<() => void>, required: false, default: undefined },
    /** Extra classes on the scroll container. */
    className: { type: String, required: false, default: undefined },
    /** Storage key for persisting expand/collapse state across reloads. */
    persistKey: { type: String, required: false, default: undefined },
    /** Path of the currently active file — highlighted in the tree. */
    activeFile: { type: [String, null] as PropType<string | null>, required: false, default: null },
    /** Maps file path to git status — used to color directory names too. */
    fileStatuses: {
      type: Object as PropType<Record<string, string>>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const themeMode = useThemeMode()
    const gitColors = computed<Record<string, string>>(() =>
      themeMode.value === 'light' ? LIGHT_GIT_COLORS : DARK_GIT_COLORS,
    )
    const isCoarse = useCoarsePointer()
    const containerRef = ref<HTMLElement | null>(null)
    // One id prefix for every row: the container points aria-activedescendant
    // at `<prefix>-<render position>` of the focused row (see FileTreeItem).
    const rowIdPrefix = useId().replace(/[:]/g, '')
    // When set, the next render after DOM update will scroll this path into view
    let scrollTarget: string | null = null
    // A row long-press just fired: the click the browser synthesizes at
    // finger-lift must not ALSO select/open that row (the touchend suppression
    // in the row's recognizer is the first line of defense; this is the second).
    let suppressNextRowClick = false
    // Each visible directory's expansion as of the last committed render: a
    // second click inside one pass reads this, matching React's batched render
    // (whose handler still sees the row's pre-click props).
    const committedOpen = new Map<string, boolean>()
    // When set, briefly flash a highlight on this path after scrolling
    let highlightTarget: string | null = null

    const expandState = ref<ExpandState>(
      props.persistKey
        ? loadExpandState(props.persistKey)
        : { expanded: new Set(), collapsed: new Set() },
    )

    // Follow the bonded provider for this key. A synchronous provider's value is
    // already in `expandState`; an asynchronous one hydrates later and updates
    // this SAME tree (never a remount), as does a change from another tab.
    let stopWatchingExpand: (() => void) | null = null
    watch(
      () => props.persistKey,
      (persistKey) => {
        stopWatchingExpand?.()
        stopWatchingExpand = null
        if (!persistKey) return
        expandState.value = loadExpandState(persistKey)
        stopWatchingExpand = watchExpandState(persistKey, (state) => {
          expandState.value = state
        })
      },
      { immediate: true },
    )
    onUnmounted(() => stopWatchingExpand?.())

    // -------------------------------------------------------------------------
    // Selection state
    // -------------------------------------------------------------------------

    const selectedPaths = ref<Set<string>>(new Set())
    const lastClickedPath = ref<string | null>(null)
    const focusedPath = ref<string | null>(null)

    // Clipboard for cut/copy (internal)
    const clipboard = ref<{ paths: Set<string>; operation: 'cut' | 'copy' } | null>(null)

    // Drag-and-drop state
    const draggedPaths = ref<Set<string> | null>(null)
    const dropTargetPath = ref<string | null>(null)

    // Memoized visible items list — used for shift-click range and keyboard nav
    const visibleItems = computed(() => getVisibleItems(props.files, expandState.value))
    // Each visible path's 1-based render-order position — the number in every
    // row's id and in the container's aria-activedescendant (see FileTreeItem).
    const rowIndexById = computed(
      () => new Map(visibleItems.value.map((path, i) => [path, i + 1] as const)),
    )

    // Prune stale selections when the file tree changes
    watch(
      () => props.files,
      (files) => {
        const treePaths = collectAllPaths(files)
        const prev = selectedPaths.value
        const next = new Set<string>()
        for (const p of prev) {
          if (treePaths.has(p)) next.add(p)
        }
        if (next.size !== prev.size) selectedPaths.value = next
      },
    )

    // When activeFile changes, expand all ancestor directories and queue a scroll
    const followActiveFile = (): void => {
      const activeFile = props.activeFile
      if (!activeFile) return
      const ancestors = getAncestorPaths(activeFile)
      if (ancestors.length > 0) {
        const prev = expandState.value
        const needsUpdate = ancestors.some((p) => !prev.expanded.has(p))
        if (needsUpdate) {
          const next: ExpandState = {
            expanded: new Set(prev.expanded),
            collapsed: new Set(prev.collapsed),
          }
          for (const ancestor of ancestors) {
            next.expanded.add(ancestor)
            next.collapsed.delete(ancestor)
          }
          expandState.value = next
          if (props.persistKey) saveExpandState(props.persistKey, next)
        }
      }
      scrollTarget = activeFile
    }
    watch([() => props.activeFile, () => props.persistKey], followActiveFile, { immediate: true })

    // After every render, attempt the pending scroll (retries until element is in the DOM)
    const applyPendingScroll = (): void => {
      if (!scrollTarget || !containerRef.value) return
      const target = scrollTarget
      const shouldHighlight = highlightTarget === target
      const el = Array.from(
        containerRef.value.querySelectorAll<HTMLElement>('[data-explorer-path]'),
      ).find((e) => e.dataset.explorerPath === target)
      if (el) {
        scrollTarget = null
        if (shouldHighlight) {
          highlightTarget = null
          scrollAndHighlight(containerRef.value, target)
        } else {
          el.scrollIntoView({ block: 'nearest' })
        }
      }
    }
    onMounted(applyPendingScroll)
    onUpdated(applyPendingScroll)

    /**
     * Opens or closes a directory, persisting the new state under `persistKey`.
     * @param path - The directory path.
     * @param nowExpanded - Whether it should now be open.
     */
    const handleTogglePath = (path: string, nowExpanded: boolean): void => {
      const prev = expandState.value
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
      if (props.persistKey) saveExpandState(props.persistKey, next)
      expandState.value = next
    }

    /**
     * Follows a symlink: a directory target opens its ancestors and flashes it,
     * a file target (or a path not in the tree) is opened as a file.
     * @param symlinkPath - The symlink's own path.
     * @param target - Its target value.
     */
    const handleSymlinkClick = (symlinkPath: string, target: string): void => {
      const resolvedPath = resolveSymlinkTarget(symlinkPath, target)
      const found = findNodeByPath(props.files, resolvedPath)

      if (found && found.node.type === 'directory') {
        // Ensure ancestors are expanded so the target is visible
        const ancestors = getAncestorPaths(resolvedPath)
        const prev = expandState.value
        const needsUpdate = ancestors.some((p) => !prev.expanded.has(p))
        if (!needsUpdate) {
          // Already visible — scroll and highlight directly
          scrollAndHighlight(containerRef.value, resolvedPath)
        } else {
          const next: ExpandState = {
            expanded: new Set(prev.expanded),
            collapsed: new Set(prev.collapsed),
          }
          for (const a of ancestors) {
            next.expanded.add(a)
            next.collapsed.delete(a)
          }
          if (props.persistKey) saveExpandState(props.persistKey, next)
          expandState.value = next
        }
        scrollTarget = resolvedPath
        highlightTarget = resolvedPath
      } else {
        // File symlink (or target not in tree) — select the real file
        props.onFileSelect(resolvedPath)
      }
    }

    // -------------------------------------------------------------------------
    // Selection click handler
    // -------------------------------------------------------------------------

    /**
     * Applies one row click to the selection, following React's rules.
     * @param path - The clicked row's path.
     * @param modifiers - Which modifier keys were held.
     */
    const handleItemClick = (
      path: string,
      modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
    ): void => {
      const isToggle = modifiers.ctrlKey || modifiers.metaKey

      if (modifiers.shiftKey && lastClickedPath.value) {
        // Shift+Click: range select
        const items = visibleItems.value
        const startIdx = items.indexOf(lastClickedPath.value)
        const endIdx = items.indexOf(path)
        if (startIdx !== -1 && endIdx !== -1) {
          const lo = Math.min(startIdx, endIdx)
          const hi = Math.max(startIdx, endIdx)
          const range = new Set(items.slice(lo, hi + 1))
          // When shift is combined with ctrl/cmd, add to existing selection
          if (isToggle) {
            const next = new Set(selectedPaths.value)
            for (const p of range) next.add(p)
            selectedPaths.value = next
          } else {
            selectedPaths.value = range
          }
        }
        focusedPath.value = path
        // Don't update lastClickedPath on shift-click to preserve the anchor
      } else if (isToggle) {
        // Ctrl/Cmd+Click: toggle single item
        const next = new Set(selectedPaths.value)
        if (next.has(path)) {
          next.delete(path)
        } else {
          next.add(path)
        }
        selectedPaths.value = next
        lastClickedPath.value = path
        focusedPath.value = path
      } else {
        // Plain click: select single
        selectedPaths.value = new Set([path])
        lastClickedPath.value = path
        focusedPath.value = path
      }
    }

    // -------------------------------------------------------------------------
    // Context menu
    // -------------------------------------------------------------------------

    const contextMenu = ref<{ position: { x: number; y: number }; node: FileNode | null } | null>(
      null,
    )

    /**
     * Opens the row menu, selecting the row unless it is already selected.
     * @param position - The pointer position to open at.
     * @param node - The right-clicked node.
     */
    const handleItemContextMenu = (position: { x: number; y: number }, node: FileNode): void => {
      // If right-clicked item is already selected, keep multi-selection
      if (!selectedPaths.value.has(node.path)) {
        selectedPaths.value = new Set([node.path])
        lastClickedPath.value = node.path
      }
      focusedPath.value = node.path
      contextMenu.value = { position, node }
    }

    /**
     * Opens the empty-area menu and clears the selection.
     * @param position - The pointer position to open at.
     */
    const openBackgroundContextMenu = (position: { x: number; y: number }): void => {
      selectedPaths.value = new Set()
      contextMenu.value = { position, node: null }
    }

    /**
     * Opens the empty-area menu at the pointer.
     * @param e - The native contextmenu event.
     */
    const handleBackgroundContextMenu = (e: MouseEvent): void => {
      e.preventDefault()
      openBackgroundContextMenu({ x: e.clientX, y: e.clientY })
    }

    // Touch path to the background menu (New File / New Folder / Collapse All) —
    // iOS Safari never fires 'contextmenu', so a long-press on the empty tree
    // area opens it instead. Presses that start on a row are excluded at the
    // container's onPointerDown (the row recognizer owns those).
    const backgroundLongPress = useLongPress(() => isCoarse.value, openBackgroundContextMenu)

    /** Closes the context menu. */
    const handleCloseContextMenu = (): void => {
      contextMenu.value = null
    }

    /** Collapses every directory (and tells the host). */
    const handleCollapseAll = (): void => {
      expandState.value = { expanded: new Set(), collapsed: new Set(['__all_collapsed__']) }
      if (props.persistKey)
        saveExpandState(props.persistKey, {
          expanded: new Set(),
          collapsed: new Set(['__all_collapsed__']),
        })
      props.onCollapseAll?.()
    }

    // A row's click reaches the tree CONTAINER — the tree pattern's one tab
    // stop owns the keyboard handling, so the click handling lives beside it
    // (and the row itself carries no onClick). The pressed row resolves by its
    // path and runs the same select / toggle / open logic it always did.
    /**
     * Applies one bubbled row click: the pressed row's selection, then its
     * open/toggle/follow action, unless a long-press just fired.
     *
     * @param e - The native click event that reached the tree container.
     */
    const handleTreeClick = (e: MouseEvent): void => {
      if (suppressNextRowClick) {
        suppressNextRowClick = false
        return
      }
      const row = (e.target as Element).closest('[data-explorer-path]') as HTMLElement | null
      const path = row?.dataset.explorerPath
      if (!path) return
      const found = findNodeByPath(props.files, path)
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
        const open =
          committedOpen.get(path) ?? isExpandedFromState(expandState.value, path, found.depth)
        handleTogglePath(path, !open)
      } else {
        props.onFileSelect(path)
      }
    }

    // A row's double-click (files only) — delegated the same way.
    /**
     * Opens the file of a bubbled row double-click; directories ignore it.
     *
     * @param e - The native dblclick event that reached the tree container.
     */
    const handleTreeDoubleClick = (e: MouseEvent): void => {
      const row = (e.target as Element).closest('[data-explorer-path]') as HTMLElement | null
      const path = row?.dataset.explorerPath
      if (!path) return
      const found = findNodeByPath(props.files, path)
      if (found?.node.type !== 'file') return
      props.onFileDoubleClick?.(path)
    }

    /**
     * Execute a paste operation: move clipboard items to the target directory.
     * @param targetDir - The directory to move items into.
     */
    const executePaste = (targetDir: string): void => {
      const cut = clipboard.value
      if (!cut || cut.operation !== 'cut') return
      const moves: Array<{ oldPath: string; newPath: string }> = []
      for (const oldPath of cut.paths) {
        const fileName = oldPath.split('/').pop()!
        const newPath = `${targetDir}/${fileName}`
        if (newPath !== oldPath) {
          moves.push({ oldPath, newPath })
        }
      }
      if (moves.length > 0) props.onMoveFiles?.(moves)
      clipboard.value = null
      selectedPaths.value = new Set()
    }

    /**
     * Runs one context-menu action against the menu's node and the selection.
     * @param action - The chosen action.
     */
    const handleContextMenuAction = (action: ContextMenuAction): void => {
      const node = contextMenu.value?.node ?? null
      const selection = selectedPaths.value
      switch (action) {
        case 'open':
          if (node) props.onFileSelect(node.path)
          break
        case 'rename':
          if (node) props.onRename?.(node.path)
          break
        case 'delete':
          if (node) props.onDelete?.(node.path)
          break
        case 'deleteMultiple':
          if (selection.size > 0) props.onDeleteMultiple?.(Array.from(selection))
          break
        case 'newFile': {
          const dir = node?.type === 'directory' ? node.path : '/workspace'
          props.onNewFile?.(dir)
          break
        }
        case 'newFolder': {
          const dir = node?.type === 'directory' ? node.path : '/workspace'
          props.onNewFolder?.(dir)
          break
        }
        case 'copyPath':
          // A copy can fail (insecure context, permission); copyTextWithFallback
          // resolves false instead of throwing, and the in-app selection still works.
          if (node) void copyTextWithFallback(node.path)
          break
        case 'copyPaths': {
          const paths = Array.from(selection).join('\n')
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
          const rels = Array.from(selection)
            .map((p) => p.replace(/^\/workspace\//, ''))
            .join('\n')
          void copyTextWithFallback(rels)
          break
        }
        case 'cut':
          if (selection.size > 0) {
            clipboard.value = { paths: new Set(selection), operation: 'cut' }
            void copyTextWithFallback(Array.from(selection).join('\n'))
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
    }

    // -------------------------------------------------------------------------
    // Keyboard navigation
    // -------------------------------------------------------------------------

    /**
     * Handles one key press on the tree: navigation, opening, selection and the
     * hand-over keys, exactly the React component's rules.
     * @param e - The native keydown event.
     */
    const handleTreeKeyDown = (e: KeyboardEvent): void => {
      const isMod = e.metaKey || e.ctrlKey

      // Navigate up/down
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = visibleItems.value
        const currentIdx = focusedPath.value ? items.indexOf(focusedPath.value) : -1
        const nextIdx =
          e.key === 'ArrowDown'
            ? Math.min(currentIdx + 1, items.length - 1)
            : Math.max(currentIdx - 1, 0)
        if (nextIdx < 0 || nextIdx >= items.length) return
        const nextPath = items[nextIdx]
        focusedPath.value = nextPath

        if (e.shiftKey) {
          // Shift+Arrow: extend selection
          const next = new Set(selectedPaths.value)
          next.add(nextPath)
          selectedPaths.value = next
        } else if (!isMod) {
          selectedPaths.value = new Set([nextPath])
          lastClickedPath.value = nextPath
        }

        // Scroll focused item into view
        if (containerRef.value) {
          const el = containerRef.value.querySelector(
            `[data-explorer-path="${CSS.escape(nextPath)}"]`,
          )
          el?.scrollIntoView({ block: 'nearest' })
        }
        return
      }

      // Expand directory / move to first child
      if (e.key === 'ArrowRight' && focusedPath.value) {
        e.preventDefault()
        const found = findNodeByPath(props.files, focusedPath.value)
        if (found?.node.type === 'directory') {
          if (!isExpandedFromState(expandState.value, focusedPath.value, found.depth)) {
            handleTogglePath(focusedPath.value, true)
          } else if (found.node.children && found.node.children.length > 0) {
            const sorted = sortNodes(found.node.children)
            focusedPath.value = sorted[0].path
            selectedPaths.value = new Set([sorted[0].path])
            lastClickedPath.value = sorted[0].path
          }
        }
        return
      }

      // Collapse directory / move to parent
      if (e.key === 'ArrowLeft' && focusedPath.value) {
        e.preventDefault()
        const found = findNodeByPath(props.files, focusedPath.value)
        if (
          found?.node.type === 'directory' &&
          isExpandedFromState(expandState.value, focusedPath.value, found.depth)
        ) {
          handleTogglePath(focusedPath.value, false)
        } else {
          const parent = getParentDir(focusedPath.value)
          if (parent !== '/workspace' && parent.startsWith('/workspace')) {
            focusedPath.value = parent
            selectedPaths.value = new Set([parent])
            lastClickedPath.value = parent
          }
        }
        return
      }

      // Enter: open file / toggle directory
      if (e.key === 'Enter' && focusedPath.value) {
        e.preventDefault()
        const found = findNodeByPath(props.files, focusedPath.value)
        if (found?.node.type === 'directory') {
          handleTogglePath(
            focusedPath.value,
            !isExpandedFromState(expandState.value, focusedPath.value, found.depth),
          )
        } else {
          props.onFileSelect(focusedPath.value)
        }
        return
      }

      // Space: toggle selection on focused item
      if (e.key === ' ' && focusedPath.value) {
        e.preventDefault()
        const next = new Set(selectedPaths.value)
        if (next.has(focusedPath.value)) {
          next.delete(focusedPath.value)
        } else {
          next.add(focusedPath.value)
        }
        selectedPaths.value = next
        return
      }

      // Delete/Backspace: delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedPaths.value.size > 0) {
        e.preventDefault()
        if (selectedPaths.value.size === 1) {
          props.onDelete?.(Array.from(selectedPaths.value)[0])
        } else {
          props.onDeleteMultiple?.(Array.from(selectedPaths.value))
        }
        return
      }

      // F2: rename (single selection only)
      if (e.key === 'F2' && selectedPaths.value.size === 1) {
        e.preventDefault()
        props.onRename?.(Array.from(selectedPaths.value)[0])
        return
      }

      // Escape: clear selection + clipboard
      if (e.key === 'Escape') {
        e.preventDefault()
        selectedPaths.value = new Set()
        clipboard.value = null
        focusedPath.value = null
        return
      }

      // Ctrl/Cmd+A: select all visible
      if (isMod && e.key === 'a') {
        e.preventDefault()
        selectedPaths.value = new Set(visibleItems.value)
        return
      }

      // Ctrl/Cmd+C: copy paths (OS-clipboard write is best-effort; the in-app
      // clipboard state below still tracks the selection for Ctrl/Cmd+V)
      if (isMod && e.key === 'c' && selectedPaths.value.size > 0) {
        e.preventDefault()
        const paths = Array.from(selectedPaths.value).join('\n')
        void copyTextWithFallback(paths)
        clipboard.value = { paths: new Set(selectedPaths.value), operation: 'copy' }
        return
      }

      // Ctrl/Cmd+X: cut (same best-effort OS-clipboard write)
      if (isMod && e.key === 'x' && selectedPaths.value.size > 0) {
        e.preventDefault()
        clipboard.value = { paths: new Set(selectedPaths.value), operation: 'cut' }
        void copyTextWithFallback(Array.from(selectedPaths.value).join('\n'))
        return
      }

      // Ctrl/Cmd+V: paste (move cut items to focused directory)
      if (isMod && e.key === 'v' && clipboard.value?.operation === 'cut') {
        e.preventDefault()
        let targetDir = '/workspace'
        if (focusedPath.value) {
          const found = findNodeByPath(props.files, focusedPath.value)
          targetDir =
            found?.node.type === 'directory' ? focusedPath.value : getParentDir(focusedPath.value)
        }
        executePaste(targetDir)
        return
      }
    }

    // -------------------------------------------------------------------------
    // Drag and drop
    // -------------------------------------------------------------------------

    /**
     * Starts a drag, selecting the row when it is not part of the selection.
     * @param path - The dragged row's path.
     * @param e - The native dragstart event.
     */
    const handleDragStart = (path: string, e: DragEvent): void => {
      let paths: Set<string>
      if (selectedPaths.value.has(path)) {
        paths = new Set(selectedPaths.value)
      } else {
        // Dragging unselected item — select it alone
        paths = new Set([path])
        selectedPaths.value = paths
      }
      draggedPaths.value = paths
      e.dataTransfer?.setData('text/plain', [...paths].join('\n'))
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'

      // Custom drag image
      const badge = document.createElement('div')
      badge.textContent = paths.size === 1 ? (path.split('/').pop() ?? '') : `${paths.size} items`
      badge.style.cssText =
        'padding:4px 8px;background:#2a6fc9;color:#fff;border-radius:4px;font-size:12px;position:absolute;top:-1000px'
      document.body.appendChild(badge)
      e.dataTransfer?.setDragImage(badge, 0, 0)
      requestAnimationFrame(() => {
        if (badge.parentNode) document.body.removeChild(badge)
      })
    }

    /**
     * Tracks the directory a drag would drop into, refusing self/descendants.
     * @param path - The row being dragged over.
     * @param e - The native dragover event.
     */
    const handleDragOver = (path: string, e: DragEvent): void => {
      const dragged = draggedPaths.value
      if (!dragged) return
      e.preventDefault()
      e.stopPropagation()

      // Resolve drop target to a directory
      const found = findNodeByPath(props.files, path)
      const targetDir = found?.node.type === 'directory' ? path : getParentDir(path)

      // Validate: cannot drop into self or descendant of any dragged path
      for (const dragPath of dragged) {
        if (targetDir === dragPath || targetDir.startsWith(dragPath + '/')) {
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'
          dropTargetPath.value = null
          return
        }
      }

      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
      dropTargetPath.value = targetDir
    }

    /**
     * Clears the drop target once the pointer truly leaves the tree.
     * @param e - The native dragleave event.
     */
    const handleItemDragLeave = (e: DragEvent): void => {
      // Only clear if we're truly leaving (not entering a child element)
      const related = e.relatedTarget as Node | null
      if (containerRef.value && related && containerRef.value.contains(related)) return
      dropTargetPath.value = null
    }

    /**
     * Drops the dragged rows into the row's directory.
     * @param path - The row dropped on.
     * @param e - The native drop event.
     */
    const handleDrop = (path: string, e: DragEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      const dragged = draggedPaths.value
      if (!dragged || dragged.size === 0) {
        draggedPaths.value = null
        dropTargetPath.value = null
        return
      }

      const found = findNodeByPath(props.files, path)
      const targetDir = found?.node.type === 'directory' ? path : getParentDir(path)

      const moves: Array<{ oldPath: string; newPath: string }> = []
      for (const oldPath of dragged) {
        const fileName = oldPath.split('/').pop()!
        const newPath = `${targetDir}/${fileName}`
        if (newPath !== oldPath) {
          moves.push({ oldPath, newPath })
        }
      }

      if (moves.length > 0) props.onMoveFiles?.(moves)

      draggedPaths.value = null
      dropTargetPath.value = null
      selectedPaths.value = new Set()
    }

    /**
     * Shows the workspace root as the drop target for a background drag.
     * @param e - The native dragover event on the container.
     */
    const handleBackgroundDragOver = (e: DragEvent): void => {
      if (!draggedPaths.value) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
      dropTargetPath.value = '/workspace'
    }

    /**
     * Drops dragged rows into the workspace root.
     * @param e - The native drop event on the container.
     */
    const handleBackgroundDrop = (e: DragEvent): void => {
      e.preventDefault()
      const dragged = draggedPaths.value
      if (!dragged || dragged.size === 0) {
        draggedPaths.value = null
        dropTargetPath.value = null
        return
      }

      const moves: Array<{ oldPath: string; newPath: string }> = []
      for (const oldPath of dragged) {
        const fileName = oldPath.split('/').pop()!
        const newPath = `/workspace/${fileName}`
        if (newPath !== oldPath) {
          moves.push({ oldPath, newPath })
        }
      }

      if (moves.length > 0) props.onMoveFiles?.(moves)

      draggedPaths.value = null
      dropTargetPath.value = null
      selectedPaths.value = new Set()
    }

    /** Ends a drag, whatever happened to it. */
    const handleDragEnd = (): void => {
      draggedPaths.value = null
      dropTargetPath.value = null
    }

    // Shared mutable counter — reset each render, incremented by each FileTreeItem.
    // Prevents symlink cycles from freezing the browser by capping total rendered nodes.
    const renderCount = { current: 0 }

    return (): VNodeChild => {
      renderCount.current = 0
      const files = props.files
      const isEmpty = files.length === 0
      // The focused row's id, when one exists and is visible — the tree
      // pattern's one tab stop names the row it draws.
      const activeDescendant =
        isEmpty || !focusedPath.value || !rowIndexById.value.has(focusedPath.value)
          ? undefined
          : `${rowIdPrefix}-${rowIndexById.value.get(focusedPath.value)}`

      // Sort root-level entries: directories first, then files, alphabetically
      const sortedFiles = sortNodes(files)

      return h(
        'div',
        {
          ref: containerRef,
          class: cm.cn(cm.sp('py', 1), cm.sp('pl', 1), props.className),
          style: { overflowY: 'auto', outline: 'none' },
          // An empty tree has no `treeitem` children, and `role="tree"` requires
          // them (axe `aria-required-children`): with no items the container is
          // plain chrome around the empty-state text.
          role: isEmpty ? undefined : 'tree',
          tabindex: 0,
          'aria-activedescendant': activeDescendant,
          onKeydown: handleTreeKeyDown,
          onClick: handleTreeClick,
          onDblclick: handleTreeDoubleClick,
          onContextmenu: handleBackgroundContextMenu,
          onPointerdown: (e: PointerEvent) => {
            // Row presses bubble here too — those belong to the row's own
            // long-press recognizer, so only arm the background one for presses
            // that start on the empty tree area.
            // A new press invalidates any stale long-press click suppression.
            suppressNextRowClick = false
            if ((e.target as HTMLElement).closest('[data-explorer-path]')) return
            backgroundLongPress.onPointerDown(e)
          },
          onPointermove: backgroundLongPress.onPointerMove,
          onPointerup: backgroundLongPress.onPointerUp,
          onPointercancel: backgroundLongPress.onPointerCancel,
          onTouchend: backgroundLongPress.onTouchEnd,
          onDragover: handleBackgroundDragOver,
          onDrop: handleBackgroundDrop,
          onDragend: handleDragEnd,
        },
        [
          isEmpty
            ? h('div', { class: cm.cn(cm.textMuted, cm.textSize('sm'), cm.sp('p', 3)) }, [
                t('ide.files.empty', undefined, { defaultValue: 'No files' }),
              ])
            : null,
          ...sortedFiles.map((node) =>
            h(FileTreeItem, {
              key: node.path,
              node,
              depth: 0,
              isExpanded: isExpandedFromState(expandState.value, node.path, 0),
              activeFile: props.activeFile,
              isSelected: selectedPaths.value.has(node.path),
              isCut: clipboard.value?.operation === 'cut' && clipboard.value.paths.has(node.path),
              isFocused: focusedPath.value === node.path,
              isDropTarget: dropTargetPath.value === node.path,
              onFileSelect: props.onFileSelect,
              onFileDoubleClick: props.onFileDoubleClick,
              onDirExpand: props.onDirExpand,
              onTogglePath: handleTogglePath,
              onSymlinkClick: handleSymlinkClick,
              onContextMenu: handleItemContextMenu,
              onItemClick: handleItemClick,
              onDragStart: handleDragStart,
              onDragOver: handleDragOver,
              onDragLeave: handleItemDragLeave,
              onDrop: handleDrop,
              expandState: expandState.value,
              fileStatuses: props.fileStatuses,
              gitColors: gitColors.value,
              selectedPaths: selectedPaths.value,
              clipboardPaths: clipboard.value?.paths ?? null,
              clipboardOperation: clipboard.value?.operation ?? null,
              renderCount,
              dropTargetPath: dropTargetPath.value,
              isCoarse: isCoarse.value,
              rowIdPrefix,
              rowIndex: rowIndexById.value,
              committedOpen,
              onLongPressFired: () => {
                suppressNextRowClick = true
              },
            }),
          ),
          contextMenu.value
            ? h(FileExplorerContextMenu, {
                readOnly: props.readOnly,
                position: contextMenu.value.position,
                node: contextMenu.value.node,
                selectedCount: selectedPaths.value.size,
                canPaste: clipboard.value?.operation === 'cut' && clipboard.value.paths.size > 0,
                onAction: handleContextMenuAction,
                onClose: handleCloseContextMenu,
              })
            : null,
        ],
      )
    }
  },
})
