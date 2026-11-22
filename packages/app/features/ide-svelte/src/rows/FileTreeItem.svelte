<!--
  One row of the file explorer's tree — React's `FileTreeItem`, module-local
  there and here (a file explorer renders it, the package does not export it).

  Svelte counterpart of `@molecule/app-ide-react`'s `FileTreeItem` (see that
  file for the design notes): the same row DOM for the same node, the same
  depth indent and guide line, the same chevron/file-type icon, the same git
  status color, the same selection/drop/cut tints, the same keyboard-free click
  rules (plain, ctrl/meta, shift) and the same long-press menu on touch.

  Styling uses `getClassMap()` (`cm.*`); the inline styles are the row layout the
  ClassMap can't express, written through the CSSOM as style directives, the way
  React writes them (the DOM's `style` attribute is the CSSOM's serialization,
  not a written string).
-->
<script module lang="ts">
  import type { FileNode } from '@molecule/app-ide-panel-logic'
  import type { ExpandState } from '@molecule/app-ide-panel-logic/panels'

  /** Props for a single rendered file-tree row — the React prop names. */
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
    onDragStart: (path: string, e: DragEvent) => void
    onDragOver: (path: string, e: DragEvent) => void
    onDragLeave: (e: DragEvent) => void
    onDrop: (path: string, e: DragEvent) => void
    expandState: ExpandState
    fileStatuses?: Record<string, string>
    gitColors: Record<string, string>
    selectedPaths: Set<string>
    clipboardPaths: Set<string> | null
    clipboardOperation: 'cut' | 'copy' | null
    /** Shared mutable counter — tracks total rendered items to prevent runaway recursion. */
    renderCount: { current: number }
    dropTargetPath: string | null
    /** Touch-first device — rows get a ≥36px min-height so they're comfortably tappable. */
    isCoarse: boolean
    /**
     * Prefix (one generated id at the tree root) for the rows' DOM ids — the
     * tree container points `aria-activedescendant` at the focused row's id.
     */
    rowIdPrefix: string
    /** Each visible path's 1-based render-order position, keying the rows' ids. */
    rowIndex: ReadonlyMap<string, number>
    /**
     * Arms the tree container's long-press click suppression (see the tree's
     * delegated click handler).
     */
    onLongPressFired: () => void
  }
</script>

<script lang="ts">
  import { getIcon } from 'material-file-icons'

  import { getClassMap } from '@molecule/app-ui'

  import Markup from '../parts/Markup.svelte'
  import {
    createLongPress,
    createStyleWriter,
    getDirColor,
    isExpandedFromState,
    MAX_RENDERED_NODES,
    sortNodes,
  } from './fileTree.js'
  import FileTreeItem from './FileTreeItem.svelte'

  let {
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
    isCoarse,
    rowIdPrefix,
    rowIndex,
    onLongPressFired,
  }: FileTreeItemProps = $props()

  // svelte-ignore state_referenced_locally
  renderCount.current++

  const cm = getClassMap()
  const isDir = $derived(node.type === 'directory')
  // This row's position in visible-items order (1-based) — the tree container
  // names the focused row via `aria-activedescendant` with the same numbering.
  // The position comes from the root's visible-items map, not a render-time
  // counter, because a row that skips re-rendering would otherwise take
  // another row's number (two rows, one id).
  const rowId = $derived(`${rowIdPrefix}-${rowIndex.get(node.path) ?? 0}`)
  // Directories before files, each group sorted alphabetically
  const sortedChildren = $derived(node.children ? sortNodes(node.children) : undefined)

  // Load children whenever this dir is expanded but hasn't been fetched yet.
  // `undefined` means not yet loaded; `[]` means loaded but empty — only fetch
  // for the former to avoid infinite loops on empty/errored directories.
  $effect(() => {
    if (isExpanded && isDir && node.children === undefined && onDirExpand) onDirExpand(node.path)
  })

  // iOS Safari never fires 'contextmenu', so on coarse pointers a ~500ms
  // long-press opens the SAME menu the right-click path does.
  const longPress = createLongPress(
    () => isCoarse && !!onContextMenu,
    (position) => {
      // Arm the tree container's synthesized-click suppression — the
      // recognizer's own touchend preventDefault is the first line of defense.
      onLongPressFired()
      onContextMenu?.(position, node)
    },
  )

  // Compute background color: dropTarget > selection > activeFile > transparent
  // Drop/selection tints follow the theme primary (a rebranded app tints its
  // own tree), never a literal blue; the hex is only the CSS-var fallback.
  const background = $derived(
    isDropTarget
      ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 15%, transparent)'
      : isSelected
        ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 20%, transparent)'
        : node.path === activeFile
          ? 'rgba(128,128,128,0.15)'
          : 'transparent',
  )

  // Compute opacity: cut > dimmed > normal
  const opacity = $derived(isCut ? 0.4 : node.isDimmed ? 0.35 : 1)

  const outline = $derived(
    isDropTarget
      ? '1px solid color-mix(in srgb, var(--mol-color-primary, #4070e0) 40%, transparent)'
      : isFocused
        ? '1px dotted rgba(128,128,128,0.5)'
        : 'none',
  )

  const labelColor = $derived(
    isDir
      ? fileStatuses
        ? getDirColor(node.path, fileStatuses, gitColors)
        : undefined
      : fileStatuses?.[node.path]
        ? gitColors[fileStatuses[node.path]]
        : undefined,
  )

  // The chevron points right when collapsed, down when expanded.
  const chevronTransform = $derived(isExpanded ? 'rotate(90deg)' : 'rotate(0deg)')

  const symlinkLabel = $derived(
    node.symlinkTarget ? ' → ' + (node.symlinkTarget.split('/').pop() ?? '') : '',
  )

  let rowEl = $state<HTMLElement | null>(null)
  let labelEl = $state<HTMLElement | null>(null)
  const writeRowStyle = createStyleWriter()
  const writeLabelStyle = createStyleWriter()

  // The row's inline style, written property by property the way React writes it
  // (the drag tints and tints that revert are per-property writes, and the
  // touch-device text-selection guard is part of the same style).
  $effect(() => {
    writeRowStyle(rowEl, {
      display: 'flex',
      'align-items': 'center',
      gap: '4px',
      'padding-left': `${depth * 12}px`,
      'padding-top': '1px',
      'padding-bottom': '1px',
      'padding-right': '6px',
      border: 'none',
      background: background,
      outline: outline,
      'outline-offset': '-1px',
      color: 'inherit',
      cursor: 'pointer',
      'text-align': 'left',
      opacity: opacity,
      'font-size': '13px',
      'line-height': '22px',
      ...(isCoarse ? { '-webkit-user-select': 'none', 'user-select': 'none' } : {}),
    })
  })

  // The label's color (a file's status, or the directory's rolled-up one) and the
  // dimmed symlink.
  $effect(() => {
    writeLabelStyle(labelEl, {
      overflow: 'hidden',
      'text-overflow': 'ellipsis',
      'white-space': 'nowrap',
      color: labelColor,
      opacity: node.symlinkTarget ? 0.55 : undefined,
    })
  })

  /** Opens this row's menu at the pointer, or swallows the browser's. */
  function handleContextMenu(e: MouseEvent): void {
    if (onContextMenu) {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu({ x: e.clientX, y: e.clientY }, node)
    }
  }
