/**
 * Context menu for the file explorer — shown on right-click.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `FileExplorerContextMenu`
 * (see that file for the design notes): the same props (React names), the same
 * DOM for the same input, the same callbacks. The menu is portalled into
 * `document.body` the way React portals it, so it escapes every `overflow`
 * ancestor; the position clamps into the viewport on mount and on every
 * position change, measured from the menu's own box; `Escape` (a document
 * listener in the capture phase, which stops the key from reaching the rows)
 * and a pointer press outside close it; a row acts on click and on
 * `Enter`/`Space` alone. The component is a part (React renders it inside
 * `FileExplorer` without exporting it), so it lives in `src/parts/`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createEffect, createMemo, createSignal, on, onCleanup, onMount } from 'solid-js'

import type { FileNode } from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/** Action identifiers for context menu items. */
export type ContextMenuAction =
  | 'open'
  | 'newFile'
  | 'newFolder'
  | 'rename'
  | 'delete'
  | 'deleteMultiple'
  | 'copyPath'
  | 'copyPaths'
  | 'copyRelativePath'
  | 'copyRelativePaths'
  | 'cut'
  | 'paste'
  | 'collapseAll'

/** Props for {@link FileExplorerContextMenu} — the React prop names, React's own contract. */
export interface ContextMenuProps {
  /** Screen coordinates where the menu should appear. */
  position: { x: number; y: number }
  /** The file/directory node that was right-clicked, or null for background. */
  node: FileNode | null
  /** Number of items in the current multi-selection (0 or 1 = single mode). */
  selectedCount: number
  /** Whether paste is available (clipboard has cut items). */
  canPaste: boolean
  /** Called when the user selects a menu action. */
  onAction: (action: ContextMenuAction) => void
  /** Called when the menu should close (Escape, outside click, after action). */
  onClose: () => void
  /**
   * Read-only mode (a project viewer): every mutating entry — new file/folder,
   * rename, delete, cut, paste — is omitted; copy-path and collapse-all stay.
   */
  readOnly?: boolean
}

/** Actions that WRITE the tree — omitted entirely in read-only mode. */
const MUTATING_ACTIONS: ReadonlySet<ContextMenuAction> = new Set([
  'newFile',
  'newFolder',
  'rename',
  'delete',
  'deleteMultiple',
  'cut',
  'paste',
])

/** One row of the menu. */
interface MenuItem {
  action: ContextMenuAction
  label: string
  shortcut?: string
  separator?: boolean
}

/**
 * Build the list of menu items based on context (file, directory, or background).
 * @param t - The translation function from `useTranslation()`.
 * @param node - The right-clicked node, or null for background.
 * @param selectedCount - Number of selected items (> 1 triggers multi-select menu).
 * @param canPaste - Whether paste is available.
 * @param readOnly - Read-only mode: mutating actions are omitted.
 * @returns Array of menu items with optional separators.
 */
