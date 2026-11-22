/**
 * Context menu for the file explorer — shown on right-click.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `FileExplorerContextMenu` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input, the same callbacks. The menu is teleported into
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

import {
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  type PropType,
  ref,
  Teleport,
  type VNodeChild,
  watch,
} from 'vue'

import type { FileNode } from '@molecule/app-ide-panel-logic'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

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
 * Portal-rendered context menu for the file explorer. React renders it under
 * the React name `FileExplorerContextMenu`.
 *
 * @param props - See {@link ContextMenuProps}.
 * @returns The teleported context menu.
 */
export const FileExplorerContextMenu = defineComponent({
  name: 'FileExplorerContextMenu',
  inheritAttrs: false,
  props: {
    /** Screen coordinates where the menu should appear. */
    position: {
      type: Object as PropType<{ x: number; y: number }>,
      required: true,
    },
    /** The file/directory node that was right-clicked, or null for background. */
    node: {
      type: [Object, null] as PropType<FileNode | null>,
      required: true,
    },
    /** Number of items in the current multi-selection (0 or 1 = single mode). */
    selectedCount: { type: Number, required: true },
    /** Whether paste is available (clipboard has cut items). */
    canPaste: { type: Boolean, required: true },
    /** Called when the user selects a menu action. */
    onAction: {
      type: Function as PropType<(action: ContextMenuAction) => void>,
      required: true,
    },
    /** Called when the menu should close (Escape, outside click, after action). */
    onClose: { type: Function as PropType<() => void>, required: true },
    /** Read-only mode: mutating actions are omitted. */
    readOnly: { type: Boolean, required: false, default: false },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const menuRef = ref<HTMLElement | null>(null)

    // The position clamped into the viewport (React clamps the DOM style from
    // its mount/position effect; keeping the clamped value in the render keeps
    // every later re-render — a locale switch — at the clamped spot too).
    const clamped = ref({ x: props.position.x, y: props.position.y })

    /** Measures the menu's box and clamps the position into the viewport. */
    const clampIntoViewport = (): void => {
      const el = menuRef.value
      if (!el) return
      const rect = el.getBoundingClientRect()
      let { x, y } = props.position
      if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4
      if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4
      if (x < 0) x = 4
      if (y < 0) y = 4
      clamped.value = { x, y }
    }
    onMounted(clampIntoViewport)
    watch(() => props.position, clampIntoViewport, { flush: 'post' })

    // Close on Escape (the capture-phase listener stops the key from reaching
    // anything else) or outside click.
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        props.onClose()
      }
    }
    const handlePointerDown = (e: PointerEvent): void => {
      if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
        props.onClose()
      }
    }
    onMounted(() => {
      document.addEventListener('keydown', handleKeyDown, true)
      document.addEventListener('pointerdown', handlePointerDown)
    })
    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('pointerdown', handlePointerDown)
    })

    /** Acts on a row: fire the action, then close. */
    const handleClick = (action: ContextMenuAction): void => {
      props.onAction(action)
      props.onClose()
    }

    return (): VNodeChild => {
      const items = getMenuItems(t, props.node, props.selectedCount, props.canPaste, props.readOnly)
      return h(Teleport, { to: 'body' }, [
        h(
          'div',
          {
            ref: menuRef,
            role: 'menu',
            class: cm.dropdownContent,
            style: {
              position: 'fixed',
              left: `${clamped.value.x}px`,
              top: `${clamped.value.y}px`,
              zIndex: 9999,
              minWidth: '160px',
            },
          },
          items.map((item, i) =>
            h('div', { key: item.action }, [
              item.separator && i > 0
                ? h('div', { class: cm.dropdownSeparator, role: 'separator' })
                : null,
              h(
                'div',
                {
                  role: 'menuitem',
                  tabindex: 0,
                  'data-mol-id': `file-context-${item.action}`,
                  // Menu rows take the same coarse-pointer floor as the preview's
                  // device menu — `dropdownItem` sets padding only.
                  class: cm.cn(cm.dropdownItem, cm.touchTargetCompact),
                  onClick: () => handleClick(item.action),
                  onKeydown: (e: KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleClick(item.action)
                    }
                  },
                },
                [
                  h('span', { class: cm.dropdownItemLabel }, [item.label]),
                  item.shortcut
                    ? h('span', { class: cm.dropdownItemShortcut }, [item.shortcut])
                    : null,
                ],
              ),
            ]),
          ),
        ),
      ])
    }
  },
})