</script>

<div role="none">
  <!-- A file-TREE row — depth-indented, drag/drop and long-press aware, a list
       item rather than a CTA. A `treeitem` div, not a `<button>` (HTML does
       not allow `role="treeitem"` on one), so the tree it belongs to has the
       `treeitem` children `role="tree"` requires; focus stays on the tree
       container, which draws the focused row, handles its keys and owns its
       clicks (the row carries no click handler of its own). -->
  <div
    role="treeitem"
    id={rowId}
    aria-level={depth + 1}
    aria-expanded={isDir ? isExpanded : undefined}
    aria-selected={isSelected}
    tabindex="-1"
    oncontextmenu={handleContextMenu}
    onpointerdown={longPress.onPointerDown}
    onpointermove={longPress.onPointerMove}
    onpointerup={longPress.onPointerUp}
    onpointercancel={longPress.onPointerCancel}
    ontouchend={longPress.onTouchEnd}
    draggable={!isCoarse}
    ondragstart={(e) => onDragStart(node.path, e)}
    ondragover={(e) => onDragOver(node.path, e)}
    ondragleave={(e) => onDragLeave(e)}
    ondrop={(e) => onDrop(node.path, e)}
    data-explorer-path={node.path}
    class={cm.cn(cm.w('full'), cm.touchTargetCompact)}
    bind:this={rowEl}
  >
    <!-- Icon column — chevron for dirs, file-type icon for files; always 16px so names align -->
    <span style="align-items: center; display: flex; flex-shrink: 0; width: 16px">
      {#if isDir}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          style="display: block; flex-shrink: 0; opacity: 0.65; transform: {chevronTransform}; transition: transform 100ms"
        >
          <!-- Right-pointing chevron (V rotated): collapses/expands via CSS rotation -->
          <polyline
            points="6,4 10,8 6,12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      {:else}
        <span style="display: inline-flex; flex-shrink: 0; height: 16px; width: 16px"
          ><Markup markup={getIcon(node.name).svg} /></span
        >
      {/if}
    </span>

    <!-- Label -->
    <span
      bind:this={labelEl}
      style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
    >
      {node.name}{symlinkLabel}
    </span>
  </div>

  {#if isDir && isExpanded && sortedChildren && renderCount.current < MAX_RENDERED_NODES}
    <!-- The directory's children render in a group owned by their treeitem. -->
    <div role="group" style="position: relative">
      <!-- Guide line — 1px at center of parent chevron (paddingLeft + half icon width) -->
      <span
        style="position: absolute; top: 0px; bottom: 0px; width: 1px; background: rgba(128, 128, 128, 0.15); pointer-events: none; left: {depth *
          12 +
          8}px"
      ></span>
      {#each sortedChildren as child (child.path)}
        <FileTreeItem
          node={child}
          depth={depth + 1}
          isExpanded={isExpandedFromState(expandState, child.path, depth + 1)}
          {activeFile}
          isSelected={selectedPaths.has(child.path)}
          isCut={clipboardOperation === 'cut' &&
            clipboardPaths !== null &&
            clipboardPaths.has(child.path)}
          isFocused={false}
          isDropTarget={dropTargetPath === child.path}
          {onFileSelect}
          {onFileDoubleClick}
          {onDirExpand}
          {onTogglePath}
          {onSymlinkClick}
          {onContextMenu}
          {onItemClick}
          {onDragStart}
          {onDragOver}
          {onDragLeave}
          {onDrop}
          {expandState}
          {fileStatuses}
          {gitColors}
          {selectedPaths}
          {clipboardPaths}
          {clipboardOperation}
          {renderCount}
          {dropTargetPath}
          {isCoarse}
          {rowIdPrefix}
          {rowIndex}
          {onLongPressFired}
        />
      {/each}
    </div>
  {/if}
</div>
