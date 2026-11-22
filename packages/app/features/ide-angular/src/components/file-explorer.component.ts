/**
 * Tree-view file browser with multi-select, keyboard navigation, and drag-and-drop.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `FileExplorer` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. Directories render before files, each
 * group alphabetically; a directory at the root opens by default and any other
 * opens from the state persisted under `persistKey`; an expanded directory that
 * has no `children` yet asks for them once through `onDirExpand`; the active
 * file opens its ancestors and is tinted; git statuses color a file and roll the
 * highest-priority one up to its directory; a symlink shows its target and a
 * directory symlink reveals and flashes that target; selection follows plain,
 * ctrl/meta, shift, shift+ctrl and space, the arrow keys move a focus and extend
 * the selection, Delete/Backspace and F2 hand the selection over, and the row
 * menu, the background menu and a coarse pointer's long-press all open the same
 * `FileExplorerContextMenu` the React component portals.
 *
 * The host element is React's root `div` (an attribute selector), so every
 * container attribute and event lives on the host and `:host` adds nothing. Rows
 * come from one recursive `ng-template`, and every derived row value is a method
 * the template reads, so each change-detection pass renders the current state the
 * way React's render does. Styling uses `getClassMap()` (`cm.*`); the inline
 * styles are the row layout the ClassMap can't express, written through the
 * CSSOM as style bindings the way React writes them. All user-facing text goes
 * through `t()`.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewChecked,
  Component,
  computed,
  Directive,
  ElementRef,
  inject,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  signal,
  type SimpleChanges,
} from '@angular/core'
import { getIcon } from 'material-file-icons'

import { useThemeMode, useTranslation } from '@molecule/app-angular'
import { copyTextWithFallback } from '@molecule/app-clipboard'
import type { FileNode } from '@molecule/app-ide-panel-logic'
import {
  type ExpandState,
  loadExpandState,
  saveExpandState,
  watchExpandState,
} from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer } from '../hooks/useViewport.js'
import type { ContextMenuAction } from '../parts/file-explorer-context-menu.component.js'
import { FileExplorerContextMenu } from '../parts/file-explorer-context-menu.component.js'

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

/** Max total rows to render in a single pass (symlink cycles cannot freeze the browser). */
const MAX_RENDERED_NODES = 10_000

/** Next unique id prefix for a tree's rows (one per component instance). */
let fileExplorerSeq = 0

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
 * Writes React's touch-device text-selection guard onto a row: React writes both
 * `WebkitUserSelect` and `userSelect` through the CSSOM, which is how the DOM's
 * `-webkit-user-select` declaration appears (Angular's style binding cannot name
 * a vendor-prefixed property here).
 */
@Directive({
  selector: 'div[mol-coarse-select]',
  standalone: true,
  inputs: ['molCoarseSelect'],
})
export class CoarseSelect implements OnChanges {
  /** Whether the primary pointer is coarse (bound by the row template). */
  molCoarseSelect = false

  /** The row. */
  private readonly host: HTMLElement = inject(ElementRef).nativeElement

  /** Applies the guard whenever the pointer class changes. */
  ngOnChanges(): void {
    if (this.molCoarseSelect) {
      this.host.style.setProperty('-webkit-user-select', 'none')
      this.host.style.setProperty('user-select', 'none')
    } else {
      this.host.style.removeProperty('-webkit-user-select')
      this.host.style.removeProperty('user-select')
    }
  }
}

/**
 * A row's file-type icon: the file name's material icon injected as the span's
 * content (React's `FileTypeIcon` via `dangerouslySetInnerHTML`). Safe for the
 * same reason: the markup comes from a trusted static icon library, not from
 * user input. The span's own layout is the template's static style.
 */
@Component({
  selector: 'span[mol-file-icon]',
  standalone: true,
  template: '',
  inputs: ['name'],
})
export class FileTypeIcon implements OnChanges {
  /** The file name to resolve an icon for. */
  name = ''

  /** The icon host span. */
  private readonly host: HTMLElement = inject(ElementRef).nativeElement

  /** Writes the icon once the name is known. */
  ngOnChanges(): void {
    this.host.innerHTML = getIcon(this.name).svg
  }
}

/**
 * Tree-view file explorer component with multi-select, keyboard navigation, and
 * drag-and-drop. React renders it under the same name.
 */