function getMenuItems(
  t: ReturnType<typeof useTranslation>['t'],
  node: FileNode | null,
  selectedCount: number,
  canPaste: boolean,
  readOnly?: boolean,
): MenuItem[] {
  const filterReadOnly = (items: MenuItem[]): MenuItem[] =>
    readOnly ? items.filter((i) => !MUTATING_ACTIONS.has(i.action)) : items
  if (!node) {
    // Background (empty area)
    const items: MenuItem[] = [
      {
        action: 'newFile',
        label: t('ide.contextMenu.newFile', undefined, { defaultValue: 'New File...' }),
      },
      {
        action: 'newFolder',
        label: t('ide.contextMenu.newFolder', undefined, { defaultValue: 'New Folder...' }),
      },
    ]
    if (canPaste) {
      items.push({
        action: 'paste',
        label: t('ide.contextMenu.paste', undefined, { defaultValue: 'Paste' }),
        shortcut: '⌘V',
        separator: true,
      })
    }
    items.push({
      action: 'collapseAll',
      label: t('ide.contextMenu.collapseAll', undefined, { defaultValue: 'Collapse All' }),
      separator: !canPaste,
    })
    return filterReadOnly(items)
  }

  // Multi-select menu (2+ items selected)
  if (selectedCount > 1) {
    const items: MenuItem[] = [
      {
        action: 'deleteMultiple',
        label: t(
          'ide.contextMenu.deleteCount',
          { count: selectedCount },
          { defaultValue: 'Delete {{count}} Items' },
        ),
        shortcut: '⌫',
      },
      {
        action: 'cut',
        label: t('ide.contextMenu.cut', undefined, { defaultValue: 'Cut' }),
        shortcut: '⌘X',
        separator: true,
      },
      {
        action: 'copyPaths',
        label: t('ide.contextMenu.copyPaths', undefined, { defaultValue: 'Copy Paths' }),
        separator: true,
      },
      {
        action: 'copyRelativePaths',
        label: t('ide.contextMenu.copyRelativePaths', undefined, {
          defaultValue: 'Copy Relative Paths',
        }),
      },
    ]
    if (canPaste) {
      items.push({
        action: 'paste',
        label: t('ide.contextMenu.paste', undefined, { defaultValue: 'Paste' }),
        shortcut: '⌘V',
        separator: true,
      })
    }
    items.push({
      action: 'collapseAll',
      label: t('ide.contextMenu.collapseAll', undefined, { defaultValue: 'Collapse All' }),
      separator: true,
    })
    return filterReadOnly(items)
  }

  // Single-item menus
  if (node.type === 'directory') {
    const items: MenuItem[] = [
      {
        action: 'newFile',
        label: t('ide.contextMenu.newFile', undefined, { defaultValue: 'New File...' }),
      },
      {
        action: 'newFolder',
        label: t('ide.contextMenu.newFolder', undefined, { defaultValue: 'New Folder...' }),
      },
      {
        action: 'rename',
        label: t('ide.contextMenu.rename', undefined, { defaultValue: 'Rename' }),
        shortcut: 'F2',
        separator: true,
      },
      {
        action: 'delete',
        label: t('ide.contextMenu.delete', undefined, { defaultValue: 'Delete' }),
      },
      {
        action: 'cut',
        label: t('ide.contextMenu.cut', undefined, { defaultValue: 'Cut' }),
        shortcut: '⌘X',
      },
    ]
    if (canPaste) {
      items.push({
        action: 'paste',
        label: t('ide.contextMenu.paste', undefined, { defaultValue: 'Paste' }),
        shortcut: '⌘V',
      })
    }
    items.push(
      {
        action: 'copyPath',
        label: t('ide.contextMenu.copyPath', undefined, { defaultValue: 'Copy Path' }),
        separator: true,
      },
      {
        action: 'copyRelativePath',
        label: t('ide.contextMenu.copyRelativePath', undefined, {
          defaultValue: 'Copy Relative Path',
        }),
      },
      {
        action: 'collapseAll',
        label: t('ide.contextMenu.collapseAll', undefined, { defaultValue: 'Collapse All' }),
        separator: true,
      },
    )
    return filterReadOnly(items)
  }

  // File
  const items: MenuItem[] = [
    { action: 'open', label: t('ide.contextMenu.open', undefined, { defaultValue: 'Open' }) },
    {
      action: 'rename',
      label: t('ide.contextMenu.rename', undefined, { defaultValue: 'Rename' }),
      shortcut: 'F2',
      separator: true,
    },
    { action: 'delete', label: t('ide.contextMenu.delete', undefined, { defaultValue: 'Delete' }) },
    {
      action: 'cut',
      label: t('ide.contextMenu.cut', undefined, { defaultValue: 'Cut' }),
      shortcut: '⌘X',
    },
  ]
  if (canPaste) {
    items.push({
      action: 'paste',
      label: t('ide.contextMenu.paste', undefined, { defaultValue: 'Paste' }),
      shortcut: '⌘V',
    })
  }
  items.push(
    {
      action: 'copyPath',
      label: t('ide.contextMenu.copyPath', undefined, { defaultValue: 'Copy Path' }),
      separator: true,
    },
    {
      action: 'copyRelativePath',
      label: t('ide.contextMenu.copyRelativePath', undefined, {
        defaultValue: 'Copy Relative Path',
      }),
    },
  )
  return filterReadOnly(items)
}

