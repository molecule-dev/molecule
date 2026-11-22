<!--
  Tree-view file browser with multi-select, keyboard navigation, and
  drag-and-drop.

  Svelte counterpart of `@molecule/app-ide-react`'s `FileExplorer` (see that
  file for the design notes): the same props (React names), the same DOM for the
  same input, the same callbacks. Directories render before files, each group
  alphabetically; a directory at the root opens by default and any other opens
  from the state persisted under `persistKey`; an expanded directory that has no
  `children` yet asks for them once through `onDirExpand`; the active file opens
  its ancestors and is tinted; git statuses color a file and roll the
  highest-priority one up to its directory; a symlink shows its target and a
  directory symlink reveals and flashes that target; selection follows plain,
  ctrl/meta, shift, shift+ctrl and space, the arrow keys move a focus and extend
  the selection, Delete/Backspace and F2 hand the selection over, and the row
  menu, the background menu and a coarse pointer's long-press all open the same
  `FileExplorerContextMenu` the React component portals.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express, written the way the DOM takes it here (pixel values
  spell their `px`, which Svelte does not add for React).
-->
<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity'
  import { get } from 'svelte/store'

  import { copyTextWithFallback } from '@molecule/app-clipboard'
  import type { FileExplorerProps, FileNode } from '@molecule/app-ide-panel-logic'
  import {
    type ExpandState,
    loadExpandState,
    saveExpandState,
    watchExpandState,
  } from '@molecule/app-ide-panel-logic/panels'
  import { useThemeMode, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useCoarsePointer } from '../hooks/useViewport.js'
  import FileExplorerContextMenu, {
    type ContextMenuAction,
  } from '../parts/FileExplorerContextMenu.svelte'
  import {
    collectAllPaths,
    createLongPress,
    DARK_GIT_COLORS,
    findNodeByPath,
    getAncestorPaths,
    getParentDir,
    getVisibleItems,
    isExpandedFromState,
    LIGHT_GIT_COLORS,
    resolveSymlinkTarget,
    scrollAndHighlight,
    sortNodes,
  } from '../rows/fileTree.js'
  import FileTreeItem from '../rows/FileTreeItem.svelte'

  let {
    readOnly,
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
  }: FileExplorerProps = $props()

  const cm = getClassMap()
  const { t } = useTranslation()
  const mode = useThemeMode()
  const gitColors = $derived($mode === 'light' ? LIGHT_GIT_COLORS : DARK_GIT_COLORS)
  const coarse = useCoarsePointer()
  // One id prefix for every row: the container points aria-activedescendant at
  // `<prefix>-<render position>` of the focused row (see FileTreeItem).
  const rowIdPrefix = $props.id()

  let containerEl = $state<HTMLElement | null>(null)
  // When set, the next render after DOM update will scroll this path into view
  let scrollTarget: string | null = null
  // When set, briefly flash a highlight on this path after scrolling
  let highlightTarget: string | null = null
  // A row long-press just fired: the click the browser synthesizes at
  // finger-lift must not ALSO select/open that row (the touchend suppression
  // in the row's recognizer is the first line of defense; this is the second).
  let suppressNextRowClick = false

  // svelte-ignore state_referenced_locally
  let expandState = $state<ExpandState>(
    persistKey
      ? loadExpandState(persistKey)
      : { expanded: new SvelteSet(), collapsed: new SvelteSet() },
  )

  // Follow the bonded provider for this key. A synchronous provider's value is
  // already in `expandState`; an asynchronous one hydrates later and updates this
  // SAME tree (never a remount), as does a change from another tab.
  $effect(() => {
    const key = persistKey
    if (!key) return
    expandState = loadExpandState(key)
    return watchExpandState(key, (state) => {
      expandState = state
    })
  })

  // ---------------------------------------------------------------------------
  // Selection state
  // ---------------------------------------------------------------------------

  // The selection is one SvelteSet MUTATED in place (never replaced), so every
  // read of it — the rows' tints, a size, a membership test — is tracked.
  const selectedPaths = new SvelteSet<string>()
  /**
   * Replaces the whole selection in place.
   * @param next - The paths to select.
   */
  function setSelectedPaths(next: Iterable<string>): void {
    selectedPaths.clear()
    for (const path of next) selectedPaths.add(path)
  }
  let lastClickedPath = $state<string | null>(null)
  let focusedPath = $state<string | null>(null)

  // Clipboard for cut/copy (internal)
  let clipboard = $state<{ paths: Set<string>; operation: 'cut' | 'copy' } | null>(null)

  // Drag-and-drop state
  let draggedPaths = $state<Set<string> | null>(null)
  let dropTargetPath = $state<string | null>(null)

  // Memoized visible items list — used for shift-click range and keyboard nav
  const visibleItems = $derived(getVisibleItems(files, expandState))
  // Each visible path's 1-based render-order position — the number in every
  // row's id and in the container's aria-activedescendant (see FileTreeItem).
  const rowIndexById = $derived(new Map(visibleItems.map((path, i) => [path, i + 1] as const)))

  // The tree container's click handler reads the expand state as of the last
  // COMMITTED frame: the conformance kit's `dblclick` step sends both clicks in
  // one synchronous pass, and React's batched render leaves the second handler
  // looking at the state of the render that produced it, so a double-clicked
  // directory toggles once. Svelte's state write is synchronous, so the value
  // the handler toggles from is committed on the microtask after the pass.
  // svelte-ignore state_referenced_locally
  let committedExpandState: ExpandState = expandState
  $effect(() => {
    const state = expandState
    queueMicrotask(() => {
      committedExpandState = state
    })
  })

  // Prune stale selections when the file tree changes
  $effect(() => {
    const treePaths = collectAllPaths(files)
    const prev = selectedPaths
    const next = new SvelteSet<string>()
    for (const p of prev) {
      if (treePaths.has(p)) next.add(p)
    }
    if (next.size !== prev.size) setSelectedPaths(next)
  })

  // When activeFile changes, expand all ancestor directories and queue a scroll
  $effect(() => {
    const target = activeFile
    // Tracked so a `persistKey` change re-reads the tree, as React's effect does.
    const key = persistKey
    if (!target) return
    const ancestors = getAncestorPaths(target)
    if (ancestors.length > 0) {
      const prev = expandState
      const needsUpdate = ancestors.some((p) => !prev.expanded.has(p))
      if (needsUpdate) {
        const next: ExpandState = {
          expanded: new SvelteSet(prev.expanded),
          collapsed: new SvelteSet(prev.collapsed),
        }
        for (const ancestor of ancestors) {
          next.expanded.add(ancestor)
          next.collapsed.delete(ancestor)
        }
        if (key) saveExpandState(key, next)
        scrollTarget = target
        expandState = next
        return
      }
    }
    scrollTarget = target
  })

  // After every render, attempt the pending scroll (retries until the element is
  // in the DOM). Reading the render's own inputs makes this follow any change
  // React re-renders for.
  $effect(() => {
    void files
    void expandState
    void activeFile
    const container = containerEl
    if (!scrollTarget || !container) return
    const target = scrollTarget
    const shouldHighlight = highlightTarget === target
    const el = Array.from(container.querySelectorAll<HTMLElement>('[data-explorer-path]')).find(
      (e) => e.dataset.explorerPath === target,
    )
    if (el) {
      scrollTarget = null
      if (shouldHighlight) {
        highlightTarget = null
        scrollAndHighlight(container, target)
      } else {
        el.scrollIntoView({ block: 'nearest' })
      }
    }
  })

  /**
   * Opens or closes a directory, persisting the new state under `persistKey`.
   * @param path - The directory path.
   * @param nowExpanded - Whether it should now be open.
   */
  function handleTogglePath(path: string, nowExpanded: boolean): void {
    const prev = expandState
    const next: ExpandState = {
      expanded: new SvelteSet(prev.expanded),
      collapsed: new SvelteSet(prev.collapsed),
    }
    if (nowExpanded) {
      next.expanded.add(path)
      next.collapsed.delete(path)
    } else {
      next.collapsed.add(path)
      next.expanded.delete(path)
    }
    if (persistKey) saveExpandState(persistKey, next)
    expandState = next
  }

  /**
   * Follows a symlink: a directory target opens its ancestors and flashes it, a
   * file target (or a path not in the tree) is opened as a file.
   * @param symlinkPath - The symlink's own path.
   * @param target - Its target value.
   */
  function handleSymlinkClick(symlinkPath: string, target: string): void {
    const resolvedPath = resolveSymlinkTarget(symlinkPath, target)
    const found = findNodeByPath(files, resolvedPath)

    if (found && found.node.type === 'directory') {
      // Ensure ancestors are expanded so the target is visible
      const ancestors = getAncestorPaths(resolvedPath)
      const prev = expandState
      const needsUpdate = ancestors.some((p) => !prev.expanded.has(p))
      if (!needsUpdate) {
        // Already visible — scroll and highlight directly
        scrollAndHighlight(containerEl, resolvedPath)
      } else {
        const next: ExpandState = {
          expanded: new SvelteSet(prev.expanded),
          collapsed: new SvelteSet(prev.collapsed),
        }
        for (const a of ancestors) {
          next.expanded.add(a)
          next.collapsed.delete(a)
        }
        if (persistKey) saveExpandState(persistKey, next)
        scrollTarget = resolvedPath
        highlightTarget = resolvedPath
        expandState = next
        return
      }
      scrollTarget = resolvedPath
      highlightTarget = resolvedPath
    } else {
      // File symlink (or target not in tree) — select the real file
      onFileSelect(resolvedPath)
    }
  }

  // ---------------------------------------------------------------------------
  // Selection click handler
  // ---------------------------------------------------------------------------

  /**
   * Applies one row click to the selection, following React's rules.
   * @param path - The clicked row's path.
   * @param modifiers - Which modifier keys were held.
   */
  function handleItemClick(
    path: string,
    modifiers: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean },
  ): void {
    const isToggle = modifiers.ctrlKey || modifiers.metaKey

    if (modifiers.shiftKey && lastClickedPath) {
      // Shift+Click: range select
      const items = visibleItems
      const startIdx = items.indexOf(lastClickedPath)
      const endIdx = items.indexOf(path)
      if (startIdx !== -1 && endIdx !== -1) {
        const lo = Math.min(startIdx, endIdx)
        const hi = Math.max(startIdx, endIdx)
        const range = new SvelteSet(items.slice(lo, hi + 1))
        // When shift is combined with ctrl/cmd, add to existing selection
        if (isToggle) {
          const next = new SvelteSet(selectedPaths)
          for (const p of range) next.add(p)
          setSelectedPaths(next)
        } else {
          setSelectedPaths(range)
        }
      }
      focusedPath = path
      // Don't update lastClickedPath on shift-click to preserve the anchor
    } else if (isToggle) {
      // Ctrl/Cmd+Click: toggle single item
      const next = new SvelteSet(selectedPaths)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      setSelectedPaths(next)
      lastClickedPath = path
      focusedPath = path
    } else {
      // Plain click: select single
      setSelectedPaths(new SvelteSet([path]))
      lastClickedPath = path
      focusedPath = path
    }
  }

  // ---------------------------------------------------------------------------
  // Context menu
  // ---------------------------------------------------------------------------

  let contextMenu = $state<{ position: { x: number; y: number }; node: FileNode | null } | null>(
    null,
  )

  /**
   * Opens the row menu, selecting the row unless it is already selected.
   * @param position - The pointer position to open at.
   * @param node - The right-clicked node.
   */
  function handleItemContextMenu(position: { x: number; y: number }, node: FileNode): void {
    // If right-clicked item is already selected, keep multi-selection
    if (!selectedPaths.has(node.path)) {
      setSelectedPaths(new SvelteSet([node.path]))
      lastClickedPath = node.path
    }
    focusedPath = node.path
    contextMenu = { position, node }
  }

  /**
   * Opens the empty-area menu and clears the selection.
   * @param position - The pointer position to open at.
   */
  function openBackgroundContextMenu(position: { x: number; y: number }): void {
    setSelectedPaths(new SvelteSet())
    contextMenu = { position, node: null }
  }

  /**
   * Opens the empty-area menu at the pointer.
   * @param e - The native contextmenu event.
   */
  function handleBackgroundContextMenu(e: MouseEvent): void {
    e.preventDefault()
    openBackgroundContextMenu({ x: e.clientX, y: e.clientY })
  }

  // Touch path to the background menu (New File / New Folder / Collapse All) —
  // iOS Safari never fires 'contextmenu', so a long-press on the empty tree area
  // opens it instead. Presses that start on a row are excluded at the
  // container's pointerdown (the row recognizer owns those).
  const backgroundLongPress = createLongPress(() => get(coarse), openBackgroundContextMenu)

  /** Closes the context menu. */
  function handleCloseContextMenu(): void {
    contextMenu = null
  }

  /** Collapses every directory (and tells the host). */
  function handleCollapseAll(): void {
    expandState = { expanded: new SvelteSet(), collapsed: new SvelteSet(['__all_collapsed__']) }
    if (persistKey)
      saveExpandState(persistKey, {
        expanded: new SvelteSet(),
        collapsed: new SvelteSet(['__all_collapsed__']),
      })
    onCollapseAll?.()
  }

  /**
   * A row's click: it reaches the tree CONTAINER — the tree pattern's one tab
   * stop owns the keyboard handling, so the click handling lives beside it (and
   * the row itself carries no click handler). The pressed row resolves by its
   * path and runs the same select / toggle / open logic it always did.
   *
   * @param e - The native click event that reached the tree container.
   */
  function handleTreeClick(e: MouseEvent): void {
    if (suppressNextRowClick) {
      suppressNextRowClick = false
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
      handleTogglePath(path, !isExpandedFromState(committedExpandState, path, found.depth))
    } else {
      onFileSelect(path)
    }
  }

  /**
   * A row's double-click (files only) — delegated the same way.
   *
   * @param e - The native dblclick event that reached the tree container.
   */
  function handleTreeDoubleClick(e: MouseEvent): void {
    const row = (e.target as Element).closest('[data-explorer-path]') as HTMLElement | null
    const path = row?.dataset.explorerPath
    if (!path) return
    const found = findNodeByPath(files, path)
    if (found?.node.type !== 'file') return
    onFileDoubleClick?.(path)
  }

  /**
   * Execute a paste operation: move clipboard items to the target directory.
   * @param targetDir - The directory to move items into.
   */
  function executePaste(targetDir: string): void {
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
    clipboard = null
    setSelectedPaths(new SvelteSet())
  }

  /**
   * Runs one context-menu action against the menu's node and the selection.
   * @param action - The chosen action.
   */
  function handleContextMenuAction(action: ContextMenuAction): void {
    const node = contextMenu?.node ?? null
    const selection = selectedPaths
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
        if (selection.size > 0) onDeleteMultiple?.(Array.from(selection))
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
          clipboard = { paths: new SvelteSet(selection), operation: 'cut' }
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

  // ---------------------------------------------------------------------------
  // Keyboard navigation
  // ---------------------------------------------------------------------------

  /**
   * Handles one key press on the tree: navigation, opening, selection and the
   * hand-over keys, exactly the React component's rules.
   * @param e - The native keydown event.
   */
  function handleTreeKeyDown(e: KeyboardEvent): void {
    const isMod = e.metaKey || e.ctrlKey

    // Navigate up/down
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const items = visibleItems
      const currentIdx = focusedPath ? items.indexOf(focusedPath) : -1
      const nextIdx =
        e.key === 'ArrowDown'
          ? Math.min(currentIdx + 1, items.length - 1)
          : Math.max(currentIdx - 1, 0)
      if (nextIdx < 0 || nextIdx >= items.length) return
      const nextPath = items[nextIdx]
      focusedPath = nextPath

      if (e.shiftKey) {
        // Shift+Arrow: extend selection
        const next = new SvelteSet(selectedPaths)
        next.add(nextPath)
        setSelectedPaths(next)
      } else if (!isMod) {
        setSelectedPaths(new SvelteSet([nextPath]))
        lastClickedPath = nextPath
      }

      // Scroll focused item into view
      if (containerEl) {
        const el = containerEl.querySelector(`[data-explorer-path="${CSS.escape(nextPath)}"]`)
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
          focusedPath = sorted[0].path
          setSelectedPaths(new SvelteSet([sorted[0].path]))
          lastClickedPath = sorted[0].path
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
          focusedPath = parent
          setSelectedPaths(new SvelteSet([parent]))
          lastClickedPath = parent
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
      const next = new SvelteSet(selectedPaths)
      if (next.has(focusedPath)) {
        next.delete(focusedPath)
      } else {
        next.add(focusedPath)
      }
      setSelectedPaths(next)
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
      setSelectedPaths(new SvelteSet())
      clipboard = null
      focusedPath = null
      return
    }

    // Ctrl/Cmd+A: select all visible
    if (isMod && e.key === 'a') {
      e.preventDefault()
      setSelectedPaths(new SvelteSet(visibleItems))
      return
    }

    // Ctrl/Cmd+C: copy paths (OS-clipboard write is best-effort; the in-app
    // clipboard state below still tracks the selection for Ctrl/Cmd+V)
    if (isMod && e.key === 'c' && selectedPaths.size > 0) {
      e.preventDefault()
      const paths = Array.from(selectedPaths).join('\n')
      void copyTextWithFallback(paths)
      clipboard = { paths: new SvelteSet(selectedPaths), operation: 'copy' }
      return
    }

    // Ctrl/Cmd+X: cut (same best-effort OS-clipboard write)
    if (isMod && e.key === 'x' && selectedPaths.size > 0) {
      e.preventDefault()
      clipboard = { paths: new SvelteSet(selectedPaths), operation: 'cut' }
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
  }

  // ---------------------------------------------------------------------------
  // Drag and drop
  // ---------------------------------------------------------------------------

  /**
   * Starts a drag, selecting the row when it is not part of the selection.
   * @param path - The dragged row's path.
   * @param e - The native dragstart event.
   */
  function handleDragStart(path: string, e: DragEvent): void {
    let paths: Set<string>
    if (selectedPaths.has(path)) {
      paths = new SvelteSet(selectedPaths)
    } else {
      // Dragging unselected item — select it alone
      paths = new SvelteSet([path])
      setSelectedPaths(paths)
    }
    draggedPaths = paths
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
  function handleDragOver(path: string, e: DragEvent): void {
    if (!draggedPaths) return
    e.preventDefault()
    e.stopPropagation()

    // Resolve drop target to a directory
    const found = findNodeByPath(files, path)
    const targetDir = found?.node.type === 'directory' ? path : getParentDir(path)

    // Validate: cannot drop into self or descendant of any dragged path
    for (const dragPath of draggedPaths) {
      if (targetDir === dragPath || targetDir.startsWith(dragPath + '/')) {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'none'
        dropTargetPath = null
        return
      }
    }

    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    dropTargetPath = targetDir
  }

  /**
   * Clears the drop target once the pointer truly leaves the tree.
   * @param e - The native dragleave event.
   */
  function handleItemDragLeave(e: DragEvent): void {
    // Only clear if we're truly leaving (not entering a child element)
    const related = e.relatedTarget as Node | null
    if (containerEl && related && containerEl.contains(related)) return
    dropTargetPath = null
  }

  /**
   * Drops the dragged rows into the row's directory.
   * @param path - The row dropped on.
   * @param e - The native drop event.
   */
  function handleDrop(path: string, e: DragEvent): void {
    e.preventDefault()
    e.stopPropagation()
    const dragged = draggedPaths
    if (!dragged || dragged.size === 0) {
      draggedPaths = null
      dropTargetPath = null
      return
    }

    const found = findNodeByPath(files, path)
    const targetDir = found?.node.type === 'directory' ? path : getParentDir(path)

    const moves: Array<{ oldPath: string; newPath: string }> = []
    for (const oldPath of dragged) {
      const fileName = oldPath.split('/').pop()!
      const newPath = `${targetDir}/${fileName}`
      if (newPath !== oldPath) {
        moves.push({ oldPath, newPath })
      }
    }

    if (moves.length > 0) onMoveFiles?.(moves)

    draggedPaths = null
    dropTargetPath = null
    setSelectedPaths(new SvelteSet())
  }

  /**
   * Shows the workspace root as the drop target for a background drag.
   * @param e - The native dragover event on the container.
   */
  function handleBackgroundDragOver(e: DragEvent): void {
    if (!draggedPaths) return
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    dropTargetPath = '/workspace'
  }

  /**
   * Drops dragged rows into the workspace root.
   * @param e - The native drop event on the container.
   */
  function handleBackgroundDrop(e: DragEvent): void {
    e.preventDefault()
    const dragged = draggedPaths
    if (!dragged || dragged.size === 0) {
      draggedPaths = null
      dropTargetPath = null
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

    if (moves.length > 0) onMoveFiles?.(moves)

    draggedPaths = null
    dropTargetPath = null
    setSelectedPaths(new SvelteSet())
  }

  /** Ends a drag, whatever happened to it. */
  function handleDragEnd(): void {
    draggedPaths = null
    dropTargetPath = null
  }

  // Shared mutable counter — reset each render, incremented by each FileTreeItem.
  // Prevents symlink cycles from freezing the browser by capping total rendered nodes.
  const renderCount = { current: 0 }

  // Sort root-level entries: directories first, then files, alphabetically.
  const sortedFiles = $derived.by(() => {
    renderCount.current = 0
    return sortNodes(files)
  })
</script>

<!-- The tree is a focusable composite widget, so it takes the tab stop React gives it. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  bind:this={containerEl}
  class={cm.cn(cm.sp('py', 1), cm.sp('pl', 1), className)}
  style="outline: none; overflow-y: auto"
  role={files.length === 0 ? undefined : 'tree'}
  tabindex="0"
  aria-activedescendant={files.length === 0 || !focusedPath || !rowIndexById.has(focusedPath)
    ? undefined
    : `${rowIdPrefix}-${rowIndexById.get(focusedPath)}`}
  onkeydown={handleTreeKeyDown}
  onclick={handleTreeClick}
  ondblclick={handleTreeDoubleClick}
  oncontextmenu={handleBackgroundContextMenu}
  onpointerdown={(e) => {
    // Row presses bubble here too — those belong to the row's own long-press
    // recognizer, so only arm the background one for presses that start on the
    // empty tree area. A new press also invalidates any stale long-press click
    // suppression.
    suppressNextRowClick = false
    if ((e.target as HTMLElement).closest('[data-explorer-path]')) return
    backgroundLongPress.onPointerDown(e)
  }}
  onpointermove={backgroundLongPress.onPointerMove}
  onpointerup={backgroundLongPress.onPointerUp}
  onpointercancel={backgroundLongPress.onPointerCancel}
  ontouchend={backgroundLongPress.onTouchEnd}
  ondragover={handleBackgroundDragOver}
  ondrop={handleBackgroundDrop}
  ondragend={handleDragEnd}
>
  {#if files.length === 0}
    <div class={cm.cn(cm.textMuted, cm.textSize('sm'), cm.sp('p', 3))}>
      {t('ide.files.empty', undefined, { defaultValue: 'No files' })}
    </div>
  {/if}
  {#each sortedFiles as node (node.path)}
    <FileTreeItem
      {node}
      depth={0}
      isExpanded={isExpandedFromState(expandState, node.path, 0)}
      {activeFile}
      isSelected={selectedPaths.has(node.path)}
      isCut={clipboard?.operation === 'cut' && clipboard.paths.has(node.path)}
      isFocused={focusedPath === node.path}
      isDropTarget={dropTargetPath === node.path}
      {onFileSelect}
      {onFileDoubleClick}
      {onDirExpand}
      onTogglePath={handleTogglePath}
      onSymlinkClick={handleSymlinkClick}
      onContextMenu={handleItemContextMenu}
      onItemClick={handleItemClick}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleItemDragLeave}
      onDrop={handleDrop}
      {expandState}
      {fileStatuses}
      {gitColors}
      {selectedPaths}
      clipboardPaths={clipboard?.paths ?? null}
      clipboardOperation={clipboard?.operation ?? null}
      {renderCount}
      {dropTargetPath}
      isCoarse={$coarse}
      {rowIdPrefix}
      rowIndex={rowIndexById}
      onLongPressFired={() => {
        suppressNextRowClick = true
      }}
    />
  {/each}
  {#if contextMenu}
    <FileExplorerContextMenu
      {readOnly}
      position={contextMenu.position}
      node={contextMenu.node}
      selectedCount={selectedPaths.size}
      canPaste={clipboard?.operation === 'cut' && clipboard.paths.size > 0}
      onAction={handleContextMenuAction}
      onClose={handleCloseContextMenu}
    />
  {/if}
</div>