@Component({
  selector: 'div[mol-file-explorer]',
  standalone: true,
  imports: [NgTemplateOutlet, FileExplorerContextMenu, CoarseSelect, FileTypeIcon],
  inputs: [
    'readOnly',
    'files',
    'onFileSelect',
    'onFileDoubleClick',
    'onDirExpand',
    'onRename',
    'onDelete',
    'onDeleteMultiple',
    'onMoveFiles',
    'onNewFile',
    'onNewFolder',
    'onCollapseAll',
    'className',
    'persistKey',
    'activeFile',
    'fileStatuses',
  ],
  host: {
    '[class]': 'containerClass()',
    '[attr.style]': 'containerStyle',
    '[attr.role]': 'role()',
    '[attr.aria-activedescendant]': 'activeDescendant()',
    tabindex: '0',
    '(keydown)': 'onTreeKeyDown($event)',
    '(click)': 'onTreeClick($event)',
    '(dblclick)': 'onTreeDoubleClick($event)',
    '(contextmenu)': 'onBackgroundContextMenu($event)',
    '(pointerdown)': 'onBackgroundPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'clearLongPress()',
    '(pointercancel)': 'clearLongPress()',
    '(touchend)': 'onTouchEnd($event)',
    '(dragover)': 'onBackgroundDragOver($event)',
    '(drop)': 'onBackgroundDrop($event)',
    '(dragend)': 'endDrag()',
  },
  // prettier-ignore
  template: `@if (files.length === 0) {<div [class]="emptyClass">{{ t('ide.files.empty', undefined, { defaultValue: 'No files' }) }}</div>}<ng-container *ngTemplateOutlet="rows; context: { $implicit: files, depth: 0 }" />@if (contextMenu(); as menu) {<div mol-file-explorer-context-menu [position]="menu.position" [node]="menu.node" [selectedCount]="selection().size" [canPaste]="canPaste()" [readOnly]="readOnly" [onAction]="actionHandler" [onClose]="closeMenuHandler"></div>}
    <ng-template #rows let-nodes let-depth="depth">
      @for (node of sorted(nodes, depth); track node.path) {<ng-container *ngTemplateOutlet="row; context: { $implicit: node, depth }" />}
    </ng-template>
    <ng-template #row let-node let-depth="depth">
      <div role="none">
        <div role="treeitem" [attr.id]="rowId(node)" [attr.aria-level]="depth + 1" [attr.aria-expanded]="node.type === 'directory' ? (isExpanded(node, depth) ? 'true' : 'false') : null" [attr.aria-selected]="isSelected(node)" tabindex="-1" (contextmenu)="onRowContextMenu(node, $event)" (pointerdown)="onRowPointerDown(node, $event)" (pointermove)="onPointerMove($event)" (pointerup)="clearLongPress()" (pointercancel)="clearLongPress()" (touchend)="onTouchEnd($event)" [attr.draggable]="!coarse()" (dragstart)="onRowDragStart(node, $event)" (dragover)="onRowDragOver(node, $event)" (dragleave)="onRowDragLeave($event)" (drop)="onRowDrop(node, $event)" [attr.data-explorer-path]="node.path" [class]="rowClasses" mol-coarse-select [molCoarseSelect]="coarse()" style="display: flex; align-items: center; gap: 4px; padding-top: 1px; padding-bottom: 1px; padding-right: 6px; border: none; outline-offset: -1px; color: inherit; cursor: pointer; text-align: left; font-size: 13px; line-height: 22px" [style.padding-left]="indent(depth)" [style.background]="backgroundOf(node)" [style.outline]="outlineOf(node, depth)" [style.opacity]="opacityOf(node)"><span style="align-items: center; display: flex; flex-shrink: 0; width: 16px">@if (node.type === 'directory') {<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" style="display: block; flex-shrink: 0; opacity: 0.65; transition: transform 100ms" [style.transform]="chevronTransform(node, depth)"><polyline points="6,4 10,8 6,12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>} @else {<span mol-file-icon [name]="node.name" style="display: inline-flex; flex-shrink: 0; height: 16px; width: 16px"></span>}</span><span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap" [style.color]="labelColor(node)" [style.opacity]="symlinkOpacity(node)">{{ node.name }}{{ symlinkLabel(node) }}</span></div>
        @if (node.type === 'directory' && isExpanded(node, depth) && node.children) {<div role="group" style="position: relative"><span style="position: absolute; top: 0px; bottom: 0px; width: 1px; background: rgba(128, 128, 128, 0.15); pointer-events: none" [style.left]="guideOffset(depth)"></span><ng-container *ngTemplateOutlet="rows; context: { $implicit: node.children, depth: depth + 1 }" /></div>}
      </div>
    </ng-template>`,
})
export class FileExplorer implements OnChanges, OnInit, AfterViewChecked, OnDestroy {
  /** Read-only mode (a project viewer): the context menu omits every mutating entry. */
  readOnly = false

  /** The tree to render. */
  files: FileNode[] = []

  /** Opens a file. */
  onFileSelect!: (path: string) => void

  /** Opens a file on a double-click. */
  onFileDoubleClick?: (path: string) => void

  /** Asks the host for a directory's children the first time it opens. */
  onDirExpand?: (path: string) => void

  /** Renames the chosen node. */
  onRename?: (path: string) => void

  /** Deletes the chosen node. */
  onDelete?: (path: string) => void

  /** Deletes every selected node. */
  onDeleteMultiple?: (paths: string[]) => void

  /** Moves files by drag-and-drop or cut+paste. */
  onMoveFiles?: (moves: Array<{ oldPath: string; newPath: string }>) => void

  /** Creates a file in the chosen directory. */
  onNewFile?: (dirPath: string) => void

  /** Creates a folder in the chosen directory. */
  onNewFolder?: (dirPath: string) => void

  /** Collapses every directory. */
  onCollapseAll?: () => void

  /** Extra classes on the scroll container. */
  className?: string

  /** Storage key for persisting expand/collapse state across reloads. */
  persistKey?: string

  /** Path of the currently active file — highlighted in the tree. */
  activeFile: string | null = null

  /** Maps file path to git status — used to color directory names too. */
  fileStatuses?: Record<string, string>

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()

  /** The translation function for the empty state. */
  protected readonly t = this.i18n.t

  /** The theme mode (the git colors follow it). */
  private readonly mode = useThemeMode()

  /** Whether the primary pointer is coarse. */
  protected readonly coarse = useCoarsePointer()

  /** The container's class list. */
  protected containerClass(): string {
    return this.cm.cn(this.cm.sp('py', 1), this.cm.sp('pl', 1), this.className)
  }

  /** The container's own inline layout (React's two declarations). */
  protected readonly containerStyle = 'outline: none; overflow-y: auto'