/**
 * Portal-rendered context menu for the file explorer.
 *
 * @param props - See {@link ContextMenuProps}.
 * @returns The portalled context menu.
 */
export function FileExplorerContextMenu(props: ContextMenuProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  let menuRef: HTMLDivElement | undefined

  // The rows (React builds them on every render; the memo re-runs whenever a
  // read prop or the locale changes).
  const items = createMemo(() =>
    getMenuItems(t, props.node, props.selectedCount, props.canPaste, props.readOnly),
  )

  // The position clamped into the viewport (React clamps the DOM style from its
  // mount/position effect; keeping the clamped value in the render keeps every
  // later re-render — a locale switch — at the clamped spot too). It starts at
  // the raw position and the effect below measures and clamps once the portal
  // has mounted the menu.
  const [clamped, setClamped] = createSignal({ x: props.position.x, y: props.position.y })

  const clampIntoViewport = (): void => {
    const el = menuRef
    if (!el) return
    const rect = el.getBoundingClientRect()
    let { x, y } = props.position
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4
    if (x < 0) x = 4
    if (y < 0) y = 4
    setClamped({ x, y })
  }

  // React portals the menu into `document.body`; move the rendered menu there
  // the way the portal does — appended last, so it lands where React's menu
  // lands. (Solid's own `<Portal>` wraps its content in a container div the
  // reference DOM does not have.) Solid's teardown removes nodes from wherever
  // they live, so the moved menu is cleaned up with the component.
  onMount(() => {
    if (menuRef) document.body.appendChild(menuRef)
  })

  // Close on Escape (the capture-phase listener stops the key from reaching
  // anything else) or outside click.
  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      props.onClose()
    }
  }
  const handlePointerDown = (e: PointerEvent): void => {
    if (menuRef && !menuRef.contains(e.target as Node)) {
      props.onClose()
    }
  }
  onMount(() => {
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('pointerdown', handlePointerDown)
    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('pointerdown', handlePointerDown)
    })
  })

  // Measure after the menu has mounted, and again on every position change,
  // the way React's effect does.
  createEffect(on(() => props.position, clampIntoViewport))

  /** Acts on a row: fire the action, then close. */
  const handleClick = (action: ContextMenuAction): void => {
    props.onAction(action)
    props.onClose()
  }

  return (
    <div
      ref={(el: HTMLDivElement) => {
        menuRef = el
      }}
      role="menu"
      class={cm.dropdownContent}
      style={{
        position: 'fixed',
        left: `${clamped().x}px`,
        top: `${clamped().y}px`,
        'z-index': '9999',
        'min-width': '160px',
      }}
    >
      {items().map((item, i) => (
        <div>
          {item.separator && i > 0 && <div class={cm.dropdownSeparator} role="separator" />}
          <div
            role="menuitem"
            tabIndex={0}
            data-mol-id={`file-context-${item.action}`}
            // Menu rows take the same coarse-pointer floor as the preview's
            // device menu — `dropdownItem` sets padding only.
            class={cm.cn(cm.dropdownItem, cm.touchTargetCompact)}
            onClick={() => handleClick(item.action)}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClick(item.action)
              }
            }}
          >
            <span class={cm.dropdownItemLabel}>{item.label}</span>
            {item.shortcut && <span class={cm.dropdownItemShortcut}>{item.shortcut}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