  /** The empty state's class list. */
  protected readonly emptyClass: string = getClassMap().cn(
    getClassMap().textMuted,
    getClassMap().textSize('sm'),
    getClassMap().sp('p', 3),
  )

  /** The row's class list (React's two ClassMap entries). */
  protected readonly rowClasses: string = getClassMap().cn(
    getClassMap().w('full'),
    getClassMap().touchTargetCompact,
  )

  /** The tree's own expand/collapse state. */
  private readonly expandState = signal<ExpandState>({
    expanded: new Set(),
    collapsed: new Set(),
  })

  /** Every selected path. */
  private readonly selection = signal<Set<string>>(new Set())

  /** The last plain-clicked path (the shift-click anchor). */
  private readonly lastClicked = signal<string | null>(null)

  /** The path holding the keyboard focus. */
  private readonly focused = signal<string | null>(null)

  /** The cut/copy clipboard (internal). */
  private readonly clipboard = signal<{ paths: Set<string>; operation: 'cut' | 'copy' } | null>(
    null,
  )

  /** The paths being dragged. */
  private readonly dragging = signal<Set<string> | null>(null)

  /** The directory a drag would drop into. */
  private readonly dropTarget = signal<string | null>(null)

  /** The open context menu, if any. */
  protected readonly contextMenu = signal<{
    position: { x: number; y: number }
    node: FileNode | null
  } | null>(null)

  /**
   * One id prefix for every row of this tree (React's one `useId()` at the
   * root): the container points `aria-activedescendant` at
   * `<prefix>-<render position>` of the focused row.
   */
  private readonly rowIdPrefix = `mol-file-tree-${fileExplorerSeq++}`

  /** The cached visible-path index map, keyed by the files and state it was built from. */
  private rowIndexCache: {
    files: FileNode[]
    state: ExpandState
    map: Map<string, number>
  } | null = null

  /**
   * A row long-press just fired: the click the browser synthesizes at
   * finger-lift must not ALSO select/open that row (the touchend suppression
   * in the row's recognizer is the first line of defense; this is the second).
   */
  private suppressNextRowClick = false

  /** The menu's action handler (one identity, so the part's input stays stable). */
  protected readonly actionHandler = (action: ContextMenuAction): void =>
    this.handleContextMenuAction(action)

  /** The menu's close handler. */
  protected readonly closeMenuHandler = (): void => {
    this.contextMenu.set(null)
  }

  /** The host element (React's root div). */
  private readonly host: HTMLElement = inject(ElementRef).nativeElement

  /** Stops following the persisted key. */
  private stopWatchingExpand: (() => void) | null = null

  /** Pending long-press timer. */
  private longPressTimer: number | null = null

  /** The press origin a pending long-press measures drift from. */
  private longPressStart: { x: number; y: number } | null = null

  /** Whether a long-press just fired (its synthesized click is swallowed). */
  private longPressFired = false

  /** The node a pending long-press belongs to. */
  private longPressNode: FileNode | null = null

  /** When set, the next view-check scrolls this path into view. */
  private scrollTarget: string | null = null

  /** When set, the next view-check flashes this path after scrolling. */
  private highlightTarget: string | null = null

  /** Rows rendered in the current pass (the runaway-recursion cap). */
  private renderedRows = 0

  /**
   * Each directory's open state as of the last committed pass: a click toggles
   * from THIS value, the way React's batched render leaves a second click in the
   * same pass looking at the props of the render that produced the row.
   */
  private readonly committedOpen = new Map<string, boolean>()

  /**
   * React portals the menu into `document.body`: the part's host is inserted
   * into this view by Angular (after the part appended itself to the body in its
   * constructor), so the observer moves it back out as soon as it lands.
   */
  private readonly menuObserver = new MutationObserver(() => this.adoptMenu())

  /** The expanded directories whose children were already requested. */
  private readonly requestedChildren = new Set<string>()

  /** The git status colors for the current theme. */
  private readonly gitColors = computed<Record<string, string>>(() =>
    this.mode() === 'light' ? LIGHT_GIT_COLORS : DARK_GIT_COLORS,
  )

  /** The visible paths, in order (shift-click ranges and keyboard navigation). */
  private visibleItems(): string[] {
    return getVisibleItems(this.files, this.expandState())
  }

  /**
   * Each visible path's 1-based render-order position — the number in every
   * row's id and in the container's `aria-activedescendant` (React's
   * `rowIndexById`). The position comes from the visible-items walk, not a
   * render-time counter, because a row that skips change detection would
   * otherwise take another row's number (two rows, one id); the map is cached
   * against the files/expand-state pair it was built from.
   * @returns The path → 1-based position map.
   */
  private rowIndex(): Map<string, number> {
    const state = this.expandState()
    const cache = this.rowIndexCache
    if (cache && cache.files === this.files && cache.state === state) return cache.map
    const map = new Map<string, number>()
    getVisibleItems(this.files, state).forEach((path, i) => map.set(path, i + 1))
    this.rowIndexCache = { files: this.files, state, map }
    return map
  }

  /**
   * One row's id: the tree's one prefix plus the row's 1-based render position.
   * @param node - The row's node.
   * @returns The id.
   */
  protected rowId(node: FileNode): string {
    return `${this.rowIdPrefix}-${this.rowIndex().get(node.path) ?? 0}`
  }

  /**
   * Whether a row is part of the selection (its `aria-selected`).
   * @param node - The row's node.
   * @returns The `aria-selected` value.
   */
  protected isSelected(node: FileNode): 'true' | 'false' {
    return this.selection().has(node.path) ? 'true' : 'false'
  }

  /**
   * The container's `aria-activedescendant`: the focused row's id, when a
   * focused row exists.
   * @returns The id, or null for none.
   */
  protected activeDescendant(): string | null {
    if (this.files.length === 0) return null
    const focusedPath = this.focused()
    if (!focusedPath) return null
    const index = this.rowIndex().get(focusedPath)
    return index === undefined ? null : `${this.rowIdPrefix}-${index}`
  }

  /** The container's `role`: a tree only when it has rows. */
  protected role(): string | null {
    return this.files.length === 0 ? null : 'tree'
  }

  /** The row's depth indent. */
  protected indent(depth: number): string {
    return `${depth * 12}px`
  }

  /** The guide line's offset from the container's left edge. */
  protected guideOffset(depth: number): string {
    return `${depth * 12 + 8}px`
  }

  /** The children of a directory in render order, bounded by the total-row cap. */
  protected sorted(nodes: FileNode[] | undefined, depth: number): FileNode[] {
    if (depth === 0) this.renderedRows = 0
    const sorted = nodes ? sortNodes(nodes) : []
    const room = MAX_RENDERED_NODES - this.renderedRows
    this.renderedRows += sorted.length
    return room <= 0 ? [] : sorted.slice(0, room)
  }

  /** Whether a directory row is open. */
  protected isExpanded(node: FileNode, depth: number): boolean {
    return isExpandedFromState(this.expandState(), node.path, depth)
  }

  /** The chevron's rotation. */
  protected chevronTransform(node: FileNode, depth: number): string {
    return this.isExpanded(node, depth) ? 'rotate(90deg)' : 'rotate(0deg)'
  }

  /** A row's background: drop target > selection > active file > transparent. */
  protected backgroundOf(node: FileNode): string {
    if (this.dropTarget() === node.path) {
      return 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 15%, transparent)'
    }
    if (this.selection().has(node.path)) {
      return 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 20%, transparent)'
    }
    if (node.path === this.activeFile) return 'rgba(128,128,128,0.15)'
    return 'transparent'
  }

  /**
   * A row's outline: the drop target, then the keyboard focus, then none. React
   * passes `isFocused={false}` to every nested row, so only a root row ever
   * shows the focus ring.
   */
  protected outlineOf(node: FileNode, depth: number): string {
    if (this.dropTarget() === node.path) {
      return '1px solid color-mix(in srgb, var(--mol-color-primary, #4070e0) 40%, transparent)'
    }
    if (depth === 0 && this.focused() === node.path) return '1px dotted rgba(128,128,128,0.5)'
    return 'none'
  }

  /** A row's opacity: cut > dimmed > normal. */
  protected opacityOf(node: FileNode): number {
    const clipboard = this.clipboard()
    if (clipboard?.operation === 'cut' && clipboard.paths.has(node.path)) return 0.4
    if (node.isDimmed) return 0.35
    return 1
  }

  /** A label's color: a file's own status, or the directory's rolled-up one. */
  protected labelColor(node: FileNode): string | null {
    const statuses = this.fileStatuses
    if (node.type === 'directory') {
      return statuses ? (getDirColor(node.path, statuses, this.gitColors()) ?? null) : null
    }
    const status = statuses?.[node.path]
    return status ? (this.gitColors()[status] ?? null) : null
  }

  /** The dimmed opacity a symlink's label takes. */
  protected symlinkOpacity(node: FileNode): number | null {
    return node.symlinkTarget ? 0.55 : null
  }

  /** The target a symlink's label shows. */
  protected symlinkLabel(node: FileNode): string {
    return node.symlinkTarget ? ' → ' + (node.symlinkTarget.split('/').pop() ?? '') : ''
  }

  /** Whether a cut/copy clipboard makes a paste possible. */
  protected canPaste(): boolean {
    const clipboard = this.clipboard()
    return clipboard?.operation === 'cut' && clipboard.paths.size > 0
  }

  /**
   * Applies the inputs that change the tree: the persisted key (subscribe), the
   * files (prune stale selections) and the active file (open its ancestors).
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if ('persistKey' in changes) {
      this.followPersistKey()
    }
    if (changes['files']) {
      const treePaths = collectAllPaths(this.files)
      const prev = this.selection()
      const next = new Set<string>()
      for (const p of prev) {
        if (treePaths.has(p)) next.add(p)
      }
      if (next.size !== prev.size) this.selection.set(next)
    }
    if (changes['activeFile'] || changes['persistKey']) {
      this.followActiveFile()
    }
  }

  /** Loads the persisted expand state for the current key and follows it. */
  private followPersistKey(): void {
    this.stopWatchingExpand?.()
    this.stopWatchingExpand = null
    const key = this.persistKey
    if (!key) {
      this.expandState.set({ expanded: new Set(), collapsed: new Set() })
      return
    }
    this.expandState.set(loadExpandState(key))
    this.stopWatchingExpand = watchExpandState(key, (state) => {
      this.expandState.set(state)
    })
  }

  /** Opens the active file's ancestors and queues it for a scroll. */
  private followActiveFile(): void {
    const target = this.activeFile
    if (!target) return
    const ancestors = getAncestorPaths(target)
    if (ancestors.length > 0) {
      const prev = this.expandState()
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
        if (this.persistKey) saveExpandState(this.persistKey, next)
        this.scrollTarget = target
        this.expandState.set(next)
        return
      }
    }
    this.scrollTarget = target
  }

  /** Watches for a menu host to move out to the body (React's portal). */
  ngOnInit(): void {
    this.menuObserver.observe(this.host, { childList: true })
  }

  /**
   * After every change-detection pass: attempt the pending scroll, then ask for
   * the children of any open directory that has none yet (React's per-row
   * effect, driven from the pass instead).
   */
  ngAfterViewChecked(): void {
    this.attemptPendingScroll()
    this.requestUnloadedChildren()
  }

  /**
   * React portals the menu into `document.body`. The part appends its host
   * there in its constructor, but Angular inserts that host into this view right
   * afterwards, so the host is moved out again once the insertion has happened
   * (in the microtask after the pass that created it) — the menu then sits where
   * React's portal puts it.
   */
  private adoptMenu(): void {
    const menu = this.host.querySelector('div[mol-file-explorer-context-menu]')
    if (menu && menu.parentNode !== document.body) document.body.appendChild(menu)
  }

  /** Scrolls to (and flashes) the queued path once its row exists. */
  private attemptPendingScroll(): void {
    if (!this.scrollTarget) return
    const target = this.scrollTarget
    const shouldHighlight = this.highlightTarget === target
    const el = Array.from(this.host.querySelectorAll<HTMLElement>('[data-explorer-path]')).find(
      (e) => e.dataset.explorerPath === target,
    )
    if (!el) return
    this.scrollTarget = null
    if (shouldHighlight) {
      this.highlightTarget = null
      scrollAndHighlight(this.host, target)
    } else {
      el.scrollIntoView({ block: 'nearest' })
    }
  }

  /** Asks the host once for each open directory whose children were never loaded. */
  private requestUnloadedChildren(): void {
    const expandState = this.expandState()
    const walk = (nodes: FileNode[], depth: number): void => {
      for (const node of sortNodes(nodes)) {
        if (node.type !== 'directory') continue
        const open = isExpandedFromState(expandState, node.path, depth)
        this.committedOpen.set(node.path, open)
        if (open && node.children === undefined) {
          if (!this.requestedChildren.has(node.path)) {
            this.requestedChildren.add(node.path)
            const path = node.path
            const onDirExpand = this.onDirExpand
            if (onDirExpand) queueMicrotask(() => onDirExpand(path))
          }
        } else {
          // React's per-row effect re-runs when the row closes or the children
          // arrive, so a later open asks again — the marker is dropped here.
          this.requestedChildren.delete(node.path)
        }
        if (open && node.children) walk(node.children, depth + 1)
      }
    }
    walk(this.files, 0)
  }

  /** Applies one click to the selection, following React's rules. */
  private clickRow(
    path: string,
    modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
  ): void {
    const isToggle = modifiers.ctrlKey || modifiers.metaKey
    const lastClicked = this.lastClicked()

    if (modifiers.shiftKey && lastClicked) {
      const items = this.visibleItems()
      const startIdx = items.indexOf(lastClicked)
      const endIdx = items.indexOf(path)
      if (startIdx !== -1 && endIdx !== -1) {
        const lo = Math.min(startIdx, endIdx)
        const hi = Math.max(startIdx, endIdx)
        const range = new Set(items.slice(lo, hi + 1))
        if (isToggle) {
          const next = new Set(this.selection())
          for (const p of range) next.add(p)
          this.selection.set(next)
        } else {
          this.selection.set(range)
        }
      }
      this.focused.set(path)
      return
    }
    if (isToggle) {
      const next = new Set(this.selection())
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      this.selection.set(next)
      this.lastClicked.set(path)
      this.focused.set(path)
      return
    }
    this.selection.set(new Set([path]))
    this.lastClicked.set(path)
    this.focused.set(path)
  }

  /**
   * A row's click reaches the tree CONTAINER — the tree pattern's one tab stop
   * owns the keyboard handling, so the click handling lives beside it (and the
   * row itself carries no click handler). The pressed row resolves by its path
   * and runs the same select / toggle / open logic it always did.
   */
  protected onTreeClick(e: MouseEvent): void {
    if (this.suppressNextRowClick) {
      this.suppressNextRowClick = false
      return
    }
    const row = (e.target as Element).closest('[data-explorer-path]') as HTMLElement | null
    const path = row?.dataset.explorerPath
    if (!path) return
    const found = findNodeByPath(this.files, path)
    if (!found) return
    const hasModifier = e.ctrlKey || e.metaKey || e.shiftKey
    if (hasModifier) {
      // Modifier clicks: pure selection, no open/toggle.
      this.clickRow(path, { ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey })
      return
    }
    // No modifier: select single + perform action.
    this.clickRow(path, { ctrlKey: false, metaKey: false, shiftKey: false })
    if (found.node.symlinkTarget) {
      this.handleSymlinkClick(path, found.node.symlinkTarget)
      return
    }
    if (found.node.type === 'directory') {
      const open =
        this.committedOpen.get(path) ?? isExpandedFromState(this.expandState(), path, found.depth)
      this.togglePath(path, !open)
      return
    }
    this.onFileSelect(path)
  }

  /** A row's double-click (files only) — delegated the same way. */
  protected onTreeDoubleClick(e: MouseEvent): void {
    const row = (e.target as Element).closest('[data-explorer-path]') as HTMLElement | null
    const path = row?.dataset.explorerPath
    if (!path) return
    const found = findNodeByPath(this.files, path)
    if (found?.node.type !== 'file') return
    this.onFileDoubleClick?.(path)
  }

  /** Opens or closes a directory, persisting the new state under `persistKey`. */
  private togglePath(path: string, nowExpanded: boolean): void {
    const prev = this.expandState()
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
    if (this.persistKey) saveExpandState(this.persistKey, next)
    this.expandState.set(next)
  }

  /**
   * Follows a symlink: a directory target opens its ancestors and flashes it, a
   * file target (or a path not in the tree) is opened as a file.
   */
  private handleSymlinkClick(symlinkPath: string, target: string): void {
    const resolvedPath = resolveSymlinkTarget(symlinkPath, target)
    const found = findNodeByPath(this.files, resolvedPath)
    if (!found || found.node.type !== 'directory') {
      this.onFileSelect(resolvedPath)
      return
    }
    const ancestors = getAncestorPaths(resolvedPath)
    const prev = this.expandState()
    const needsUpdate = ancestors.some((p) => !prev.expanded.has(p))
    if (!needsUpdate) {
      scrollAndHighlight(this.host, resolvedPath)
      this.scrollTarget = resolvedPath
      this.highlightTarget = resolvedPath
      return
    }
    const next: ExpandState = {
      expanded: new Set(prev.expanded),
      collapsed: new Set(prev.collapsed),
    }
    for (const a of ancestors) {
      next.expanded.add(a)
      next.collapsed.delete(a)
    }
    if (this.persistKey) saveExpandState(this.persistKey, next)
    this.scrollTarget = resolvedPath
    this.highlightTarget = resolvedPath
    this.expandState.set(next)
  }

  /** Opens the row menu at the pointer, selecting the row unless it is selected. */
  protected onRowContextMenu(node: FileNode, e: MouseEvent): void {
    e.preventDefault()
    e.stopPropagation()
    this.openRowContextMenu(node, { x: e.clientX, y: e.clientY })
  }

  /** Shows the row menu: the row joins (or keeps) the selection and takes the focus. */
  private openRowContextMenu(node: FileNode, position: { x: number; y: number }): void {
    if (!this.selection().has(node.path)) {
      this.selection.set(new Set([node.path]))
      this.lastClicked.set(node.path)
    }
    this.focused.set(node.path)
    this.contextMenu.set({ position, node })
  }

  /** Opens the empty-area menu and clears the selection. */
  private openBackgroundContextMenu(position: { x: number; y: number }): void {
    this.selection.set(new Set())
    this.contextMenu.set({ position, node: null })
  }

  /** Opens the empty-area menu at the pointer. */
  protected onBackgroundContextMenu(e: MouseEvent): void {
    e.preventDefault()
    this.openBackgroundContextMenu({ x: e.clientX, y: e.clientY })
  }

  /**
   * Arms the background long-press for a press that starts on the empty area.
   * Row presses bubble here too and belong to the row's own recognizer; a new
   * press invalidates any stale long-press click suppression first (React's
   * container `onPointerDown`).
   */
  protected onBackgroundPointerDown(e: PointerEvent): void {
    this.suppressNextRowClick = false
    if ((e.target as HTMLElement).closest('[data-explorer-path]')) return
    if (!this.coarse()) return
    this.armLongPress(e, null)
  }

  /** Arms the row long-press (touch/pen pointers only). */
  protected onRowPointerDown(node: FileNode, e: PointerEvent): void {
    if (!this.coarse()) return
    this.armLongPress(e, node)
  }

  /** Arms the long-press timer for a press. */
  private armLongPress(e: PointerEvent, node: FileNode | null): void {
    // A new press always invalidates any stale "just fired" flag.
    this.longPressFired = false
    if (e.pointerType === 'mouse') return
    const clientX = e.clientX
    const clientY = e.clientY
    this.clearLongPress()
    this.longPressStart = { x: clientX, y: clientY }
    this.longPressNode = node
    this.longPressTimer = window.setTimeout(() => {
      this.longPressTimer = null
      this.longPressFired = true
      const position = { x: clientX, y: clientY }
      const pressedNode = this.longPressNode
      if (pressedNode) {
        // Arm the container's synthesized-click suppression (see onTreeClick)
        // — the recognizer's own touchend preventDefault is the first line of
        // defense.
        this.suppressNextRowClick = true
        this.openRowContextMenu(pressedNode, position)
      } else {
        this.openBackgroundContextMenu(position)
      }
    }, LONG_PRESS_MS)
  }

  /** Cancels the pending long-press once the finger drifts past the tolerance. */
  protected onPointerMove(e: PointerEvent): void {
    if (this.longPressTimer === null || !this.longPressStart) return
    const dx = e.clientX - this.longPressStart.x
    const dy = e.clientY - this.longPressStart.y
    if (dx * dx + dy * dy > LONG_PRESS_MOVE_TOLERANCE_PX * LONG_PRESS_MOVE_TOLERANCE_PX) {
      this.clearLongPress()
    }
  }

  /** Cancels the pending long-press (release, cancel, or a drift). */
  protected clearLongPress(): void {
    if (this.longPressTimer !== null) {
      window.clearTimeout(this.longPressTimer)
      this.longPressTimer = null
    }
    this.longPressStart = null
  }

  /** Suppresses the compatibility mouse events synthesized after a fired long-press. */
  protected onTouchEnd(e: Event): void {
    if (this.longPressFired) e.preventDefault()
  }

  /** Collapses every directory (and tells the host). */
  private collapseAll(): void {
    this.expandState.set({ expanded: new Set(), collapsed: new Set(['__all_collapsed__']) })
    if (this.persistKey)
      saveExpandState(this.persistKey, {
        expanded: new Set(),
        collapsed: new Set(['__all_collapsed__']),
      })
    this.onCollapseAll?.()
  }

  /** Moves the cut items into the target directory. */
  private executePaste(targetDir: string): void {
    const clipboard = this.clipboard()
    if (!clipboard || clipboard.operation !== 'cut') return
    const moves: Array<{ oldPath: string; newPath: string }> = []
    for (const oldPath of clipboard.paths) {
      const fileName = oldPath.split('/').pop()!
      const newPath = `${targetDir}/${fileName}`
      if (newPath !== oldPath) moves.push({ oldPath, newPath })
    }
    if (moves.length > 0) this.onMoveFiles?.(moves)
    this.clipboard.set(null)
    this.selection.set(new Set())
  }

  /** Runs one context-menu action against the menu's node and the selection. */
  private handleContextMenuAction(action: ContextMenuAction): void {
    const node = this.contextMenu()?.node ?? null
    const selection = this.selection()
    switch (action) {
      case 'open':
        if (node) this.onFileSelect(node.path)
        break
      case 'rename':
        if (node) this.onRename?.(node.path)
        break
      case 'delete':
        if (node) this.onDelete?.(node.path)
        break
      case 'deleteMultiple':
        if (selection.size > 0) this.onDeleteMultiple?.(Array.from(selection))
        break
      case 'newFile': {
        const dir = node?.type === 'directory' ? node.path : '/workspace'
        this.onNewFile?.(dir)
        break
      }
      case 'newFolder': {
        const dir = node?.type === 'directory' ? node.path : '/workspace'
        this.onNewFolder?.(dir)
        break
      }
      case 'copyPath':
        // A copy can fail (insecure context, permission); copyTextWithFallback
        // resolves false instead of throwing, and the in-app selection still works.
        if (node) void copyTextWithFallback(node.path)
        break
      case 'copyPaths':
        void copyTextWithFallback(Array.from(selection).join('\n'))
        break
      case 'copyRelativePath':
        if (node) {
          const rel = node.path.replace(/^\/workspace\//, '')
          void copyTextWithFallback(rel)
        }
        break
      case 'copyRelativePaths':
        void copyTextWithFallback(
          Array.from(selection)
            .map((p) => p.replace(/^\/workspace\//, ''))
            .join('\n'),
        )
        break
      case 'cut':
        if (selection.size > 0) {
          this.clipboard.set({ paths: new Set(selection), operation: 'cut' })
          void copyTextWithFallback(Array.from(selection).join('\n'))
        }
        break
      case 'paste': {
        const targetDir = node
          ? node.type === 'directory'
            ? node.path
            : getParentDir(node.path)
          : '/workspace'
        this.executePaste(targetDir)
        break
      }
      case 'collapseAll':
        this.collapseAll()
        break
    }
  }

  /** Handles one key press on the tree: navigation, opening, selection and hand-over. */
  protected onTreeKeyDown(e: KeyboardEvent): void {
    const isMod = e.metaKey || e.ctrlKey
    const focusedPath = this.focused()
    const selection = this.selection()

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const items = this.visibleItems()
      const currentIdx = focusedPath ? items.indexOf(focusedPath) : -1
      const nextIdx =
        e.key === 'ArrowDown'
          ? Math.min(currentIdx + 1, items.length - 1)
          : Math.max(currentIdx - 1, 0)
      if (nextIdx < 0 || nextIdx >= items.length) return
      const nextPath = items[nextIdx]
      this.focused.set(nextPath)
      if (e.shiftKey) {
        const next = new Set(selection)
        next.add(nextPath)
        this.selection.set(next)
      } else if (!isMod) {
        this.selection.set(new Set([nextPath]))
        this.lastClicked.set(nextPath)
      }
      const el = this.host.querySelector(`[data-explorer-path="${CSS.escape(nextPath)}"]`)
      el?.scrollIntoView({ block: 'nearest' })
      return
    }

    if (e.key === 'ArrowRight' && focusedPath) {
      e.preventDefault()
      const found = findNodeByPath(this.files, focusedPath)
      if (found?.node.type === 'directory') {
        if (!isExpandedFromState(this.expandState(), focusedPath, found.depth)) {
          this.togglePath(focusedPath, true)
        } else if (found.node.children && found.node.children.length > 0) {
          const sorted = sortNodes(found.node.children)
          this.focused.set(sorted[0].path)
          this.selection.set(new Set([sorted[0].path]))
          this.lastClicked.set(sorted[0].path)
        }
      }
      return
    }

    if (e.key === 'ArrowLeft' && focusedPath) {
      e.preventDefault()
      const found = findNodeByPath(this.files, focusedPath)
      if (
        found?.node.type === 'directory' &&
        isExpandedFromState(this.expandState(), focusedPath, found.depth)
      ) {
        this.togglePath(focusedPath, false)
      } else {
        const parent = getParentDir(focusedPath)
        if (parent !== '/workspace' && parent.startsWith('/workspace')) {
          this.focused.set(parent)
          this.selection.set(new Set([parent]))
          this.lastClicked.set(parent)
        }
      }
      return
    }

    if (e.key === 'Enter' && focusedPath) {
      e.preventDefault()
      const found = findNodeByPath(this.files, focusedPath)
      if (found?.node.type === 'directory') {
        this.togglePath(
          focusedPath,
          !isExpandedFromState(this.expandState(), focusedPath, found.depth),
        )
      } else {
        this.onFileSelect(focusedPath)
      }
      return
    }

    if (e.key === ' ' && focusedPath) {
      e.preventDefault()
      const next = new Set(selection)
      if (next.has(focusedPath)) {
        next.delete(focusedPath)
      } else {
        next.add(focusedPath)
      }
      this.selection.set(next)
      return
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && selection.size > 0) {
      e.preventDefault()
      if (selection.size === 1) {
        this.onDelete?.(Array.from(selection)[0])
      } else {
        this.onDeleteMultiple?.(Array.from(selection))
      }
      return
    }

    if (e.key === 'F2' && selection.size === 1) {
      e.preventDefault()
      this.onRename?.(Array.from(selection)[0])
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      this.selection.set(new Set())
      this.clipboard.set(null)
      this.focused.set(null)
      return
    }

    if (isMod && e.key === 'a') {
      e.preventDefault()
      this.selection.set(new Set(this.visibleItems()))
      return
    }

    if (isMod && e.key === 'c' && selection.size > 0) {
      e.preventDefault()
      void copyTextWithFallback(Array.from(selection).join('\n'))
      this.clipboard.set({ paths: new Set(selection), operation: 'copy' })
      return
    }

    if (isMod && e.key === 'x' && selection.size > 0) {
      e.preventDefault()
      this.clipboard.set({ paths: new Set(selection), operation: 'cut' })
      void copyTextWithFallback(Array.from(selection).join('\n'))
      return
    }

    if (isMod && e.key === 'v' && this.clipboard()?.operation === 'cut') {
      e.preventDefault()
      let targetDir = '/workspace'
      if (focusedPath) {
        const found = findNodeByPath(this.files, focusedPath)
        targetDir = found?.node.type === 'directory' ? focusedPath : getParentDir(focusedPath)
      }
      this.executePaste(targetDir)
      return
    }
  }

  /** Starts a drag, selecting the row when it is not part of the selection. */
  protected onRowDragStart(node: FileNode, e: DragEvent): void {
    let paths: Set<string>
    if (this.selection().has(node.path)) {
      paths = new Set(this.selection())
    } else {
      paths = new Set([node.path])
      this.selection.set(paths)
    }
    this.dragging.set(paths)
    e.dataTransfer?.setData('text/plain', [...paths].join('\n'))
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'

    const badge = document.createElement('div')
    badge.textContent =
      paths.size === 1 ? (node.path.split('/').pop() ?? '') : `${paths.size} items`
    badge.style.cssText =
      'padding:4px 8px;background:#2a6fc9;color:#fff;border-radius:4px;font-size:12px;position:absolute;top:-1000px'
    document.body.appendChild(badge)
    e.dataTransfer?.setDragImage(badge, 0, 0)
    requestAnimationFrame(() => {
      if (badge.parentNode) document.body.removeChild(badge)
    })
  }

  /** Tracks the directory a drag would drop into, refusing self/descendants. */
  protected onRowDragOver(node: FileNode, e: DragEvent): void {
    const dragged = this.dragging()
    if (!dragged) return
    e.preventDefault()
    e.stopPropagation()
    const found = findNodeByPath(this.files, node.path)
    const targetDir = found?.node.type === 'directory' ? node.path : getParentDir(node.path)
    for (const dragPath of dragged) {
      if (targetDir === dragPath || targetDir.startsWith(dragPath + '/')) {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'
        this.dropTarget.set(null)
        return
      }
    }
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    this.dropTarget.set(targetDir)
  }

  /** Clears the drop target once the pointer truly leaves the tree. */
  protected onRowDragLeave(e: DragEvent): void {
    const related = e.relatedTarget as Node | null
    if (related && this.host.contains(related)) return
    this.dropTarget.set(null)
  }

  /** Drops the dragged rows into the row's directory. */
  protected onRowDrop(node: FileNode, e: DragEvent): void {
    e.preventDefault()
    e.stopPropagation()
    const dragged = this.dragging()
    if (!dragged || dragged.size === 0) {
      this.dragging.set(null)
      this.dropTarget.set(null)
      return
    }
    const found = findNodeByPath(this.files, node.path)
    const targetDir = found?.node.type === 'directory' ? node.path : getParentDir(node.path)
    const moves: Array<{ oldPath: string; newPath: string }> = []
    for (const oldPath of dragged) {
      const fileName = oldPath.split('/').pop()!
      const newPath = `${targetDir}/${fileName}`
      if (newPath !== oldPath) moves.push({ oldPath, newPath })
    }
    if (moves.length > 0) this.onMoveFiles?.(moves)
    this.dragging.set(null)
    this.dropTarget.set(null)
    this.selection.set(new Set())
  }

  /** Shows the workspace root as the drop target for a background drag. */
  protected onBackgroundDragOver(e: DragEvent): void {
    if (!this.dragging()) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    this.dropTarget.set('/workspace')
  }

  /** Drops dragged rows into the workspace root. */
  protected onBackgroundDrop(e: DragEvent): void {
    e.preventDefault()
    const dragged = this.dragging()
    if (!dragged || dragged.size === 0) {
      this.dragging.set(null)
      this.dropTarget.set(null)
      return
    }
    const moves: Array<{ oldPath: string; newPath: string }> = []
    for (const oldPath of dragged) {
      const fileName = oldPath.split('/').pop()!
      const newPath = `/workspace/${fileName}`
      if (newPath !== oldPath) moves.push({ oldPath, newPath })
    }
    if (moves.length > 0) this.onMoveFiles?.(moves)
    this.dragging.set(null)
    this.dropTarget.set(null)
    this.selection.set(new Set())
  }

  /** Ends a drag, whatever happened to it. */
  protected endDrag(): void {
    this.dragging.set(null)
    this.dropTarget.set(null)
  }

  /** Clears the long-press timer, the persisted-key subscription and the observer. */
  ngOnDestroy(): void {
    this.menuObserver.disconnect()
    this.clearLongPress()
    this.stopWatchingExpand?.()
  }
}
